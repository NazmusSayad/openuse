import type { OpenRouterModel } from './types.js'

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

export function buildModelIndex(models: OpenRouterModel[]) {
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

export function matchModel(
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
