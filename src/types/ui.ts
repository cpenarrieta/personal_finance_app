/**
 * UI State and Control Flow Types
 *
 * This file contains types for UI state management, control flow, and user interactions.
 * These are types that control how the UI behaves, not the data itself.
 */

// ============================================================================
// DATE RANGE TYPES
// ============================================================================

/**
 * Date range options for analytics and charts
 * Used across multiple chart and analytics components
 */
export type DateRange = "7d" | "30d" | "90d" | "1y" | "all" | "custom"

export interface DateRangeOption {
  value: DateRange
  label: string
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
]

// ============================================================================
// THEME TYPES
// ============================================================================

/**
 * Theme mode
 */
export type ThemeMode = "light" | "dark" | "system"

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Helper to get date range label
 */
export function getDateRangeLabel(range: DateRange): string {
  const option = DATE_RANGE_OPTIONS.find((opt) => opt.value === range)
  return option?.label ?? "Unknown"
}
