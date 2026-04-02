#!/usr/bin/env node

import os from 'node:os'
import path from 'node:path'
import {
  fetchOpenRouterModels,
  priceRows,
  printReport,
  readUsage,
} from './costs.js'

const dbPath =
  process.argv[2] ??
  process.env.OPENCODE_DB_PATH ??
  path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db')

async function main() {
  const usageRows = readUsage(dbPath)
  if (usageRows.length === 0) {
    console.log(`No usage rows found in ${dbPath}`)
    return
  }
  const models = await fetchOpenRouterModels()
  const pricedRows = priceRows(usageRows, models)
  printReport(pricedRows, dbPath)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed: ${message}`)
  process.exit(1)
})
