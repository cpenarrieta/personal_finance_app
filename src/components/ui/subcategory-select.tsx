"use client";

import { useMemo } from "react";
import { CategoryForClient, SubcategoryForClient } from "@/types";

interface SubcategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: CategoryForClient[];
  categoryId: string | null;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  showAllOption?: boolean; // For MoveTransactions: "All subcategories"
  showNullOption?: boolean; // For MoveTransactions: "No subcategory"
}

/**
 * A reusable subcategory select dropdown that shows subcategories
 * for the selected category
 */
export function SubcategorySelect({
  value,
  onChange,
  categories,
  categoryId,
  placeholder = "None",
  disabled = false,
  id,
  className = "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
  showAllOption = false,
  showNullOption = false,
}: SubcategorySelectProps) {
  // Get subcategories for the selected category
  const availableSubcategories = useMemo<SubcategoryForClient[]>(() => {
    if (!categoryId) return [];
    const category = categories.find((c) => c.id === categoryId);
    return category?.subcategories || [];
  }, [categoryId, categories]);

  // Disable if no category is selected
  const isDisabled = disabled || !categoryId;

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isDisabled}
      className={className}
    >
      {/* Show either placeholder or special options, not both */}
      {!showAllOption && !showNullOption && (
        <option value="">{placeholder}</option>
      )}
      {showAllOption && <option value="">All subcategories</option>}
      {showNullOption && <option value="null">No subcategory</option>}
      {availableSubcategories.map((sub) => (
        <option key={sub.id} value={sub.id}>
          {sub.name}
        </option>
      ))}
    </select>
  );
}
