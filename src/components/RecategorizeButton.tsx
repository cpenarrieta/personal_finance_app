'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RecategorizeButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleRecategorize = async () => {
    if (isLoading) return

    const confirmed = confirm(
      '⚠️ WARNING: This will re-categorize ALL transactions using AI, overwriting any existing categories you have set manually. This action cannot be undone. Continue?'
    )

    if (!confirmed) return

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/categorize-all', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✓ ${data.message}`)
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh()
          setMessage(null)
        }, 3000)
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
        onClick={handleRecategorize}
        disabled={isLoading}
        className="px-6 py-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-medium shadow-sm transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed"
      >
        {isLoading ? '🔄 Re-categorizing All...' : '🔄 Re-Categorize All (Overwrite)'}
      </button>
      {message && (
        <span className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
