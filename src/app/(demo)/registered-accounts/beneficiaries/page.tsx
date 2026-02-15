import { BeneficiaryManager } from "@/components/registered-accounts/BeneficiaryManager"

export default function DemoBeneficiariesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Beneficiaries</h1>
      <BeneficiaryManager />
    </div>
  )
}
