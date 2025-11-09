/**
 * Component prop types and UI-specific types
 *
 * This file contains types used specifically in React components.
 * All component prop types should be defined here, not in individual component files.
 */

import type { CategoryWithSubcategories } from "./api";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
  HoldingForClient,
  InvestmentTransactionForClient,
  PlaidAccountForClient,
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

export interface SplitTransactionModalProps {
  transaction: TransactionForClient;
  onClose: () => void;
  categories: CategoryForClient[];
}

export interface SplitItem {
  amount: string;
  categoryId: string | null;
  subcategoryId: string | null;
  notes: string;
  description: string;
}

export interface AddTransactionModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  categories: CategoryForClient[];
  tags: TagForClient[];
  accounts: PlaidAccountForClient[];
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

export interface TransactionActionBarProps {
  filteredTransactions: TransactionForClient[];
  totalTransactions: number;
  categories: CategoryForClient[];
  showBulkUpdate: boolean;
  onToggleBulkUpdate: () => void;
  bulkCategoryId: string;
  bulkSubcategoryId: string;
  setBulkCategoryId: (id: string) => void;
  setBulkSubcategoryId: (id: string) => void;
  selectedTransactions: Set<string>;
  isBulkUpdating: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkUpdate: () => void;
  availableSubcategories: Array<{ id: string; name: string }>;
}

export interface TransactionsPageClientProps {
  transactions: TransactionForClient[];
  categories: CategoryForClient[];
  tags: TagForClient[];
  accounts: PlaidAccountForClient[];
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

export interface CategoryOrderClientProps {
  categories: CategoryForClient[];
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

export interface AccountsMenuClientProps {
  accounts: Array<{
    id: string;
    name: string;
    item: {
      institution: {
        id: string;
        name: string;
        logoUrl: string | null;
      } | null;
    };
  }>;
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
// CHART COMPONENT TYPES
// ============================================================================

export interface DailySpendingChartProps {
  data: Array<{
    day: string;
    spending: number;
  }>;
}

export interface MonthlyTrendChartProps {
  data: Array<{
    month: string;
    spending: number;
    income: number;
  }>;
}

export interface SpendingByCategoryChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  title?: string;
}

export interface SubcategoryChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface IncomeVsExpenseChartProps {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
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

export interface TransactionChartsViewProps {
  transactions: TransactionForClient[];
  categories: CategoryForClient[];
}

export interface ChartsViewProps {
  transactions: TransactionForClient[];
  categories: CategoryForClient[];
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

export interface TransferCategoryToggleProps {
  categoryId: string;
  isTransferCategory: boolean;
  updateAction: (formData: FormData) => Promise<void>;
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

export interface GenericSyncButtonProps {
  action: () => Promise<void>;
  idleText: string;
  pendingText: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  className?: string;
  requireConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
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
// NAVIGATION & LAYOUT TYPES
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

export interface AppShellProps {
  children: React.ReactNode;
  sidebarSlot: React.ReactNode;
  breadcrumbsSlot: React.ReactNode;
}

export interface AppSidebarProps {
  accountsSlot: React.ReactNode;
  pathname: string;
}

export interface AppSidebarWithPathnameProps {
  accountsSlot: React.ReactNode;
}

export interface AppSidebarSkeletonProps {
  // No props currently
}

// ============================================================================
// SETTINGS COMPONENT TYPES
// ============================================================================

export interface ConnectedItemsListProps {
  items: Array<{
    id: string;
    plaidItemId: string;
    accessToken: string;
    status: string | null;
    created_at_string: string | null;
    institution: {
      name: string;
      logoUrl: string | null;
      shortName: string | null;
    } | null;
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string | null;
    }>;
  }>;
}

// ============================================================================
// SHARED COMPONENT TYPES
// ============================================================================

export interface ErrorFallbackProps {
  error?: Error;
  title?: string;
  description?: string;
}

export interface TransitionLinkProps {
  href: string;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  href?: string;
  valueClassName?: string;
}

// ============================================================================
// AUTH COMPONENT TYPES
// ============================================================================

export interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}
