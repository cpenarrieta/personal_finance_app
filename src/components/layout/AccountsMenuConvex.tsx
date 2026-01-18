"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { AccountsMenuClient } from "./AccountsMenuClient"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { Wallet } from "lucide-react"

function AccountsMenuSkeleton() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton disabled>
        <Wallet className="opacity-50" />
        <Skeleton className="h-4 w-16" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AccountsMenuConvex() {
  const accountsData = useQuery(api.accounts.getAllWithInstitution)

  if (accountsData === undefined) {
    return <AccountsMenuSkeleton />
  }

  // Transform Convex data to match AccountsMenuClient format
  const accounts = accountsData.map((acc) => ({
    id: acc.id as string,
    name: acc.name,
    type: acc.type,
    mask: acc.mask,
    item: {
      institution: acc.item?.institution
        ? {
            id: acc.item.institution.id as string,
            name: acc.item.institution.name,
            logoUrl: acc.item.institution.logoUrl,
          }
        : null,
    },
  }))

  return <AccountsMenuClient accounts={accounts} />
}
