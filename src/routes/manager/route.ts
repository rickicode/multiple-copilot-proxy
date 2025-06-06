import { Hono } from "hono"
import { serveStatic } from "hono/serve-static"
import fs from "node:fs/promises"
import path from "node:path"
import { 
  createAccount, 
  deleteAccount, 
  getAccountStats,
  validateApiKey 
} from "~/lib/account-manager"
import { getAllAccounts, getAccountByApiKey } from "~/lib/state"
import { getDeviceCode } from "~/services/github/get-device-code"
import { pollAccessToken } from "~/services/github/poll-access-token"
import { getGitHubUser } from "~/services/github/get-user"
import { setupCopilotToken } from "~/lib/token"
import { saveAccountsToDb } from "~/lib/account-manager"
import { basicAuthMiddleware } from "~/lib/basic-auth-middleware"

export const managerRoutes = new Hono()

// Apply basic auth middleware to all manager routes
managerRoutes.use('*', basicAuthMiddleware)

// Store for tracking last poll time per device code to implement rate limiting
const lastPollTimes = new Map<string, number>()

// Clean up old entries every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  const maxAge = 15 * 60 * 1000 // 15 minutes
  
  for (const [deviceCode, lastTime] of lastPollTimes.entries()) {
    if (now - lastTime > maxAge) {
      lastPollTimes.delete(deviceCode)
    }
  }
}, 15 * 60 * 1000)

// Serve static HTML file
managerRoutes.get('/', async (c) => {
  try {
    const htmlPath = path.join(process.cwd(), 'static', 'manager.html')
    const htmlContent = await fs.readFile(htmlPath, 'utf-8')
    return c.html(htmlContent)
  } catch (error) {
    console.error('Failed to load manager HTML:', error)
    return c.html('<h1>Manager interface not available</h1><p>Please ensure static/manager.html exists</p>')
  }
})

// Serve test page
managerRoutes.get('/test', async (c) => {
  try {
    const htmlPath = path.join(process.cwd(), 'static', 'test.html')
    const htmlContent = await fs.readFile(htmlPath, 'utf-8')
    return c.html(htmlContent)
  } catch (error) {
    console.error('Failed to load test HTML:', error)
    return c.html('<h1>API Tester not available</h1><p>Please ensure static/test.html exists</p>')
  }
})

// API endpoints
managerRoutes.get('/api/stats', async (c) => {
  const stats = getAccountStats()
  return c.json(stats)
})

managerRoutes.get('/api/accounts', async (c) => {
  const accounts = getAllAccounts()
  const accountList = accounts.map(([apiKey, account]) => ({
    apiKey,
    username: account.username,
    accountType: account.accountType,
    copilotToken: !!account.copilotToken,
    createdAt: account.createdAt,
    lastUsed: account.lastUsed
  }))
  return c.json(accountList)
})

managerRoutes.post('/api/auth/start', async (c) => {
  try {
    const { accountType = 'individual' } = await c.req.json()
    const deviceCodeResponse = await getDeviceCode()
    
    // Store device code data temporarily (in a real app, use Redis or similar)
    return c.json(deviceCodeResponse)
  } catch (error) {
    console.error('Failed to start auth:', error)
    return c.json({ error: 'Failed to start authentication' }, 500)
  }
})

managerRoutes.post('/api/auth/poll', async (c) => {
  console.log('📡 Auth poll request received')
  
  try {
    const body = await c.req.json()
    console.log('📡 Poll request body:', body)
    
    const { device_code, account_type = 'individual' } = body
    
    if (!device_code) {
      console.error('❌ No device code provided')
      return c.json({ error: 'device_code is required' }, 400)
    }
    
    // Rate limiting: enforce 3 second minimum interval between polls for same device code
    const now = Date.now()
    const lastPollTime = lastPollTimes.get(device_code) || 0
    const timeSinceLastPoll = now - lastPollTime
    const minInterval = 3000 // 3 seconds in milliseconds
    
    if (timeSinceLastPoll < minInterval) {
      const waitTime = minInterval - timeSinceLastPoll
      console.log(`🐌 Rate limiting: ${waitTime}ms remaining before next allowed poll`)
      return c.json({ 
        error: 'slow_down',
        message: `Please wait ${Math.ceil(waitTime / 1000)} seconds before polling again`
      }, 429)
    }
    
    // Update last poll time
    lastPollTimes.set(device_code, now)
    
    console.log('📡 Polling GitHub with device code:', device_code)
    
    const githubToken = await pollAccessToken({ 
      device_code,
      user_code: '',
      verification_uri: '',
      expires_in: 0,
      interval: 0
    })
    
    console.log('✅ GitHub token received, getting user info...')
    
    // Get user info
    const user = await getGitHubUser(githubToken)
    console.log('✅ User info received:', user.login)
    
    // Create account
    const apiKey = await createAccount(githubToken, account_type)
    console.log('✅ Account created with API key:', apiKey)
    
    // Update account with user info
    const account = getAccountByApiKey(apiKey)
    if (account) {
      account.username = user.login
      account.vsCodeVersion = "1.85.0" // Default version
      
      // Setup Copilot token for the new account
      try {
        await setupCopilotToken(account)
        await saveAccountsToDb()
        console.log(`✅ Copilot token setup completed for ${user.login}`)
      } catch (error) {
        console.warn(`⚠️ Failed to setup Copilot token for ${user.login}:`, error)
        // Continue without failing - user can try again later
      }
    }
    
    return c.json({ apiKey, username: user.login })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log('📡 Poll error:', errorMessage)
    
    if (errorMessage.includes('authorization_pending') || errorMessage.includes('still pending')) {
      console.log('⏳ Authorization pending...')
      return c.json({ error: 'authorization_pending' }, 400)
    }
    if (errorMessage.includes('slow_down') || errorMessage.includes('Too many requests')) {
      console.log('🐌 Slow down requested - rate limited')
      return c.json({ error: 'slow_down' }, 400)
    }
    if (errorMessage.includes('expired_token') || errorMessage.includes('expired')) {
      console.log('⏰ Token expired')
      return c.json({ error: 'expired_token' }, 400)
    }
    if (errorMessage.includes('access_denied')) {
      console.log('❌ Access denied by user')
      return c.json({ error: 'access_denied' }, 400)
    }
    
    console.error('❌ Failed to poll token:', error)
    return c.json({ error: 'Failed to authenticate' }, 500)
  }
})

managerRoutes.get('/api/models/:apiKey', async (c) => {
  try {
    const apiKey = c.req.param('apiKey')
    
    if (!validateApiKey(apiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400)
    }
    
    const account = getAccountByApiKey(apiKey)
    if (!account) {
      return c.json({ error: 'Account not found' }, 404)
    }
    
    if (!account.copilotToken) {
      return c.json({ error: 'Account has no active Copilot token' }, 400)
    }
    
    // Import getModels here to avoid circular dependency
    const { getModels } = await import("~/services/copilot/get-models")
    const models = await getModels(account)
    
    return c.json(models)
  } catch (error) {
    console.error('Failed to get models for account:', error)
    return c.json({ error: 'Failed to get models' }, 500)
  }
})

managerRoutes.delete('/api/accounts/:apiKey', async (c) => {
  try {
    const apiKey = c.req.param('apiKey')
    
    if (!validateApiKey(apiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400)
    }
    
    const success = await deleteAccount(apiKey)
    
    if (!success) {
      return c.json({ error: 'Account not found' }, 404)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return c.json({ error: 'Failed to delete account' }, 500)
  }
})
