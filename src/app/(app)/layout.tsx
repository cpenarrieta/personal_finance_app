import { cookies } from "next/headers"
import { AppShell } from "@/components/AppShell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar-open")
  const defaultOpen = sidebarCookie ? sidebarCookie.value === "true" : true

  return (
    <AppShell defaultOpen={defaultOpen}>
      <div className="w-full max-w-7xl mx-auto">{children}</div>
    </AppShell>
  )
}
