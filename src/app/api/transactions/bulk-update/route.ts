import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bulkUpdateTransactionsSchema, safeParseRequestBody } from '@/types/api'

export async function PATCH(request: NextRequest) {
  try {
    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(request, bulkUpdateTransactionsSchema)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: parseResult.error.message,
        },
        { status: 400 }
      )
    }

    const { transactionIds, customCategoryId, customSubcategoryId, tagIds } = parseResult.data

    // Update all transactions with the new category/subcategory
    await prisma.transaction.updateMany({
      where: {
        id: {
          in: transactionIds,
        },
      },
      data: {
        customCategoryId: customCategoryId ?? undefined,
        customSubcategoryId: customSubcategoryId ?? undefined,
      },
    })

    // Handle tags if provided
    if (tagIds !== undefined) {
      // First, delete all existing tag associations for these transactions
      await prisma.transactionTag.deleteMany({
        where: {
          transactionId: {
            in: transactionIds,
          },
        },
      })

      // Then create new tag associations
      if (tagIds.length > 0) {
        const tagData = transactionIds.flatMap((transactionId) =>
          tagIds.map((tagId) => ({
            transactionId,
            tagId,
          }))
        )

        await prisma.transactionTag.createMany({
          data: tagData,
        })
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: transactionIds.length,
    })
  } catch (error) {
    console.error('Error bulk updating transactions:', error)
    return NextResponse.json(
      { error: 'Failed to bulk update transactions' },
      { status: 500 }
    )
  }
}
