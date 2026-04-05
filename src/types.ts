export type UsageRow = {
  day: string
  model: string
  provider: string
  input_tokens: number
  output_tokens: number
  reasoning_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  total_tokens: number
  steps: number
}

export type OpenRouterModel = {
  id: string
  name?: string
  pricing?: Record<string, string>
}

export type PricedRow = UsageRow & {
  matched_model_id: string | null
  prompt_rate: number
  completion_rate: number
  cache_read_rate: number
  cache_write_rate: number
  cost_usd: number | null
}
