import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionIds, customCategoryId, customSubcategoryId } = body

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'Transaction IDs are required' },
        { status: 400 }
      )
    }

    if (!customCategoryId) {
      return NextResponse.json(
        { error: 'Custom category ID is required' },
        { status: 400 }
      )
    }

    // Update all transactions with the new category/subcategory
    await prisma.transaction.updateMany({
      where: {
        id: {
          in: transactionIds,
        },
      },
      data: {
        customCategoryId,
        customSubcategoryId: customSubcategoryId || null,
      },
    })

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
