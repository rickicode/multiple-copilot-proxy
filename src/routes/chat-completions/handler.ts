import type { Context } from "hono"

import consola from "consola"
import { streamSSE, type SSEMessage } from "hono/streaming"

import { awaitApproval } from "~/lib/approval"
import { isNullish } from "~/lib/is-nullish"
import { checkRateLimit } from "~/lib/rate-limit"
import { multiUserState } from "~/lib/state"
import { getTokenCount } from "~/lib/tokenizer"
import { getAccountFromContext, getAllApiKeysFromContext, getApiKeyFromContext } from "~/lib/auth-middleware"
import { updateUsageStats, saveAccountsToDb, getAvailableApiKey } from "~/lib/account-manager"
import { getAccountByApiKey } from "~/lib/state"
import {
  createChatCompletions,
  type ChatCompletionResponse,
  type ChatCompletionsPayload,
} from "~/services/copilot/create-chat-completions"
import type { ModelsResponse } from "~/services/copilot/get-models"

async function tryCreateCompletions(payload: ChatCompletionsPayload, apiKeys: string[], currentIndex = 0): Promise<{ response: Awaited<ReturnType<typeof createChatCompletions>>, usedApiKey: string }> {
  if (currentIndex >= apiKeys.length) {
    throw new Error('All API keys have been exhausted or are rate limited')
  }

  const apiKey = apiKeys[currentIndex]
  const account = getAccountByApiKey(apiKey)
  
  if (!account || !account.copilotToken) {
    // Try next API key
    return tryCreateCompletions(payload, apiKeys, currentIndex + 1)
  }

  try {
    consola.info(`[${account.username}] Attempting request with API key ${currentIndex + 1}/${apiKeys.length}`)
    const response = await createChatCompletions(payload, account)
    return { response, usedApiKey: apiKey }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Check if error is rate limit related
    if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('quota')) {
      consola.warn(`[${account.username}] Rate limited, trying next API key...`)
      return tryCreateCompletions(payload, apiKeys, currentIndex + 1)
    }
    
    // For other errors, rethrow
    throw error
  }
}

export async function handleCompletion(c: Context) {
  // Get account and API keys from context (set by auth middleware)
  let account = getAccountFromContext(c)
  const allApiKeys = getAllApiKeysFromContext(c)
  let apiKey = getApiKeyFromContext(c)
  
  if (!account) {
    return c.json({ error: 'No account found' }, 401)
  }

  if (!account.copilotToken) {
    return c.json({ error: 'Copilot token not available for this account' }, 400)
  }

  // Use global state for rate limiting (can be made per-account later)
  await checkRateLimit(multiUserState.globalState)

  let payload = await c.req.json<ChatCompletionsPayload>()

  const inputTokens = getTokenCount(payload.messages)
  consola.info(`[${account.username}] Current token count:`, inputTokens)
  
  if (allApiKeys.length > 1) {
    consola.info(`Load balancing enabled with ${allApiKeys.length} API keys`)
  }

  if (multiUserState.globalState.manualApprove) await awaitApproval()

  if (isNullish(payload.max_tokens)) {
    const selectedModel = account.models?.data.find(
      (model: ModelsResponse['data'][0]) => model.id === payload.model,
    )

    payload = {
      ...payload,
      max_tokens: selectedModel?.capabilities.limits.max_output_tokens,
    }
  }

  // Try to create completions with failover
  let response: Awaited<ReturnType<typeof createChatCompletions>>
  let usedApiKey: string
  
  try {
    const result = await tryCreateCompletions(payload, allApiKeys)
    response = result.response
    usedApiKey = result.usedApiKey
    
    // Update account and apiKey if we switched to a different one
    if (usedApiKey !== apiKey) {
      account = getAccountByApiKey(usedApiKey)!
      apiKey = usedApiKey
      consola.info(`[${account.username}] Successfully switched to backup API key`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    consola.error('All API keys failed:', errorMessage)
    
    if (errorMessage.includes('exhausted') || errorMessage.includes('rate limit')) {
      return c.json({ 
        error: 'All provided API keys are rate limited or exhausted. Please try again later.',
        details: 'Multiple API key failover failed'
      }, 429)
    }
    
    return c.json({ 
      error: 'Failed to create completion',
      details: errorMessage
    }, 500)
  }

  // Track usage after successful response
  try {
    let totalTokens: number
    
    if (isNonStreaming(response)) {
      // For non-streaming, calculate input + estimated output tokens
      const inputTokenCount = typeof inputTokens === 'number' ? inputTokens : inputTokens.input + inputTokens.output
      const estimatedOutput = payload.max_tokens || 1000
      totalTokens = inputTokenCount + Math.min(estimatedOutput, 1000)
      updateUsageStats(apiKey, totalTokens, payload.model)
      await saveAccountsToDb()
    } else {
      // For streaming, estimate tokens (input + estimated output)
      const inputTokenCount = typeof inputTokens === 'number' ? inputTokens : inputTokens.input + inputTokens.output
      const estimatedOutput = payload.max_tokens || 1000
      totalTokens = inputTokenCount + Math.min(estimatedOutput, 1000) // Cap estimation
      updateUsageStats(apiKey, totalTokens, payload.model)
      await saveAccountsToDb()
    }
    
    consola.info(`[${account.username}] Usage tracked: ${totalTokens} tokens for model ${payload.model}`)
  } catch (error) {
    consola.warn(`[${account.username}] Failed to track usage:`, error)
  }

  if (isNonStreaming(response)) {
    return c.json(response)
  }

  return streamSSE(c, async (stream) => {
    for await (const chunk of response) {
      await stream.writeSSE(chunk as SSEMessage)
    }
  })
}

const isNonStreaming = (
  response: Awaited<ReturnType<typeof createChatCompletions>>,
): response is ChatCompletionResponse => Object.hasOwn(response, "choices")
