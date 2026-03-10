import { Search, Layout, TrendingUp, Film, UserCircle, Code2, Feather } from 'lucide-react'
import type { Agent } from '../types'

export const agents: Agent[] = [
  { id: 'seo', name: 'Lupa', role: 'Estratega SEO', color: '#3b82f6', icon: <Search size={16} />, desc: 'Auditorías, Backlinks y posicionamiento Google.' },
  { id: 'web', name: 'Pixel', role: 'Diseñador Visual', color: '#a855f7', icon: <Layout size={16} />, desc: 'Logos, posts, banners, flyers, moodboards y todo lo visual con Midjourney.' },
  { id: 'ads', name: 'Metric', role: 'Growth & Ads', color: '#10b981', icon: <TrendingUp size={16} />, desc: 'Pauta en Meta, Google Ads, funnels, growth hacking y ROAS.' },
  { id: 'content', name: 'Pluma', role: 'Copywriter & Social Media', color: '#f97316', icon: <Feather size={16} />, desc: 'Blogs, emails, calendarios de redes, captions y estrategia de contenido.' },
  { id: 'video', name: 'Reel', role: 'Creador de Video', color: '#ef4444', icon: <Film size={16} />, desc: 'Videos cortos, reels y contenido audiovisual con IA.' },
  { id: 'dev', name: 'Code', role: 'Desarrollador Full-Stack', color: '#f59e0b', icon: <Code2 size={16} />, desc: 'Apps web, dashboards, CRUD, e-commerce y sistemas con React + Supabase.' },
]

// Human agent for visualization only (not in marketplace)
export const humanAgent: Agent = {
  id: 'human', name: 'Agente Humano', role: 'Supervisor', color: '#8b5cf6', icon: <UserCircle size={16} />, desc: 'Agente humano de soporte.',
}
