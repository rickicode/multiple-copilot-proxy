import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { completionRoutes } from "./routes/chat-completions/route"
import { embeddingRoutes } from "./routes/embeddings/route"
import { modelRoutes } from "./routes/models/route"
import { managerRoutes } from "./routes/manager/route"
import { authMiddleware } from "./lib/auth-middleware"

export const server = new Hono()

server.use(logger())
server.use(cors())

// Manager routes (no auth required)
server.route("/manager", managerRoutes)

server.get("/", (c) => c.text("Copilot API Server - Multiple Account Support"))

// Apply auth middleware only to API routes (not manager)
server.use("/chat/*", authMiddleware)
server.use("/models/*", authMiddleware) 
server.use("/embeddings/*", authMiddleware)
server.use("/v1/*", authMiddleware)

server.route("/chat/completions", completionRoutes)
server.route("/models", modelRoutes)
server.route("/embeddings", embeddingRoutes)

// Compatibility with tools that expect v1/ prefix
server.route("/v1/chat/completions", completionRoutes)
server.route("/v1/models", modelRoutes)
server.route("/v1/embeddings", embeddingRoutes)
