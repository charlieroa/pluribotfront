import type { ToolDefinition, ToolContext } from './types.js'
import { v4 as uuid } from 'uuid'
import { prisma } from '../../db/client.js'
import { broadcast } from '../sse.js'

export const codegenTools: ToolDefinition[] = [
  {
    name: 'code_generate_project',
    description: 'Genera un proyecto web completo (landing page, app, etc.) con todos los archivos necesarios. El código generado se guarda como deliverable.',
    parameters: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Nombre del proyecto',
        },
        description: {
          type: 'string',
          description: 'Descripción detallada de lo que debe incluir el proyecto',
        },
        framework: {
          type: 'string',
          description: 'Framework a usar (react, nextjs, html)',
          default: 'react',
        },
        seoKeywords: {
          type: 'string',
          description: 'Keywords SEO a incluir en meta tags y headings (opcional)',
        },
        designNotes: {
          type: 'string',
          description: 'Notas de diseño de Pixel a seguir (opcional)',
        },
      },
      required: ['projectName', 'description'],
    },
    execute: async (input, context) => {
      const projectName = input.projectName as string
      const description = input.description as string

      // The actual code generation is done by the LLM via the prompt
      // This tool creates the deliverable and kanban task
      const deliverableId = uuid()
      const taskId = uuid()

      const content = `## Proyecto: ${projectName}\n\n${description}\n\n(El código será generado en la respuesta del agente)`

      const deliverable = await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId: context.conversationId,
          title: projectName,
          type: 'code',
          content,
          agent: context.agentName,
          botType: context.agentId,
        },
      })

      const task = await prisma.kanbanTask.create({
        data: {
          id: taskId,
          conversationId: context.conversationId,
          title: `Desarrollo: ${projectName}`,
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
          type: deliverable.type as 'code',
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

      return `Proyecto "${projectName}" creado como deliverable. ID: ${deliverableId}. Genera el código completo en tu respuesta.`
    },
  },
  {
    name: 'code_generate_component',
    description: 'Genera un componente web individual (hero section, pricing table, form, etc.).',
    parameters: {
      type: 'object',
      properties: {
        componentName: {
          type: 'string',
          description: 'Nombre del componente',
        },
        description: {
          type: 'string',
          description: 'Descripción de lo que debe hacer el componente',
        },
        framework: {
          type: 'string',
          description: 'Framework (react, html)',
          default: 'react',
        },
      },
      required: ['componentName', 'description'],
    },
    execute: async (input, context) => {
      const componentName = input.componentName as string
      const deliverableId = uuid()

      const deliverable = await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId: context.conversationId,
          title: `Componente: ${componentName}`,
          type: 'code',
          content: `## Componente: ${componentName}\n\n(Código generado por ${context.agentName})`,
          agent: context.agentName,
          botType: context.agentId,
        },
      })

      broadcast(context.conversationId, {
        type: 'deliverable',
        deliverable: {
          id: deliverable.id,
          title: deliverable.title,
          type: 'code',
          content: deliverable.content,
          agent: deliverable.agent,
          botType: deliverable.botType,
        },
      })

      return `Componente "${componentName}" creado como deliverable. ID: ${deliverableId}. Genera el código en tu respuesta.`
    },
  },
]
