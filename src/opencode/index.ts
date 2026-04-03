import os from 'node:os'
import path from 'node:path'
import { readUsage } from './db.js'
import { fetchOpenRouterModels } from './openrouter.js'
import { priceRows } from './pricing.js'
import { printReport } from './report.js'

export function renderOpenCodeUsage() {
  const dbPath =
    process.argv[2] ??
    process.env.OPENCODE_DB_PATH ??
    path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db')

  async function main() {
    const usageRows = await readUsage(dbPath)
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
}
