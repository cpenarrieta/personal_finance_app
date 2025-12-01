import { NextRequest, NextResponse } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { Products, CountryCode } from "plaid"
import { logError } from "@/lib/utils/logger"

export async function POST(req: NextRequest) {
  try {
    const plaid = getPlaidClient()
    const body = await req.json().catch(() => ({}))
    const { access_token } = body

    // Get webhook URL from environment or construct from request
    const webhookUrl = process.env.PLAID_WEBHOOK_URL || `${process.env.BETTER_AUTH_URL}/api/plaid/webhook`

    const config: any = {
      user: { client_user_id: "local-user" },
      client_name: "Personal Finance (Local)",
      language: "en",
      redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
      webhook: webhookUrl, // Enable webhooks for this item
    }

    if (access_token) {
      // Update mode - reauth existing item
      config.access_token = access_token
      config.country_codes = process.env.PLAID_COUNTRY_CODES!.split(",").map((c) => c.trim() as CountryCode)
    } else {
      // New item mode
      config.products = process.env.PLAID_PRODUCTS!.split(",").map((p) => p.trim() as Products)
      config.country_codes = process.env.PLAID_COUNTRY_CODES!.split(",").map((c) => c.trim() as CountryCode)
    }

    const resp = await plaid.linkTokenCreate(config)
    return NextResponse.json({ link_token: resp.data.link_token })
  } catch (error: any) {
    logError("Error creating link token:", error, { responseData: error.response?.data })
    return NextResponse.json(
      {
        error: error.response?.data?.error_message || error.message || "Failed to create link token",
        errorCode: error.response?.data?.error_code,
      },
      { status: 500 },
    )
  }
}
