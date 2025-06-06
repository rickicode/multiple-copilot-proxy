import type { Context, Next } from "hono"
import { HTTPException } from "hono/http-exception"
import { getAccountByApiKey } from "./state"
import { extractApiKeyFromAuthHeader, parseMultipleApiKeys, getAvailableApiKey } from "./account-manager"

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
  const apiKeyString = extractApiKeyFromAuthHeader(authHeader || '')

  if (!apiKeyString) {
    throw new HTTPException(401, {
      message: 'Missing or invalid API key. Please provide a valid API key in the Authorization header.',
    })
  }

  // Parse multiple API keys if provided (comma-separated)
  const apiKeys = parseMultipleApiKeys(apiKeyString)
  
  if (apiKeys.length === 0) {
    throw new HTTPException(401, {
      message: 'Invalid API key format. Please provide valid API key(s) in the Authorization header.',
    })
  }

  // Get the first available (non-limited) API key
  const availableApiKey = getAvailableApiKey(apiKeys)
  
  if (!availableApiKey) {
    // If no API key is available, try the first one anyway and let it handle the error
    const firstApiKey = apiKeys[0]
    const account = getAccountByApiKey(firstApiKey)
    
    if (!account) {
      throw new HTTPException(401, {
        message: 'Invalid API key. Please check your API key and try again.',
      })
    }

    if (!account.copilotToken) {
      throw new HTTPException(401, {
        message: 'Account has no active Copilot token. Please check your account configuration.',
      })
    }

    // All accounts are limited, but attach the first one anyway
    c.set('account', account)
    c.set('apiKey', firstApiKey)
    c.set('allApiKeys', apiKeys)
    c.set('isLimited', true)
  } else {
    const account = getAccountByApiKey(availableApiKey)
    if (!account) {
      throw new HTTPException(401, {
        message: 'Invalid API key. Please check your API key and try again.',
      })
    }

    // Attach the available account to context for use in handlers
    c.set('account', account)
    c.set('apiKey', availableApiKey)
    c.set('allApiKeys', apiKeys)
    c.set('isLimited', false)
  }

  return next()
}

export function getAccountFromContext(c: Context) {
  return c.get('account')
}

export function getApiKeyFromContext(c: Context) {
  return c.get('apiKey')
}

export function getAllApiKeysFromContext(c: Context): string[] {
  return c.get('allApiKeys') || []
}

export function isLimitedFromContext(c: Context): boolean {
  return c.get('isLimited') || false
}
