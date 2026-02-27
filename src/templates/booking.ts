/**
 * Booking/Appointments template — Multi-step wizard: Service -> Date -> Time -> Confirm.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import { useState } from 'react'
import Header from './components/Header'
import StepIndicator from './components/StepIndicator'
import ServiceList from './components/ServiceList'
import Calendar from './components/Calendar'
import TimeSlots from './components/TimeSlots'
import BookingConfirm from './components/BookingConfirm'
import { services } from './data/services'

type Step = 1 | 2 | 3 | 4

export default function App() {
  const [step, setStep] = useState<Step>(1)
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const service = services.find(s => s.id === selectedService)

  const handleServiceSelect = (id: number) => {
    setSelectedService(id)
    setStep(2)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setStep(3)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(4)
  }

  const handleConfirm = () => {
    setConfirmed(true)
  }

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reserva confirmada</h2>
          <p className="text-gray-500 mb-1">{service?.name} — {selectedDate} a las {selectedTime}</p>
          <p className="text-gray-400 text-sm">Te enviaremos un recordatorio por email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <StepIndicator currentStep={step} />
        <div className="mt-8">
          {step === 1 && <ServiceList services={services} onSelect={handleServiceSelect} />}
          {step === 2 && <Calendar onSelect={handleDateSelect} onBack={handleBack} />}
          {step === 3 && <TimeSlots onSelect={handleTimeSelect} onBack={handleBack} />}
          {step === 4 && service && selectedDate && selectedTime && (
            <BookingConfirm
              service={service}
              date={selectedDate}
              time={selectedTime}
              onConfirm={handleConfirm}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  )
}
`

const headerTsx = `import { CalendarCheck } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-lg font-bold text-teal-600">
          <CalendarCheck size={22} />
          MiAgenda
        </a>
        <nav className="hidden sm:flex items-center gap-6">
          {['Servicios', 'Horarios', 'Contacto'].map(l => (
            <a key={l} href="#" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">{l}</a>
          ))}
        </nav>
      </div>
    </header>
  )
}
`

const stepIndicatorTsx = `const steps = ['Servicio', 'Fecha', 'Hora', 'Confirmar']

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between max-w-md mx-auto">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={\`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors \${
                isCompleted
                  ? 'bg-teal-600 text-white'
                  : isActive
                    ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                    : 'bg-gray-200 text-gray-500'
              }\`}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNum}
              </div>
              <span className={\`text-[11px] font-medium mt-1.5 \${isActive || isCompleted ? 'text-teal-600' : 'text-gray-400'}\`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={\`w-12 sm:w-20 h-0.5 mx-2 mb-5 \${isCompleted ? 'bg-teal-600' : 'bg-gray-200'}\`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
`

const serviceListTsx = `interface Service {
  id: number
  name: string
  duration: string
  price: number
  description: string
  icon: string
}

export default function ServiceList({ services, onSelect }: { services: Service[]; onSelect: (id: number) => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Elige un servicio</h2>
      <p className="text-gray-500 text-sm mb-6">Selecciona el servicio que deseas reservar.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-teal-300 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900">{s.name}</h3>
                  <span className="text-sm font-bold text-teal-600">\${s.price}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.description}</p>
                <span className="text-[11px] text-gray-400 mt-2 inline-block">{s.duration}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
`

const calendarTsx = `import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const dayNames = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom']

export default function Calendar({ onSelect, onBack }: { onSelect: (date: string) => void; onBack: () => void }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isPast = (day: number) => new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const handleSelect = (day: number) => {
    if (isPast(day)) return
    const d = new Date(year, month, day)
    const formatted = d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear()
    onSelect(formatted)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Elige una fecha</h2>
      <p className="text-gray-500 text-sm mb-6">Selecciona el dia para tu cita.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold text-gray-900">{monthNames[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const past = isPast(day)
            return (
              <button
                key={day}
                disabled={past}
                onClick={() => handleSelect(day)}
                className={\`h-10 rounded-lg text-sm font-medium transition-colors \${
                  isToday(day)
                    ? 'bg-teal-600 text-white'
                    : past
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-teal-50 hover:text-teal-600'
                }\`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={onBack} className="mt-6 text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Volver
      </button>
    </div>
  )
}
`

const timeSlotsTsx = `const slots = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30',
]

const unavailable = ['10:30', '14:00', '15:30']

export default function TimeSlots({ onSelect, onBack }: { onSelect: (time: string) => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Elige un horario</h2>
      <p className="text-gray-500 text-sm mb-6">Horarios disponibles para la fecha seleccionada.</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto">
        {slots.map(slot => {
          const busy = unavailable.includes(slot)
          return (
            <button
              key={slot}
              disabled={busy}
              onClick={() => onSelect(slot)}
              className={\`py-3 rounded-lg text-sm font-medium transition-colors border \${
                busy
                  ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600'
              }\`}
            >
              {slot}
            </button>
          )
        })}
      </div>

      <button onClick={onBack} className="mt-6 text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Volver
      </button>
    </div>
  )
}
`

const bookingConfirmTsx = `import { useState } from 'react'

interface Service {
  id: number
  name: string
  duration: string
  price: number
  description: string
  icon: string
}

interface Props {
  service: Service
  date: string
  time: string
  onConfirm: () => void
  onBack: () => void
}

export default function BookingConfirm({ service, date, time, onConfirm, onBack }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm()
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Confirma tu reserva</h2>
      <p className="text-gray-500 text-sm mb-6">Revisa los detalles y completa tus datos.</p>

      <div className="bg-teal-50 rounded-xl border border-teal-200 p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{service.icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-900">{service.name}</p>
            <p className="text-xs text-gray-500">{service.duration} — \${service.price}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-teal-700">
          <span>{date}</span>
          <span>{time} hrs</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Tu nombre"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="tu@email.com"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
        <input
          required
          type="tel"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          placeholder="Tu telefono"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
        <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors">
          Confirmar reserva
        </button>
      </form>

      <button onClick={onBack} className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Volver
      </button>
    </div>
  )
}
`

const servicesData = `export const services = [
  { id: 1, name: 'Consulta general', duration: '30 min', price: 50, description: 'Evaluacion y diagnostico general con un profesional.', icon: '🩺' },
  { id: 2, name: 'Corte de cabello', duration: '45 min', price: 25, description: 'Corte personalizado con estilista profesional.', icon: '✂️' },
  { id: 3, name: 'Masaje relajante', duration: '60 min', price: 70, description: 'Masaje corporal completo con aceites esenciales.', icon: '💆' },
  { id: 4, name: 'Asesoria financiera', duration: '45 min', price: 80, description: 'Revision de finanzas personales y plan de ahorro.', icon: '📊' },
  { id: 5, name: 'Clase de yoga', duration: '60 min', price: 20, description: 'Sesion grupal de yoga para todos los niveles.', icon: '🧘' },
  { id: 6, name: 'Sesion de fotos', duration: '90 min', price: 120, description: 'Sesion profesional en estudio o exteriores.', icon: '📸' },
]
`

export function getBookingFiles(): FileSystemTree {
  const sharedSrc = (sharedFiles.src as { directory: FileSystemTree }).directory
  return {
    ...sharedFiles,
    src: {
      directory: {
        ...sharedSrc,
        'App.tsx': { file: { contents: appTsx } },
        components: {
          directory: {
            ...sharedUIComponents,
            'Header.tsx': { file: { contents: headerTsx } },
            'StepIndicator.tsx': { file: { contents: stepIndicatorTsx } },
            'ServiceList.tsx': { file: { contents: serviceListTsx } },
            'Calendar.tsx': { file: { contents: calendarTsx } },
            'TimeSlots.tsx': { file: { contents: timeSlotsTsx } },
            'BookingConfirm.tsx': { file: { contents: bookingConfirmTsx } },
          },
        },
        data: {
          directory: {
            'services.ts': { file: { contents: servicesData } },
          },
        },
      },
    },
  }
}
