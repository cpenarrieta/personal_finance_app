import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateTransactionSchema } from '@/types/api'
import { safeParseRequestBody } from '@/types/api'
import type { Prisma } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(req, updateTransactionSchema)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: parseResult.error.message,
        },
        { status: 400 }
      )
    }

    const {
      name,
      plaidCategory,
      plaidSubcategory,
      categoryId,
      subcategoryId,
      notes,
      tagIds,
    } = parseResult.data

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

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}
