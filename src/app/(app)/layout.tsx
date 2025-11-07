import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppSidebarWithPathname } from "@/components/layout/AppSidebarWithPathname";
import { AppSidebarSkeleton } from "@/components/layout/AppSidebarSkeleton";
import { BreadcrumbsAsync } from "@/components/layout/BreadcrumbsAsync";
import { BreadcrumbsSkeleton } from "@/components/layout/BreadcrumbsSkeleton";
import { AccountsMenuAsync } from "@/components/layout/AccountsMenuAsync";
import { AccountsMenuSkeleton } from "@/components/layout/AccountsMenuSkeleton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accountsSlot = (
    <Suspense fallback={<AccountsMenuSkeleton />}>
      <AccountsMenuAsync />
    </Suspense>
  );

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
  );
}
