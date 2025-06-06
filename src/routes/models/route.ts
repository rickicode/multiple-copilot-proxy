import { Hono } from "hono"

import { forwardError } from "~/lib/forward-error"
import { getModels } from "~/services/copilot/get-models"
import { getAccountByApiKey } from "~/lib/state"

export const modelRoutes = new Hono()

modelRoutes.get("/", async (c) => {
  try {
    // Get API key from Authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401)
    }
    
    const apiKey = authHeader.substring(7) // Remove "Bearer " prefix
    const userAccount = getAccountByApiKey(apiKey)
    
    if (!userAccount) {
      return c.json({ error: 'Invalid API key' }, 401)
    }
    
    // Update last used timestamp
    userAccount.lastUsed = new Date().toISOString()
    
    const models = await getModels(userAccount)
    return c.json(models)
  } catch (error) {
    return await forwardError(c, error)
  }
})
