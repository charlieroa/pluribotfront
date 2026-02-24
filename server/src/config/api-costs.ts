// Real API costs in USD per 1M tokens (from provider pricing pages)

export const apiCostsPerMillionTokens: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':                { input: 5.00,  output: 25.00  },
  'claude-sonnet-4-5-20250929':     { input: 3.00,  output: 15.00  },
  'claude-haiku-4-5-20251001':      { input: 1.00,  output: 5.00   },
  'gpt-4.5-preview':               { input: 75.00, output: 150.00 },
  'gpt-4o':                        { input: 2.50,  output: 10.00  },
  'gpt-4o-mini':                   { input: 0.15,  output: 0.60   },
  'gemini-2.5-pro':                { input: 1.25,  output: 10.00  },
  'gemini-2.5-flash':              { input: 0.30,  output: 2.50   },
}

// Real API costs in USD per tool call
export const toolApiCosts: Record<string, number> = {
  generate_image:      0.05,  // ~average Imagen 4 cost
  generate_video:      2.50,  // ~average Veo 3 cost
  search_stock_photo:  0,
  search_web:          0,
  run_code:            0,
  deploy_site:         0,
}

// Map model name prefix to provider
export function getProviderForModel(model: string): 'anthropic' | 'openai' | 'google' {
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  return 'openai' // fallback
}

export function calculateRealCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = apiCostsPerMillionTokens[model] || { input: 2.50, output: 10.00 }
  return (inputTokens / 1_000_000 * costs.input) + (outputTokens / 1_000_000 * costs.output)
}
