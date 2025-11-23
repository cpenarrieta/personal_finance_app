"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { formatAmount } from "@/lib/utils"
import { formatTransactionDate } from "@/lib/utils/transaction-date"
import { EditTransactionModal } from "@/components/transactions/modals/EditTransactionModal"
import { SplitTransactionModal } from "@/components/transactions/modals/SplitTransactionModal"
import { TransactionFileUpload } from "@/components/transactions/detail/TransactionFileUpload"
import { TransactionActions } from "@/components/transactions/detail/TransactionActions"
import { AICategorizationDialog } from "@/components/transactions/detail/AICategorizationDialog"
import { DeleteConfirmationDialog } from "@/components/transactions/detail/DeleteConfirmationDialog"
import { SmartSplitReviewModal } from "@/components/transactions/detail/SmartSplitReviewModal"
import { Alert } from "@/components/ui/alert"
import { useAICategorization } from "@/hooks/useAICategorization"
import { useTransactionDelete } from "@/hooks/useTransactionDelete"
import { useSmartAnalysis } from "@/hooks/useSmartAnalysis"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"

interface TransactionDetailViewProps {
  transaction: TransactionForClient
  categories: CategoryForClient[]
  tags: TagForClient[]
}

export function TransactionDetailView({ transaction, categories, tags }: TransactionDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [transactionFiles, setTransactionFiles] = useState<string[]>(transaction.files || [])
  const router = useRouter()

  // Custom hooks for AI categorization, smart analysis, and deletion
  const aiCategorization = useAICategorization(transaction.id)
  const smartAnalysis = useSmartAnalysis()
  const deletion = useTransactionDelete(transaction.id)

  const amount = transaction.amount_number
  const isExpense = amount < 0
  const absoluteAmount = Math.abs(amount)

  // Handler for Smart Analysis
  const handleSmartAnalysis = async () => {
    await smartAnalysis.handlers.analyzeReceipt(transaction.id, categories)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-card rounded-lg shadow-md border overflow-hidden">
        {/* Header with Logo/Icon */}
        <div className="bg-primary p-6 text-primary-foreground">
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
                  <span className="bg-primary-foreground/20 px-3 py-1 rounded">{transaction.merchantName}</span>
                )}
                {transaction.pending && (
                  <span className="bg-warning text-warning-foreground px-3 py-1 rounded font-medium">Pending</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-foreground">
                {isExpense ? "-" : "+"}${formatAmount(absoluteAmount)}
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
            <TransactionActions
              transaction={transaction}
              isAILoading={aiCategorization.state.isLoading}
              onAICategorize={aiCategorization.handlers.categorize}
              onSplit={() => setIsSplitting(true)}
              onSmartSplit={handleSmartAnalysis}
              isSmartSplitLoading={smartAnalysis.state.isAnalyzing}
              onEdit={() => setIsEditing(true)}
              onDelete={() => deletion.handlers.setIsDialogOpen(true)}
            />
          </div>

          {/* Parent Transaction Info (if this is a split child) */}
          {transaction.parentTransaction && (
            <div className="mb-6 p-4 bg-primary/5 border-l-4 border-primary rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">This is part of a split transaction</p>
                  <p className="text-sm text-primary">
                    Original: {transaction.parentTransaction.name} • $
                    {formatAmount(transaction.parentTransaction.amount_number)}
                  </p>
                </div>
                <Link
                  href={`/transactions/${transaction.parentTransaction.id}`}
                  className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90"
                >
                  View Original
                </Link>
              </div>
            </div>
          )}

          {/* Child Transactions (if this has been split) */}
          {transaction.childTransactions && transaction.childTransactions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Split Into {transaction.childTransactions.length} Transactions
              </h3>
              <div className="space-y-2">
                {transaction.childTransactions.map((child, index) => (
                  <Link
                    key={child.id}
                    href={`/transactions/${child.id}`}
                    className="block p-4 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">
                          {index + 1}. {child.name}
                        </p>
                        {child.category && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {child.category.name}
                            {child.subcategory && ` • ${child.subcategory.name}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${child.amount_number < 0 ? "text-destructive" : "text-success"}`}>
                          {child.amount_number < 0 ? "-" : "+"}$
                          {Math.abs(child.amount_number).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
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
                <label className="block text-sm font-medium text-muted-foreground mb-1">Transaction Date</label>
                <div className="text-lg font-semibold text-foreground">
                  {formatTransactionDate(transaction.datetime, "medium")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatTransactionDate(transaction.datetime, "weekday")}
                </div>
              </div>

              {transaction.authorizedDatetime && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Authorized Date</label>
                  <div className="text-foreground">
                    {formatTransactionDate(transaction.authorizedDatetime, "medium")}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
                <div className="text-foreground">
                  {transaction.account?.name}
                  {transaction.account?.mask && (
                    <span className="text-muted-foreground ml-2">••{transaction.account.mask}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{transaction.account?.type}</div>
              </div>
            </div>

            {/* Category Information */}
            <div className="space-y-4">
              {(transaction.category || transaction.subcategory) && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                  <div className="text-foreground">{transaction.category?.name || "None"}</div>
                  {transaction.subcategory && (
                    <div className="text-sm text-muted-foreground">{transaction.subcategory.name}</div>
                  )}
                </div>
              )}

              {transaction.paymentChannel && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Channel</label>
                  <div className="text-foreground capitalize">{transaction.paymentChannel.replace("_", " ")}</div>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {transaction.notes && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <label className="block text-sm font-medium text-warning-foreground mb-2">Notes</label>
              <div className="text-foreground whitespace-pre-wrap">{transaction.notes}</div>
            </div>
          )}

          {/* Tags Section */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Tags</label>
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

          {/* File Upload Section */}
          <TransactionFileUpload
            transactionId={transaction.id}
            files={transactionFiles}
            onFilesUpdate={(newFiles) => {
              setTransactionFiles(newFiles)
              router.refresh()
            }}
          />

          {/* Technical Details */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Transaction ID:</span>
                <div className="font-mono text-xs text-foreground mt-1 break-all">{transaction.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Plaid Transaction ID:</span>
                <div className="font-mono text-xs text-foreground mt-1 break-all">{transaction.plaidTransactionId}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="text-foreground mt-1">
                  {format(new Date(transaction.created_at_string), "MMM d yyyy h:mm a")}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div className="text-foreground mt-1">
                  {format(new Date(transaction.updated_at_string), "MMM d yyyy h:mm a")}
                </div>
              </div>
              {transaction.pendingTransactionId && (
                <div>
                  <span className="text-muted-foreground">Pending Transaction ID:</span>
                  <div className="font-mono text-xs text-foreground mt-1 break-all">
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

      {/* Error Alerts */}
      {aiCategorization.state.error && (
        <Alert variant="destructive" className="mt-4 grid-cols-1fr">
          <p className="text-sm">{aiCategorization.state.error}</p>
        </Alert>
      )}
      {smartAnalysis.state.error && (
        <Alert variant="destructive" className="mt-4 grid-cols-1fr">
          <p className="text-sm">{smartAnalysis.state.error}</p>
        </Alert>
      )}

      {/* AI Categorization Dialog */}
      <AICategorizationDialog
        transaction={transaction}
        suggestion={aiCategorization.state.suggestion}
        isOpen={aiCategorization.state.isDialogOpen}
        isApplying={aiCategorization.state.isApplying}
        onOpenChange={aiCategorization.handlers.setIsDialogOpen}
        onApply={aiCategorization.handlers.apply}
        onDeny={aiCategorization.handlers.deny}
      />

      {/* Smart Split Review Modal (for split results) */}
      {smartAnalysis.state.resultType === "split" && (
        <SmartSplitReviewModal
          isOpen={smartAnalysis.state.isSplitModalOpen}
          onClose={smartAnalysis.handlers.cancelSplit}
          transaction={transaction}
          suggestedSplits={smartAnalysis.state.suggestedSplits}
          categories={categories}
          isSubmitting={smartAnalysis.state.isConfirmingSplit}
          onConfirm={() => smartAnalysis.handlers.confirmSplit(transaction.id, smartAnalysis.state.suggestedSplits)}
          confidence={smartAnalysis.state.splitConfidence}
          notes={smartAnalysis.state.splitNotes}
        />
      )}

      {/* AI Recategorization Dialog (for recategorize results) */}
      {smartAnalysis.state.resultType === "recategorize" && (
        <AICategorizationDialog
          transaction={transaction}
          suggestion={
            smartAnalysis.state.suggestedCategoryId
              ? {
                  categoryId: smartAnalysis.state.suggestedCategoryId,
                  subcategoryId: smartAnalysis.state.suggestedSubcategoryId,
                  categoryName: smartAnalysis.state.suggestedCategoryName,
                  subcategoryName: smartAnalysis.state.suggestedSubcategoryName,
                  confidence: smartAnalysis.state.recategorizeConfidence || 0,
                  reasoning: smartAnalysis.state.recategorizeReasoning || "",
                }
              : null
          }
          isOpen={smartAnalysis.state.isRecategorizeDialogOpen}
          isApplying={smartAnalysis.state.isApplyingRecategorization}
          onOpenChange={(open) => !open && smartAnalysis.handlers.cancelRecategorization()}
          onApply={() =>
            smartAnalysis.handlers.applyRecategorization(
              transaction.id,
              smartAnalysis.state.suggestedCategoryId!,
              smartAnalysis.state.suggestedSubcategoryId,
            )
          }
          onDeny={smartAnalysis.handlers.cancelRecategorization}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        transaction={transaction}
        isOpen={deletion.state.isDialogOpen}
        isDeleting={deletion.state.isDeleting}
        onOpenChange={deletion.handlers.setIsDialogOpen}
        onConfirm={deletion.handlers.deleteTransaction}
      />
    </div>
  )
}
