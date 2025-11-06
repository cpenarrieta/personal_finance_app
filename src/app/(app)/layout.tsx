import { AppShell } from "@/components/AppShell";
import { getAllAccountsWithInstitution } from "@/lib/cached-queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accounts = await getAllAccountsWithInstitution();

  return (
    <AppShell accounts={accounts}>
      <div className="w-full max-w-7xl mx-auto">{children}</div>
    </AppShell>
  );
}
