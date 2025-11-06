"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SIDEBAR_COOKIE_NAME,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface AppShellProps {
  children: React.ReactNode;
  sidebarSlot: React.ReactNode;
  breadcrumbsSlot: React.ReactNode;
}

export function AppShell({ children, sidebarSlot, breadcrumbsSlot }: AppShellProps) {
  const [open, setOpen] = useState(true);

  // Read sidebar state from cookie after mount
  useEffect(() => {
    const sidebarCookie = Cookies.get(SIDEBAR_COOKIE_NAME);
    if (sidebarCookie !== undefined) {
      setOpen(sidebarCookie === "true");
    }
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { expires: 365 });
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
