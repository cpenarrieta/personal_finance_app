"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { EditTransactionModal } from "./EditTransactionModal";
import { SplitTransactionModal } from "./SplitTransactionModal";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
} from "@/types";

interface TransactionDetailViewProps {
  transaction: TransactionForClient;
  categories: CategoryForClient[];
  tags: TagForClient[];
}

export function TransactionDetailView({
  transaction,
  categories,
  tags,
}: TransactionDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);

  const amount = transaction.amount_number;
  const isExpense = amount > 0;
  const absoluteAmount = Math.abs(amount);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        {/* Header with Logo/Icon */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-start gap-4">
            {transaction.logoUrl && (
              <Image
                src={transaction.logoUrl}
                alt=""
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{transaction.name}</h1>
              <div className="flex items-center gap-4 text-sm">
                {transaction.merchantName && (
                  <span className="bg-blue-800 bg-opacity-50 px-3 py-1 rounded">
                    {transaction.merchantName}
                  </span>
                )}
                {transaction.pending && (
                  <span className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded font-medium">
                    Pending
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-3xl font-bold ${
                  isExpense ? "text-red-300" : "text-green-300"
                }`}
              >
                {isExpense ? "-" : "+"}$
                {absoluteAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              {transaction.isoCurrencyCode && (
                <div className="text-sm opacity-90 mt-1">
                  {transaction.isoCurrencyCode}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Details */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Transaction Details
            </h2>
            <div className="flex gap-2">
              {!transaction.isSplit && !transaction.parentTransactionId && (
                <button
                  onClick={() => setIsSplitting(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Split Transaction
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Transaction
              </button>
            </div>
          </div>

          {/* Parent Transaction Info (if this is a split child) */}
          {transaction.parentTransaction && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    This is part of a split transaction
                  </p>
                  <p className="text-sm text-blue-700">
                    Original: {transaction.parentTransaction.name} • $
                    {Math.abs(
                      transaction.parentTransaction.amount_number
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <Link
                  href={`/transactions/${transaction.parentTransaction.id}`}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  View Original
                </Link>
              </div>
            </div>
          )}

          {/* Child Transactions (if this has been split) */}
          {transaction.childTransactions &&
            transaction.childTransactions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Split Into {transaction.childTransactions.length} Transactions
                </h3>
                <div className="space-y-2">
                  {transaction.childTransactions.map((child, index) => (
                    <Link
                      key={child.id}
                      href={`/transactions/${child.id}`}
                      className="block p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {index + 1}. {child.name}
                          </p>
                          {child.category && (
                            <p className="text-sm text-gray-600 mt-1">
                              {child.category.name}
                              {child.subcategory &&
                                ` • ${child.subcategory.name}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              child.amount_number > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {child.amount_number > 0 ? "-" : "+"}$
                            {Math.abs(child.amount_number).toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Transaction Date
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {format(new Date(transaction.date_string), "MMM d yyyy")}
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(transaction.date_string), "EEEE")} at{" "}
                  {format(new Date(transaction.date_string), "h:mm a")}
                </div>
              </div>

              {transaction.authorized_date_string && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Authorized Date
                  </label>
                  <div className="text-gray-900">
                    {format(new Date(transaction.authorized_date_string), "MMM d yyyy")}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Account
                </label>
                <div className="text-gray-900">
                  {transaction.account?.name}
                  {transaction.account?.mask && (
                    <span className="text-gray-500 ml-2">
                      ••{transaction.account.mask}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {transaction.account?.type}
                </div>
              </div>
            </div>

            {/* Category Information */}
            <div className="space-y-4">
              {(transaction.category ||
                transaction.subcategory) && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <div className="text-gray-900">
                    {transaction.category?.name || "None"}
                  </div>
                  {transaction.subcategory && (
                    <div className="text-sm text-gray-500">
                      {transaction.subcategory.name}
                    </div>
                  )}
                </div>
              )}

              {transaction.paymentChannel && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Payment Channel
                  </label>
                  <div className="text-gray-900 capitalize">
                    {transaction.paymentChannel.replace("_", " ")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {transaction.notes && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="block text-sm font-medium text-amber-900 mb-2">
                Notes
              </label>
              <div className="text-gray-900 whitespace-pre-wrap">
                {transaction.notes}
              </div>
            </div>
          )}

          {/* Tags Section */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {transaction.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Technical Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Transaction ID:</span>
                <div className="font-mono text-xs text-gray-900 mt-1 break-all">
                  {transaction.id}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Plaid Transaction ID:</span>
                <div className="font-mono text-xs text-gray-900 mt-1 break-all">
                  {transaction.plaidTransactionId}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <div className="text-gray-900 mt-1">
                  {format(new Date(transaction.created_at_string), "MMM d yyyy h:mm a")}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <div className="text-gray-900 mt-1">
                  {format(new Date(transaction.updated_at_string), "MMM d yyyy h:mm a")}
                </div>
              </div>
              {transaction.pendingTransactionId && (
                <div>
                  <span className="text-gray-600">Pending Transaction ID:</span>
                  <div className="font-mono text-xs text-gray-900 mt-1 break-all">
                    {transaction.pendingTransactionId}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditTransactionModal
          transaction={transaction}
          onClose={() => setIsEditing(false)}
          categories={categories}
          tags={tags}
        />
      )}

      {/* Split Modal */}
      {isSplitting && (
        <SplitTransactionModal
          transaction={transaction}
          onClose={() => setIsSplitting(false)}
          categories={categories}
        />
      )}
    </div>
  );
}
