import { copilotHeaders, copilotBaseUrl } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state, type UserAccount } from "~/lib/state"

export const createEmbeddings = async (payload: EmbeddingRequest, userAccount?: UserAccount) => {
  // Create temporary state object for API functions
  let stateToUse = state
  
  if (userAccount) {
    stateToUse = {
      githubToken: userAccount.githubToken,
      accountType: userAccount.accountType,
      copilotToken: userAccount.copilotToken || '',
      vsCodeVersion: userAccount.vsCodeVersion || '1.85.0',
      manualApprove: state.manualApprove,
      rateLimitWait: state.rateLimitWait,
      visionEnabled: state.visionEnabled
    }
  }
  
  if (!stateToUse.copilotToken) throw new Error("Copilot token not found")

  const response = await fetch(`${copilotBaseUrl(stateToUse)}/embeddings`, {
    method: "POST",
    headers: copilotHeaders(stateToUse),
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new HTTPError("Failed to create embeddings", response)

  return (await response.json()) as EmbeddingResponse
}

export interface EmbeddingRequest {
  input: string | Array<string>
  model: string
}

export interface Embedding {
  object: string
  embedding: Array<number>
  index: number
}

export interface EmbeddingResponse {
  object: string
  data: Array<Embedding>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}
