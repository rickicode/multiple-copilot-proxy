import consola from "consola"
import { 
  multiUserState, 
  type UserAccount,
  type UsageStats, 
  generateApiKey, 
  setAccount, 
  getAccountByApiKey,
  removeAccount,
  getAllAccounts 
} from "./state"
import { loadAccountsFromDisk, saveAccountsToDisk } from "./paths"

export async function initializeAccountManager(): Promise<void> {
  try {
    const savedAccounts = await loadAccountsFromDisk()
    
    // Load accounts from disk into memory
    for (const [apiKey, accountData] of Object.entries(savedAccounts)) {
      multiUserState.accounts.set(apiKey, accountData as UserAccount)
    }
    
    consola.info(`Loaded ${multiUserState.accounts.size} accounts from disk`)
  } catch (error) {
    consola.error("Failed to initialize account manager:", error)
  }
}

export async function saveAccountsToDb(): Promise<void> {
  try {
    const accountsObject: Record<string, UserAccount> = {}
    
    for (const [apiKey, account] of multiUserState.accounts.entries()) {
      accountsObject[apiKey] = account
    }
    
    await saveAccountsToDisk(accountsObject)
  } catch (error) {
    consola.error("Failed to save accounts to disk:", error)
    throw error
  }
}

export async function createAccount(githubToken: string, accountType: string = "individual"): Promise<string> {
  const apiKey = generateApiKey()
  const account: UserAccount = {
    githubToken,
    accountType,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  }
  
  setAccount(apiKey, account)
  await saveAccountsToDb()
  
  consola.success(`Created new account with API key: ${apiKey}`)
  return apiKey
}

export async function updateAccount(apiKey: string, updates: Partial<UserAccount>): Promise<boolean> {
  const account = getAccountByApiKey(apiKey)
  if (!account) {
    return false
  }
  
  const updatedAccount = { ...account, ...updates }
  setAccount(apiKey, updatedAccount)
  await saveAccountsToDb()
  
  return true
}

export async function deleteAccount(apiKey: string): Promise<boolean> {
  const success = removeAccount(apiKey)
  if (success) {
    await saveAccountsToDb()
    consola.info(`Deleted account with API key: ${apiKey}`)
  }
  return success
}

export function getAccountStats(): { total: number, withCopilotToken: number } {
  const accounts = getAllAccounts()
  return {
    total: accounts.length,
    withCopilotToken: accounts.filter(([_, account]) => account.copilotToken).length
  }
}

export function validateApiKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-') && apiKey.length >= 10
}

export function extractApiKeyFromAuthHeader(authHeader: string): string | null {
  if (!authHeader) return null
  
  // Support both "Bearer sk-xxx" and "sk-xxx" formats
  const match = authHeader.match(/^(?:Bearer )?(.+)$/)
  if (!match) return null
  
  const apiKey = match[1]
  return validateApiKey(apiKey) ? apiKey : null
}

export function parseMultipleApiKeys(apiKeyString: string): string[] {
  if (!apiKeyString) return []
  
  // If no comma, it's a single key
  if (!apiKeyString.includes(',')) {
    return validateApiKey(apiKeyString.trim()) ? [apiKeyString.trim()] : []
  }
  
  // Split by comma and clean up each key
  const keys = apiKeyString.split(',')
    .map(key => key.trim())
    .filter(key => validateApiKey(key))
  
  return keys
}

export function getAvailableApiKey(apiKeys: string[]): string | null {
  for (const apiKey of apiKeys) {
    const account = getAccountByApiKey(apiKey)
    if (account && account.copilotToken && !isAccountLimited(apiKey)) {
      return apiKey
    }
  }
  return null
}

export function isAccountLimited(apiKey: string): boolean {
  const usage = getUsageStats(apiKey)
  if (!usage) return false
  
  const account = getAccountByApiKey(apiKey)
  if (!account) return true
  
  // Define limits based on account type
  const limits = {
    individual: {
      dailyRequests: 2000,
      dailyTokens: 100000
    },
    business: {
      dailyRequests: 5000,
      dailyTokens: 500000
    }
  }
  
  const accountLimits = limits[account.accountType as keyof typeof limits] || limits.individual
  
  // Check if account is approaching limits (90% threshold)
  const requestThreshold = accountLimits.dailyRequests * 0.9
  const tokenThreshold = accountLimits.dailyTokens * 0.9
  
  return usage.dailyRequests >= requestThreshold || usage.dailyTokens >= tokenThreshold
}

export function findAccountByUsername(username: string): [string, UserAccount] | null {
  const accounts = getAllAccounts()
  const found = accounts.find(([_, account]) => account.username === username)
  return found || null
}

export function isGitHubAccountExists(username: string): boolean {
  return findAccountByUsername(username) !== null
}

export function initializeUsageStats(): UsageStats {
  return {
    totalRequests: 0,
    totalTokens: 0,
    dailyRequests: 0,
    dailyTokens: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    requestHistory: []
  }
}

export function updateUsageStats(apiKey: string, tokens: number, model: string): void {
  const account = getAccountByApiKey(apiKey)
  if (!account) return

  if (!account.usage) {
    account.usage = initializeUsageStats()
  }

  const today = new Date().toISOString().split('T')[0]
  
  // Reset daily stats if it's a new day
  if (account.usage.lastResetDate !== today) {
    account.usage.dailyRequests = 0
    account.usage.dailyTokens = 0
    account.usage.lastResetDate = today
  }

  // Update stats
  account.usage.totalRequests++
  account.usage.totalTokens += tokens
  account.usage.dailyRequests++
  account.usage.dailyTokens += tokens

  // Add to history (keep last 100 requests)
  account.usage.requestHistory.push({
    timestamp: new Date().toISOString(),
    tokens,
    model
  })

  if (account.usage.requestHistory.length > 100) {
    account.usage.requestHistory = account.usage.requestHistory.slice(-100)
  }

  setAccount(apiKey, account)
}

export function getUsageStats(apiKey: string): UsageStats | null {
  const account = getAccountByApiKey(apiKey)
  if (!account || !account.usage) return null
  
  const today = new Date().toISOString().split('T')[0]
  
  // Reset daily stats if it's a new day
  if (account.usage.lastResetDate !== today) {
    account.usage.dailyRequests = 0
    account.usage.dailyTokens = 0
    account.usage.lastResetDate = today
    setAccount(apiKey, account)
  }

  return account.usage
}
