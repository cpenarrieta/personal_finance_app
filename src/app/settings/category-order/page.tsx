import { prisma } from "@/lib/prisma";
import { CategoryOrderClient } from "@/components/CategoryOrderClient";
import Link from "next/link";
import type { Metadata } from "next";
import type { CategoryForClient } from "@/types";

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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href="/settings/manage-categories" className="text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Category Order</h1>
        <p className="text-gray-600 mt-1">
          Organize how categories appear in dropdown lists
        </p>
      </div>

      <CategoryOrderClient categories={categories} />
    </div>
  );
}
