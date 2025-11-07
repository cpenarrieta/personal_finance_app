/**
 * Cached queries for settings pages
 */

import { prisma } from "@/lib/db/prisma";
import { cacheTag, cacheLife } from "next/cache";

/**
 * Get all categories with subcategories for management
 * Cached with 24h expiration, tagged with "categories"
 */
export async function getAllCategoriesForManagement() {
  "use cache";
  cacheLife({ stale: 60 * 60 * 24 });
  cacheTag("categories");

  return prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get all tags with transaction counts
 * Cached with 24h expiration, tagged with "tags"
 */
export async function getAllTagsWithCounts() {
  "use cache";
  cacheLife({ stale: 60 * 60 * 24 });
  cacheTag("tags");

  return prisma.tag.findMany({
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Get all categories for move-transactions page
 * Cached with 24h expiration, tagged with "categories"
 */
export async function getAllCategoriesForMoveTransactions() {
  "use cache";
  cacheLife({ stale: 60 * 60 * 24 });
  cacheTag("categories");

  return prisma.category.findMany({
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
  });
}
