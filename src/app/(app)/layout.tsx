import { AppShell } from "@/components/AppShell"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <div className="w-full max-w-7xl mx-auto">{children}</div>
    </AppShell>
  )
}
