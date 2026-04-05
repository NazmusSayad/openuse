import chalk from 'chalk'
import { table, TableUserConfig } from 'table'
import type { PricedRow } from './types.js'

export type PrintMode = 'all' | 'total' | 'model' | 'provider'

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

function formatCostForPrint(value: number) {
  if (value === 0) return '0'
  return chalk.bold(Number(value.toFixed(4)))
}

const singleLineTableConfig: TableUserConfig = {
  border: {
    topBody: chalk.dim('─'),
    topJoin: chalk.dim('┬'),
    topLeft: chalk.dim('┌'),
    topRight: chalk.dim('┐'),
    bottomBody: chalk.dim('─'),
    bottomJoin: chalk.dim('┴'),
    bottomLeft: chalk.dim('└'),
    bottomRight: chalk.dim('┘'),
    bodyLeft: chalk.dim('│'),
    bodyRight: chalk.dim('│'),
    bodyJoin: chalk.dim('│'),
    joinBody: chalk.dim('─'),
    joinLeft: chalk.dim('├'),
    joinRight: chalk.dim('┤'),
    joinJoin: chalk.dim('┼'),
  },
}

export function printReport(
  mode: PrintMode,
  rows: PricedRow[],
  dbPath: string
) {
  const detailRows = [
    [
      'Date',
      'Model',
      'Input ⭡',
      'Output ⭣',
      'Cache R/W',
      'Total Tokens',
      'Cost USD $',
    ].map((header) => chalk.bold.cyan(header)),

    ...rows.map((row) => [
      row.day,

      row.model,

      humanizeTokens(row.input_tokens),

      humanizeTokens(row.output_tokens),

      [
        humanizeTokens(row.cache_read_tokens),
        humanizeTokens(row.cache_write_tokens),
      ].join(chalk.dim('/')),

      humanizeTokens(row.total_tokens),

      row.cost_usd === null
        ? chalk.dim('N/A')
        : formatCostForPrint(row.cost_usd),
    ]),
  ]

  const totalsByDayProvider = new Map<
    string,
    {
      day: string
      provider: string
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
      totalTokens: number
      cost: number
    }
  >()

  for (const row of rows) {
    const provider = row.provider || 'unknown'
    const key = `${row.day}::${provider}`
    const current = totalsByDayProvider.get(key) ?? {
      day: row.day,
      provider,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      cost: 0,
    }

    current.inputTokens += row.input_tokens
    current.outputTokens += row.output_tokens
    current.cacheReadTokens += row.cache_read_tokens
    current.cacheWriteTokens += row.cache_write_tokens
    current.totalTokens += row.total_tokens
    if (row.cost_usd !== null) {
      current.cost += row.cost_usd
    }

    totalsByDayProvider.set(key, current)
  }

  const providerRows = [
    [
      'Date',
      'Provider',
      'Input ⭡',
      'Output ⭣',
      'Cache R/W',
      'Total Tokens',
      'Cost USD $',
    ].map((header) => chalk.bold.cyan(header)),

    ...[...totalsByDayProvider.values()]
      .sort((a, b) => {
        if (a.day !== b.day) {
          return b.day.localeCompare(a.day)
        }
        return b.totalTokens - a.totalTokens
      })
      .map((value) => [
        value.day,
        value.provider,
        humanizeTokens(value.inputTokens),
        humanizeTokens(value.outputTokens),
        [
          humanizeTokens(value.cacheReadTokens),
          humanizeTokens(value.cacheWriteTokens),
        ].join(chalk.dim('/')),
        humanizeTokens(value.totalTokens),
        chalk.bold(formatCostForPrint(value.cost)),
      ]),
  ]

  const totalsByDay = new Map<
    string,
    {
      models: number
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
      totalTokens: number
      cost: number
    }
  >()
  for (const row of rows) {
    const current = totalsByDay.get(row.day) ?? {
      models: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      cost: 0,
    }
    current.models += 1
    current.inputTokens += row.input_tokens
    current.outputTokens += row.output_tokens
    current.cacheReadTokens += row.cache_read_tokens
    current.cacheWriteTokens += row.cache_write_tokens
    current.totalTokens += row.total_tokens
    if (row.cost_usd !== null) {
      current.cost += row.cost_usd
    }
    totalsByDay.set(row.day, current)
  }

  const dailyRows = [
    [
      'Date',
      'Models',
      'Input ⭡',
      'Output ⭣',
      'Cache R/W',
      'Total Tokens',
      'Cost USD $',
    ].map((header) => chalk.bold.cyan(header)),

    ...[...totalsByDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, value]) => [
        day,
        String(value.models),
        humanizeTokens(value.inputTokens),
        humanizeTokens(value.outputTokens),
        [
          humanizeTokens(value.cacheReadTokens),
          humanizeTokens(value.cacheWriteTokens),
        ].join(chalk.dim('/')),
        humanizeTokens(value.totalTokens),
        chalk.bold(formatCostForPrint(value.cost)),
      ]),
  ]

  console.log(`${chalk.bold.cyan('Database:')} ${chalk.dim(dbPath)}`)

  console.log(`\n${chalk.bold.blue('Daily Usage/Model:')}`)
  console.log(
    table(detailRows, {
      ...singleLineTableConfig,
      columns: {
        0: { alignment: 'center' },
        2: { alignment: 'center' },
        3: { alignment: 'center' },
        4: { alignment: 'center' },
        5: { alignment: 'center' },
        6: { alignment: 'center' },
      },
    })
  )

  console.log(chalk.bold.blue('Daily Usage/Provider:'))
  console.log(
    table(providerRows, {
      ...singleLineTableConfig,
      columns: {
        0: { alignment: 'center' },
        2: { alignment: 'center' },
        3: { alignment: 'center' },
        4: { alignment: 'center' },
        5: { alignment: 'center' },
        6: { alignment: 'center' },
      },
    })
  )

  console.log(chalk.bold.blue('Daily Total Usage:'))
  console.log(
    table(dailyRows, {
      ...singleLineTableConfig,
      columns: {
        0: { alignment: 'center' },
        1: { alignment: 'center' },
        2: { alignment: 'center' },
        3: { alignment: 'center' },
        4: { alignment: 'center' },
        5: { alignment: 'center' },
        6: { alignment: 'center' },
      },
    })
  )
}
