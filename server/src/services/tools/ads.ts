import type { ToolDefinition, ToolContext } from './types.js'
import { v4 as uuid } from 'uuid'
import { prisma } from '../../db/client.js'
import { broadcast } from '../sse.js'

export const adsTools: ToolDefinition[] = [
  {
    name: 'ads_copy_generation',
    description: 'Genera copys para campañas publicitarias con variantes para A/B testing.',
    parameters: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          description: 'Producto o servicio a promocionar',
        },
        platform: {
          type: 'string',
          description: 'Plataforma (meta, google, tiktok)',
          default: 'meta',
        },
        targetAudience: {
          type: 'string',
          description: 'Descripción de la audiencia objetivo',
        },
      },
      required: ['product'],
    },
    execute: async (input, context) => {
      const product = input.product as string
      const deliverableId = uuid()

      const deliverable = await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId: context.conversationId,
          title: `Copys: ${product}`,
          type: 'copy',
          content: `## Copys para ${product}\n\n(Generado por ${context.agentName})`,
          agent: context.agentName,
          botType: context.agentId,
        },
      })

      const task = await prisma.kanbanTask.create({
        data: {
          id: uuid(),
          conversationId: context.conversationId,
          title: `Copys: ${product}`,
          agent: context.agentName,
          status: 'doing',
          botType: context.agentId,
          deliverableId,
        },
      })

      broadcast(context.conversationId, {
        type: 'deliverable',
        deliverable: {
          id: deliverable.id,
          title: deliverable.title,
          type: 'copy',
          content: deliverable.content,
          agent: deliverable.agent,
          botType: deliverable.botType,
        },
      })

      broadcast(context.conversationId, {
        type: 'kanban_update',
        task: {
          id: task.id,
          title: task.title,
          agent: task.agent,
          status: task.status as 'doing',
          botType: task.botType,
          deliverableId,
        },
      })

      return `Deliverable de copys creado. Genera las variantes de copy en tu respuesta incluyendo headlines, body text, y CTAs.`
    },
  },
  {
    name: 'ads_campaign_planning',
    description: 'Planifica una campaña publicitaria con presupuesto, segmentación y métricas objetivo.',
    parameters: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'Objetivo de la campaña (leads, ventas, awareness)',
        },
        budget: {
          type: 'number',
          description: 'Presupuesto mensual en USD',
        },
        platforms: {
          type: 'string',
          description: 'Plataformas a usar (meta, google, tiktok)',
        },
      },
      required: ['objective'],
    },
    execute: async (input, context) => {
      const objective = input.objective as string
      const budget = (input.budget as number) || 500
      const deliverableId = uuid()

      const deliverable = await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId: context.conversationId,
          title: `Plan de Campaña: ${objective}`,
          type: 'report',
          content: `## Plan de Campaña\n\nObjetivo: ${objective}\nPresupuesto: $${budget} USD/mes`,
          agent: context.agentName,
          botType: context.agentId,
        },
      })

      broadcast(context.conversationId, {
        type: 'deliverable',
        deliverable: {
          id: deliverable.id,
          title: deliverable.title,
          type: 'report',
          content: deliverable.content,
          agent: deliverable.agent,
          botType: deliverable.botType,
        },
      })

      return `Plan de campaña creado como deliverable. Incluye en tu respuesta: distribución de presupuesto, segmentación detallada, métricas objetivo (CTR, CPA, ROAS), y timeline.`
    },
  },
]
