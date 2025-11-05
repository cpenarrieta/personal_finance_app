"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Cookies from "js-cookie"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { generateBreadcrumbs } from "@/lib/breadcrumbs"

interface AppShellProps {
  children: React.ReactNode
  defaultOpen?: boolean
  accounts: Array<{
    id: string
    name: string
    item: {
      institution: {
        id: string
        name: string
        logoUrl: string | null
      } | null
    }
  }>
}

export function AppShell({ children, defaultOpen = true, accounts }: AppShellProps) {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)
  const [open, setOpen] = useState(defaultOpen)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    Cookies.set("sidebar-open", String(newOpen), { expires: 365 })
  }

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <AppSidebar accounts={accounts} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
