import type { ToolDefinition } from './types.js'

export const deployTools: ToolDefinition[] = [
  {
    name: 'deploy_vercel',
    description: 'Despliega un proyecto a Vercel y retorna la URL pública. Requiere token de Vercel configurado.',
    parameters: {
      type: 'object',
      properties: {
        deliverableId: {
          type: 'string',
          description: 'ID del deliverable de código a desplegar',
        },
        projectName: {
          type: 'string',
          description: 'Nombre del proyecto en Vercel',
        },
      },
      required: ['deliverableId', 'projectName'],
    },
    execute: async (input) => {
      const projectName = input.projectName as string
      // Placeholder - in production would call Vercel API
      return JSON.stringify({
        status: 'pending',
        message: `Deploy de "${projectName}" pendiente. Configura VERCEL_TOKEN en las variables de entorno del servidor para habilitar deploys automáticos.`,
        url: null,
      })
    },
  },
]
