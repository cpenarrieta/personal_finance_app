import { NextResponse } from 'next/server'
import { syncInvestmentsOnly } from '@/lib/sync/sync'

export async function POST() {
  await syncInvestmentsOnly()
  return NextResponse.json({ ok: true })
}
