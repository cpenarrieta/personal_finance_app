import { prisma } from "@/lib/prisma";
import { MoveTransactionsClient } from "@/components/MoveTransactionsClient";
import type { Metadata } from "next";
import { serializeCustomCategory, type PrismaCustomCategoryWithSubcategories } from "@/types";

export const metadata: Metadata = {
  title: "Move Transactions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MoveTransactionsPage() {
  const categories = (await prisma.customCategory.findMany({
    include: {
      subcategories: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })) as PrismaCustomCategoryWithSubcategories[];

  const serializedCategories = categories.map(serializeCustomCategory);

  return <MoveTransactionsClient categories={serializedCategories} />;
}
