import type { Context } from "hono"

import consola from "consola"
import { streamSSE, type SSEMessage } from "hono/streaming"

import { awaitApproval } from "~/lib/approval"
import { isNullish } from "~/lib/is-nullish"
import { checkRateLimit } from "~/lib/rate-limit"
import { multiUserState } from "~/lib/state"
import { getTokenCount } from "~/lib/tokenizer"
import { getAccountFromContext } from "~/lib/auth-middleware"
import {
  createChatCompletions,
  type ChatCompletionResponse,
  type ChatCompletionsPayload,
} from "~/services/copilot/create-chat-completions"
import type { ModelsResponse } from "~/services/copilot/get-models"

export async function handleCompletion(c: Context) {
  // Get account from context (set by auth middleware)
  const account = getAccountFromContext(c)
  if (!account) {
    return c.json({ error: 'No account found' }, 401)
  }

  if (!account.copilotToken) {
    return c.json({ error: 'Copilot token not available for this account' }, 400)
  }

  // Use global state for rate limiting (can be made per-account later)
  await checkRateLimit(multiUserState.globalState)

  let payload = await c.req.json<ChatCompletionsPayload>()

  consola.info(`[${account.username}] Current token count:`, getTokenCount(payload.messages))

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

  const response = await createChatCompletions(payload, account)

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
