import { NextRequest, NextResponse } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { handleTransactionWebhook, handleItemWebhook } from "@/lib/plaid/webhook-handlers"
import { logInfo, logWarn, logError } from "@/lib/utils/logger"

/**
 * Plaid webhook types
 */
interface PlaidWebhook {
  webhook_type: string
  webhook_code: string
  item_id?: string
  error?: {
    error_code: string
    error_message: string
  }
  new_transactions?: number
  removed_transactions?: string[]
  reason?: string
}

/**
 * Verifies that the webhook request is from Plaid
 */
async function verifyPlaidWebhook(request: NextRequest, _body: string): Promise<boolean> {
  const plaidVerification = request.headers.get("plaid-verification")

  if (!plaidVerification) {
    logError("❌ Missing Plaid-Verification header")
    return false
  }

  if (!process.env.PLAID_WEBHOOK_VERIFICATION_KEY) {
    logWarn("⚠️  Webhook verification disabled (set PLAID_WEBHOOK_VERIFICATION_KEY for production)")
    return true
  }

  try {
    const jwtParts = plaidVerification.split(".")
    if (jwtParts.length !== 3 || !jwtParts[0]) {
      logError("❌ Invalid JWT format")
      return false
    }

    const headerJson = Buffer.from(jwtParts[0], "base64").toString("utf-8")
    const header = JSON.parse(headerJson) as { kid?: string }
    const keyId = header.kid

    if (!keyId) {
      logError("❌ Missing kid in JWT header")
      return false
    }

    const plaid = getPlaidClient()
    const isValid = await plaid.webhookVerificationKeyGet({ key_id: keyId })

    if (!isValid.data) {
      logError("❌ Webhook verification failed")
      return false
    }

    logInfo("✅ Webhook verification header present")
    return true
  } catch (error) {
    logError("❌ Error verifying webhook:", error)
    return false
  }
}

/**
 * Route transaction webhooks to the handler
 */
async function routeTransactionWebhook(webhookCode: string, itemId: string | undefined): Promise<void> {
  if (!itemId) return

  switch (webhookCode) {
    case "SYNC_UPDATES_AVAILABLE":
    case "DEFAULT_UPDATE":
    case "INITIAL_UPDATE":
    case "HISTORICAL_UPDATE":
    case "TRANSACTIONS_REMOVED":
      await handleTransactionWebhook(webhookCode, itemId)
      break

    default:
      logInfo(`ℹ️  Unhandled transaction webhook code: ${webhookCode}`, { webhookCode })
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const body: PlaidWebhook = JSON.parse(bodyText)

    logInfo("\n🔔 Received Plaid webhook:", {
      type: body.webhook_type,
      code: body.webhook_code,
      itemId: body.item_id,
    })

    const isValid = await verifyPlaidWebhook(request, bodyText)
    if (!isValid) {
      logError("❌ Webhook verification failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    switch (body.webhook_type) {
      case "TRANSACTIONS":
        await routeTransactionWebhook(body.webhook_code, body.item_id)
        break

      case "ITEM":
        if (body.item_id) {
          await handleItemWebhook(body.webhook_code, body.item_id, body.error, body.reason)
        }
        break

      default:
        logInfo(`ℹ️  Unhandled webhook type: ${body.webhook_type}`, { webhookType: body.webhook_type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logError("❌ Error processing webhook:", error)
    return NextResponse.json(
      { received: true, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 200 },
    )
  }
}
