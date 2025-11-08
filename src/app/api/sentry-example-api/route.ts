import { NextResponse } from "next/server";

/**
 * Example API route to test Sentry server-side error tracking
 * This route is created by the Sentry installation wizard
 */
export async function GET() {
  // This will trigger a server-side error that Sentry will capture
  throw new Error("Sentry Backend Error - Test from API Route");

  // This code will never be reached
  return NextResponse.json({ ok: true });
}
