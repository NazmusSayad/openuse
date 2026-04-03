import sqlite3 from 'sqlite3'
import type { UsageRow } from './types.js'

export function readUsage(file: string) {
  const sql = `
    SELECT
      date(datetime(json_extract(m.data, '$.time.created') / 1000, 'unixepoch', 'localtime')) AS day,
      COALESCE(json_extract(m.data, '$.modelID'), 'unknown') AS model,
      SUM(COALESCE(json_extract(p.data, '$.tokens.input'), 0)) AS input_tokens,
      SUM(COALESCE(json_extract(p.data, '$.tokens.output'), 0)) AS output_tokens,
      SUM(COALESCE(json_extract(p.data, '$.tokens.reasoning'), 0)) AS reasoning_tokens,
      SUM(COALESCE(json_extract(p.data, '$.tokens.cache.read'), 0)) AS cache_read_tokens,
      SUM(COALESCE(json_extract(p.data, '$.tokens.cache.write'), 0)) AS cache_write_tokens,
      SUM(COALESCE(json_extract(p.data, '$.tokens.total'), 0)) AS total_tokens,
      COUNT(*) AS steps
    FROM part p
    JOIN message m ON m.id = p.message_id
    WHERE json_extract(p.data, '$.type') = 'step-finish'
      AND json_extract(m.data, '$.time.created') IS NOT NULL
    GROUP BY day, model
    ORDER BY day DESC, total_tokens DESC
  `
  return new Promise<UsageRow[]>((resolve, reject) => {
    const db = new sqlite3.Database(
      file,
      sqlite3.OPEN_READONLY,
      (openError) => {
        if (openError) {
          reject(openError)
          return
        }

        db.all(sql, (queryError, rows) => {
          db.close((closeError) => {
            if (queryError) {
              reject(queryError)
              return
            }

            if (closeError) {
              reject(closeError)
              return
            }

            resolve((rows ?? []) as UsageRow[])
          })
        })
      }
    )
  })
}
