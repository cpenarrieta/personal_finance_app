/**
 * Transaction matching logic for receipt analysis
 * Finds existing transactions that match receipt data
 */

import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"

export interface TransactionMatchCandidate {
  id: string
  name: string
  merchantName: string | null
  amount: number
  date: Date
  datetime: string
  pending: boolean
  accountName: string
  categoryName: string | null
  subcategoryName: string | null
  isSplit: boolean
  matchScore: number
  matchReasons: string[]
}

/**
 * Find transactions that match receipt data
 * @param merchantName - Merchant name from receipt
 * @param totalAmount - Total amount from receipt (positive number)
 * @param receiptDate - Date from receipt (optional)
 * @param dateRangeDays - Number of days to search before/after receipt date (default: 7)
 */
export async function findMatchingTransactions(
  merchantName: string,
  totalAmount: number,
  receiptDate?: string | null,
  dateRangeDays: number = 7,
): Promise<TransactionMatchCandidate[]> {
  try {
    // Build date range filter
    let dateFilter: Prisma.TransactionWhereInput["date"] | undefined

    if (receiptDate) {
      const receiptDateTime = new Date(receiptDate)
      const startDate = new Date(receiptDateTime)
      startDate.setDate(startDate.getDate() - dateRangeDays)
      const endDate = new Date(receiptDateTime)
      endDate.setDate(endDate.getDate() + dateRangeDays)

      dateFilter = {
        gte: startDate,
        lte: endDate,
      }
    } else {
      // If no receipt date, search last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      dateFilter = {
        gte: thirtyDaysAgo,
      }
    }

    // Find transactions that might match
    // Note: Plaid stores amounts as negative for expenses
    const amountTolerance = totalAmount * 0.05 // 5% tolerance for amount matching
    const targetAmount = -totalAmount // Convert to negative for expense matching

    const transactions = await prisma.transaction.findMany({
      where: {
        date: dateFilter,
        isSplit: false, // Don't match already-split transactions
        parentTransactionId: null, // Don't match child split transactions
        amount: {
          gte: new Prisma.Decimal(targetAmount - amountTolerance),
          lte: new Prisma.Decimal(targetAmount + amountTolerance),
        },
      },
      include: {
        account: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        subcategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 50, // Limit to 50 most recent matches
    })

    // Score and rank matches
    const candidates = transactions.map((t) => {
      let matchScore = 0
      const matchReasons: string[] = []

      // Amount match (most important)
      const amountDiff = Math.abs(Math.abs(t.amount.toNumber()) - totalAmount)
      const amountDiffPercent = (amountDiff / totalAmount) * 100

      if (amountDiffPercent < 1) {
        matchScore += 50
        matchReasons.push("Exact amount match")
      } else if (amountDiffPercent < 5) {
        matchScore += 40
        matchReasons.push(`Amount match (${amountDiffPercent.toFixed(1)}% diff)`)
      }

      // Merchant name match
      const transactionMerchant = (t.merchantName || t.name).toLowerCase()
      const receiptMerchant = merchantName.toLowerCase()

      if (transactionMerchant.includes(receiptMerchant) || receiptMerchant.includes(transactionMerchant)) {
        matchScore += 30
        matchReasons.push("Merchant name match")
      } else {
        // Partial match (e.g., "Amazon" matches "Amazon.com")
        const merchantWords = receiptMerchant.split(/\s+/)
        const hasPartialMatch = merchantWords.some((word) => word.length > 3 && transactionMerchant.includes(word))
        if (hasPartialMatch) {
          matchScore += 20
          matchReasons.push("Partial merchant name match")
        }
      }

      // Date match (if receipt date provided)
      if (receiptDate) {
        const receiptDateTime = new Date(receiptDate)
        const transactionDate = new Date(t.date)
        const daysDiff = Math.abs((transactionDate.getTime() - receiptDateTime.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff === 0) {
          matchScore += 20
          matchReasons.push("Same date")
        } else if (daysDiff <= 1) {
          matchScore += 15
          matchReasons.push("Within 1 day")
        } else if (daysDiff <= 3) {
          matchScore += 10
          matchReasons.push("Within 3 days")
        } else if (daysDiff <= 7) {
          matchScore += 5
          matchReasons.push("Within 7 days")
        }
      }

      return {
        id: t.id,
        name: t.name,
        merchantName: t.merchantName,
        amount: Math.abs(t.amount.toNumber()),
        date: t.date,
        datetime: t.datetime,
        pending: t.pending,
        accountName: t.account.name,
        categoryName: t.category?.name || null,
        subcategoryName: t.subcategory?.name || null,
        isSplit: t.isSplit,
        matchScore,
        matchReasons,
      }
    })

    // Sort by match score (highest first) and filter low scores
    return candidates
      .filter((c) => c.matchScore >= 20) // Minimum threshold
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10) // Return top 10 matches
  } catch (error) {
    console.error("Error finding matching transactions:", error)
    throw error
  }
}
