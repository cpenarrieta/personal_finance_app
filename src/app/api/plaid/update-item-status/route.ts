import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { revalidateTag } from 'next/cache'

/**
 * Updates item status after successful reauth (when item_id hasn't changed)
 * This endpoint is used when Link update mode successfully repairs login
 * without creating a new item (no public_token exchange needed)
 */
export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json()

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      )
    }

    // Update item status to ACTIVE (login repaired)
    await prisma.item.update({
      where: { id: itemId },
      data: { status: 'ACTIVE' },
    })

    // Invalidate caches so UI updates immediately
    revalidateTag('items', 'max')
    revalidateTag('accounts', 'max')
    revalidateTag('dashboard', 'max')

    console.log(`✅ Item ${itemId} status updated to ACTIVE (reauth successful)`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Error updating item status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
