"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import ConnectedItemsList from "./ConnectedItemsList"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Convex wrapper for ConnectedItemsList
 * Fetches connected items via Convex query
 */
export function ConnectedItemsListConvex() {
  const items = useQuery(api.accounts.getAllConnectedItems)

  if (items === undefined) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform to expected format
  const transformedItems = items.map((item) => ({
    id: item.id,
    status: item.status,
    institution: item.institution
      ? {
          name: item.institution.name,
          logoUrl: item.institution.logoUrl,
        }
      : null,
    accounts: item.accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype,
    })),
  }))

  return <ConnectedItemsList items={transformedItems} />
}
