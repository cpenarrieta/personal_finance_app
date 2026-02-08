import { Suspense } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { AppSidebarWithPathname } from "@/components/layout/AppSidebarWithPathname"
import { AppSidebarSkeleton } from "@/components/layout/AppSidebarSkeleton"
import { BreadcrumbsAsync } from "@/components/layout/BreadcrumbsAsync"
import { BreadcrumbsSkeleton } from "@/components/layout/BreadcrumbsSkeleton"
import { AccountsMenuConvex } from "@/components/layout/AccountsMenuConvex"
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const accountsSlot = <AccountsMenuConvex />

  return (
    <AppShell
      sidebarSlot={
        <Suspense fallback={<AppSidebarSkeleton accountsSlot={accountsSlot} />}>
          <AppSidebarWithPathname accountsSlot={accountsSlot} />
        </Suspense>
      }
      breadcrumbsSlot={
        <Suspense fallback={<BreadcrumbsSkeleton />}>
          <BreadcrumbsAsync />
        </Suspense>
      }
    >
      <div className="w-full max-w-7xl mx-auto">{children}</div>
    </AppShell>
  )
}
