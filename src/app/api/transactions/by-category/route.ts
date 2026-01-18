import { NextRequest, NextResponse } from "next/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { logError } from "@/lib/utils/logger"

/**
 * Get transactions by category and optional subcategory
 *
 * Note: This route is automatically dynamic in Next.js 16 with cacheComponents
 * because it uses request.nextUrl.searchParams
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get("categoryId")
    const subcategoryId = searchParams.get("subcategoryId")

    if (!categoryId) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    // Call Convex query
    const transactions = await fetchQuery(api.transactions.getByCategory, {
      categoryId: categoryId as Id<"categories">,
      subcategoryId:
        subcategoryId === null || subcategoryId === undefined
          ? undefined
          : subcategoryId === "null"
            ? null
            : (subcategoryId as Id<"subcategories">),
    })

    return NextResponse.json(transactions)
  } catch (error) {
    logError("Error fetching transactions by category:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
