export interface Plan {
  id: string
  name: string
  price: string
  credits: string
  features: string[]
  highlighted?: boolean
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Gratis',
    credits: '50',
    features: [
      '2 agentes',
      '50 creditos/mes',
      'Deploy con subdominio',
      'Soporte email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/mes',
    credits: '500',
    highlighted: true,
    features: [
      '7 agentes',
      '500 creditos/mes',
      'Modelos premium (GPT-4o, Claude, Gemini)',
      'Dominio personalizado',
      'Soporte prioritario',
      'Compatible con Senior add-on',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$99/mes',
    credits: '2,500',
    features: [
      'Agentes ilimitados',
      '2,500 creditos/mes',
      'White Label (tu marca)',
      'Equipo y staff ilimitado',
      'API de integracion',
      'Compatible con Senior add-on',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$299/mes',
    credits: '10,000',
    features: [
      'Todo en Agency +',
      '10,000 creditos/mes',
      'API con 500 req/hora',
      'Senior Dedicado incluido',
      'Account manager',
      'SLA 99.9%',
      'Soporte 24/7',
    ],
  },
]
