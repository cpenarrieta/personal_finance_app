"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const MONTH_OPTIONS = [
  { value: "0", label: "Current Month", mobileLabel: "Now" },
  { value: "1", label: "Last Month", mobileLabel: "1m" },
  { value: "2", label: "Last 2 Months", mobileLabel: "2m" },
  { value: "3", label: "Last 3 Months", mobileLabel: "3m" },
  { value: "6", label: "Last 6 Months", mobileLabel: "6m" },
] as const

/**
 * Client Component for month range filter
 * Uses URL search params to maintain filter state
 * Shows abbreviated labels on mobile to prevent horizontal scrolling
 */
export function MonthFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentMonths = searchParams.get("months") || "0"

  const handleMonthChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "0") {
      params.delete("months")
    } else {
      params.set("months", value)
    }
    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : "/")
  }

  return (
    <div className="flex items-center gap-2">
      <Tabs value={currentMonths} onValueChange={handleMonthChange}>
        <TabsList>
          {MONTH_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              <span className="md:hidden">{option.mobileLabel}</span>
              <span className="hidden md:inline">{option.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
