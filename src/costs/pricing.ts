import { buildModelIndex, matchModel } from './model-match.js'
import type { OpenRouterModel, PricedRow, UsageRow } from './types.js'

function toNumber(value: string | undefined) {
  if (!value) {
    return 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function priceRows(rows: UsageRow[], models: OpenRouterModel[]) {
  const index = buildModelIndex(models)

  return rows.map((row) => {
    const matched = matchModel(row.model, index)
    if (!matched) {
      return {
        ...row,
        matched_model_id: null,
        prompt_rate: 0,
        completion_rate: 0,
        cache_read_rate: 0,
        cache_write_rate: 0,
        cost_usd: null,
      } satisfies PricedRow
    }

    const pricing = matched.pricing ?? {}
    const promptRate = toNumber(pricing.prompt)
    const completionRate = toNumber(pricing.completion)
    const cacheReadRate = toNumber(pricing.input_cache_read)
    const cacheWriteRate = toNumber(
      pricing.input_cache_write ||
        pricing.input_cache_creation ||
        pricing.cache_write
    )

    const costUsd =
      row.input_tokens * promptRate +
      row.output_tokens * completionRate +
      row.cache_read_tokens * cacheReadRate +
      row.cache_write_tokens * cacheWriteRate

    return {
      ...row,
      matched_model_id: matched.id,
      prompt_rate: promptRate,
      completion_rate: completionRate,
      cache_read_rate: cacheReadRate,
      cache_write_rate: cacheWriteRate,
      cost_usd: costUsd,
    } satisfies PricedRow
  })
}
