import { prisma } from "@/lib/prisma";
import { MoveTransactionsClient } from "@/components/MoveTransactionsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Move Transactions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MoveTransactionsPage() {
  const categories = await prisma.customCategory.findMany({
    include: {
      subcategories: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return <MoveTransactionsClient categories={categories} />;
}
