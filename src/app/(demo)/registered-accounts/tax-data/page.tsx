import { TaxDataManager } from "@/components/registered-accounts/TaxDataManager"

export default function DemoTaxDataPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tax Data</h1>
      <TaxDataManager />
    </div>
  )
}
