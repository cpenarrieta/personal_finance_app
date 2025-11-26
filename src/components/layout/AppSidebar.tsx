"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Home,
  Receipt,
  TrendingUp,
  Settings,
  ChevronDown,
  RefreshCw,
  Moon,
  Sun,
  Bot,
  ClipboardCheck,
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
  useSidebar,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { LogoutButton } from "@/components/auth/LogoutButton"

interface AppSidebarProps {
  accountsSlot: React.ReactNode
  pathname: string
}

// Static nav items (accounts section will be passed as slot)
const getStaticNavItems = () => {
  return [
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
      title: "Review Transactions",
      href: "/review-transactions",
      icon: ClipboardCheck,
    },
    {
      title: "Investments",
      icon: TrendingUp,
      defaultHref: "/investments/holdings",
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
      title: "AI Chat",
      href: "/chat",
      icon: Bot,
    },
    {
      title: "Settings",
      icon: Settings,
      defaultHref: "/settings/connections",
      items: [
        {
          title: "Connections",
          href: "/settings/connections",
        },
        {
          title: "Security",
          href: "/settings/security",
        },
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
}

function SyncDropdown() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [syncing, setSyncing] = useState(false)
  const [showReauthModal, setShowReauthModal] = useState(false)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSync = async (endpoint: string, label: string) => {
    setSyncing(true)
    setOpen(false)
    const toastId = toast.loading(`${label}...`)

    try {
      const response = await fetch(endpoint, { method: "POST" })

      if (response.ok) {
        toast.success(`${label} completed!`, { id: toastId })
        router.refresh()
      } else {
        // Check if it's a reauth error
        const errorData = await response.json().catch(() => null)
        if (errorData?.errorCode === "ITEM_LOGIN_REQUIRED") {
          toast.dismiss(toastId)
          setShowReauthModal(true)
          return
        }
        toast.error(`${label} failed`, { id: toastId })
      }
    } catch (error) {
      toast.error(`${label} failed`, { id: toastId })
    } finally {
      setSyncing(false)
    }
  }

  const handleReauthClick = () => {
    setShowReauthModal(false)
    router.push("/settings/connections")
  }

  if (!mounted) {
    return (
      <Button
        variant="outline"
        className="w-full justify-between group-data-[collapsible=icon]:justify-center"
        disabled
      >
        <span className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sync</span>
        </span>
        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
      </Button>
    )
  }

  // Mobile: Sheet (bottom drawer)
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between group-data-[collapsible=icon]:justify-center"
              disabled={syncing}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                <span className="group-data-[collapsible=icon]:hidden">Sync</span>
              </span>
              <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="px-4 pb-8">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">Sync Financial Data</SheetTitle>
            </SheetHeader>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSync("/api/plaid/sync", "Syncing all")}
                disabled={syncing}
                className="w-full h-14 text-base justify-start"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Sync All
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSync("/api/plaid/sync-transactions", "Syncing transactions")}
                disabled={syncing}
                className="w-full h-14 text-base justify-start"
              >
                <Receipt className="h-5 w-5 mr-3" />
                Sync Transactions Only
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSync("/api/plaid/sync-investments", "Syncing investments")}
                disabled={syncing}
                className="w-full h-14 text-base justify-start"
              >
                <TrendingUp className="h-5 w-5 mr-3" />
                Sync Investments Only
              </Button>
              <Separator className="my-2" />
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSync("/api/plaid/sync-from-scratch", "Running fresh sync")}
                disabled={syncing}
                className="w-full h-14 text-base justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Fresh Sync (Emergency)
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <AlertDialog open={showReauthModal} onOpenChange={setShowReauthModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reauthorization Required</AlertDialogTitle>
              <AlertDialogDescription>
                Your financial institution requires you to sign in again. This is normal and happens when your login
                credentials or session expires.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReauthClick}>Go to Connections</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Desktop: Dropdown Menu
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between group-data-[collapsible=icon]:justify-center"
            disabled={syncing}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              <span className="group-data-[collapsible=icon]:hidden">Sync</span>
            </span>
            <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleSync("/api/plaid/sync", "Syncing all")} disabled={syncing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSync("/api/plaid/sync-transactions", "Syncing transactions")}
            disabled={syncing}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Sync Transactions Only
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSync("/api/plaid/sync-investments", "Syncing investments")}
            disabled={syncing}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Sync Investments Only
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleSync("/api/plaid/sync-from-scratch", "Running fresh sync")}
            disabled={syncing}
            className="text-destructive focus:text-destructive"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Fresh Sync (Emergency)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={showReauthModal} onOpenChange={setShowReauthModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reauthorization Required</AlertDialogTitle>
            <AlertDialogDescription>
              Your financial institution requires you to sign in again. This is normal and happens when your login
              credentials or session expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReauthClick}>Go to Connections</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
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
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export function AppSidebar({ accountsSlot, pathname }: AppSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const navItems = useMemo(() => getStaticNavItems(), [])

  // Auto-expand menu if current path matches
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {}

    navItems.forEach((item) => {
      if (item.items) {
        const hasActiveSubItem = item.items.some((subItem) => pathname === subItem.href)
        if (hasActiveSubItem) {
          newOpenMenus[item.title] = true
        }
      }
    })

    // Auto-expand Accounts menu if on an account page
    if (pathname === "/accounts" || pathname.startsWith("/accounts/") || pathname === "/connect-account") {
      newOpenMenus["Accounts"] = true
    }

    setOpenMenus(newOpenMenus)
  }, [pathname, navItems])

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-2 hover:opacity-80 transition-opacity"
          onClick={handleLinkClick}
        >
          <Image src="/app_logo.svg" alt="Logo" width={24} height={24} className="h-6 w-6" />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">Personal Finance</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, idx) => {
                const isActive = item.href
                  ? pathname === item.href
                  : item.items?.some((subItem) => pathname === subItem.href)

                const isCollapsed = state === "collapsed"

                const menuItem = item.items ? (
                  <SidebarMenuItem key={item.title}>
                    {isCollapsed ? (
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={(item as any).defaultHref || item.items[0]?.href || "#"} onClick={handleLinkClick}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleMenu(item.title)}
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronDown
                            className={`ml-auto h-4 w-4 transition-transform ${openMenus[item.title] ? "rotate-180" : ""}`}
                          />
                        </SidebarMenuButton>
                        {openMenus[item.title] && (
                          <SidebarMenuSub>
                            {item.items.map((subItem, index) => (
                              <SidebarMenuSubItem key={subItem.href || `${subItem.title}-${index}`}>
                                <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                  <Link href={subItem.href!} onClick={handleLinkClick}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    )}
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href!} onClick={handleLinkClick}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )

                // Insert accounts slot after Review Transactions (idx === 2)
                return (
                  <React.Fragment key={item.title}>
                    {menuItem}
                    {idx === 2 && accountsSlot}
                  </React.Fragment>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="space-y-2 p-2">
          <SyncDropdown />
          <ThemeToggle />
          <LogoutButton
            variant="ghost"
            className="w-full text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
