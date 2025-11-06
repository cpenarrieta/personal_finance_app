import { Wallet } from "lucide-react";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

export function AccountsMenuSkeleton() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="Accounts">
        <Wallet />
        <span>Accounts</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
