"use client";

import { format } from "date-fns";
import Link from "next/link";
import { getCategoryImage } from "@/lib/categoryImages";
import type { SerializedTransaction } from "@/types/transaction";

interface TransactionItemProps {
  transaction: SerializedTransaction;
  showBulkUpdate?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit?: (transaction: SerializedTransaction) => void;
  showAccount?: boolean; // Whether to display account name
}

export function TransactionItem({
  transaction: t,
  showBulkUpdate = false,
  isSelected = false,
  onToggleSelect,
  onEdit,
  showAccount = true,
}: TransactionItemProps) {
  // Determine which image to show (merchant logo takes priority over category image)
  const displayImage = t.logoUrl ||
    (t.customCategory ? getCategoryImage(t.customCategory.name, t.customCategory.imageUrl) : null);

  return (
    <li className="hover:bg-gray-50 transition-colors">
      <div className="p-4 flex items-start gap-3">
        {/* Bulk select checkbox */}
        {showBulkUpdate && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(t.id)}
            className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Merchant/Category Image */}
        {displayImage && (
          <img
            src={displayImage}
            alt=""
            className="w-10 h-10 rounded object-cover flex-shrink-0 mt-0.5 cursor-pointer"
            onClick={() => !showBulkUpdate && onEdit?.(t)}
          />
        )}

        {/* Transaction Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => !showBulkUpdate && onEdit?.(t)}
            >
              {/* Transaction Name */}
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <span className="truncate">{t.name}</span>
                {t.pending && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex-shrink-0">
                    Pending
                  </span>
                )}
                {t.parentTransactionId && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded flex-shrink-0" title="This transaction is part of a split">
                    Split
                  </span>
                )}
              </div>

              {/* Date and Account */}
              <div className="text-sm text-gray-600 mt-1">
                {format(new Date(t.date), "MMM d yyyy")}
                {showAccount && t.account && ` • ${t.account.name}`}
              </div>

              {/* Merchant Name */}
              {t.merchantName && (
                <div className="text-sm text-gray-500 mt-1">
                  Merchant: {t.merchantName}
                </div>
              )}

              {/* Category and Subcategory */}
              {t.customCategory && (
                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span>Category: {t.customCategory.name}</span>
                  {t.customSubcategory && (
                    <span className="text-gray-400">
                      • {t.customSubcategory.name}
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              {t.notes && (
                <div className="text-sm text-gray-500 mt-1 italic">
                  Note: {t.notes}
                </div>
              )}

              {/* Tags */}
              {t.tags && t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Amount and Actions */}
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
              <div
                className={`text-lg font-semibold ${
                  Number(t.amount) > 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {Number(t.amount) > 0 ? "-" : "+"}$
                {Math.abs(Number(t.amount)).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              {t.isoCurrencyCode && (
                <div className="text-xs text-gray-500">
                  {t.isoCurrencyCode}
                </div>
              )}
              <Link
                href={`/transactions/${t.id}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center"
              >
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
