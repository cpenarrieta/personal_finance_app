"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  format,
} from "date-fns";
import { EditTransactionModal } from "./EditTransactionModal";
import { TransactionItem } from "./TransactionItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SearchableTransactionListProps, TransactionForClient } from "@/types";
import { sortCategoriesByGroupAndOrder, formatAmount } from "@/lib/utils";
import { useClickOutside } from "@/hooks/useClickOutside";

type DateRange =
  | "all"
  | "last30"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "custom";

type SortOption = "createdAt" | "date" | "amount" | "name" | "merchant";
type SortDirection = "asc" | "desc";

export function SearchableTransactionList({
  transactions,
  showAccount = true,
  categories,
  tags,
}: SearchableTransactionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionForClient | null>(null);
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false); // Filter for uncategorized transactions

  // Category/Subcategory filter state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<
    Set<string>
  >(new Set());
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(new Set());
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showIncome, setShowIncome] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);

  // Tag filter state
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Bulk update state
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Sort categories by group type and display order
  const sortedCategories = useMemo(() => sortCategoriesByGroupAndOrder(categories), [categories]);

  // Filter transactions based on search query and date range
  const filteredTransactions = useMemo(() => {
    let filtered: TransactionForClient[] = transactions;

    // Calculate date range
    const now = new Date();
    let range: { start: Date; end: Date } | null = null;

    switch (dateRange) {
      case "last30":
        range = { start: subMonths(now, 1), end: now };
        break;
      case "last90":
        range = { start: subMonths(now, 3), end: now };
        break;
      case "thisMonth":
        range = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        range = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          range = {
            start: new Date(customStartDate),
            end: new Date(customEndDate),
          };
        }
        break;
      case "all":
      default:
        range = null;
    }

    // Date range filter
    if (range) {
      filtered = filtered.filter((t) =>
        isWithinInterval(new Date(t.date_string), {
          start: range.start,
          end: range.end,
        })
      );
    }

    // Income/Expense filter
    if (!showIncome && !showExpenses) {
      // If neither is selected, show nothing
      return [];
    } else if (showIncome && !showExpenses) {
      // Show only income (negative amounts)
      filtered = filtered.filter((t) => t.amount_number < 0);
    } else if (!showIncome && showExpenses) {
      // Show only expenses (positive amounts)
      filtered = filtered.filter((t) => t.amount_number > 0);
    }
    // If both are selected, show both (no filter needed)

    // Uncategorized filter
    if (showOnlyUncategorized) {
      filtered = filtered.filter(
        (t) => !t.category || !t.subcategory
      );
    }

    // Exclude categories filter
    if (excludedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.categoryId) return true; // Keep uncategorized
        return !excludedCategoryIds.has(t.categoryId);
      });
    }

    // Category filter (include)
    if (selectedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.categoryId) return false;
        return selectedCategoryIds.has(t.categoryId);
      });
    }

    // Subcategory filter
    if (selectedSubcategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.subcategoryId) return false;
        return selectedSubcategoryIds.has(t.subcategoryId);
      });
    }

    // Tag filter
    if (selectedTagIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.tags || t.tags.length === 0) return false;
        // Transaction must have at least one of the selected tags
        return t.tags.some(tag => selectedTagIds.has(tag.id));
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter((t) => {
        // Search in multiple fields including tags
        const tagNames = t.tags?.map(tag => tag.name).join(" ") || "";
        const searchableText = [
          t.name,
          t.merchantName,
          t.category?.name,
          t.subcategory?.name,
          t.account?.name,
          t.isoCurrencyCode,
          t.amount_number?.toString(),
          t.notes,
          tagNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Sort filtered transactions
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "createdAt":
          compareValue = new Date(a.created_at_string).getTime() - new Date(b.created_at_string).getTime();
          break;
        case "date":
          compareValue = new Date(a.date_string).getTime() - new Date(b.date_string).getTime();
          break;
        case "amount":
          compareValue = a.amount_number - b.amount_number;
          break;
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "merchant":
          compareValue = (a.merchantName || "").localeCompare(b.merchantName || "");
          break;
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });

    return sorted;
  }, [
    transactions,
    searchQuery,
    dateRange,
    customStartDate,
    customEndDate,
    showOnlyUncategorized,
    selectedCategoryIds,
    selectedSubcategoryIds,
    excludedCategoryIds,
    showIncome,
    showExpenses,
    selectedTagIds,
    sortBy,
    sortDirection,
  ]);

  // Set default exclusions (exclude Transfers by default)
  useEffect(() => {
    const transfersCategory = categories.find((cat) => cat.name === '🔁 Transfers');
    if (transfersCategory) {
      setExcludedCategoryIds(new Set([transfersCategory.id]));
    }
  }, [categories]);

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, () => setShowCategoryDropdown(false), showCategoryDropdown);

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

  // Toggle transaction selection
  const toggleTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  // Select all filtered transactions
  const selectAll = () => {
    setSelectedTransactions(new Set(filteredTransactions.map((t) => t.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedTransactions(new Set());
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedTransactions.size === 0 || !bulkCategoryId) {
      return;
    }

    setIsBulkUpdating(true);
    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionIds: Array.from(selectedTransactions),
          categoryId: bulkCategoryId,
          subcategoryId: bulkSubcategoryId && bulkSubcategoryId !== "NONE" ? bulkSubcategoryId : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to bulk update transactions");
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error bulk updating transactions:", error);
      alert("Failed to update transactions. Please try again.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Get subcategories for selected bulk category
  const selectedBulkCategory = categories.find((c) => c.id === bulkCategoryId);
  const availableBulkSubcategories = selectedBulkCategory?.subcategories || [];

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategoryIds);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
      // Also remove all subcategories of this category
      const category = categories.find((c) => c.id === categoryId);
      if (category && category.subcategories) {
        const newSelectedSubs = new Set(selectedSubcategoryIds);
        category.subcategories.forEach((sub) => newSelectedSubs.delete(sub.id));
        setSelectedSubcategoryIds(newSelectedSubs);
      }
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategoryIds(newSelected);
  };

  // Toggle subcategory selection
  const toggleSubcategory = (subcategoryId: string, categoryId: string) => {
    const newSelected = new Set(selectedSubcategoryIds);
    if (newSelected.has(subcategoryId)) {
      newSelected.delete(subcategoryId);
    } else {
      newSelected.add(subcategoryId);
      // Also select the parent category if not selected
      if (!selectedCategoryIds.has(categoryId)) {
        setSelectedCategoryIds(new Set(selectedCategoryIds).add(categoryId));
      }
    }
    setSelectedSubcategoryIds(newSelected);
  };

  // Toggle excluded category
  const toggleExcludedCategory = (categoryId: string) => {
    const newExcluded = new Set(excludedCategoryIds);
    if (newExcluded.has(categoryId)) {
      newExcluded.delete(categoryId);
    } else {
      newExcluded.add(categoryId);
    }
    setExcludedCategoryIds(newExcluded);
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTagIds(newSelected);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setDateRange("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setShowOnlyUncategorized(false);
    setSelectedCategoryIds(new Set());
    setSelectedSubcategoryIds(new Set());
    setSelectedTagIds(new Set());
    setSortBy("date");
    setSortDirection("desc");
    // Reset to default exclusions
    const transfersCategory = categories.find((c) => c.name === '🔁 Transfers');
    if (transfersCategory) {
      setExcludedCategoryIds(new Set([transfersCategory.id]));
    } else {
      setExcludedCategoryIds(new Set());
    }
    setShowIncome(false);
    setShowExpenses(true);
  };

  // Check if any filters are active (excluding default transfers exclusion)
  const defaultExcludedCategory = categories.find((c) => c.name === '🔁 Transfers');
  const hasNonDefaultExclusions = excludedCategoryIds.size > 0 &&
    (excludedCategoryIds.size > 1 || !defaultExcludedCategory || !excludedCategoryIds.has(defaultExcludedCategory.id));

  const hasActiveFilters =
    searchQuery ||
    dateRange !== "all" ||
    showOnlyUncategorized ||
    selectedCategoryIds.size > 0 ||
    selectedSubcategoryIds.size > 0 ||
    selectedTagIds.size > 0 ||
    showIncome ||
    !showExpenses ||
    hasNonDefaultExclusions;

  return (
    <div className="space-y-4">
      {/* Search Bar - Full Width at Top */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search transactions (name, merchant, category, account, amount, tags...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
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
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex-shrink-0">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger className="w-[180px]">
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
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <>
              <div className="flex-shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[180px] justify-start text-left font-normal"
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
                      {customStartDate ? format(new Date(customStartDate), "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate ? new Date(customStartDate) : undefined}
                      onSelect={(date) => setCustomStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                      weekStartsOn={1}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[180px] justify-start text-left font-normal"
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
                      {customEndDate ? format(new Date(customEndDate), "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate ? new Date(customEndDate) : undefined}
                      onSelect={(date) => setCustomEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                      weekStartsOn={1}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Category/Subcategory Multi-select */}
          <div className="flex-shrink-0 relative" ref={dropdownRef}>
            <Button
              variant="outline"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
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
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Include Categories</h4>
                    {sortedCategories.map((category) => (
                      <div key={category.id} className="mb-2">
                        <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <Checkbox
                            checked={selectedCategoryIds.has(category.id)}
                            onCheckedChange={() => toggleCategory(category.id)}
                          />
                          <span className="ml-2 text-sm font-medium text-foreground">
                            {category.name}
                          </span>
                        </label>
                        {category.subcategories && category.subcategories.length > 0 &&
                          selectedCategoryIds.has(category.id) && (
                            <div className="ml-6 mt-1 space-y-1">
                              {category.subcategories.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selectedSubcategoryIds.has(sub.id)}
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
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Exclude Categories</h4>
                    {sortedCategories.map((category) => (
                      <label key={category.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <Checkbox
                          checked={excludedCategoryIds.has(category.id)}
                          onCheckedChange={() => toggleExcludedCategory(category.id)}
                        />
                        <span className="ml-2 text-sm text-foreground">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Income Toggle */}
          <label className="flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={showIncome}
              onChange={(e) => setShowIncome(e.target.checked)}
              className="w-4 h-4 text-success border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-2 text-sm text-muted-foreground">Income</span>
          </label>

          {/* Expenses Toggle */}
          <label className="flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={showExpenses}
              onChange={(e) => setShowExpenses(e.target.checked)}
              className="w-4 h-4 text-destructive border-gray-300 rounded focus:ring-red-500"
            />
            <span className="ml-2 text-sm text-muted-foreground">Expenses</span>
          </label>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.has(tag.id) ? "default" : "secondary"}
                    className={`cursor-pointer transition-all ${
                      selectedTagIds.has(tag.id)
                        ? "text-white ring-2 ring-offset-1"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    style={
                      selectedTagIds.has(tag.id)
                        ? { backgroundColor: tag.color }
                        : undefined
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Uncategorized Checkbox */}
          <label className="flex items-center cursor-pointer flex-shrink-0 gap-2">
            <Checkbox
              checked={showOnlyUncategorized}
              onCheckedChange={(checked) => setShowOnlyUncategorized(checked === true)}
            />
            <span className="text-sm text-muted-foreground">Uncategorized</span>
          </label>

          {/* Order By Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Creation Date</SelectItem>
                <SelectItem value="date">Transaction Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="merchant">Merchant</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              title={sortDirection === "asc" ? "Ascending" : "Descending"}
            >
              {sortDirection === "asc" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </Button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Selected Filter Chips */}
        {(selectedCategoryIds.size > 0 || selectedSubcategoryIds.size > 0 || excludedCategoryIds.size > 0 || selectedTagIds.size > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(selectedCategoryIds).map((catId) => {
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
            {Array.from(selectedSubcategoryIds).map((subId) => {
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
            {Array.from(excludedCategoryIds).map((catId) => {
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
            {Array.from(selectedTagIds).map((tagId) => {
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
          <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
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
              onClick={() => setShowBulkUpdate(!showBulkUpdate)}
              className="bg-primary hover:bg-primary/90"
            >
              {showBulkUpdate ? "Hide Bulk Update" : "Bulk Update"}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Update Panel */}
      {showBulkUpdate && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary-foreground">
              Bulk Update Categories
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={selectAll}
                className="bg-primary hover:bg-primary/90"
              >
                Select All ({filteredTransactions.length})
              </Button>
              <Button
                size="sm"
                onClick={deselectAll}
                variant="secondary"
              >
                Deselect All
              </Button>
            </div>
          </div>

          {selectedTransactions.size > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-3">
                Selected {selectedTransactions.size} transaction
                {selectedTransactions.size !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="bulk-category">
                    Category
                  </Label>
                  <Select
                    value={bulkCategoryId}
                    onValueChange={(value) => {
                      setBulkCategoryId(value);
                      setBulkSubcategoryId("");
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
                  <Label htmlFor="bulk-subcategory">
                    Subcategory
                  </Label>
                  <Select
                    value={bulkSubcategoryId}
                    onValueChange={setBulkSubcategoryId}
                    disabled={!bulkCategoryId}
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
                  onClick={handleBulkUpdate}
                  disabled={!bulkCategoryId || isBulkUpdating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isBulkUpdating
                    ? "Updating..."
                    : `Update ${selectedTransactions.size} Transaction${
                        selectedTransactions.size !== 1 ? "s" : ""
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
            {searchQuery
              ? "No transactions found matching your search."
              : "No transactions found."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredTransactions.map((t) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                showBulkUpdate={showBulkUpdate}
                isSelected={selectedTransactions.has(t.id)}
                onToggleSelect={toggleTransaction}
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
