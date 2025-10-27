'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CategorizeButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleCategorize = async () => {
    if (isLoading) return

    const confirmed = confirm(
      'This will automatically categorize all transactions that don\'t have a category using AI. Continue?'
    )

    if (!confirmed) return

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/categorize', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✓ ${data.message}`)
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh()
          setMessage(null)
        }, 2000)
      } else {
        setMessage(`✗ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Categorization failed:', error)
      setMessage('✗ Categorization failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCategorize}
        disabled={isLoading}
        className="px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-medium shadow-sm transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed"
      >
        {isLoading ? '🤖 Categorizing...' : '🤖 Auto-Categorize Transactions'}
      </button>
      {message && (
        <span className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
