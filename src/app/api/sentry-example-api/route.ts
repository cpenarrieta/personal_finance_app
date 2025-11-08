import { NextResponse } from "next/server";

/**
 * Example API route to test Sentry server-side error tracking
 * This route is created by the Sentry installation wizard
 *
 * Note: This route is automatically dynamic in Next.js 16 with cacheComponents
 * because it throws an error intentionally
 */
export async function GET() {
  // This will trigger a server-side error that Sentry will capture
  throw new Error("Sentry Backend Error - Test from API Route");

  // This code will never be reached
  return NextResponse.json({ ok: true });
}
