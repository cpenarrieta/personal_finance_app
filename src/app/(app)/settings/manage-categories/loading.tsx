import { SettingsPageSkeleton } from "@/components/settings/SettingsPageSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Manage Categories
        </h1>
        <p className="text-muted-foreground mt-1">
          Create and organize your categories and subcategories
        </p>
      </div>
      <SettingsPageSkeleton />
    </div>
  );
}
