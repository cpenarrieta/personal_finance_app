"use client";

import { useState, useMemo, useEffect, useRef, RefObject } from "react";
import { format } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EditTransactionModal } from "./EditTransactionModal";
import { TransactionItem } from "./TransactionItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  SearchableTransactionListProps,
  TransactionForClient,
} from "@/types";
import { sortCategoriesByGroupAndOrder, formatAmount } from "@/lib/utils";
import { useClickOutside } from "@/hooks/useClickOutside";
import { TagSelector } from "@/components/TagSelector";
import {
  useTransactionFilters,
  DateRange,
} from "@/hooks/useTransactionFilters";
import { useTransactionSort } from "@/hooks/useTransactionSort";
import { useBulkTransactionOperations } from "@/hooks/useBulkTransactionOperations";
import { useCategoryToggle } from "@/hooks/useCategoryToggle";
import { transactionFiltersToUrlParams } from "@/lib/transactionUrlParams";

export function SearchableTransactionList({
  transactions,
  showAccount = true,
  categories,
  tags,
  accounts = [],
  initialFilters,
}: SearchableTransactionListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editingTransaction, setEditingTransaction] =
    useState<TransactionForClient | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const nonInvestmentAccounts = accounts.filter(
    (account) => account.type !== "investment"
  );

  // Use hooks with initial values from URL
  const filters = useTransactionFilters({
    categories,
    tags,
    accounts: nonInvestmentAccounts,
    defaultDateRange: initialFilters?.dateRange ?? "all",
    defaultShowIncome: initialFilters?.showIncome ?? true,
    defaultShowExpenses: initialFilters?.showExpenses ?? true,
    excludeTransfersByDefault: false, // No longer exclude transfers by default
    enableSearch: true,
    enableTagFilter: true,
    enableUncategorizedFilter: true,
    enableAccountFilter: true,
    initialSelectedCategoryIds: initialFilters?.selectedCategoryIds,
    initialSelectedSubcategoryIds: initialFilters?.selectedSubcategoryIds,
    initialExcludedCategoryIds: initialFilters?.excludedCategoryIds,
    initialCustomStartDate: initialFilters?.customStartDate,
    initialCustomEndDate: initialFilters?.customEndDate,
    initialSearchQuery: initialFilters?.searchQuery,
    initialSelectedTagIds: initialFilters?.selectedTagIds,
    initialShowOnlyUncategorized: initialFilters?.showOnlyUncategorized,
    initialSelectedAccountIds: initialFilters?.selectedAccountIds,
  });

  const sort = useTransactionSort({
    defaultSortBy: (initialFilters?.sortBy as any) ?? "date",
    defaultSortDirection: initialFilters?.sortDirection ?? "desc",
  });

  const bulk = useBulkTransactionOperations();

  const categoryToggle = useCategoryToggle();

  // Sort categories by group type and display order
  const sortedCategories = useMemo(
    () => sortCategoriesByGroupAndOrder(categories),
    [categories]
  );

  // No longer need default transfer exclusions - using showTransfers checkbox instead

  // Sync filters to URL
  useEffect(() => {
    const params = transactionFiltersToUrlParams({
      dateRange: filters.dateRange,
      customStartDate: filters.customStartDate,
      customEndDate: filters.customEndDate,
      selectedCategoryIds: filters.selectedCategoryIds,
      selectedSubcategoryIds: filters.selectedSubcategoryIds,
      excludedCategoryIds: filters.excludedCategoryIds,
      showIncome: filters.showIncome,
      showExpenses: filters.showExpenses,
      showTransfers: filters.showTransfers,
      searchQuery: filters.searchQuery,
      selectedTagIds: filters.selectedTagIds,
      showOnlyUncategorized: filters.showOnlyUncategorized,
      selectedAccountIds: filters.selectedAccountIds,
      sortBy: sort.sortBy,
      sortDirection: sort.sortDirection,
    });

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    // Only update if the URL actually changed
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [
    filters.dateRange,
    filters.customStartDate,
    filters.customEndDate,
    filters.selectedCategoryIds,
    filters.selectedSubcategoryIds,
    filters.excludedCategoryIds,
    filters.showIncome,
    filters.showExpenses,
    filters.showTransfers,
    filters.searchQuery,
    filters.selectedTagIds,
    filters.showOnlyUncategorized,
    filters.selectedAccountIds,
    sort.sortBy,
    sort.sortDirection,
    pathname,
    router,
    searchParams,
  ]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const filtered = filters.filterTransactions(transactions);
    return sort.sortTransactions(filtered);
  }, [
    transactions,
    filters.dateRange,
    filters.customStartDate,
    filters.customEndDate,
    filters.selectedCategoryIds,
    filters.selectedSubcategoryIds,
    filters.excludedCategoryIds,
    filters.showIncome,
    filters.showExpenses,
    filters.showTransfers,
    filters.searchQuery,
    filters.selectedTagIds,
    filters.showOnlyUncategorized,
    filters.selectedAccountIds,
    filters.filterTransactions,
    sort.sortBy,
    sort.sortDirection,
    sort.sortTransactions,
  ]);

  // Close dropdown when clicking outside
  useClickOutside(
    dropdownRef as RefObject<HTMLElement>,
    () => filters.setShowCategoryDropdown(false),
    filters.showCategoryDropdown
  );

  // Calculate totals for filtered transactions
  const totals = useMemo(() => {
    const expenses = filteredTransactions
      .filter((t) => t.amount_number > 0)
      .reduce((sum, t) => sum + t.amount_number, 0);

    const income = Math.abs(
      filteredTransactions
        .filter((t) => t.amount_number < 0)
        .reduce((sum, t) => sum + t.amount_number, 0)
    );

    const netBalance = income - expenses;

    return {
      expenses,
      income,
      netBalance,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Get subcategories for selected bulk category
  const availableBulkSubcategories = bulk.getAvailableSubcategories(categories);

  // Helper functions using hooks
  const toggleCategory = (categoryId: string) => {
    categoryToggle.toggleCategory(
      categoryId,
      filters.selectedCategoryIds,
      filters.setSelectedCategoryIds,
      filters.selectedSubcategoryIds,
      filters.setSelectedSubcategoryIds,
      categories
    );
  };

  const toggleSubcategory = (subcategoryId: string, categoryId: string) => {
    categoryToggle.toggleSubcategory(
      subcategoryId,
      categoryId,
      filters.selectedCategoryIds,
      filters.setSelectedCategoryIds,
      filters.selectedSubcategoryIds,
      filters.setSelectedSubcategoryIds
    );
  };

  const toggleExcludedCategory = (categoryId: string) => {
    categoryToggle.toggleExcludedCategory(
      categoryId,
      filters.excludedCategoryIds,
      filters.setExcludedCategoryIds
    );
  };

  const toggleTag = (tagId: string) => {
    if (!filters.selectedTagIds || !filters.setSelectedTagIds) return;
    const newSelected = new Set(filters.selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    filters.setSelectedTagIds(newSelected);
  };

  const toggleAccount = (accountId: string) => {
    if (!filters.selectedAccountIds || !filters.setSelectedAccountIds) return;
    const newSelected = new Set(filters.selectedAccountIds);
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId);
    } else {
      newSelected.add(accountId);
    }
    filters.setSelectedAccountIds(newSelected);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar - Full Width at Top */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search transactions (name, merchant, category, account, amount, tags...)"
            value={filters.searchQuery || ""}
            onChange={(e) => filters.setSearchQuery?.(e.target.value)}
            className="pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {filters.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => filters.setSearchQuery?.("")}
              className="absolute right-3 top-2 h-7 w-7 p-0"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        {/* Primary Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <Select
            value={filters.dateRange}
            onValueChange={(value) => filters.setDateRange(value as DateRange)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="last90">Last 90 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          {filters.dateRange === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[160px] justify-start text-left font-normal"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {filters.customStartDate
                      ? format(new Date(filters.customStartDate), "PP")
                      : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.customStartDate
                        ? new Date(filters.customStartDate)
                        : undefined
                    }
                    onSelect={(date) =>
                      filters.setCustomStartDate(
                        date ? format(date, "yyyy-MM-dd") : ""
                      )
                    }
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[160px] justify-start text-left font-normal"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {filters.customEndDate
                      ? format(new Date(filters.customEndDate), "PP")
                      : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.customEndDate
                        ? new Date(filters.customEndDate)
                        : undefined
                    }
                    onSelect={(date) =>
                      filters.setCustomEndDate(
                        date ? format(date, "yyyy-MM-dd") : ""
                      )
                    }
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          {/* Account Filter */}
          {nonInvestmentAccounts.length > 0 && (
            <Select
              value={
                filters.selectedAccountIds &&
                filters.selectedAccountIds.size === 1
                  ? Array.from(filters.selectedAccountIds)[0]
                  : "all"
              }
              onValueChange={(value) => {
                if (value === "all") {
                  filters.setSelectedAccountIds?.(new Set());
                } else {
                  filters.setSelectedAccountIds?.(new Set([value]));
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {nonInvestmentAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}{" "}
                    {account.mask ? `(•••${account.mask})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Category/Subcategory Multi-select */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="outline"
              onClick={() =>
                filters.setShowCategoryDropdown(!filters.showCategoryDropdown)
              }
            >
              <span>Select Categories...</span>
              <svg
                className="h-4 w-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>

            {/* Dropdown Menu */}
            {filters.showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Include Categories
                    </h4>
                    {sortedCategories.map((category) => (
                      <div key={category.id} className="mb-2">
                        <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <Checkbox
                            checked={filters.selectedCategoryIds.has(
                              category.id
                            )}
                            onCheckedChange={() => toggleCategory(category.id)}
                          />
                          <span className="ml-2 text-sm font-medium text-foreground">
                            {category.name}
                          </span>
                        </label>
                        {category.subcategories &&
                          category.subcategories.length > 0 &&
                          filters.selectedCategoryIds.has(category.id) && (
                            <div className="ml-6 mt-1 space-y-1">
                              {category.subcategories.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <Checkbox
                                    checked={filters.selectedSubcategoryIds.has(
                                      sub.id
                                    )}
                                    onCheckedChange={() =>
                                      toggleSubcategory(sub.id, category.id)
                                    }
                                  />
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {sub.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Exclude Categories
                    </h4>
                    {sortedCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.excludedCategoryIds.has(category.id)}
                          onCheckedChange={() =>
                            toggleExcludedCategory(category.id)
                          }
                        />
                        <span className="ml-2 text-sm text-foreground">
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sort Controls */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Select
              value={sort.sortBy}
              onValueChange={(value) => sort.setSortBy(value as any)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Transaction Date</SelectItem>
                <SelectItem value="createdAt">Creation Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="merchant">Merchant</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                sort.setSortDirection(
                  sort.sortDirection === "asc" ? "desc" : "asc"
                )
              }
              title={sort.sortDirection === "asc" ? "Ascending" : "Descending"}
            >
              {sort.sortDirection === "asc" ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Secondary Filters Row - Type, Tags, Uncategorized */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t">
          {/* Income/Expense/Transfer Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showIncome}
                onCheckedChange={(checked) =>
                  filters.setShowIncome(checked === true)
                }
              />
              <span className="text-sm text-muted-foreground">Income</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showExpenses}
                onCheckedChange={(checked) =>
                  filters.setShowExpenses(checked === true)
                }
              />
              <span className="text-sm text-muted-foreground">Expenses</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showTransfers}
                onCheckedChange={(checked) =>
                  filters.setShowTransfers(checked === true)
                }
              />
              <span className="text-sm text-muted-foreground">Transfers</span>
            </label>
          </div>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <TagSelector
                tags={tags}
                selectedTagIds={Array.from(filters.selectedTagIds || [])}
                onToggleTag={toggleTag}
                label=""
                showManageLink={false}
              />
            </div>
          )}

          {/* Uncategorized Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.showOnlyUncategorized || false}
              onCheckedChange={(checked) =>
                filters.setShowOnlyUncategorized?.(checked === true)
              }
            />
            <span className="text-sm text-muted-foreground">Uncategorized</span>
          </label>

          {/* Clear Filters */}
          {filters.hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={filters.clearAllFilters}
              className="ml-auto"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Active Filter Chips */}
        {(filters.selectedCategoryIds.size > 0 ||
          filters.selectedSubcategoryIds.size > 0 ||
          filters.excludedCategoryIds.size > 0 ||
          (filters.selectedTagIds && filters.selectedTagIds.size > 0) ||
          (filters.selectedAccountIds &&
            filters.selectedAccountIds.size > 0)) && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {Array.from(filters.selectedCategoryIds).map((catId) => {
              const category = categories.find((c) => c.id === catId);
              if (!category) return null;
              return (
                <Badge
                  key={catId}
                  variant="secondary"
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary"
                >
                  ✓ {category.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(catId)}
                    className="h-auto p-0.5 hover:bg-primary/20"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </Badge>
              );
            })}
            {Array.from(filters.selectedSubcategoryIds).map((subId) => {
              const category = categories.find((c) =>
                c.subcategories?.some((s) => s.id === subId)
              );
              const subcategory = category?.subcategories?.find(
                (s) => s.id === subId
              );
              if (!subcategory || !category) return null;
              return (
                <Badge
                  key={subId}
                  variant="secondary"
                  className="inline-flex items-center gap-1 bg-secondary/20 text-secondary-foreground"
                >
                  ✓ {subcategory.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSubcategory(subId, category.id)}
                    className="h-auto p-0.5 hover:bg-secondary/30"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </Badge>
              );
            })}
            {Array.from(filters.excludedCategoryIds).map((catId) => {
              const category = categories.find((c) => c.id === catId);
              if (!category) return null;
              return (
                <Badge
                  key={`excluded-${catId}`}
                  variant="secondary"
                  className="inline-flex items-center gap-1 bg-destructive/10 text-destructive"
                >
                  ✕ {category.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExcludedCategory(catId)}
                    className="h-auto p-0.5 hover:bg-destructive/20"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </Badge>
              );
            })}
            {filters.selectedTagIds &&
              Array.from(filters.selectedTagIds).map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={`tag-${tagId}`}
                    className="inline-flex items-center gap-1 text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTag(tagId)}
                      className="h-auto p-0.5 hover:bg-black hover:bg-opacity-20"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </Badge>
                );
              })}
            {filters.selectedAccountIds &&
              Array.from(filters.selectedAccountIds).map((accountId) => {
                const account = nonInvestmentAccounts.find(
                  (a) => a.id === accountId
                );
                if (!account) return null;
                return (
                  <Badge
                    key={`account-${accountId}`}
                    variant="secondary"
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary"
                  >
                    {account.name} {account.mask ? `(•••${account.mask})` : ""}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAccount(accountId)}
                      className="h-auto p-0.5 hover:bg-primary/20"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </Badge>
                );
              })}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Total Income</div>
          <div className="text-2xl font-bold text-success">
            +$
            {formatAmount(totals.income)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">
            Total Expenses
          </div>
          <div className="text-2xl font-bold text-destructive">
            -$
            {formatAmount(totals.expenses)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Net Balance</div>
          <div
            className={`text-2xl font-bold ${
              totals.netBalance >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {totals.netBalance >= 0 ? "+" : ""}$
            {formatAmount(Math.abs(totals.netBalance))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredTransactions.length} of {transactions.length}{" "}
            transactions
          </div>
          {filteredTransactions.length > 0 && (
            <Button
              onClick={() => bulk.setShowBulkUpdate(!bulk.showBulkUpdate)}
              className="bg-primary hover:bg-primary/90"
            >
              {bulk.showBulkUpdate ? "Hide Bulk Update" : "Bulk Update"}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Update Panel */}
      {bulk.showBulkUpdate && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">
              Bulk Update Categories
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => bulk.selectAll(filteredTransactions)}
                className="bg-primary hover:bg-primary/90"
              >
                Select All ({filteredTransactions.length})
              </Button>
              <Button size="sm" onClick={bulk.deselectAll} variant="secondary">
                Deselect All
              </Button>
            </div>
          </div>

          {bulk.selectedTransactions.size > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-3">
                Selected {bulk.selectedTransactions.size} transaction
                {bulk.selectedTransactions.size !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="bulk-category">Category</Label>
                  <Select
                    value={bulk.bulkCategoryId}
                    onValueChange={(value) => {
                      bulk.setBulkCategoryId(value);
                      bulk.setBulkSubcategoryId("");
                    }}
                  >
                    <SelectTrigger id="bulk-category">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-subcategory">Subcategory</Label>
                  <Select
                    value={bulk.bulkSubcategoryId}
                    onValueChange={bulk.setBulkSubcategoryId}
                    disabled={!bulk.bulkCategoryId}
                  >
                    <SelectTrigger id="bulk-subcategory">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {availableBulkSubcategories.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={bulk.handleBulkUpdate}
                  disabled={!bulk.bulkCategoryId || bulk.isBulkUpdating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {bulk.isBulkUpdating
                    ? "Updating..."
                    : `Update ${bulk.selectedTransactions.size} Transaction${
                        bulk.selectedTransactions.size !== 1 ? "s" : ""
                      }`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {filters.searchQuery
              ? "No transactions found matching your search."
              : "No transactions found."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredTransactions.map((t) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                showBulkUpdate={bulk.showBulkUpdate}
                isSelected={bulk.selectedTransactions.has(t.id)}
                onToggleSelect={bulk.toggleTransaction}
                onEdit={setEditingTransaction}
                showAccount={showAccount}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          categories={categories}
          tags={tags}
        />
      )}
    </div>
  );
}
