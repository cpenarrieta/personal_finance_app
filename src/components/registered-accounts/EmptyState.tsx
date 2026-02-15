"use client"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PiggyBank } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { useIsDemo } from "@/components/demo/DemoContext"

export function EmptyState() {
  const seedAccounts = useMutation(api.registeredAccounts.seedAccounts)
  const isDemo = useIsDemo()
  const [loading, setLoading] = useState(false)

  const handleSeed = async () => {
    setLoading(true)
    try {
      const result = await seedAccounts()
      if (result.seeded) {
        toast.success(result.message)
      } else {
        toast.info(result.message)
      }
    } catch {
      toast.error("Failed to set up accounts")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Registered Accounts</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Set up your RRSP, TFSA, and RESP accounts to track contribution room and avoid over-contribution penalties.
        </p>
        <Button onClick={handleSeed} disabled={loading || isDemo}>
          {loading ? "Setting up..." : "Set Up Accounts"}
        </Button>
      </CardContent>
    </Card>
  )
}
