"use client"

import { useState, useCallback } from "react"
import { format } from "date-fns"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { formatAmount } from "@/lib/utils"
import { formatTransactionDate } from "@/lib/utils/transaction-date"
import { SplitTransactionModal } from "@/components/transactions/modals/SplitTransactionModal"
import { TransactionFileUpload } from "@/components/transactions/detail/TransactionFileUpload"
import { TransactionActions } from "@/components/transactions/detail/TransactionActions"
import { AICategorizationDialog } from "@/components/transactions/detail/AICategorizationDialog"
import { DeleteConfirmationDialog } from "@/components/transactions/detail/DeleteConfirmationDialog"
import { SmartSplitReviewModal } from "@/components/transactions/detail/SmartSplitReviewModal"
import { InlineEditableInput } from "@/components/shared/InlineEditableInput"
import { InlineEditableSelect } from "@/components/shared/InlineEditableSelect"
import { InlineEditableTextarea } from "@/components/shared/InlineEditableTextarea"
import { InlineEditableTags } from "@/components/transactions/detail/InlineEditableTags"
import { Alert } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CategorySelect } from "@/components/ui/category-select"
import { SubcategorySelect } from "@/components/ui/subcategory-select"
import { Calendar, CreditCard, Tag, FolderOpen, Clock, ChevronRight } from "lucide-react"
import { useAICategorization } from "@/hooks/useAICategorization"
import { useTransactionDelete } from "@/hooks/useTransactionDelete"
import { useSmartAnalysis } from "@/hooks/useSmartAnalysis"
import { useIsDemo } from "@/components/demo/DemoContext"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"

interface TransactionDetailViewProps {
  transaction: TransactionForClient
  categories: CategoryForClient[]
  tags: TagForClient[]
}

