import { NextResponse } from 'next/server'
import { syncAllItems } from '@/lib/sync/sync'

export async function POST() {
  await syncAllItems()
  return NextResponse.json({ ok: true })
}
