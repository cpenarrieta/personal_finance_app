"use client"

import dynamic from "next/dynamic"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface AppShellProps {
  children: React.ReactNode
  sidebarSlot: React.ReactNode
  breadcrumbsSlot: React.ReactNode
}

function RefreshButtonSkeleton() {
  return (
    <Button variant="ghost" size="icon" disabled className="ml-auto">
      <RefreshCw className="h-4 w-4" />
    </Button>
  )
}

const RefreshButton = dynamic(() => import("@/components/layout/RefreshButton").then((mod) => ({ default: mod.RefreshButton })), {
  ssr: false,
  loading: () => <RefreshButtonSkeleton />,
})

export function AppShell({ children, sidebarSlot, breadcrumbsSlot }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      {sidebarSlot}
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbsSlot}
          <RefreshButton />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
