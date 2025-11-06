"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

interface AppSidebarWithPathnameProps {
  accountsSlot: React.ReactNode;
}

export function AppSidebarWithPathname({ accountsSlot }: AppSidebarWithPathnameProps) {
  const pathname = usePathname();

  return <AppSidebar accountsSlot={accountsSlot} pathname={pathname} />;
}
