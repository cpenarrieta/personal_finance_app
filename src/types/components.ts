/**
 * Component prop types and UI-specific types
 *
 * This file contains types used specifically in React components
 */

import type { CategoryWithSubcategories } from "./api";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
  HoldingForClient,
  InvestmentTransactionForClient,
} from "./client";
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params";

// ============================================================================
// TRANSACTION COMPONENT TYPES
// ============================================================================

export interface TransactionListProps {
  transactions: TransactionForClient[];
  showAccount?: boolean;
}

export interface TransactionItemProps {
  transaction: TransactionForClient;
  onClick?: (transaction: TransactionForClient) => void;
}

export interface TransactionDetailViewProps {
  transaction: TransactionForClient;
  categories: CategoryForClient[];
  tags: TagForClient[];
}

export interface EditTransactionModalProps {
  transaction: TransactionForClient;
  onClose: () => void;
  onSuccess?: () => void;
  categories: CategoryForClient[];
  tags: TagForClient[];
}

export interface SearchableTransactionListProps {
  transactions: TransactionForClient[];
  showAccount?: boolean;
  categories: CategoryForClient[];
  tags: TagForClient[];
  accounts?: Array<{
    id: string;
    name: string;
    type: string;
    mask?: string | null;
  }>;
  initialFilters?: TransactionFiltersFromUrl;
}

// ============================================================================
// CATEGORY COMPONENT TYPES
// ============================================================================

export interface CategorySelectorProps {
  categories: CategoryWithSubcategories[];
  selectedCategoryId?: string | null;
  selectedSubcategoryId?: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onSubcategoryChange: (subcategoryId: string | null) => void;
}

export interface CategoryBadgeProps {
  category: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
  subcategory?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// TAG COMPONENT TYPES
// ============================================================================

export interface TagSelectorProps {
  availableTags: TagForClient[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag?: () => void;
}

export interface TagBadgeProps {
  tag: TagForClient;
  size?: "sm" | "md" | "lg";
  onRemove?: (tagId: string) => void;
}

export interface TagListProps {
  tags: TagForClient[];
  onTagClick?: (tag: TagForClient) => void;
}

// ============================================================================
// ACCOUNT COMPONENT TYPES
// ============================================================================

export interface AccountCardProps {
  account: {
    id: string;
    name: string;
    officialName?: string | null;
    type: string;
    subtype?: string | null;
    mask?: string | null;
    currentBalance?: string | null;
    availableBalance?: string | null;
    creditLimit?: string | null;
    balanceUpdatedAt?: string | null;
  };
  onClick?: (accountId: string) => void;
}

export interface AccountSelectorProps {
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    mask?: string | null;
  }>;
  selectedAccountId?: string | null;
  onAccountChange: (accountId: string | null) => void;
}

// ============================================================================
// INVESTMENT COMPONENT TYPES
// ============================================================================

export interface HoldingListProps {
  holdings: HoldingForClient[];
}

export interface HoldingItemProps {
  holding: HoldingForClient;
  onClick?: (holding: HoldingForClient) => void;
}

export interface InvestmentTransactionListProps {
  transactions: InvestmentTransactionForClient[];
}

export interface InvestmentTransactionItemProps {
  transaction: InvestmentTransactionForClient;
  onClick?: (transaction: InvestmentTransactionForClient) => void;
}

// ============================================================================
// ANALYTICS COMPONENT TYPES
// ============================================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
}

export interface TransactionAnalyticsProps {
  transactions: TransactionForClient[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface BarChartData {
  name: string;
  amount: number;
  count: number;
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export interface TransactionFilters {
  accountId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  tagIds?: string[];
  startDate?: Date | null;
  endDate?: Date | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  searchQuery?: string;
  pending?: boolean;
}

export interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

export interface AmountRangeInputProps {
  minAmount?: number | null;
  maxAmount?: number | null;
  onMinAmountChange: (amount: number | null) => void;
  onMaxAmountChange: (amount: number | null) => void;
}

// ============================================================================
// BUTTON & ACTION COMPONENT TYPES
// ============================================================================

export interface SyncButtonProps {
  onSyncComplete?: () => void;
  disabled?: boolean;
}

export interface DeleteButtonProps {
  itemId: string;
  itemType: "transaction" | "category" | "tag" | "account";
  onDeleteComplete?: () => void;
  confirmMessage?: string;
}

export interface CategorizeButtonProps {
  transactionId?: string;
  onCategorizeComplete?: () => void;
}

// ============================================================================
// MODAL & DIALOG TYPES
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: FormFieldError[];
  isSubmitting: boolean;
  isDirty: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig<T extends string = string> {
  field: T;
  direction: SortDirection;
}

// ============================================================================
// PLAID COMPONENT TYPES
// ============================================================================

export interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  onExit?: () => void;
  children?: React.ReactNode;
  className?: string;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}
