import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const APP_DIR = path.join(os.homedir(), ".local", "share", "copilot-api")

const GITHUB_TOKEN_PATH = path.join(APP_DIR, "github_token")
const ACCOUNTS_DB_PATH = path.join(APP_DIR, "accounts.json")

export const PATHS = {
  APP_DIR,
  GITHUB_TOKEN_PATH, // Legacy support
  ACCOUNTS_DB_PATH,
}

export async function ensurePaths(): Promise<void> {
  await fs.mkdir(PATHS.APP_DIR, { recursive: true })
  await ensureFile(PATHS.GITHUB_TOKEN_PATH) // Legacy support
  await ensureFile(PATHS.ACCOUNTS_DB_PATH)
}

async function ensureFile(filePath: string): Promise<void> {
  try {
    await fs.access(filePath, fs.constants.W_OK)
  } catch {
    // Initialize accounts.json with empty object if it's the accounts file
    const initialContent = filePath === PATHS.ACCOUNTS_DB_PATH ? "{}" : ""
    await fs.writeFile(filePath, initialContent)
    await fs.chmod(filePath, 0o600)
  }
}

// Database functions for accounts
export async function loadAccountsFromDisk(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(PATHS.ACCOUNTS_DB_PATH, "utf8")
    return JSON.parse(data || "{}")
  } catch {
    return {}
  }
}

export async function saveAccountsToDisk(accounts: Record<string, any>): Promise<void> {
  await fs.writeFile(PATHS.ACCOUNTS_DB_PATH, JSON.stringify(accounts, null, 2))
  await fs.chmod(PATHS.ACCOUNTS_DB_PATH, 0o600)
}
