import { NextResponse } from 'next/server'
import { syncTransactionsOnly } from '@/lib/sync'

export async function POST() {
  await syncTransactionsOnly()
  return NextResponse.json({ ok: true })
}
