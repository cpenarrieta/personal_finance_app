/**
 * API route for analyzing receipt images and finding matching transactions
 */

import { NextRequest, NextResponse } from "next/server"
import { analyzeReceiptImage, matchCategoriesToIds } from "@/lib/ai/analyze-receipt"
import { findMatchingTransactions } from "@/lib/ai/match-transaction"
import { prisma } from "@/lib/db/prisma"

export const maxDuration = 60 // Allow up to 60 seconds for Vision API processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 },
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    console.log(`📤 Analyzing receipt: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // Fetch available categories
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
      },
      orderBy: { displayOrder: "asc" },
    })

    // Analyze receipt
    const analysis = await analyzeReceiptImage(dataUrl, categories)

    // Match categories to IDs
    const lineItemsWithIds = matchCategoriesToIds(analysis.lineItems, categories)

    // Find matching transactions
    const matchingTransactions = await findMatchingTransactions(
      analysis.merchantName,
      analysis.totalAmount,
      analysis.receiptDate,
    )

    console.log(`✅ Receipt analysis complete:`)
    console.log(`   - Merchant: ${analysis.merchantName}`)
    console.log(`   - Total: $${analysis.totalAmount.toFixed(2)}`)
    console.log(`   - Line items: ${analysis.lineItems.length}`)
    console.log(`   - Matching transactions: ${matchingTransactions.length}`)

    return NextResponse.json({
      analysis: {
        merchantName: analysis.merchantName,
        totalAmount: analysis.totalAmount,
        receiptDate: analysis.receiptDate,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        lineItems: lineItemsWithIds,
      },
      matchingTransactions,
    })
  } catch (error) {
    console.error("Error analyzing receipt:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze receipt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
