import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const {
      name,
      category,
      subcategory,
      customCategoryId,
      customSubcategoryId,
      notes,
    } = body

    // Build update data object
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (subcategory !== undefined) updateData.subcategory = subcategory
    if (notes !== undefined) updateData.notes = notes

    // Handle custom category relation
    if (customCategoryId !== undefined) {
      if (customCategoryId === null || customCategoryId === '') {
        updateData.customCategory = { disconnect: true }
      } else {
        updateData.customCategory = { connect: { id: customCategoryId } }
      }
    }

    // Handle custom subcategory relation
    if (customSubcategoryId !== undefined) {
      if (customSubcategoryId === null || customSubcategoryId === '') {
        updateData.customSubcategory = { disconnect: true }
      } else {
        updateData.customSubcategory = { connect: { id: customSubcategoryId } }
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
