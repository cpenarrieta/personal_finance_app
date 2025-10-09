'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'

export default function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then(r => r.json())
      .then(d => setLinkToken(d.link_token))
  }, [])

  const onSuccess = useCallback(async (public_token: string) => {
    await fetch('/api/plaid/exchange-public-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token }),
    })
    alert('Linked! Now run a sync.')
  }, [])

  const { open, ready } = usePlaidLink(
    linkToken ? { token: linkToken, onSuccess } : { token: '', onSuccess }
  )

  return (
    <button
      disabled={!ready}
      onClick={() => open?.()}
      className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
    >
      {ready ? 'Connect Wealthsimple' : 'Loading…'}
    </button>
  )
}
