import { Rocket, Globe, BarChart3, Palette, Sparkles } from 'lucide-react'
import type { QuickAction } from '../types'

export const quickActions: QuickAction[] = [
  { id: 'brand', title: 'Crear un Logo', icon: <Palette className="text-pink-500" />, desc: 'Branding profesional con IA' },
  { id: 'web', title: 'Crear una Landing', icon: <Rocket className="text-indigo-500" />, desc: 'Diseño de alta conversión' },
  { id: 'social', title: 'Post para Redes', icon: <Sparkles className="text-orange-500" />, desc: 'Banners y contenido social' },
  { id: 'seo', title: 'Analizar mi Web', icon: <Globe className="text-indigo-500" />, desc: 'Reporte SEO completo' },
  { id: 'ads', title: 'Nueva Pauta', icon: <BarChart3 className="text-indigo-500" />, desc: 'Meta & Google Ads' },
]
