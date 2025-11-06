import { SettingsPageSkeleton } from "@/components/settings/SettingsPageSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Move Transactions Between Categories
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk move transactions from one category/subcategory to another
        </p>
      </div>
      <div className="border rounded-lg p-4">
        <SettingsPageSkeleton />
      </div>
    </div>
  );
}
