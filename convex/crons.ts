import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Generate daily demo transactions at 6:00 AM UTC
// This keeps the demo data fresh with new transactions appearing each day
crons.daily(
  "generate daily demo transactions",
  { hourUTC: 6, minuteUTC: 0 },
  internal.demoSeed.generateDailyTransactions,
)

export default crons
