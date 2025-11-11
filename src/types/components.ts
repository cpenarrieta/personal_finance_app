/**
 * Shared data structures and types used across multiple components
 *
 * This file contains ONLY shared data structures, not component-specific props.
 * Component props should be defined inline within the component file.
 *
 * Use this file for:
 * - Shared data structures used by multiple components (e.g., SplitItem)
 * - Common type aliases (e.g., ChartDataPoint)
 * - Reusable data shapes
 *
 * DO NOT use this file for:
 * - Component-specific props (define those in the component file)
 */

// ============================================================================
// TRANSACTION SHARED TYPES
// ============================================================================

/**
 * Structure for split transaction items
 * Used by SplitTransactionModal and split transaction API
 */
export interface SplitItem {
  amount: string
  categoryId: string | null
  subcategoryId: string | null
  notes: string
  description: string
}

// ============================================================================
// CHART SHARED TYPES
// ============================================================================

/**
 * Generic chart data point structure
 */
export interface ChartDataPoint {
  name: string
  value: number
  label?: string
}

/**
 * Pie chart data structure
 */
export interface PieChartData {
  name: string
  value: number
  color?: string
}

/**
 * Bar chart data structure
 */
export interface BarChartData {
  name: string
  amount: number
  count: number
}

// ============================================================================
// FILTER & SEARCH SHARED TYPES
// ============================================================================

/**
 * Generic transaction filter structure
 */
export interface TransactionFilters {
  accountId?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  tagIds?: string[]
  startDate?: Date | null
  endDate?: Date | null
  minAmount?: number | null
  maxAmount?: number | null
  searchQuery?: string
  pending?: boolean
}

// ============================================================================
// FORM SHARED TYPES
// ============================================================================

/**
 * Form field error structure
 */
export interface FormFieldError {
  field: string
  message: string
}

/**
 * Generic form state
 */
export interface FormState<T> {
  values: T
  errors: FormFieldError[]
  isSubmitting: boolean
  isDirty: boolean
}

// ============================================================================
// UTILITY SHARED TYPES
// ============================================================================

/**
 * Loading state enum
 */
export type LoadingState = "idle" | "loading" | "success" | "error"

/**
 * Async data wrapper
 */
export interface AsyncData<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc"

/**
 * Generic sort configuration
 */
export interface SortConfig<T extends string = string> {
  field: T
  direction: SortDirection
}

// ============================================================================
// NAVIGATION SHARED TYPES
// ============================================================================

/**
 * Navigation item structure
 */
export interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: number | string
}

/**
 * Breadcrumb item structure
 */
export interface BreadcrumbItem {
  label: string
  href?: string
}
