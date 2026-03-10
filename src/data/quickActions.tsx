import { Rocket, Globe, BarChart3, Palette, Sparkles } from 'lucide-react'
import type { QuickAction } from '../types'

export const quickActions: QuickAction[] = [
  { id: 'web', title: 'Crear un Logo', icon: <Palette className="text-[#a78bfa]" />, desc: 'Branding profesional con IA' },
  { id: 'web', title: 'Crear una Landing', icon: <Rocket className="text-[#a78bfa]" />, desc: 'Diseño de alta conversión' },
  { id: 'web', title: 'Post para Redes', icon: <Sparkles className="text-[#a78bfa]" />, desc: 'Banners y contenido social' },
  { id: 'seo', title: 'Analizar mi Web', icon: <Globe className="text-[#a78bfa]" />, desc: 'Reporte SEO completo' },
  { id: 'ads', title: 'Nueva Pauta', icon: <BarChart3 className="text-[#a78bfa]" />, desc: 'Meta & Google Ads' },
]
