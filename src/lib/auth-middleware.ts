import type { Context, Next } from "hono"
import { HTTPException } from "hono/http-exception"
import { getAccountByApiKey } from "./state"
import { extractApiKeyFromAuthHeader } from "./account-manager"

export async function authMiddleware(c: Context, next: Next) {
  // Skip auth for manager routes
  if (c.req.path.startsWith('/manager')) {
    return next()
  }

  // Skip auth for root endpoint
  if (c.req.path === '/') {
    return next()
  }

  const authHeader = c.req.header('Authorization')
  const apiKey = extractApiKeyFromAuthHeader(authHeader || '')

  if (!apiKey) {
    throw new HTTPException(401, {
      message: 'Missing or invalid API key. Please provide a valid API key in the Authorization header.',
    })
  }

  const account = getAccountByApiKey(apiKey)
  if (!account) {
    throw new HTTPException(401, {
      message: 'Invalid API key. Please check your API key and try again.',
    })
  }

  // Attach account to context for use in handlers
  c.set('account', account)
  c.set('apiKey', apiKey)

  return next()
}

export function getAccountFromContext(c: Context) {
  return c.get('account')
}

export function getApiKeyFromContext(c: Context) {
  return c.get('apiKey')
}
