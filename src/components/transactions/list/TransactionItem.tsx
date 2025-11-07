"use client";

import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { getCategoryImage } from "@/lib/categories/images";
import { formatAmount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { TransactionForClient } from "@/types";

interface TransactionItemProps {
  transaction: TransactionForClient;
  showBulkUpdate?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit?: (transaction: TransactionForClient) => void;
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
  const displayImage =
    t.logoUrl ||
    (t.category
      ? getCategoryImage(t.category.name, t.category.imageUrl)
      : null);

  return (
    <li className="hover:bg-muted/50 transition-colors">
      <div className="p-4 flex items-start gap-3">
        {/* Bulk select checkbox */}
        {showBulkUpdate && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(t.id)}
            className="mt-1"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        )}

        {/* Merchant/Category Image */}
        {displayImage && (
          <Image
            src={displayImage}
            alt=""
            width={40}
            height={40}
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
              <div className="font-medium text-foreground flex items-center gap-2">
                <span className="truncate">{t.name}</span>
                {t.pending && (
                  <Badge
                    variant="secondary"
                    className="bg-warning/10 text-warning-foreground flex-shrink-0"
                  >
                    Pending
                  </Badge>
                )}
                {t.parentTransactionId && (
                  <Badge
                    variant="secondary"
                    className="bg-secondary/20 text-secondary-foreground flex-shrink-0"
                    title="This transaction is part of a split"
                  >
                    Split
                  </Badge>
                )}
              </div>

              {/* Date and Account */}
              <div className="text-sm text-muted-foreground mt-1">
                {format(new Date(t.date_string), "MMM d yyyy")}
                {showAccount && t.account && ` • ${t.account.name}`}
              </div>

              {/* Merchant Name */}
              {t.merchantName && (
                <div className="text-sm text-muted-foreground mt-1">
                  Merchant: {t.merchantName}
                </div>
              )}

              {/* Category and Subcategory */}
              {t.category && (
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <span>Category: {t.category.name}</span>
                  {t.subcategory && (
                    <span className="text-muted-foreground/60">
                      • {t.subcategory.name}
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              {t.notes && (
                <div className="text-sm text-muted-foreground mt-1 italic">
                  Note: {t.notes}
                </div>
              )}

              {/* Tags */}
              {t.tags && t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.tags.map((tag) => {
                    return (
                      <Badge
                        key={tag.id}
                        className="text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Amount and Actions */}
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
              <div
                className={`text-lg font-semibold ${
                  t.amount_number > 0 ? "text-destructive" : "text-success"
                }`}
              >
                {t.amount_number > 0 ? "-" : "+"}$
                {formatAmount(t.amount_number)}
              </div>
              {t.isoCurrencyCode && (
                <div className="text-xs text-muted-foreground">{t.isoCurrencyCode}</div>
              )}
              <Button
                asChild
                size="sm"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Link href={`/transactions/${t.id}`}>Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
