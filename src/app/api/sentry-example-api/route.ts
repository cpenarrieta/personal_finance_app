import { NextResponse } from "next/server"
import { headers } from "next/headers"

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message)
    this.name = "SentryExampleAPIError"
  }
}
// A faulty API route to test Sentry's error monitoring
export async function GET() {
  await headers() // Makes route dynamic, prevents build-time prerendering
  throw new SentryExampleAPIError("This error is raised on the backend called by the example page.")
  return NextResponse.json({ data: "Testing Sentry Error..." })
}
