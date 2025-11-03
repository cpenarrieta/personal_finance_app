import { prisma } from "@/lib/prisma";
import { CategoryOrderClient } from "@/components/CategoryOrderClient";
import type { Metadata } from "next";
import type { CategoryForClient } from "@/types";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Manage Category Order",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CategoryOrderPage() {
  const categories = (await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      groupType: true,
      displayOrder: true,
      created_at_string: true,
      updated_at_string: true,
      subcategories: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [
      { groupType: "asc" },
      { displayOrder: "asc" },
      { name: "asc" },
    ],
  })) as CategoryForClient[];

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings" },
        { label: "Category Order" },
      ]}
    >
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Manage Category Order</h1>
          <p className="text-muted-foreground mt-1">
            Organize how categories appear in dropdown lists
          </p>
        </div>

        <CategoryOrderClient categories={categories} />
      </div>
    </AppShell>
  );
}
