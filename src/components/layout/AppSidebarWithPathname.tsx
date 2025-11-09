"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import type { AppSidebarWithPathnameProps } from "@/types";

export function AppSidebarWithPathname({ accountsSlot }: AppSidebarWithPathnameProps) {
  const pathname = usePathname();

  return <AppSidebar accountsSlot={accountsSlot} pathname={pathname} />;
}
