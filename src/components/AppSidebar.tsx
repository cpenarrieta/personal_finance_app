"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Receipt,
  Wallet,
  TrendingUp,
  Settings,
  ChevronDown,
  RefreshCw,
  Moon,
  Sun,
} from "lucide-react"
import { toast } from "sonner"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: Receipt,
  },
  {
    title: "Accounts",
    href: "/accounts",
    icon: Wallet,
  },
  {
    title: "Investments",
    icon: TrendingUp,
    items: [
      {
        title: "Holdings",
        href: "/investments/holdings",
      },
      {
        title: "Transactions",
        href: "/investments/transactions",
      },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      {
        title: "Categories",
        href: "/settings/manage-categories",
      },
      {
        title: "Category Order",
        href: "/settings/category-order",
      },
      {
        title: "Tags",
        href: "/settings/manage-tags",
      },
      {
        title: "Move Transactions",
        href: "/settings/move-transactions",
      },
    ],
  },
]

function SyncDropdown() {
  const router = useRouter()
  const [syncing, setSyncing] = React.useState(false)

  const handleSync = async (endpoint: string, label: string) => {
    setSyncing(true)
    const toastId = toast.loading(`${label}...`)

    try {
      const response = await fetch(endpoint, { method: "POST" })

      if (response.ok) {
        toast.success(`${label} completed!`, { id: toastId })
        router.refresh()
      } else {
        toast.error(`${label} failed`, { id: toastId })
      }
    } catch (error) {
      toast.error(`${label} failed`, { id: toastId })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between group-data-[collapsible=icon]:justify-center"
          disabled={syncing}
        >
          <span className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="group-data-[collapsible=icon]:hidden">Sync</span>
          </span>
          <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56">
        <DropdownMenuItem
          onClick={() => handleSync("/api/plaid/sync", "Syncing all")}
          disabled={syncing}
        >
          Sync All
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSync("/api/plaid/sync-transactions", "Syncing transactions")}
          disabled={syncing}
        >
          Sync Transactions Only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSync("/api/plaid/sync-investments", "Syncing investments")}
          disabled={syncing}
        >
          Sync Investments Only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSync("/api/plaid/sync-from-scratch", "Running fresh sync")}
          disabled={syncing}
          className="text-destructive"
        >
          Fresh Sync (Emergency)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-full">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})

  // Auto-expand menu if current path matches
  React.useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {}
    navItems.forEach((item) => {
      if (item.items) {
        const isActive = item.items.some((subItem) => pathname === subItem.href)
        if (isActive) {
          newOpenMenus[item.title] = true
        }
      }
    })
    setOpenMenus(newOpenMenus)
  }, [pathname])

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
            Personal Finance
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.href
                  ? pathname === item.href
                  : item.items?.some((subItem) => pathname === subItem.href)

                if (item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => toggleMenu(item.title)}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronDown
                          className={`ml-auto h-4 w-4 transition-transform ${
                            openMenus[item.title] ? "rotate-180" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                      {openMenus[item.title] && (
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link href={subItem.href}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href!}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="space-y-2 p-2">
          <SyncDropdown />
          <ThemeToggle />
          <form action="/api/auth/sign-out" method="POST">
            <Button type="submit" variant="link" className="w-full text-destructive">
              Logout
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
