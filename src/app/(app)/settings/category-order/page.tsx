import { Suspense } from "react";
import type { Metadata } from "next";
import { CategoryOrderAsync } from "@/components/settings/CategoryOrderAsync";
import { CategoryOrderSkeleton } from "@/components/settings/CategoryOrderSkeleton";

export const metadata: Metadata = {
  title: "Manage Category Order",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CategoryOrderPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Category Order</h1>
        <p className="text-muted-foreground mt-1">
          Organize how categories appear in dropdown lists
        </p>
      </div>

      <Suspense fallback={<CategoryOrderSkeleton />}>
        <CategoryOrderAsync />
      </Suspense>
    </div>
  );
}
