"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
} from "date-fns";
import { EditTransactionModal } from "./EditTransactionModal";
import { TransactionItem } from "./TransactionItem";
import type { SerializedTransaction } from "@/types/transaction";

interface SearchableTransactionListProps {
  transactions: SerializedTransaction[];
  showAccount?: boolean; // Whether to show account name in transaction items
}

type DateRange =
  | "all"
  | "last30"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export function SearchableTransactionList({
  transactions,
  showAccount = true,
}: SearchableTransactionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<SerializedTransaction | null>(null);
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
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);

  // Bulk update state
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState("");
  const [categories, setCategories] = useState<
    {
      id: string;
      name: string;
      subcategories: { id: string; name: string }[];
    }[]
  >([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Filter transactions based on search query and date range
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

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
        isWithinInterval(new Date(t.date), {
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
      filtered = filtered.filter((t) => Number(t.amount) < 0);
    } else if (!showIncome && showExpenses) {
      // Show only expenses (positive amounts)
      filtered = filtered.filter((t) => Number(t.amount) > 0);
    }
    // If both are selected, show both (no filter needed)

    // Uncategorized filter
    if (showOnlyUncategorized) {
      filtered = filtered.filter(
        (t) => !t.customCategory || !t.customSubcategory
      );
    }

    // Exclude categories filter
    if (excludedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.customCategoryId) return true; // Keep uncategorized
        return !excludedCategoryIds.has(t.customCategoryId);
      });
    }

    // Category filter (include)
    if (selectedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.customCategoryId) return false;
        return selectedCategoryIds.has(t.customCategoryId);
      });
    }

    // Subcategory filter
    if (selectedSubcategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.customSubcategoryId) return false;
        return selectedSubcategoryIds.has(t.customSubcategoryId);
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
          t.customCategory?.name,
          t.customSubcategory?.name,
          t.account?.name,
          t.isoCurrencyCode,
          t.amount,
          t.notes,
          tagNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    return filtered;
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
  ]);

  // Fetch custom categories, tags and set default exclusions
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/custom-categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data);

          // Find and exclude "🔁 Transfers" by default
          const transfersCategory = data.find((cat: any) => cat.name === '🔁 Transfers');
          if (transfersCategory) {
            setExcludedCategoryIds(new Set([transfersCategory.id]));
          }
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }

    async function fetchTags() {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setTags(data);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    }

    fetchCategories();
    fetchTags();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    }

    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCategoryDropdown]);

  // Calculate totals for filtered transactions
  const totals = useMemo(() => {
    const expenses = filteredTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const income = Math.abs(
      filteredTransactions
        .filter((t) => Number(t.amount) < 0)
        .reduce((sum, t) => sum + Number(t.amount), 0)
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
          customCategoryId: bulkCategoryId,
          customSubcategoryId: bulkSubcategoryId || null,
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
      if (category) {
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
          <input
            type="text"
            placeholder="Search transactions (name, merchant, category, account, amount, tags...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
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
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex-shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <>
              <div className="flex-shrink-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="Start date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-shrink-0">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="End date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Category/Subcategory Multi-select */}
          <div className="flex-shrink-0 relative" ref={dropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-2"
            >
              <span className="text-gray-700">Select Categories...</span>
              <svg
                className="h-4 w-4 text-gray-400"
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
            </button>

            {/* Dropdown Menu */}
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Include Categories</h4>
                    {categories.map((category) => (
                      <div key={category.id} className="mb-2">
                        <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.has(category.id)}
                            onChange={() => toggleCategory(category.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {category.name}
                          </span>
                        </label>
                        {category.subcategories.length > 0 &&
                          selectedCategoryIds.has(category.id) && (
                            <div className="ml-6 mt-1 space-y-1">
                              {category.subcategories.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedSubcategoryIds.has(sub.id)}
                                    onChange={() =>
                                      toggleSubcategory(sub.id, category.id)
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
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
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Exclude Categories</h4>
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={excludedCategoryIds.has(category.id)}
                          onChange={() => toggleExcludedCategory(category.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{category.name}</span>
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
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-2 text-sm text-gray-700">Income</span>
          </label>

          {/* Expenses Toggle */}
          <label className="flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={showExpenses}
              onChange={(e) => setShowExpenses(e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="ml-2 text-sm text-gray-700">Expenses</span>
          </label>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-sm text-gray-700">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedTagIds.has(tag.id)
                        ? "text-white ring-2 ring-offset-1"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={
                      selectedTagIds.has(tag.id)
                        ? { backgroundColor: tag.color }
                        : undefined
                    }
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Uncategorized Checkbox */}
          <label className="flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={showOnlyUncategorized}
              onChange={(e) => setShowOnlyUncategorized(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Uncategorized</span>
          </label>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Selected Filter Chips */}
        {(selectedCategoryIds.size > 0 || selectedSubcategoryIds.size > 0 || excludedCategoryIds.size > 0 || selectedTagIds.size > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(selectedCategoryIds).map((catId) => {
              const category = categories.find((c) => c.id === catId);
              if (!category) return null;
              return (
                <span
                  key={catId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  ✓ {category.name}
                  <button
                    onClick={() => toggleCategory(catId)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
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
                  </button>
                </span>
              );
            })}
            {Array.from(selectedSubcategoryIds).map((subId) => {
              const category = categories.find((c) =>
                c.subcategories.some((s) => s.id === subId)
              );
              const subcategory = category?.subcategories.find(
                (s) => s.id === subId
              );
              if (!subcategory || !category) return null;
              return (
                <span
                  key={subId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                >
                  ✓ {subcategory.name}
                  <button
                    onClick={() => toggleSubcategory(subId, category.id)}
                    className="hover:bg-indigo-200 rounded-full p-0.5"
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
                  </button>
                </span>
              );
            })}
            {Array.from(excludedCategoryIds).map((catId) => {
              const category = categories.find((c) => c.id === catId);
              if (!category) return null;
              return (
                <span
                  key={`excluded-${catId}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                >
                  ✕ {category.name}
                  <button
                    onClick={() => toggleExcludedCategory(catId)}
                    className="hover:bg-red-200 rounded-full p-0.5"
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
                  </button>
                </span>
              );
            })}
            {Array.from(selectedTagIds).map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={`tag-${tagId}`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => toggleTag(tagId)}
                    className="hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
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
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Income</div>
          <div className="text-2xl font-bold text-green-600">
            +$
            {totals.income.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">
            -$
            {totals.expenses.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Net Balance</div>
          <div
            className={`text-2xl font-bold ${
              totals.netBalance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {totals.netBalance >= 0 ? "+" : ""}$
            {totals.netBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredTransactions.length} of {transactions.length}{" "}
            transactions
          </div>
          {filteredTransactions.length > 0 && (
            <button
              onClick={() => setShowBulkUpdate(!showBulkUpdate)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              {showBulkUpdate ? "Hide Bulk Update" : "Bulk Update"}
            </button>
          )}
        </div>
      </div>

      {/* Bulk Update Panel */}
      {showBulkUpdate && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-900">
              Bulk Update Categories
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Select All ({filteredTransactions.length})
              </button>
              <button
                onClick={deselectAll}
                className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Deselect All
              </button>
            </div>
          </div>

          {selectedTransactions.size > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-3">
                Selected {selectedTransactions.size} transaction
                {selectedTransactions.size !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Category
                  </label>
                  <select
                    value={bulkCategoryId}
                    onChange={(e) => {
                      setBulkCategoryId(e.target.value);
                      setBulkSubcategoryId("");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Subcategory
                  </label>
                  <select
                    value={bulkSubcategoryId}
                    onChange={(e) => setBulkSubcategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={!bulkCategoryId}
                  >
                    <option value="">None</option>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {availableBulkSubcategories.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleBulkUpdate}
                  disabled={!bulkCategoryId || isBulkUpdating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed"
                >
                  {isBulkUpdating
                    ? "Updating..."
                    : `Update ${selectedTransactions.size} Transaction${
                        selectedTransactions.size !== 1 ? "s" : ""
                      }`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery
              ? "No transactions found matching your search."
              : "No transactions found."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
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
        />
      )}
    </div>
  );
}
