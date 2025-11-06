import { Suspense } from "react";
import { AppShellWrapper } from "@/components/AppShellWrapper";
import { AccountsMenuAsync } from "@/components/AccountsMenuAsync";
import { AccountsMenuSkeleton } from "@/components/AccountsMenuSkeleton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShellWrapper
      accountsSlot={
        <Suspense fallback={<AccountsMenuSkeleton />}>
          <AccountsMenuAsync />
        </Suspense>
      }
    >
      <div className="w-full max-w-7xl mx-auto">{children}</div>
    </AppShellWrapper>
  );
}
