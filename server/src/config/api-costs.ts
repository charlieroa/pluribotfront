// Real API costs in USD per 1M tokens (from Anthropic pricing page)

export const apiCostsPerMillionTokens: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':                { input: 5.00,  output: 25.00  },
  'claude-sonnet-4-5-20250929':     { input: 3.00,  output: 15.00  },
  'claude-haiku-4-5-20251001':      { input: 1.00,  output: 5.00   },
}

// Approximate direct vendor costs in USD per tool call where measurable.
export const toolApiCosts: Record<string, number> = {
  generate_image:      0.08,  // Ideogram average generation
  edit_image:          0.08,  // Ideogram edit
  reframe_image:       0.08,  // Ideogram reframe
  upscale_image:       0.08,  // Ideogram upscale
  describe_image:      0.02,  // Ideogram describe
  generate_video:      0.30,  // LTX-2 fast average
  generate_3d_model:   0.60,  // Meshy image-to-3D estimate
  search_stock_photo:  0,
  search_web:          0,
  run_code:            0,
  deploy_site:         0,
}

export const toolProviderMap: Record<string, string> = {
  generate_image: 'ideogram',
  edit_image: 'ideogram',
  reframe_image: 'ideogram',
  upscale_image: 'ideogram',
  describe_image: 'ideogram',
  generate_video: 'ltx',
  generate_3d_model: 'meshy',
  search_stock_photo: 'unsplash',
}

export function getProviderForModel(_model: string): 'anthropic' {
  return 'anthropic'
}

export function calculateRealCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = apiCostsPerMillionTokens[model] || { input: 3.00, output: 15.00 }
  return (inputTokens / 1_000_000 * costs.input) + (outputTokens / 1_000_000 * costs.output)
}
