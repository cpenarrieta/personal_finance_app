import { httpRouter } from "convex/server"
import { authComponent, createAuth } from "./auth"

const http = httpRouter()

// Register Better Auth routes with CORS support for cross-domain auth
authComponent.registerRoutes(http, createAuth, { cors: true })

export default http
