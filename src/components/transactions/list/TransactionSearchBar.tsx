"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TransactionSearchBarProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Search bar for filtering transactions by name, merchant, or category
 */
export function TransactionSearchBar({ value, onChange }: TransactionSearchBarProps) {
  return (
    <div className="bg-card p-3 md:p-4 rounded-lg shadow-sm border">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search transactions (name, merchant, category...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 text-sm md:text-base"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  )
}
