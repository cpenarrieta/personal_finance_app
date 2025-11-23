import { NextRequest, NextResponse } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { Products, CountryCode } from "plaid"

export async function POST(req: NextRequest) {
  try {
    const plaid = getPlaidClient()
    const body = await req.json().catch(() => ({}))
    const { access_token } = body

    const config: any = {
      user: { client_user_id: "local-user" },
      client_name: "Personal Finance (Local)",
      language: "en",
      country_codes: process.env.PLAID_COUNTRY_CODES!.split(",").map((c) => c.trim() as CountryCode),
      redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
    }

    if (access_token) {
      // Update mode - for reauth or adding new products to existing item
      config.access_token = access_token
      // When updating an existing Item, Plaid will automatically request
      // all products from PLAID_PRODUCTS that aren't already enabled
      config.update = {
        account_selection_enabled: true,
      }
    } else {
      // New item mode
      config.products = process.env.PLAID_PRODUCTS!.split(",").map((p) => p.trim() as Products)
    }

    const resp = await plaid.linkTokenCreate(config)
    return NextResponse.json({ link_token: resp.data.link_token })
  } catch (error: any) {
    console.error("Error creating link token:", error.response?.data || error.message)
    return NextResponse.json(
      {
        error: error.response?.data?.error_message || error.message || "Failed to create link token",
        errorCode: error.response?.data?.error_code,
      },
      { status: 500 },
    )
  }
}
