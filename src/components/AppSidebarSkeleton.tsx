import { Wallet } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AppSidebarSkeletonProps {
  accountsSlot: React.ReactNode;
}

export function AppSidebarSkeleton({ accountsSlot }: AppSidebarSkeletonProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
            Personal Finance
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Static menu items without active states */}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard">
                  <Skeleton className="h-5 w-5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Transactions">
                  <Skeleton className="h-5 w-5" />
                  <span>Transactions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Accounts slot */}
              {accountsSlot}

              {/* Rest of menu items */}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Investments">
                  <Skeleton className="h-5 w-5" />
                  <span>Investments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings">
                  <Skeleton className="h-5 w-5" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="space-y-2 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Button variant="link" className="w-full text-destructive" disabled>
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
