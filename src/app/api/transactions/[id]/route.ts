import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { updateTransactionSchema } from "@/types/api"
import { safeParseRequestBody } from "@/types/api"
import type { Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { getCurrentUserIdFromHeaders } from "@/lib/auth/auth-helpers"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get current user ID
    const userId = await getCurrentUserIdFromHeaders(req.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the transaction belongs to the user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        account: {
          item: {
            userId,
          },
        },
      },
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found or access denied" }, { status: 404 })
    }

    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(req, updateTransactionSchema)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parseResult.error.message,
        },
        { status: 400 },
      )
    }

    const { name, plaidCategory, plaidSubcategory, categoryId, subcategoryId, notes, tagIds } = parseResult.data

    // Build update data object with proper typing
    const updateData: Prisma.TransactionUpdateInput = {}

    if (name !== undefined) updateData.name = name
    if (plaidCategory !== undefined) updateData.plaidCategory = plaidCategory
    if (plaidSubcategory !== undefined) updateData.plaidSubcategory = plaidSubcategory
    if (notes !== undefined) updateData.notes = notes

    // Handle category relation
    if (categoryId !== undefined) {
      if (categoryId === null) {
        updateData.category = { disconnect: true }
      } else {
        updateData.category = { connect: { id: categoryId } }
      }
    }

    // Handle subcategory relation
    if (subcategoryId !== undefined) {
      if (subcategoryId === null) {
        updateData.subcategory = { disconnect: true }
      } else {
        updateData.subcategory = { connect: { id: subcategoryId } }
      }
    }

    // Handle tags if provided
    if (tagIds !== undefined) {
      // First, delete all existing tag associations
      await prisma.transactionTag.deleteMany({
        where: { transactionId: id },
      })

      // Then create new tag associations
      if (tagIds.length > 0) {
        await prisma.transactionTag.createMany({
          data: tagIds.map((tagId) => ({
            transactionId: id,
            tagId,
          })),
        })
      }
    }

    // Update the transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get current user ID
    const userId = await getCurrentUserIdFromHeaders(req.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if transaction exists AND belongs to the user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        account: {
          item: {
            userId,
          },
        },
      },
      include: {
        childTransactions: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found or access denied" }, { status: 404 })
    }

    // If transaction has child transactions (is a split parent), delete them first
    if (transaction.childTransactions && transaction.childTransactions.length > 0) {
      await prisma.transaction.deleteMany({
        where: { parentTransactionId: id },
      })
    }

    // Delete associated tags
    await prisma.transactionTag.deleteMany({
      where: { transactionId: id },
    })

    // Delete the transaction
    await prisma.transaction.delete({
      where: { id },
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
