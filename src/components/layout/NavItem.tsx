import type { ReactNode } from 'react'

interface NavItemProps {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  badge?: string
}

const NavItem = ({ active, onClick, icon, label, badge }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-5 rounded-xl transition-all relative group ${
      active
        ? 'bg-slate-800/50 text-white border border-slate-700/50'
        : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 border border-transparent'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`${active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'} transition-colors`}>
        {icon}
      </div>
      <span className="hidden md:block font-medium text-sm">{label}</span>
    </div>
    {badge && (
      <span className="hidden md:block bg-green-500/20 text-green-500 text-[8px] font-medium px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
)

export default NavItem
