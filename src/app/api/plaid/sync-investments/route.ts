import { NextResponse } from "next/server"
import { syncInvestmentsOnly } from "@/lib/sync/sync"

export async function POST() {
  try {
    await syncInvestmentsOnly()
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    // Check if it's a Plaid error
    const errorCode = error.response?.data?.error_code
    const errorMessage = error.response?.data?.error_message || error.message

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
        errorCode: errorCode,
      },
      { status: errorCode === "ITEM_LOGIN_REQUIRED" ? 401 : 500 },
    )
  }
}
