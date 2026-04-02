import type { PricedRow } from './types.js'

function formatMoney(value: number | null) {
  if (value === null) {
    return null
  }
  return Number(value.toFixed(6))
}

export function printReport(rows: PricedRow[], dbPath: string) {
  const detail = rows.map((row) => ({
    day: row.day,
    model: row.model,
    matched: row.matched_model_id ?? 'unmatched',
    input: row.input_tokens,
    output: row.output_tokens,
    cache_read: row.cache_read_tokens,
    cache_write: row.cache_write_tokens,
    total_tokens: row.total_tokens,
    cost_usd: formatMoney(row.cost_usd),
  }))

  const totalsByDay = new Map<
    string,
    { cost: number; totalTokens: number; unmatchedRows: number }
  >()
  for (const row of rows) {
    const current = totalsByDay.get(row.day) ?? {
      cost: 0,
      totalTokens: 0,
      unmatchedRows: 0,
    }
    current.totalTokens += row.total_tokens
    if (row.cost_usd === null) {
      current.unmatchedRows += 1
    } else {
      current.cost += row.cost_usd
    }
    totalsByDay.set(row.day, current)
  }

  const daily = [...totalsByDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, value]) => ({
      day,
      total_tokens: value.totalTokens,
      estimated_cost_usd: Number(value.cost.toFixed(6)),
      unmatched_models: value.unmatchedRows,
    }))

  console.log(`Database: ${dbPath}`)
  console.log('\nPer day/model:')
  console.table(detail)
  console.log('Daily totals:')
  console.table(daily)
}
