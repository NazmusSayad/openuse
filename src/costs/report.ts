import chalk from 'chalk'
import { table } from 'table'

import type { PricedRow } from './types.js'

function humanizeTokens(value: number) {
  const abs = Math.abs(value)
  if (abs < 1000) {
    return String(value)
  }

  const units = ['K', 'M', 'B', 'T']
  let scaled = abs
  let unitIndex = -1

  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000
    unitIndex += 1
  }

  const precision = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
  const formatted = Number(scaled.toFixed(precision)).toString()
  return `${value < 0 ? '-' : ''}${formatted}${units[unitIndex]}`
}

function formatCost(value: number) {
  return Number(value.toFixed(4)).toString()
}

export function printReport(rows: PricedRow[], dbPath: string) {
  const detailRows = [
    [
      'day',
      'model',
      'input',
      'output',
      'cache_read',
      'cache_write',
      'total_tokens',
      'cost_usd',
    ],
    ...rows.map((row) => [
      row.day,
      `${row.model} (${row.matched_model_id ?? 'unmatched'})`,
      humanizeTokens(row.input_tokens),
      humanizeTokens(row.output_tokens),
      humanizeTokens(row.cache_read_tokens),
      humanizeTokens(row.cache_write_tokens),
      humanizeTokens(row.total_tokens),
      row.cost_usd === null ? 'unmatched' : formatCost(row.cost_usd),
    ]),
  ]

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

  const dailyRows = [
    ['day', 'total_tokens', 'estimated_cost_usd', 'unmatched_models'],
    ...[...totalsByDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, value]) => [
        day,
        humanizeTokens(value.totalTokens),
        formatCost(value.cost),
        value.unmatchedRows.toString(),
      ]),
  ]

  console.log(`${chalk.bold.cyan('Database:')} ${chalk.dim(dbPath)}`)
  console.log(`\n${chalk.bold.blue('Per day/model:')}`)
  console.log(table(detailRows))
  console.log(chalk.bold.blue('Daily totals:'))
  console.log(table(dailyRows))
}
