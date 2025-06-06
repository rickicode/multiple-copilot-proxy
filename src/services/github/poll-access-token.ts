import consola from "consola"

import {
  GITHUB_BASE_URL,
  GITHUB_CLIENT_ID,
  standardHeaders,
} from "~/lib/api-config"
import { sleep } from "~/lib/sleep"

import type { DeviceCodeResponse } from "./get-device-code"

export async function pollAccessToken(
  deviceCode: DeviceCodeResponse,
): Promise<string> {
  const response = await fetch(
    `${GITHUB_BASE_URL}/login/oauth/access_token`,
    {
      method: "POST",
      headers: standardHeaders(),
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    consola.error("Failed to poll access token:", errorText)
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const json = await response.json()
  consola.debug("Polling access token response:", json)

  const { access_token, error, error_description } = json as AccessTokenResponse

  if (access_token) {
    return access_token
  }

  if (error) {
    // Throw error with specific message for web handling
    throw new Error(error_description || error)
  }

  throw new Error('No access token received')
}

// Legacy function for CLI usage
export async function pollAccessTokenWithRetry(
  deviceCode: DeviceCodeResponse,
): Promise<string> {
  // Interval is in seconds, we need to multiply by 1000 to get milliseconds
  // I'm also adding another second, just to be safe
  const sleepDuration = (deviceCode.interval + 1) * 1000
  consola.debug(`Polling access token with interval of ${sleepDuration}ms`)

  while (true) {
    try {
      return await pollAccessToken(deviceCode)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('authorization_pending')) {
        await sleep(sleepDuration)
        continue
      }
      
      if (errorMessage.includes('slow_down')) {
        await sleep(sleepDuration + 2000) // Add extra 2 seconds
        continue
      }
      
      if (errorMessage.includes('expired_token')) {
        throw new Error('Device code expired. Please try again.')
      }
      
      // Other errors should be thrown
      throw error
    }
  }
}

interface AccessTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}
