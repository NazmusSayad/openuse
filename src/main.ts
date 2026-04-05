import os from 'node:os'
import path from 'node:path'
import { readUsage } from './db.js'
import { fetchOpenRouterModels } from './openrouter.js'
import { priceRows } from './pricing.js'
import { PrintMode, printReport } from './report.js'

export async function main(
  mode: PrintMode,
  opencodeDbPath: string | undefined
) {
  try {
    const dbPath =
      opencodeDbPath ??
      process.env.OPENCODE_DB_PATH ??
      path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db')

    const usageRows = await readUsage(dbPath)
    if (usageRows.length === 0) {
      console.log(`No usage rows found in ${dbPath}`)
      return
    }
    const models = await fetchOpenRouterModels()
    const pricedRows = priceRows(usageRows, models)

    printReport(mode, pricedRows, dbPath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed: ${message}`)
    process.exit(1)
  }
}
