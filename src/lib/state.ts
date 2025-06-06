import type { ModelsResponse } from "~/services/copilot/get-models"

export interface UsageStats {
  totalRequests: number
  totalTokens: number
  dailyRequests: number
  dailyTokens: number
  lastResetDate: string
  requestHistory: Array<{
    timestamp: string
    tokens: number
    model: string
  }>
}

export interface UserAccount {
  githubToken: string
  copilotToken?: string
  accountType: string
  models?: ModelsResponse
  vsCodeVersion?: string
  username?: string
  createdAt: string
  lastUsed: string
  usage?: UsageStats
}

export interface GlobalState {
  manualApprove: boolean
  rateLimitWait: boolean
  visionEnabled: boolean
  rateLimitSeconds?: number
  lastRequestTimestamp?: number
}

export interface MultiUserState {
  accounts: Map<string, UserAccount> // API key -> UserAccount
  globalState: GlobalState
}

export const multiUserState: MultiUserState = {
  accounts: new Map(),
  globalState: {
    manualApprove: false,
    rateLimitWait: false,
    visionEnabled: false,
  }
}

// Legacy state for services that still need it (to be phased out)
export interface State {
  githubToken?: string
  copilotToken?: string
  accountType: string
  models?: ModelsResponse
  vsCodeVersion?: string
  manualApprove: boolean
  rateLimitWait: boolean
  visionEnabled: boolean
  rateLimitSeconds?: number
  lastRequestTimestamp?: number
}

// Fallback state - only used by legacy services during transition
export const state: State = {
  accountType: "individual", 
  manualApprove: multiUserState.globalState.manualApprove,
  rateLimitWait: multiUserState.globalState.rateLimitWait,
  visionEnabled: multiUserState.globalState.visionEnabled,
}

// Helper functions
export function getAccountByApiKey(apiKey: string): UserAccount | undefined {
  return multiUserState.accounts.get(apiKey)
}

export function setAccount(apiKey: string, account: UserAccount): void {
  account.lastUsed = new Date().toISOString()
  multiUserState.accounts.set(apiKey, account)
}

export function removeAccount(apiKey: string): boolean {
  return multiUserState.accounts.delete(apiKey)
}

export function getAllAccounts(): [string, UserAccount][] {
  return Array.from(multiUserState.accounts.entries())
}

export function generateApiKey(): string {
  return 'sk-' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}
