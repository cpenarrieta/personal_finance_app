"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wallet, Plus, Building2, ChevronDown } from "lucide-react"
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface AccountsMenuClientProps {
  accounts: Array<{
    id: string
    name: string
    type: string
    mask: string | null
    item: {
      institution: {
        id: string
        name: string
        logoUrl: string | null
      } | null
    }
  }>
}

type Account = AccountsMenuClientProps["accounts"][number]

export function AccountsMenuClient({ accounts }: AccountsMenuClientProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const [isOpen, setIsOpen] = useState(false)
  const [openInstitutions, setOpenInstitutions] = useState<Record<string, boolean>>({})

  // Group accounts by institution
  const accountsByInstitution = accounts.reduce(
    (acc: Record<string, Account[]>, account: Account) => {
      const institutionName = account.item.institution?.name || "Unknown Bank"
      if (!acc[institutionName]) {
        acc[institutionName] = []
      }
      acc[institutionName].push(account)
      return acc
    },
    {} as Record<string, Account[]>,
  )

  // Auto-expand if on an account page
  useEffect(() => {
    if (pathname === "/accounts" || pathname.startsWith("/accounts/") || pathname === "/connect-account") {
      setIsOpen(true)

      // Auto-expand the institution that contains the current account
      Object.entries(accountsByInstitution).forEach(([institutionName, institutionAccounts]) => {
        const hasActiveAccount = institutionAccounts.some((account) => pathname === `/accounts/${account.id}`)
        if (hasActiveAccount) {
          setOpenInstitutions((prev) => ({ ...prev, [institutionName]: true }))
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isAccountsActive =
    pathname === "/accounts" || pathname.startsWith("/accounts/") || pathname === "/connect-account"

  const toggleInstitution = (institutionName: string) => {
    setOpenInstitutions((prev) => ({ ...prev, [institutionName]: !prev[institutionName] }))
  }

  // When sidebar is collapsed, clicking should navigate to /accounts
  // When expanded, clicking should toggle the menu
  const isCollapsed = state === "collapsed"

  return (
    <SidebarMenuItem>
      {isCollapsed ? (
        <SidebarMenuButton asChild isActive={isAccountsActive} tooltip="Accounts">
          <Link href="/accounts">
            <Wallet />
            <span>Accounts</span>
          </Link>
        </SidebarMenuButton>
      ) : (
        <>
          <SidebarMenuButton onClick={() => setIsOpen(!isOpen)} isActive={isAccountsActive} tooltip="Accounts">
            <Wallet />
            <span>Accounts</span>
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </SidebarMenuButton>
          {isOpen && (
            <SidebarMenuSub>
              {/* Connect Account */}
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild isActive={pathname === "/connect-account"}>
                  <Link href="/connect-account">
                    <Plus className="h-4 w-4" />
                    <span>Connect Account</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>

              {/* Institutions with accounts */}
              {Object.entries(accountsByInstitution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([institutionName, institutionAccounts]) => (
                  <SidebarMenuSubItem key={institutionName}>
                    <SidebarMenuSubButton
                      onClick={() => toggleInstitution(institutionName)}
                      isActive={institutionAccounts.some((account) => pathname === `/accounts/${account.id}`)}
                    >
                      <Building2 className="h-4 w-4" />
                      <span>{institutionName}</span>
                      <ChevronDown
                        className={`ml-auto h-3 w-3 transition-transform ${
                          openInstitutions[institutionName] ? "rotate-180" : ""
                        }`}
                      />
                    </SidebarMenuSubButton>
                    {openInstitutions[institutionName] && (
                      <SidebarMenuSub>
                        {institutionAccounts.map((account) => (
                          <SidebarMenuSubItem key={account.id}>
                            <SidebarMenuSubButton asChild isActive={pathname === `/accounts/${account.id}`}>
                              <Link href={`/accounts/${account.id}`}>
                                <span>{account.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuSubItem>
                ))}
            </SidebarMenuSub>
          )}
        </>
      )}
    </SidebarMenuItem>
  )
}
