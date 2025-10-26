"use client";

import { useMemo } from "react";
import {
  CATEGORY_GROUPS,
  getCategoryGroup,
  getCategorySortOrder,
} from "@/config/category-groups";
import { CustomCategoryWithSubcategories } from "@/types";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: CustomCategoryWithSubcategories[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * A reusable category select dropdown that groups and sorts categories
 * according to the configuration in category-groups.ts
 */
export function CategorySelect({
  value,
  onChange,
  categories,
  placeholder = "Select a category...",
  disabled = false,
  id,
  className = "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
}: CategorySelectProps) {
  // Group and sort categories
  const groupedCategories = useMemo(() => {
    const groups = CATEGORY_GROUPS.map((group) => {
      // Filter categories that belong to this group and sort by config order
      const groupCategories = categories
        .filter((cat) => getCategoryGroup(cat.name) === group.type)
        .sort((a, b) => {
          const orderA = getCategorySortOrder(a.name);
          const orderB = getCategorySortOrder(b.name);
          return orderA - orderB;
        });

      return {
        type: group.type,
        categories: groupCategories,
      };
    }).filter((group) => group.categories.length > 0); // Only show groups with categories

    // Find uncategorized categories (not in any group config)
    const categorizedIds = new Set(
      groups.flatMap((g) => g.categories.map((c) => c.id))
    );
    const uncategorized = categories.filter(
      (cat) => !categorizedIds.has(cat.id)
    );

    // Add uncategorized categories to the Expenses group at the bottom (alphabetically sorted)
    if (uncategorized.length > 0) {
      const expensesGroup = groups.find((g) => g.type === "Expenses");
      if (expensesGroup) {
        // Add uncategorized items to end of expenses, sorted alphabetically
        expensesGroup.categories.push(
          ...uncategorized.sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        // If no expenses group exists, create one with just the uncategorized items
        groups.push({
          type: "Expenses",
          categories: uncategorized.sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        });
      }
    }

    return groups;
  }, [categories]);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      <option value="">{placeholder}</option>
      {groupedCategories.map((group) => (
        <optgroup key={group.type} label={group.type}>
          {group.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
