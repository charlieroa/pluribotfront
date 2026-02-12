import { Rocket, Globe, BarChart3 } from 'lucide-react'
import type { QuickAction } from '../types'

export const quickActions: QuickAction[] = [
  { id: 'web', title: 'Crear una Landing', icon: <Rocket className="text-blue-500" />, desc: 'Diseño de alta conversión' },
  { id: 'seo', title: 'Analizar mi Web', icon: <Globe className="text-blue-500" />, desc: 'Reporte SEO completo' },
  { id: 'ads', title: 'Nueva Pauta', icon: <BarChart3 className="text-blue-500" />, desc: 'Meta & Google Ads' },
]
