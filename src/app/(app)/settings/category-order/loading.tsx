import { SettingsPageSkeleton } from "@/components/settings/SettingsPageSkeleton"

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Category Order</h1>
        <p className="text-muted-foreground mt-1">Organize how categories appear in dropdown lists</p>
      </div>
      <SettingsPageSkeleton />
    </div>
  )
}
