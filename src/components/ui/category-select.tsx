"use client";

import { useMemo } from "react";
import { CategoryForClient, CategoryGroupType } from "@/types";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: CategoryForClient[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * A reusable category select dropdown that groups and sorts categories
 * according to groupType and displayOrder from the database
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
  // Group and sort categories by groupType and displayOrder
  const groupedCategories = useMemo(() => {
    // Group categories by groupType
    const grouped = new Map<CategoryGroupType, CategoryForClient[]>();

    for (const category of categories) {
      const groupType = category.groupType || CategoryGroupType.EXPENSES;
      if (!grouped.has(groupType)) {
        grouped.set(groupType, []);
      }
      grouped.get(groupType)!.push(category);
    }

    // Sort categories within each group by displayOrder
    for (const [, cats] of grouped) {
      cats.sort((a, b) => {
        const orderA = a.displayOrder ?? 9999;
        const orderB = b.displayOrder ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name); // Fallback to name if same order
      });
    }

    // Define group order
    const groupOrder = [CategoryGroupType.EXPENSES, CategoryGroupType.INCOME, CategoryGroupType.INVESTMENT];

    // Return groups in the defined order
    return groupOrder
      .filter((groupType) => grouped.has(groupType))
      .map((groupType) => ({
        type: groupType,
        categories: grouped.get(groupType)!,
      }));
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
