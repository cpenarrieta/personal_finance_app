import { prisma } from "@/lib/prisma";
import { MoveTransactionsClient } from "@/components/MoveTransactionsClient";
import type { Metadata } from "next";
import type { CategoryForClient } from "@/types";

export const metadata: Metadata = {
  title: "Move Transactions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MoveTransactionsPage() {
  const categories = (await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      groupType: true,
      displayOrder: true,
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
      subcategories: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true, // Generated column
          updated_at_string: true, // Generated column
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

  return <MoveTransactionsClient categories={categories} />;
}
