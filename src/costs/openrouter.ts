import type { OpenRouterModel } from './types.js'

export async function fetchOpenRouterModels() {
  const response = await fetch('https://openrouter.ai/api/v1/models')
  if (!response.ok) {
    throw new Error(`OpenRouter API failed with ${response.status}`)
  }
  const payload = (await response.json()) as { data?: OpenRouterModel[] }
  return payload.data ?? []
}
