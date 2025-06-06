import { Hono } from "hono"

import { forwardError } from "~/lib/forward-error"
import { getAccountFromContext } from "~/lib/auth-middleware"
import {
  createEmbeddings,
  type EmbeddingRequest,
} from "~/services/copilot/create-embeddings"

export const embeddingRoutes = new Hono()

embeddingRoutes.post("/", async (c) => {
  try {
    // Get account from context (set by auth middleware)
    const account = getAccountFromContext(c)
    if (!account) {
      return c.json({ error: 'No account found' }, 401)
    }

    if (!account.copilotToken) {
      return c.json({ error: 'Copilot token not available for this account' }, 400)
    }

    const payload = await c.req.json<EmbeddingRequest>()
    const response = await createEmbeddings(payload, account)

    return c.json(response)
  } catch (error) {
    return await forwardError(c, error)
  }
})
