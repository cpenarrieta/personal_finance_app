"use client";

import { useState, useEffect } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const SIDEBAR_OPEN_STATE_KEY = "sidebar-open";

interface AppShellProps {
  children: React.ReactNode;
  sidebarSlot: React.ReactNode;
  breadcrumbsSlot: React.ReactNode;
}

export function AppShell({ children, sidebarSlot, breadcrumbsSlot }: AppShellProps) {
  const [open, setOpen] = useState(true);

  // Read sidebar open/closed state from localStorage after mount
  useEffect(() => {
    const storedState = localStorage.getItem(SIDEBAR_OPEN_STATE_KEY);
    if (storedState !== null) {
      setOpen(storedState === "true");
    }
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    localStorage.setItem(SIDEBAR_OPEN_STATE_KEY, String(newOpen));
  };

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      {sidebarSlot}
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbsSlot}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
