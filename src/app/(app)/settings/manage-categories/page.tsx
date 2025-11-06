import { Suspense } from "react";
import type { Metadata } from "next";
import { ManageCategoriesAsync } from "@/components/settings/ManageCategoriesAsync";
import { ManageCategoriesSkeleton } from "@/components/settings/ManageCategoriesSkeleton";

export const metadata: Metadata = {
  title: "Manage Categories",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ManageCategoriesPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Manage Categories
        </h1>
        <p className="text-muted-foreground mt-1">
          Create and organize your categories and subcategories
        </p>
      </div>

      <Suspense fallback={<ManageCategoriesSkeleton />}>
        <ManageCategoriesAsync />
      </Suspense>
    </div>
  );
}
