import type { Context, Next } from "hono"
import { HTTPException } from "hono/http-exception"

export function basicAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // Send 401 with WWW-Authenticate header to prompt for basic auth
    c.header('WWW-Authenticate', 'Basic realm="Manager Area"')
    throw new HTTPException(401, {
      message: 'Authentication required',
    })
  }

  try {
    // Extract base64 encoded credentials
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')

    // Get credentials from environment variables with defaults
    const expectedUsername = process.env.MANAGER_USERNAME || 'admin'
    const expectedPassword = process.env.MANAGER_PASSWORD || 'hijilabs'

    if (username !== expectedUsername || password !== expectedPassword) {
      c.header('WWW-Authenticate', 'Basic realm="Manager Area"')
      throw new HTTPException(401, {
        message: 'Invalid credentials',
      })
    }

    return next()
  } catch (error) {
    c.header('WWW-Authenticate', 'Basic realm="Manager Area"')
    throw new HTTPException(401, {
      message: 'Invalid authentication format',
    })
  }
}
