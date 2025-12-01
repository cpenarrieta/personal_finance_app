import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { updateTransactionSchema } from "@/types/api"
import { safeParseRequestBody } from "@/types/api"
import type { Prisma } from "@prisma/client"
import { revalidateTag, revalidatePath } from "next/cache"
import { logError } from "@/lib/utils/logger"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

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

    const { name, amount, plaidCategory, plaidSubcategory, categoryId, subcategoryId, notes, tagIds, files } =
      parseResult.data

    // Build update data object with proper typing
    const updateData: Prisma.TransactionUpdateInput = {}

    if (name !== undefined) updateData.name = name
    if (amount !== undefined) updateData.amount = amount
    if (plaidCategory !== undefined) updateData.plaidCategory = plaidCategory
    if (plaidSubcategory !== undefined) updateData.plaidSubcategory = plaidSubcategory
    if (notes !== undefined) updateData.notes = notes
    if (files !== undefined) updateData.files = files

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
    revalidatePath("/", "layout") // Invalidate Router Cache

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    logError("Error updating transaction:", error)
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        childTransactions: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
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
    revalidatePath("/", "layout") // Invalidate Router Cache

    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error deleting transaction:", error)
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
