"use client";

import { useMemo } from "react";
import { CategoryForClient } from "@/types";

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
 * A reusable category select dropdown that displays all categories alphabetically
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
  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
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
      {sortedCategories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  );
}
