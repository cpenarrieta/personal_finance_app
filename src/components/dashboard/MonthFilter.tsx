"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const MONTH_OPTIONS = [
  { value: "0", label: "Current Month" },
  { value: "1", label: "Last Month" },
  { value: "2", label: "Last 2 Months" },
  { value: "3", label: "Last 3 Months" },
  { value: "6", label: "Last 6 Months" },
] as const

/**
 * Client Component for month range filter
 * Uses URL search params to maintain filter state
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
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