export function TransactionDetailView({ transaction, categories, tags }: TransactionDetailViewProps) {
  const isDemo = useIsDemo()
  const [isSplitting, setIsSplitting] = useState(false)
  const [transactionFiles, setTransactionFiles] = useState<string[]>(transaction.files || [])
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(transaction.categoryId)
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

  // Get display names for category/subcategory
  const getCategoryName = useCallback(
    (categoryId: string | null): string | null => {
      if (!categoryId) return null
      const cat = categories.find((c) => c.id === categoryId)
      return cat?.name || null
    },
    [categories],
  )

  const getSubcategoryName = useCallback(
    (categoryId: string | null, subcategoryId: string | null): string | null => {
      if (!categoryId || !subcategoryId) return null
      const cat = categories.find((c) => c.id === categoryId)
      const sub = cat?.subcategories?.find((s) => s.id === subcategoryId)
      return sub?.name || null
    },
    [categories],
  )

  // Handle category change - needs to clear subcategory
  const handleCategoryChange = useCallback((newCategoryId: string | null) => {
    setCurrentCategoryId(newCategoryId)
    // Note: The subcategory will be reset on next render since categoryId changed
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero Header */}
      <Card className="overflow-hidden">
        <div
          className={`relative p-6 md:p-8 ${isExpense ? "bg-gradient-to-br from-card to-destructive/5" : "bg-gradient-to-br from-card to-success/5"}`}
        >
          <div className="flex items-start gap-4">
            {/* Logo/Avatar */}
            <div className="flex-shrink-0">
              {transaction.logoUrl ? (
                <Image
                  src={transaction.logoUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shadow-sm">
                  <span className="text-xl font-bold text-muted-foreground">
                    {(transaction.merchantName || transaction.name).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  {/* Inline Editable Transaction Name */}
                  <InlineEditableInput
                    transactionId={transaction.id}
                    fieldName="name"
                    initialValue={transaction.name}
                    placeholder="Transaction name"
                    className="-ml-2"
                    renderReadView={(value) => (
                      <h1 className="text-xl md:text-2xl font-bold text-foreground truncate py-1 px-2">
                        {value || transaction.merchantName || "Unnamed"}
                      </h1>
                    )}
                  />
                  {transaction.merchantName && transaction.merchantName !== transaction.name && (
                    <p className="text-sm text-muted-foreground truncate ml-0">{transaction.name}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 ml-0">
                    <span className="text-sm text-muted-foreground">
                      {formatTransactionDate(transaction.datetime, "long")}
                    </span>
                    {transaction.pending && (
                      <Badge variant="outline" className="border-warning text-warning">
                        Pending
                      </Badge>
                    )}
                    {transaction.parentTransactionId && <Badge variant="secondary">Split</Badge>}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-2xl md:text-3xl font-bold tabular-nums ${isExpense ? "text-foreground" : "text-success"}`}
                  >
                    {isExpense ? "-" : "+"}${formatAmount(absoluteAmount)}
                  </div>
                  {transaction.isoCurrencyCode && (
                    <span className="text-xs text-muted-foreground">{transaction.isoCurrencyCode}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          {!isDemo && (
            <div className="mt-6 pt-4 border-t border-border">
              <TransactionActions
                transaction={transaction}
                isAILoading={aiCategorization.state.isLoading}
                onAICategorize={aiCategorization.handlers.categorize}
                onSplit={() => setIsSplitting(true)}
                onSmartSplit={handleSmartAnalysis}
                isSmartSplitLoading={smartAnalysis.state.isAnalyzing}
                onDelete={() => deletion.handlers.setIsDialogOpen(true)}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Parent Transaction Info (if this is a split child) */}
      {transaction.parentTransaction && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Part of a split transaction</p>
                  <p className="text-xs text-muted-foreground">
                    Original: {transaction.parentTransaction.name} • $
                    {formatAmount(transaction.parentTransaction.amount_number)}
                  </p>
                </div>
              </div>
              <Link
                href={`${isDemo ? "/demo" : ""}/transactions/${transaction.parentTransaction.id}`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View Original
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Child Transactions (if this has been split) */}
      {transaction.childTransactions && transaction.childTransactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Split Into {transaction.childTransactions.length} Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transaction.childTransactions.map((child, index) => (
              <Link
                key={child.id}
                href={`${isDemo ? "/demo" : ""}/transactions/${child.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}.</span>
                  <div>
                    <p className="font-medium text-foreground text-sm">{child.name}</p>
                    {child.category && (
                      <p className="text-xs text-muted-foreground">
                        {child.category.name}
                        {child.subcategory && ` / ${child.subcategory.name}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold tabular-nums ${child.amount_number < 0 ? "" : "text-success"}`}>
                    {child.amount_number < 0 ? "-" : "+"}${formatAmount(child.amount_number)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Details Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Date & Account Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date & Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatTransactionDate(transaction.datetime, "long")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTransactionDate(transaction.datetime, "weekday")}
                </p>
              </div>
            </div>

            {transaction.authorizedDatetime && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Authorized</p>
                  <p className="text-sm">{formatTransactionDate(transaction.authorizedDatetime, "medium")}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {transaction.account?.name}
                  {transaction.account?.mask && (
                    <span className="text-muted-foreground ml-1">••{transaction.account.mask}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{transaction.account?.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category & Tags Card - Inline Editable */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Category & Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Inline Editable Category */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 -mt-0.5">
                <InlineEditableSelect
                  transactionId={transaction.id}
                  fieldName="categoryId"
                  initialValue={transaction.categoryId}
                  placeholder="Select category..."
                  displayValue={getCategoryName(currentCategoryId)}
                  onValueChange={handleCategoryChange}
                  refreshOnSave={true}
                  renderReadView={(value) => (
                    <div className="py-1 px-2">
                      {value ? (
                        <p className="text-sm font-medium">{getCategoryName(value)}</p>
                      ) : (
                        <p className="text-sm text-warning">Uncategorized</p>
                      )}
                    </div>
                  )}
                  renderSelect={({ value, onChange, disabled, className }) => (
                    <CategorySelect
                      value={value}
                      onChange={onChange}
                      categories={categories}
                      disabled={disabled}
                      className={className}
                      placeholder="None"
                    />
                  )}
                />
                {/* Inline Editable Subcategory */}
                {currentCategoryId && (
                  <InlineEditableSelect
                    key={currentCategoryId} // Reset when category changes
                    transactionId={transaction.id}
                    fieldName="subcategoryId"
                    initialValue={transaction.subcategoryId}
                    placeholder="Select subcategory..."
                    displayValue={getSubcategoryName(currentCategoryId, transaction.subcategoryId)}
                    refreshOnSave={true}
                    renderReadView={(value) => (
                      <div className="py-0.5 px-2">
                        {value ? (
                          <p className="text-xs text-muted-foreground">
                            {getSubcategoryName(currentCategoryId, value)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No subcategory</p>
                        )}
                      </div>
                    )}
                    renderSelect={({ value, onChange, disabled, className }) => (
                      <SubcategorySelect
                        value={value}
                        onChange={onChange}
                        categories={categories}
                        categoryId={currentCategoryId}
                        disabled={disabled}
                        className={className}
                        placeholder="None"
                      />
                    )}
                  />
                )}
              </div>
            </div>

            {transaction.paymentChannel && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Channel</span>
                  <span className="capitalize">{transaction.paymentChannel.replace("_", " ")}</span>
                </div>
              </>
            )}

            {/* Inline Editable Tags */}
            <Separator />
            <InlineEditableTags
              transactionId={transaction.id}
              tags={tags}
              initialSelectedIds={transaction.tags?.map((t) => t.id) || []}
            />
          </CardContent>
        </Card>
      </div>

      {/* Notes Section - Inline Editable */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <p className="text-xs text-muted-foreground mb-1 px-2">Notes</p>
              <InlineEditableTextarea
                transactionId={transaction.id}
                fieldName="notes"
                initialValue={transaction.notes}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      {!isDemo && (
        <TransactionFileUpload
          transactionId={transaction.id}
          files={transactionFiles}
          onFilesUpdate={(newFiles) => {
            setTransactionFiles(newFiles)
            router.refresh()
          }}
        />
      )}

      {/* Technical Details - Collapsible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono truncate max-w-[200px]" title={transaction.id}>
                {transaction.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plaid ID</span>
              <span className="font-mono truncate max-w-[200px]" title={transaction.plaidTransactionId}>
                {transaction.plaidTransactionId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {transaction.created_at_string
                  ? format(new Date(transaction.created_at_string), "MMM d, yyyy h:mm a")
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>
                {transaction.updated_at_string
                  ? format(new Date(transaction.updated_at_string), "MMM d, yyyy h:mm a")
                  : "-"}
              </span>
            </div>
            {transaction.pendingTransactionId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending ID</span>
                <span className="font-mono truncate max-w-[200px]">{transaction.pendingTransactionId}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Split Modal */}
      {!isDemo && isSplitting && (
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
      {!isDemo && (
        <AICategorizationDialog
          transaction={transaction}
          suggestion={aiCategorization.state.suggestion}
          isOpen={aiCategorization.state.isDialogOpen}
          isApplying={aiCategorization.state.isApplying}
          onOpenChange={aiCategorization.handlers.setIsDialogOpen}
          onApply={aiCategorization.handlers.apply}
          onDeny={aiCategorization.handlers.deny}
        />
      )}

      {/* Smart Split Review Modal (for split results) */}
      {!isDemo && smartAnalysis.state.resultType === "split" && (
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
      {!isDemo && smartAnalysis.state.resultType === "recategorize" && (
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
      {!isDemo && (
        <DeleteConfirmationDialog
          transaction={transaction}
          isOpen={deletion.state.isDialogOpen}
          isDeleting={deletion.state.isDeleting}
          onOpenChange={deletion.handlers.setIsDialogOpen}
          onConfirm={deletion.handlers.deleteTransaction}
        />
      )}
    </div>
  )
}
