import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { AppSidebarWithPathname } from "@/components/AppSidebarWithPathname";
import { AppSidebarSkeleton } from "@/components/AppSidebarSkeleton";
import { BreadcrumbsAsync } from "@/components/BreadcrumbsAsync";
import { BreadcrumbsSkeleton } from "@/components/BreadcrumbsSkeleton";
import { AccountsMenuAsync } from "@/components/AccountsMenuAsync";
import { AccountsMenuSkeleton } from "@/components/AccountsMenuSkeleton";

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
