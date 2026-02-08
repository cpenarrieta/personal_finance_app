import { RegisteredAccountsSummary } from "@/components/registered-accounts/RegisteredAccountsSummary"

export default function RegisteredAccountsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registered Accounts</h1>
      <RegisteredAccountsSummary />
    </div>
  )
}
