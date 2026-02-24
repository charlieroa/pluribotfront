import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Anonymous user handler: Pluria only explains the platform
export async function handleAnonymousMessage(conversationId: string, userText: string): Promise<void> {
  const lowerText = userText.toLowerCase()

  // Contextual responses based on what the user asks
  let responseText: string

  if (lowerText.includes('precio') || lowerText.includes('costo') || lowerText.includes('plan') || lowerText.includes('gratis')) {
    responseText = `Pluribots tiene un plan gratuito para que pruebes la plataforma. Para ver los planes y acceder a los agentes, solo necesitas crear una cuenta. Es gratis y toma menos de 30 segundos.\n\nRegistrate para comenzar a usar los bots.`
  } else if (lowerText.includes('que es') || lowerText.includes('como funciona') || lowerText.includes('que hace') || lowerText.includes('hola') || lowerText.includes('hey') || lowerText.includes('hi')) {
    responseText = `Hola! Soy Pluria, el orquestador de Pluribots.\n\nPluribots es una plataforma con agentes de IA especializados que trabajan por ti:\n\n• **Lupa** — Estratega SEO: auditorias, keywords y posicionamiento en Google\n• **Nova** — Branding: logos, identidad visual, paletas y manual de marca\n• **Pixel** — Disenador Web: landing pages y sitios web completos\n• **Spark** — Contenido Social: banners, posts, flyers y stories\n• **Metric** — Ads Specialist: campanas de Meta Ads y Google Ads optimizadas\n• **Logic** — Full-Stack Dev: paginas web funcionales con codigo real\n• **Reel** — Creador de Video: reels y videos con IA generativa\n\nYo me encargo de coordinar a los agentes segun tu proyecto. Describis lo que necesitas y yo activo al equipo correcto.\n\nPara empezar a usarlos, registrate gratis. Es rapido!`
  } else if (lowerText.includes('seo') || lowerText.includes('keyword') || lowerText.includes('google') || lowerText.includes('posicion')) {
    responseText = `Para tareas de SEO tenemos a **Lupa**, nuestro estratega SEO. Puede hacer auditorias completas, investigacion de keywords, analisis de backlinks y estrategias de posicionamiento.\n\nPero para activar a Lupa necesitas una cuenta. Registrate gratis y podras usarlo de inmediato!`
  } else if (lowerText.includes('diseno') || lowerText.includes('logo') || lowerText.includes('banner') || lowerText.includes('landing') || lowerText.includes('imagen')) {
    responseText = `Para diseno tenemos 3 agentes especializados:\n\n• **Nova** — Logos, branding e identidad visual\n• **Pixel** — Landing pages y sitios web completos\n• **Spark** — Banners, posts para redes, flyers y stories\n\nPara activarlos, solo necesitas registrarte. Es gratis!`
  } else if (lowerText.includes('video') || lowerText.includes('reel') || lowerText.includes('clip')) {
    responseText = `Para video tenemos a **Reel**, nuestro creador de video con IA generativa (Veo 3). Hace reels promocionales, clips de producto y contenido audiovisual.\n\nRegistrate gratis para activar a Reel y crear tu primer video!`
  } else if (lowerText.includes('ads') || lowerText.includes('publicidad') || lowerText.includes('campana') || lowerText.includes('meta') || lowerText.includes('facebook')) {
    responseText = `Para publicidad tenemos a **Metric**, nuestro especialista en ads. Crea campanas de Meta Ads y Google Ads optimizadas, con copywriting y segmentacion.\n\nPara usar a Metric, registrate gratis. Toma menos de 30 segundos!`
  } else if (lowerText.includes('web') || lowerText.includes('pagina') || lowerText.includes('codigo') || lowerText.includes('programar') || lowerText.includes('desarrollo')) {
    responseText = `Para desarrollo web tenemos a **Logic**, nuestro full-stack dev. Construye paginas web completas, funcionales y responsivas con codigo real.\n\nRegistrate gratis para activar a Logic y construir tu primera pagina!`
  } else {
    responseText = `Eso suena como un gran proyecto! En Pluribots tengo 7 agentes especializados que pueden ayudarte:\n\n• **Lupa** (SEO) • **Nova** (Branding) • **Pixel** (Web) • **Spark** (Social) • **Metric** (Ads) • **Logic** (Dev) • **Reel** (Video)\n\nPuedo coordinarlos automaticamente segun lo que necesites. Pero primero necesitas crear una cuenta para activar a los bots.\n\nRegistrate gratis y empezamos!`
  }

  // Save and stream the response
  const directMsg = await prisma.message.create({
    data: {
      id: uuid(),
      conversationId,
      sender: 'Pluria',
      text: responseText,
      type: 'agent',
      botType: 'base',
    },
  })

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: 'base',
    agentName: 'Pluria',
    step: 'Escribiendo respuesta...',
  })
  await sleep(150)
  broadcast(conversationId, { type: 'agent_start', agentId: 'base', agentName: 'Pluria' })

  // Stream words for typing effect
  const words = responseText.split(' ')
  const chunkSize = 5
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    const prefix = i === 0 ? '' : ' '
    broadcast(conversationId, { type: 'token', content: prefix + chunk, agentId: 'base' })
    await sleep(10)
  }

  broadcast(conversationId, {
    type: 'agent_end',
    agentId: 'base',
    messageId: directMsg.id,
    fullText: responseText,
  })
}
