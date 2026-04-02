import Database from 'better-sqlite3'

export type UsageRow = {
  day: string
  model: string
  input_tokens: number
  output_tokens: number
  reasoning_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  total_tokens: number
  steps: number
}

type OpenRouterModel = {
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

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function readUsage(file: string) {
  const db = new Database(file, { readonly: true })
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
  const rows = db.prepare(sql).all() as UsageRow[]
  db.close()
  return rows
}

export async function fetchOpenRouterModels() {
  const response = await fetch('https://openrouter.ai/api/v1/models')
  if (!response.ok) {
    throw new Error(`OpenRouter API failed with ${response.status}`)
  }
  const payload = (await response.json()) as { data?: OpenRouterModel[] }
  return payload.data ?? []
}

function buildModelIndex(models: OpenRouterModel[]) {
  const byId = new Map<string, OpenRouterModel>()
  const byNormalized = new Map<string, OpenRouterModel>()
  const candidates: {
    model: OpenRouterModel
    normalizedKeys: string[]
    tokenKeys: string[][]
  }[] = []

  for (const model of models) {
    byId.set(model.id, model)
    const keys = [
      model.id,
      model.name ?? '',
      model.id.split('/').at(-1) ?? '',
      (model.name ?? '').split(':').at(-1)?.trim() ?? '',
    ]
    const normalizedKeys: string[] = []
    const tokenKeys: string[][] = []

    for (const key of keys) {
      if (!key) {
        continue
      }
      const normalizedKey = normalize(key)
      normalizedKeys.push(normalizedKey)
      tokenKeys.push(tokenize(key))
      if (!byNormalized.has(normalizedKey)) {
        byNormalized.set(normalizedKey, model)
      }
    }

    candidates.push({ model, normalizedKeys, tokenKeys })
  }

  return { byId, byNormalized, candidates }
}

function matchModel(
  inputModel: string,
  index: ReturnType<typeof buildModelIndex>
) {
  if (index.byId.has(inputModel)) {
    return index.byId.get(inputModel) ?? null
  }

  const normalized = normalize(inputModel)
  if (index.byNormalized.has(normalized)) {
    return index.byNormalized.get(normalized) ?? null
  }

  let best: { model: OpenRouterModel; score: number } | null = null
  const inputTokens = new Set(tokenize(inputModel))

  for (const candidate of index.candidates) {
    let score = 0

    for (const key of candidate.normalizedKeys) {
      if (!key) {
        continue
      }
      if (key.includes(normalized) || normalized.includes(key)) {
        const ratio =
          Math.min(key.length, normalized.length) /
          Math.max(key.length, normalized.length)
        if (ratio > score) {
          score = ratio
        }
      }
    }

    for (const keyTokens of candidate.tokenKeys) {
      if (keyTokens.length === 0 || inputTokens.size === 0) {
        continue
      }
      let overlap = 0
      for (const token of keyTokens) {
        if (inputTokens.has(token)) {
          overlap += 1
        }
      }
      const tokenScore = overlap / Math.max(keyTokens.length, inputTokens.size)
      if (tokenScore > score) {
        score = tokenScore
      }
    }

    if (!best || score > best.score) {
      best = { model: candidate.model, score }
    }
  }

  return best && best.score >= 0.7 ? best.model : null
}

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
