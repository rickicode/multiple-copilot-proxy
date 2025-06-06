import consola from "consola"
import fs from "node:fs/promises"

import { PATHS } from "~/lib/paths"
import { getCopilotToken } from "~/services/github/get-copilot-token"
import { getDeviceCode } from "~/services/github/get-device-code"
import { getGitHubUser } from "~/services/github/get-user"
import { pollAccessTokenWithRetry } from "~/services/github/poll-access-token"

import { HTTPError } from "./http-error"
import { state, type UserAccount, getAccountByApiKey, setAccount } from "./state"
import { saveAccountsToDb } from "./account-manager"

const readGithubToken = () => fs.readFile(PATHS.GITHUB_TOKEN_PATH, "utf8")

const writeGithubToken = (token: string) =>
  fs.writeFile(PATHS.GITHUB_TOKEN_PATH, token)

export const setupCopilotToken = async (account: UserAccount) => {
  try {
    // Create a temporary state object for this account
    const tempState = {
      githubToken: account.githubToken,
      accountType: account.accountType,
      copilotToken: account.copilotToken,
      vsCodeVersion: account.vsCodeVersion
    }

    const { token, refresh_in } = await getCopilotToken(tempState)
    account.copilotToken = token

    const refreshInterval = (refresh_in - 60) * 1000

    // Set up automatic token refresh for this account
    setInterval(async () => {
      const accountName = account.username || 'Unknown Account'
      consola.start(`Refreshing Copilot token for ${accountName}`)
      try {
        const { token } = await getCopilotToken(tempState)
        account.copilotToken = token
        await saveAccountsToDb()
      } catch (error) {
        consola.error(`Failed to refresh Copilot token for ${accountName}:`, error)
      }
    }, refreshInterval)

    return token
  } catch (error) {
    const accountName = account.username || 'Unknown Account'
    consola.error(`Failed to setup Copilot token for ${accountName}:`, error)
    throw error
  }
}

interface SetupGitHubTokenOptions {
  force?: boolean
}

// Legacy function for backward compatibility
export async function setupGitHubToken(
  options?: SetupGitHubTokenOptions,
): Promise<void> {
  try {
    const githubToken = await readGithubToken()

    if (githubToken && !options?.force) {
      state.githubToken = githubToken
      await logUser(githubToken)
      return
    }

    consola.info("Not logged in, getting new access token")
    const response = await getDeviceCode()
    consola.debug("Device code response:", response)

    consola.info(
      `Please enter the code "${response.user_code}" in ${response.verification_uri}`,
    )

    const token = await pollAccessTokenWithRetry(response)
    await writeGithubToken(token)
    state.githubToken = token

    await logUser(token)
  } catch (error) {
    if (error instanceof HTTPError) {
      consola.error("Failed to get GitHub token:", await error.response.json())
      throw error
    }

    consola.error("Failed to get GitHub token:", error)
    throw error
  }
}

async function logUser(githubToken?: string) {
  const user = await getGitHubUser(githubToken)
  consola.info(`Logged in as ${user.login}`)
}

// New function for setting up tokens for specific accounts
export async function setupAccountTokens(apiKey: string): Promise<void> {
  const account = getAccountByApiKey(apiKey)
  if (!account) {
    throw new Error(`Account not found for API key: ${apiKey}`)
  }

  try {
    await setupCopilotToken(account)
    await saveAccountsToDb()
    const accountName = account.username || 'Unknown Account'
    consola.success(`Copilot token setup completed for ${accountName}`)
  } catch (error) {
    const accountName = account.username || 'Unknown Account'
    consola.error(`Failed to setup tokens for ${accountName}:`, error)
    throw error
  }
}

// Function to refresh all account tokens
export async function refreshAllAccountTokens(): Promise<void> {
  const { getAllAccounts } = await import("./state")
  const accounts = getAllAccounts()
  
  for (const [apiKey, account] of accounts) {
    if (account.githubToken) {
      try {
        await setupCopilotToken(account)
        const accountName = account.username || 'Unknown Account'
        consola.success(`Refreshed tokens for ${accountName}`)
      } catch (error) {
        const accountName = account.username || 'Unknown Account'
        consola.error(`Failed to refresh tokens for ${accountName}:`, error)
      }
    }
  }
  
  await saveAccountsToDb()
}
