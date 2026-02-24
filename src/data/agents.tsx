import { Search, Layout, TrendingUp, Code, Film, UserCircle, Palette, Sparkles } from 'lucide-react'
import type { Agent } from '../types'

export const agents: Agent[] = [
  { id: 'seo', name: 'Lupa', role: 'Estratega SEO', color: '#3b82f6', icon: <Search size={16} />, desc: 'Auditorías, Backlinks y posicionamiento Google.' },
  { id: 'brand', name: 'Nova', role: 'Branding & Identidad', color: '#ec4899', icon: <Palette size={16} />, desc: 'Logos, paletas de color y manual de marca.' },
  { id: 'web', name: 'Pixel', role: 'Diseño Web', color: '#a855f7', icon: <Layout size={16} />, desc: 'Landing pages y sitios web completos.' },
  { id: 'social', name: 'Spark', role: 'Contenido Social', color: '#f97316', icon: <Sparkles size={16} />, desc: 'Banners, posts, flyers y stories para redes.' },
  { id: 'ads', name: 'Metric', role: 'Ads Specialist', color: '#10b981', icon: <TrendingUp size={16} />, desc: 'Pauta en Meta, Google Ads y Optimización de ROAS.' },
  { id: 'dev', name: 'Logic', role: 'Jr Developer', color: '#f59e0b', icon: <Code size={16} />, desc: 'Automatizaciones, API e integraciones técnicas.' },
  { id: 'video', name: 'Reel', role: 'Creador de Video', color: '#ef4444', icon: <Film size={16} />, desc: 'Videos cortos, reels y contenido audiovisual con IA.' },
]

// Human agent for visualization only (not in marketplace)
export const humanAgent: Agent = {
  id: 'human', name: 'Agente Humano', role: 'Supervisor', color: '#8b5cf6', icon: <UserCircle size={16} />, desc: 'Agente humano de soporte.',
}
