import { Suspense } from "react"
import { DemoConvexProvider } from "@/components/providers/demo-convex-provider"
import { DemoProvider } from "@/components/demo/DemoContext"
import { DemoBanner } from "@/components/demo/DemoBanner"
import { AppShell } from "@/components/layout/AppShell"
import { AppSidebarWithPathname } from "@/components/layout/AppSidebarWithPathname"
import { AppSidebarSkeleton } from "@/components/layout/AppSidebarSkeleton"
import { BreadcrumbsAsync } from "@/components/layout/BreadcrumbsAsync"
import { BreadcrumbsSkeleton } from "@/components/layout/BreadcrumbsSkeleton"
import { AccountsMenuConvex } from "@/components/layout/AccountsMenuConvex"

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const accountsSlot = <AccountsMenuConvex basePath="/demo" isDemo />

  return (
    <DemoConvexProvider>
      <DemoProvider>
        <DemoBanner />
        <AppShell
          sidebarSlot={
            <Suspense fallback={<AppSidebarSkeleton accountsSlot={accountsSlot} />}>
              <AppSidebarWithPathname accountsSlot={accountsSlot} basePath="/demo" isDemo />
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
      </DemoProvider>
    </DemoConvexProvider>
  )
}
