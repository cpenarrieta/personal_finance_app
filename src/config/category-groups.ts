/**
 * Configuration for category grouping and ordering in dropdowns
 *
 * Categories are organized into three groups: Income, Investment, and Expenses
 * Each category name should match the exact name in the database (Category.name)
 *
 * Note: Any categories NOT listed in this config will automatically be added to the
 * Expenses group at the bottom (sorted alphabetically)
 */

import { CategoryGroupType } from "@prisma/client";

export interface CategoryGroupConfig {
  type: CategoryGroupType;
  order: string[]; // Array of category names in desired display order
}

/**
 * Category groups configuration
 * Add category names to the appropriate group in the order you want them to appear
 * IMPORTANT: Category names must match EXACTLY as they appear in the database (including emojis)
 */
export const CATEGORY_GROUPS: CategoryGroupConfig[] = [
  {
    type: CategoryGroupType.EXPENSES,
    order: [
      "🍔 Food",
      "🛒 Groceries",
      "🚗 Transportation",
      "🎭 Entertainment & Fun",
      "⚕️ Health & Wellness",
      "✈️ Vacations",
      "✨ Personal & Giving",
      "🏡 Core Housing",
      "💡 Utilities",
      "🛠️ Home Upkeep",
      "👨‍👩‍👧 Family",
      "👨‍💻 316-Software",
      "💳 Debt Repayment",
    ],
  },
  {
    type: CategoryGroupType.INCOME,
    order: ["💵 Income"],
  },
  {
    type: CategoryGroupType.INVESTMENT,
    order: ["🏦 Savings", "🔁 Transfers"],
  },
];

/**
 * Helper function to get the group type for a given category name
 */
export function getCategoryGroup(
  categoryName: string
): CategoryGroupType | null {
  for (const group of CATEGORY_GROUPS) {
    if (group.order.includes(categoryName)) {
      return group.type;
    }
  }
  return null;
}

/**
 * Helper function to get the sort order for a category within its group
 */
export function getCategorySortOrder(categoryName: string): number {
  for (const group of CATEGORY_GROUPS) {
    const index = group.order.indexOf(categoryName);
    if (index !== -1) {
      return index;
    }
  }
  return 9999; // Categories not in config appear at the end
}
