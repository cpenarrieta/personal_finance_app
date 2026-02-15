"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"

interface AppSidebarWithPathnameProps {
  accountsSlot: React.ReactNode
  basePath?: string
  isDemo?: boolean
}

export function AppSidebarWithPathname({ accountsSlot, basePath, isDemo }: AppSidebarWithPathnameProps) {
  const pathname = usePathname()

  return <AppSidebar accountsSlot={accountsSlot} pathname={pathname} basePath={basePath} isDemo={isDemo} />
}
