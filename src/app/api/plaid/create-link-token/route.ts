import { NextRequest, NextResponse } from 'next/server'
import { getPlaidClient } from '@/lib/plaid'
import { Products, CountryCode } from 'plaid'

export async function POST(req: NextRequest) {
  const plaid = getPlaidClient()
  const resp = await plaid.linkTokenCreate({
    user: { client_user_id: 'local-user' },
    client_name: 'Personal Finance (Local)',
    products: process.env.PLAID_PRODUCTS!.split(',').map(p => p.trim() as Products),
    country_codes: process.env.PLAID_COUNTRY_CODES!.split(',').map(c => c.trim() as CountryCode),
    language: 'en',
    redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
  })
  return NextResponse.json({ link_token: resp.data.link_token })
}
