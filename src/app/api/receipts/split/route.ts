/**
 * API route for creating split transactions from receipt analysis
 */

import { NextRequest, NextResponse } from "next/server"
import { createSplitTransactions } from "@/lib/ai/split-transaction"
import { z } from "zod"

const SplitRequestSchema = z.object({
  transactionId: z.string(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      amount: z.number().positive(),
      categoryId: z.string().nullable(),
      subcategoryId: z.string().nullable(),
    }),
  ),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = SplitRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { transactionId, lineItems } = validation.data

    console.log(`🔀 Creating split transaction for ${transactionId} with ${lineItems.length} items`)

    // Create split transactions
    const result = await createSplitTransactions(transactionId, lineItems)

    return NextResponse.json({
      success: true,
      parentId: result.parentId,
      childIds: result.childIds,
      message: `Successfully split transaction into ${result.childIds.length} child transactions`,
    })
  } catch (error) {
    console.error("Error creating split transaction:", error)
    return NextResponse.json(
      {
        error: "Failed to create split transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
