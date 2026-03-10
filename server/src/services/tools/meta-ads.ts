import type { ToolDefinition, ToolContext } from './types.js'
import { prisma } from '../../db/client.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function getMetaCredentials(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaAdAccountId: true },
  })

  if (!user?.metaAccessToken) {
    throw new Error('Meta Ads no está conectado. El usuario debe conectar su cuenta en Settings.')
  }
  if (!user.metaAdAccountId) {
    throw new Error('No hay cuenta de anuncios seleccionada. El usuario debe seleccionar una en Settings.')
  }

  return { token: user.metaAccessToken, adAccountId: user.metaAdAccountId }
}

async function metaFetch(url: string, options?: RequestInit) {
  const resp = await fetch(url, options)
  const data = await resp.json() as Record<string, unknown>

  if (!resp.ok) {
    const error = (data.error as Record<string, unknown>)?.message || resp.statusText
    throw new Error(`Meta API error: ${error}`)
  }

  return data
}

export const metaAdsTools: ToolDefinition[] = [
  {
    name: 'meta_list_campaigns',
    description: 'Lista las campañas existentes en la cuenta de Meta Ads del usuario con status y gasto.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de campañas a listar (default: 25)',
        },
      },
      required: [],
    },
    execute: async (input, context) => {
      const { token, adAccountId } = await getMetaCredentials(context.userId)
      const limit = (input.limit as number) || 25

      const data = await metaFetch(
        `${GRAPH_API}/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.date_preset(last_7d){spend,impressions,clicks,ctr,cpc}&limit=${limit}&access_token=${token}`
      ) as { data: unknown[] }

      if (!data.data?.length) {
        return 'No se encontraron campañas en esta cuenta de anuncios.'
      }

      return JSON.stringify(data.data, null, 2)
    },
  },
  {
    name: 'meta_create_campaign',
    description: 'Crea una nueva campaña en Meta Ads. SIEMPRE se crea en estado PAUSED para revisión del usuario.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la campaña',
        },
        objective: {
          type: 'string',
          description: 'Objetivo de la campaña: OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_AWARENESS',
        },
        dailyBudget: {
          type: 'number',
          description: 'Presupuesto diario en centavos de la moneda de la cuenta (ej: 1000 = $10.00)',
        },
        specialAdCategories: {
          type: 'string',
          description: 'Categorías especiales separadas por coma si aplica (CREDIT, EMPLOYMENT, HOUSING, SOCIAL_ISSUES_ELECTIONS_POLITICS). Dejar vacío si no aplica.',
        },
      },
      required: ['name', 'objective', 'dailyBudget'],
    },
    execute: async (input, context) => {
      const { token, adAccountId } = await getMetaCredentials(context.userId)

      const params = new URLSearchParams({
        name: input.name as string,
        objective: input.objective as string,
        status: 'PAUSED',
        daily_budget: String(input.dailyBudget),
        access_token: token,
      })

      const categories = input.specialAdCategories as string
      if (categories) {
        params.set('special_ad_categories', JSON.stringify(categories.split(',').map(c => c.trim())))
      } else {
        params.set('special_ad_categories', '[]')
      }

      const data = await metaFetch(`${GRAPH_API}/${adAccountId}/campaigns`, {
        method: 'POST',
        body: params,
      }) as { id: string }

      return `Campaña creada exitosamente en estado PAUSED.\nID: ${data.id}\nNombre: ${input.name}\nObjetivo: ${input.objective}\nPresupuesto diario: ${Number(input.dailyBudget) / 100} (moneda de la cuenta)\n\nIMPORTANTE: La campaña está pausada. El usuario debe activarla manualmente cuando esté listo.`
    },
  },
  {
    name: 'meta_create_adset',
    description: 'Crea un ad set (conjunto de anuncios) dentro de una campaña existente.',
    parameters: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'ID de la campaña padre',
        },
        name: {
          type: 'string',
          description: 'Nombre del ad set',
        },
        dailyBudget: {
          type: 'number',
          description: 'Presupuesto diario en centavos',
        },
        billingEvent: {
          type: 'string',
          description: 'Evento de facturación: IMPRESSIONS, LINK_CLICKS, POST_ENGAGEMENT (default: IMPRESSIONS)',
        },
        optimizationGoal: {
          type: 'string',
          description: 'Objetivo de optimización: LINK_CLICKS, IMPRESSIONS, REACH, LANDING_PAGE_VIEWS, LEAD_GENERATION, OFFSITE_CONVERSIONS',
        },
        ageMin: {
          type: 'number',
          description: 'Edad mínima del targeting (default: 18)',
        },
        ageMax: {
          type: 'number',
          description: 'Edad máxima del targeting (default: 65)',
        },
        genders: {
          type: 'string',
          description: 'Género: "all", "male", "female" (default: all)',
        },
        countries: {
          type: 'string',
          description: 'Códigos de país separados por coma (ej: "MX,CO,AR"). Default: MX',
        },
        interests: {
          type: 'string',
          description: 'IDs de intereses separados por coma para targeting detallado',
        },
      },
      required: ['campaignId', 'name', 'dailyBudget', 'optimizationGoal'],
    },
    execute: async (input, context) => {
      const { token, adAccountId } = await getMetaCredentials(context.userId)

      const genderMap: Record<string, number[]> = { all: [0], male: [1], female: [2] }
      const genderValue = genderMap[(input.genders as string) || 'all'] || [0]
      const countries = ((input.countries as string) || 'MX').split(',').map(c => c.trim())

      const targeting: Record<string, unknown> = {
        age_min: (input.ageMin as number) || 18,
        age_max: (input.ageMax as number) || 65,
        genders: genderValue,
        geo_locations: { countries },
      }

      if (input.interests) {
        const interestIds = (input.interests as string).split(',').map(id => ({ id: id.trim() }))
        targeting.flexible_spec = [{ interests: interestIds }]
      }

      const params = new URLSearchParams({
        campaign_id: input.campaignId as string,
        name: input.name as string,
        status: 'PAUSED',
        daily_budget: String(input.dailyBudget),
        billing_event: (input.billingEvent as string) || 'IMPRESSIONS',
        optimization_goal: input.optimizationGoal as string,
        targeting: JSON.stringify(targeting),
        access_token: token,
      })

      const data = await metaFetch(`${GRAPH_API}/${adAccountId}/adsets`, {
        method: 'POST',
        body: params,
      }) as { id: string }

      return `Ad set creado exitosamente.\nID: ${data.id}\nNombre: ${input.name}\nCampaña: ${input.campaignId}\nTargeting: ${countries.join(', ')}, ${(input.ageMin as number) || 18}-${(input.ageMax as number) || 65} años`
    },
  },
  {
    name: 'meta_create_ad',
    description: 'Crea un anuncio dentro de un ad set existente.',
    parameters: {
      type: 'object',
      properties: {
        adsetId: {
          type: 'string',
          description: 'ID del ad set padre',
        },
        name: {
          type: 'string',
          description: 'Nombre del anuncio',
        },
        headline: {
          type: 'string',
          description: 'Título principal del anuncio',
        },
        body: {
          type: 'string',
          description: 'Texto del cuerpo del anuncio',
        },
        linkUrl: {
          type: 'string',
          description: 'URL de destino del anuncio',
        },
        imageUrl: {
          type: 'string',
          description: 'URL de la imagen del anuncio (debe ser una URL pública accesible)',
        },
        callToAction: {
          type: 'string',
          description: 'Tipo de CTA: LEARN_MORE, SHOP_NOW, SIGN_UP, CONTACT_US, GET_OFFER, BOOK_TRAVEL, DOWNLOAD, SUBSCRIBE (default: LEARN_MORE)',
        },
        pageId: {
          type: 'string',
          description: 'ID de la página de Facebook para el anuncio',
        },
      },
      required: ['adsetId', 'name', 'headline', 'body', 'linkUrl', 'pageId'],
    },
    execute: async (input, context) => {
      const { token, adAccountId } = await getMetaCredentials(context.userId)

      // First create the ad creative
      const creativeData: Record<string, unknown> = {
        name: `Creative - ${input.name}`,
        object_story_spec: {
          page_id: input.pageId,
          link_data: {
            link: input.linkUrl,
            message: input.body,
            name: input.headline,
            call_to_action: {
              type: (input.callToAction as string) || 'LEARN_MORE',
              value: { link: input.linkUrl },
            },
            ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
          },
        },
      }

      const creativeParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(creativeData).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
        ),
        access_token: token,
      })

      const creative = await metaFetch(`${GRAPH_API}/${adAccountId}/adcreatives`, {
        method: 'POST',
        body: creativeParams,
      }) as { id: string }

      // Then create the ad
      const adParams = new URLSearchParams({
        name: input.name as string,
        adset_id: input.adsetId as string,
        creative: JSON.stringify({ creative_id: creative.id }),
        status: 'PAUSED',
        access_token: token,
      })

      const ad = await metaFetch(`${GRAPH_API}/${adAccountId}/ads`, {
        method: 'POST',
        body: adParams,
      }) as { id: string }

      return `Anuncio creado exitosamente.\nAd ID: ${ad.id}\nCreative ID: ${creative.id}\nNombre: ${input.name}\nHeadline: ${input.headline}\nEstado: PAUSED`
    },
  },
  {
    name: 'meta_get_insights',
    description: 'Obtiene métricas de rendimiento de campañas, ad sets o anuncios.',
    parameters: {
      type: 'object',
      properties: {
        objectId: {
          type: 'string',
          description: 'ID del objeto (campaña, ad set, o ad) del que obtener métricas. Usar el adAccountId para métricas generales de la cuenta.',
        },
        datePreset: {
          type: 'string',
          description: 'Periodo de tiempo: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month (default: last_7d)',
        },
        level: {
          type: 'string',
          description: 'Nivel de desglose: account, campaign, adset, ad (default: campaign)',
        },
      },
      required: ['objectId'],
    },
    execute: async (input, context) => {
      const { token } = await getMetaCredentials(context.userId)

      const objectId = input.objectId as string
      const datePreset = (input.datePreset as string) || 'last_7d'
      const level = (input.level as string) || ''

      const fields = 'campaign_name,adset_name,ad_name,impressions,clicks,ctr,cpc,cpm,spend,reach,frequency,actions,cost_per_action_type,conversions,conversion_values'
      let url = `${GRAPH_API}/${objectId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`

      if (level) {
        url += `&level=${level}`
      }

      const data = await metaFetch(url) as { data: unknown[] }

      if (!data.data?.length) {
        return `No hay datos de rendimiento para el periodo "${datePreset}". Es posible que la campaña no haya tenido impresiones en este periodo.`
      }

      return JSON.stringify(data.data, null, 2)
    },
  },
]
