"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { revalidatePageCache } from "@/app/actions/cache"

export function RefreshButton() {
  const router = useRouter()
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Revalidate the cache for the current path
      await revalidatePageCache(pathname)
      // Refresh the router to re-fetch data
      router.refresh()
    } catch (error) {
      console.error("Error refreshing page:", error)
    } finally {
      // Keep the loading state for a bit to ensure refresh completes
      setTimeout(() => {
        setIsRefreshing(false)
      }, 500)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="ml-auto"
      title="Refresh page and clear cache"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  )
}
