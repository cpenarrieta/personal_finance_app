'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { EditTransactionModal } from './EditTransactionModal'

interface SerializedTransaction {
  id: string
  plaidTransactionId: string
  accountId: string
  amount: string
  isoCurrencyCode: string | null
  date: string
  authorizedDate: string | null
  pending: boolean
  merchantName: string | null
  name: string
  category: string | null
  subcategory: string | null
  paymentChannel: string | null
  pendingTransactionId: string | null
  logoUrl: string | null
  categoryIconUrl: string | null
  customCategoryId: string | null
  customSubcategoryId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  account: {
    id: string
    name: string
    type: string
    mask: string | null
  } | null
  customCategory?: {
    id: string
    name: string
  } | null
  customSubcategory?: {
    id: string
    name: string
  } | null
}

interface TransactionDetailViewProps {
  transaction: SerializedTransaction
}

export function TransactionDetailView({ transaction }: TransactionDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false)

  const amount = Number(transaction.amount)
  const isExpense = amount > 0
  const absoluteAmount = Math.abs(amount)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        {/* Header with Logo/Icon */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-start gap-4">
            {(transaction.logoUrl || transaction.categoryIconUrl) && (
              <img
                src={transaction.logoUrl || transaction.categoryIconUrl || ''}
                alt=""
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
              <div className={`text-3xl font-bold ${isExpense ? 'text-red-300' : 'text-green-300'}`}>
                {isExpense ? '-' : '+'}${absoluteAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {transaction.isoCurrencyCode && (
                <div className="text-sm opacity-90 mt-1">{transaction.isoCurrencyCode}</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Details */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Transaction
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Transaction Date</label>
                <div className="text-lg font-semibold text-gray-900">
                  {format(new Date(transaction.date), 'MMMM dd, yyyy')}
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(transaction.date), 'EEEE')} at {format(new Date(transaction.date), 'h:mm a')}
                </div>
              </div>

              {transaction.authorizedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Authorized Date</label>
                  <div className="text-gray-900">
                    {format(new Date(transaction.authorizedDate), 'MMMM dd, yyyy')}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Account</label>
                <div className="text-gray-900">
                  {transaction.account?.name}
                  {transaction.account?.mask && (
                    <span className="text-gray-500 ml-2">••{transaction.account.mask}</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">{transaction.account?.type}</div>
              </div>
            </div>

            {/* Category Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Plaid Category</label>
                <div className="flex items-center gap-2">
                  {transaction.categoryIconUrl && (
                    <img src={transaction.categoryIconUrl} alt="" className="w-5 h-5 rounded" />
                  )}
                  <div className="text-gray-900">
                    {transaction.category || 'Not categorized'}
                  </div>
                </div>
                {transaction.subcategory && (
                  <div className="text-sm text-gray-500 ml-7">{transaction.subcategory}</div>
                )}
              </div>

              {(transaction.customCategory || transaction.customSubcategory) && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Custom Category</label>
                  <div className="text-gray-900">
                    {transaction.customCategory?.name || 'None'}
                  </div>
                  {transaction.customSubcategory && (
                    <div className="text-sm text-gray-500">{transaction.customSubcategory.name}</div>
                  )}
                </div>
              )}

              {transaction.paymentChannel && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Payment Channel</label>
                  <div className="text-gray-900 capitalize">{transaction.paymentChannel.replace('_', ' ')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {transaction.notes && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="block text-sm font-medium text-amber-900 mb-2">Notes</label>
              <div className="text-gray-900 whitespace-pre-wrap">{transaction.notes}</div>
            </div>
          )}

          {/* Technical Details */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Transaction ID:</span>
                <div className="font-mono text-xs text-gray-900 mt-1 break-all">{transaction.id}</div>
              </div>
              <div>
                <span className="text-gray-600">Plaid Transaction ID:</span>
                <div className="font-mono text-xs text-gray-900 mt-1 break-all">{transaction.plaidTransactionId}</div>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <div className="text-gray-900 mt-1">{format(new Date(transaction.createdAt), 'MMM dd, yyyy h:mm a')}</div>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <div className="text-gray-900 mt-1">{format(new Date(transaction.updatedAt), 'MMM dd, yyyy h:mm a')}</div>
              </div>
              {transaction.pendingTransactionId && (
                <div>
                  <span className="text-gray-600">Pending Transaction ID:</span>
                  <div className="font-mono text-xs text-gray-900 mt-1 break-all">{transaction.pendingTransactionId}</div>
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
        />
      )}
    </div>
  )
}
