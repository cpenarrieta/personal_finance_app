"use client"

import Link from "next/link"
import Image from "next/image"
import { getCategoryImage } from "@/lib/categories/images"
import { formatAmount } from "@/lib/utils"
import { formatTransactionDate } from "@/lib/utils/transaction-date"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { TransactionForClient } from "@/types"

interface TransactionItemProps {
  transaction: TransactionForClient
  showBulkUpdate?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  showAccount?: boolean // Whether to display account name
}

export function TransactionItem({
  transaction: t,
  showBulkUpdate = false,
  isSelected = false,
  onToggleSelect,
  showAccount = true,
}: TransactionItemProps) {
  // Determine which image to show (merchant logo takes priority over category image)
  const displayImage = t.logoUrl || (t.category ? getCategoryImage(t.category.name, t.category.imageUrl) : null)
  const isExpense = t.amount_number < 0
  const isUncategorized = !t.category

  return (
    <li className="group hover:bg-muted/50 transition-colors">
      <div className="p-3 md:p-4 flex items-center gap-3">
        {/* Bulk select checkbox */}
        {showBulkUpdate && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(t.id)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        )}

        {/* Main content - links to detail page */}
        <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          {/* Merchant/Category Image */}
          <div
            className={`flex-shrink-0 ${
              displayImage ? "" : "w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
            }`}
          >
            {displayImage ? (
              <Image
                src={displayImage}
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover"
                unoptimized={displayImage.startsWith("/images/")}
              />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">
                {(t.merchantName || t.name).charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Transaction Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Primary: Merchant/Name */}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{t.merchantName || t.name}</span>
                  {t.pending && (
                    <Badge variant="outline" className="border-warning text-warning text-xs px-1.5 py-0">
                      Pending
                    </Badge>
                  )}
                  {t.parentTransactionId && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      Split
                    </Badge>
                  )}
                </div>

                {/* Secondary: Date, Account, Category */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  <span>{formatTransactionDate(t.datetime, "short")}</span>
                  {showAccount && t.account && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="truncate max-w-[100px]">{t.account.name}</span>
                    </>
                  )}
                  {t.category && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-primary/80">{t.category.name}</span>
                      {t.subcategory && <span className="text-muted-foreground/60">/ {t.subcategory.name}</span>}
                    </>
                  )}
                  {isUncategorized && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-warning">Uncategorized</span>
                    </>
                  )}
                </div>

                {/* Notes (if any) */}
                {t.notes && <p className="text-xs text-muted-foreground/80 mt-1 truncate italic">{t.notes}</p>}

                {/* Tags */}
                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag.id}
                        className="text-[10px] px-1.5 py-0 text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {t.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +{t.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div
                  className={`text-base md:text-lg font-semibold tabular-nums ${
                    isExpense ? "text-foreground" : "text-success"
                  }`}
                >
                  {isExpense ? "-" : "+"}${formatAmount(t.amount_number)}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </li>
  )
}
