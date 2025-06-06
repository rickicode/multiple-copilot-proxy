import type { Context, Next } from "hono"

interface BasicAuthConfig {
  username: string
  password: string
  realm?: string
}

export function basicAuth(config?: Partial<BasicAuthConfig>) {
  const username = config?.username || process.env.MANAGER_USERNAME || 'admin'
  const password = config?.password || process.env.MANAGER_PASSWORD || 'hijilabs' 
  const realm = config?.realm || 'Manager Area'
  
  return async (c: Context, next: Next) => {
    const authorization = c.req.header('Authorization')
    
    if (!authorization || !authorization.startsWith('Basic ')) {
      return c.text('Unauthorized', 401, {
        'WWW-Authenticate': `Basic realm="${realm}"`
      })
    }
    
    const credentials = authorization.slice(6) // Remove 'Basic '
    const decoded = atob(credentials)
    const [user, pass] = decoded.split(':')
    
    if (user !== username || pass !== password) {
      return c.text('Unauthorized', 401, {
        'WWW-Authenticate': `Basic realm="${realm}"`
      })
    }
    
    await next()
  }
}
