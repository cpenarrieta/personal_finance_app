import { SettingsPageSkeleton } from "@/components/settings/SettingsPageSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Manage Tags</h1>
        <p className="text-muted-foreground mt-1">
          Create and organize tags to categorize your transactions
        </p>
      </div>
      <SettingsPageSkeleton />
    </div>
  );
}
