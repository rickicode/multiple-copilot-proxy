#!/usr/bin/env node

import { defineCommand, runMain } from "citty"
import consola from "consola"
import { serve, type ServerHandler } from "srvx"

import { ensurePaths } from "./lib/paths"
import { multiUserState } from "./lib/state"
import { refreshAllAccountTokens } from "./lib/token"
import { cacheVSCodeVersion } from "./lib/vscode-version"
import { initializeAccountManager } from "./lib/account-manager"
import { server } from "./server"

interface RunServerOptions {
  port: number
  verbose: boolean
  manual: boolean
  rateLimit?: number
  rateLimitWait: boolean
  visionEnabled: boolean
}

export async function runServer(options: RunServerOptions): Promise<void> {
  if (options.verbose) {
    consola.level = 5
    consola.info("Verbose logging enabled")
  }

  // Set global state for all accounts
  multiUserState.globalState.manualApprove = options.manual
  multiUserState.globalState.rateLimitWait = options.rateLimitWait
  multiUserState.globalState.visionEnabled = options.visionEnabled

  if (options.visionEnabled) {
    consola.info("Vision capability enabled")
  }

  await ensurePaths()
  await cacheVSCodeVersion()

  // Initialize account manager for multi-user support
  await initializeAccountManager()

  consola.info("Server starting in multi-account mode")
  consola.info("Use /manager to configure GitHub accounts")

  // Setup tokens for all existing accounts
  try {
    await refreshAllAccountTokens()
  } catch (error) {
    consola.warn("Failed to refresh some account tokens:", error)
  }

  const serverUrl = `http://localhost:${options.port}`
  const managerUrl = `${serverUrl}/manager`
  const testUrl = `${serverUrl}/manager/test`
  
  consola.box(`
🚀 Copilot API Server - Multiple Account Support

Server: ${serverUrl}
Manager: ${managerUrl}
API Tester: ${testUrl}

Visit the manager to configure multiple GitHub accounts!
  `)

  serve({
    fetch: server.fetch as ServerHandler,
    port: options.port,
  })
}

const start = defineCommand({
  meta: {
    name: "start",
    description: "Start the Copilot API server with multiple account support",
  },
  args: {
    port: {
      alias: "p",
      type: "string",
      default: "4141",
      description: "Port to listen on",
    },
    verbose: {
      alias: "v",
      type: "boolean",
      default: false,
      description: "Enable verbose logging",
    },
    manual: {
      type: "boolean",
      default: false,
      description: "Enable manual request approval",
    },
    "rate-limit": {
      alias: "r",
      type: "string",
      description: "Rate limit in seconds between requests",
    },
    wait: {
      alias: "w",
      type: "boolean",
      default: false,
      description:
        "Wait instead of error when rate limit is hit. Has no effect if rate limit is not set",
    },
    vision: {
      type: "boolean",
      default: false,
      description: "Enable vision capabilities",
      required: false,
    },
  },
  run({ args }) {
    const rateLimitRaw = args["rate-limit"]
    const rateLimit =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      rateLimitRaw === undefined ? undefined : Number.parseInt(rateLimitRaw, 10)

    const port = Number.parseInt(args.port, 10)

    return runServer({
      port,
      verbose: args.verbose,
      manual: args.manual,
      rateLimit,
      rateLimitWait: Boolean(args.wait),
      visionEnabled: args.vision,
    })
  },
})

const main = defineCommand({
  meta: {
    name: "copilot-api",
    description:
      "A wrapper around GitHub Copilot API to make it OpenAI compatible with multiple account support. Visit /manager to configure accounts.",
  },
  subCommands: { start },
})

await runMain(main)
