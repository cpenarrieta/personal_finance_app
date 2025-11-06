"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

function AppShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* Simple sidebar skeleton without hooks */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </aside>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <Skeleton className="h-8 w-8" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Skeleton className="h-4 w-32" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface AppShellWrapperProps {
  children: React.ReactNode;
  accountsSlot: React.ReactNode;
}

export function AppShellWrapper({ children, accountsSlot }: AppShellWrapperProps) {
  return (
    <Suspense fallback={<AppShellFallback>{children}</AppShellFallback>}>
      <AppShell accountsSlot={accountsSlot}>
        {children}
      </AppShell>
    </Suspense>
  );
}
