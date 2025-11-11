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
// CHART TYPES
// ============================================================================

/**
 * Available chart tabs for chart views
 */
export type ChartTab = "spending" | "category" | "subcategory" | "monthly" | "daily"

/**
 * Chart view modes
 */
export type ChartViewMode = "bar" | "line" | "pie" | "area"

// ============================================================================
// HOLDINGS/INVESTMENTS UI TYPES
// ============================================================================

/**
 * Holdings grouping options
 */
export type HoldingsGroupBy = "account" | "type" | "none"

/**
 * Holdings sorting options
 */
export type HoldingsSortBy = "value-desc" | "value-asc" | "name-asc" | "name-desc" | "quantity-desc" | "quantity-asc"

// ============================================================================
// VIEW STATE TYPES
// ============================================================================

/**
 * Generic view state for components
 */
export type ViewState = "grid" | "list" | "table"

/**
 * Pagination state
 */
export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

/**
 * Selection state for bulk operations
 */
export interface SelectionState<T = string> {
  selectedIds: Set<T>
  isAllSelected: boolean
}

// ============================================================================
// MODAL STATE TYPES
// ============================================================================

/**
 * Modal state for managing open/closed state
 */
export interface ModalState {
  isOpen: boolean
  data?: unknown
}

/**
 * Dialog action types
 */
export type DialogAction = "create" | "edit" | "delete" | "view"

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

/**
 * Generic filter state
 */
export interface FilterState {
  isActive: boolean
  hasActiveFilters: boolean
}

/**
 * Sort state
 */
export interface SortState<T extends string = string> {
  field: T
  direction: "asc" | "desc"
}

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

/**
 * Helper to create initial pagination state
 */
export function createPaginationState(pageSize: number = 50): PaginationState {
  return {
    page: 1,
    pageSize,
    total: 0,
  }
}

/**
 * Helper to create initial selection state
 */
export function createSelectionState<T = string>(): SelectionState<T> {
  return {
    selectedIds: new Set(),
    isAllSelected: false,
  }
}
