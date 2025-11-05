import { cookies } from "next/headers"
import { AppShell } from "@/components/AppShell"
import { prisma } from "@/lib/prisma"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar-open")
  const defaultOpen = sidebarCookie ? sidebarCookie.value === "true" : true

  // Fetch accounts with their institutions for the sidebar
  const accounts = await prisma.plaidAccount.findMany({
    include: {
      item: {
        include: {
          institution: true,
        },
      },
    },
    orderBy: [
      { item: { institution: { name: "asc" } } },
      { name: "asc" },
    ],
  })

  return (
    <AppShell defaultOpen={defaultOpen} accounts={accounts}>
      <div className="w-full max-w-7xl mx-auto">{children}</div>
    </AppShell>
  )
}
