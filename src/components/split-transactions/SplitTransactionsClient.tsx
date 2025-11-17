"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CategorySelect } from "@/components/ui/category-select"
import { SubcategorySelect } from "@/components/ui/subcategory-select"
import { Upload, Loader2, CheckCircle2, AlertCircle, Receipt, DollarSign, Calendar, Store } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Category {
  id: string
  name: string
  displayOrder: number
  subcategories: Array<{
    id: string
    name: string
    displayOrder: number
  }>
}

interface LineItem {
  description: string
  amount: number
  categoryId: string | null
  subcategoryId: string | null
}

interface ReceiptAnalysis {
  merchantName: string
  totalAmount: number
  receiptDate: string | null
  confidence: number
  reasoning: string
  lineItems: LineItem[]
}

interface MatchingTransaction {
  id: string
  name: string
  merchantName: string | null
  amount: number
  date: string
  datetime: string
  accountName: string
  categoryName: string | null
  subcategoryName: string | null
  matchScore: number
  matchReasons: string[]
}

interface SplitTransactionsClientProps {
  categories: Category[]
}

type Step = "upload" | "analyzing" | "review" | "confirm" | "complete"

export function SplitTransactionsClient({ categories }: SplitTransactionsClientProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null)
  const [matchingTransactions, setMatchingTransactions] = useState<MatchingTransaction[]>([])
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)

      // Create preview URL
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setStep("analyzing")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/receipts/analyze", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze receipt")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      setMatchingTransactions(data.matchingTransactions)
      setLineItems(data.analysis.lineItems)

      // Auto-select best match if available
      if (data.matchingTransactions.length > 0) {
        setSelectedTransactionId(data.matchingTransactions[0].id)
      }

      setStep("review")
      toast.success("Receipt analyzed successfully!")
    } catch (err) {
      console.error("Error analyzing receipt:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze receipt")
      setStep("upload")
      toast.error("Failed to analyze receipt")
    }
  }

  const handleCategoryChange = (index: number, categoryId: string | null) => {
    const newLineItems = [...lineItems]
    newLineItems[index].categoryId = categoryId
    newLineItems[index].subcategoryId = null // Reset subcategory
    setLineItems(newLineItems)
  }

  const handleSubcategoryChange = (index: number, subcategoryId: string | null) => {
    const newLineItems = [...lineItems]
    newLineItems[index].subcategoryId = subcategoryId
    setLineItems(newLineItems)
  }

  const handleAmountChange = (index: number, amount: string) => {
    const newLineItems = [...lineItems]
    const parsed = parseFloat(amount)
    if (!isNaN(parsed) && parsed > 0) {
      newLineItems[index].amount = parsed
      setLineItems(newLineItems)
    }
  }

  const handleDescriptionChange = (index: number, description: string) => {
    const newLineItems = [...lineItems]
    newLineItems[index].description = description
    setLineItems(newLineItems)
  }

  const handleRemoveItem = (index: number) => {
    const newLineItems = lineItems.filter((_, i) => i !== index)
    setLineItems(newLineItems)
  }

  const handleCreateSplit = async () => {
    if (!selectedTransactionId) {
      toast.error("Please select a transaction to split")
      return
    }

    if (lineItems.length === 0) {
      toast.error("At least one line item is required")
      return
    }

    setStep("confirm")

    try {
      const response = await fetch("/api/receipts/split", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: selectedTransactionId,
          lineItems,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create split transaction")
      }

      const data = await response.json()
      setStep("complete")
      toast.success(data.message)
    } catch (err) {
      console.error("Error creating split transaction:", err)
      setError(err instanceof Error ? err.message : "Failed to create split transaction")
      setStep("review")
      toast.error("Failed to create split transaction")
    }
  }

  const handleReset = () => {
    setStep("upload")
    setFile(null)
    setPreviewUrl(null)
    setAnalysis(null)
    setMatchingTransactions([])
    setSelectedTransactionId(null)
    setLineItems([])
    setError(null)
  }

  const totalLineItems = lineItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Split Transactions</h1>
        <p className="text-muted-foreground mt-2">
          Upload a receipt and let AI automatically split your transaction into categorized line items
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Step */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Receipt</CardTitle>
            <CardDescription>Upload an image of your receipt (JPEG, PNG, or WebP)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt Image</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">Maximum file size: 10MB</p>
            </div>

            {previewUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg overflow-hidden max-w-md">
                  <img src={previewUrl} alt="Receipt preview" className="w-full h-auto" />
                </div>
              </div>
            )}

            <Button onClick={handleUpload} disabled={!file} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Analyze Receipt
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analyzing Step */}
      {step === "analyzing" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Analyzing Receipt...</h3>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Step */}
      {step === "review" && analysis && (
        <div className="space-y-6">
          {/* Receipt Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Analysis</CardTitle>
              <CardDescription>Review the extracted information from your receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Merchant</p>
                    <p className="text-sm text-muted-foreground">{analysis.merchantName}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-sm text-muted-foreground">${analysis.totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {analysis.receiptDate && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(analysis.receiptDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <Receipt className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Confidence</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant={analysis.confidence >= 80 ? "default" : "secondary"}>
                        {analysis.confidence}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">AI Reasoning</p>
                <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
              </div>
            </CardContent>
          </Card>

          {/* Matching Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Select Transaction to Split</CardTitle>
              <CardDescription>
                {matchingTransactions.length > 0
                  ? "Choose the transaction that matches this receipt"
                  : "No matching transactions found"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {matchingTransactions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No transactions found matching this receipt. Try uploading a receipt for a more recent transaction.
                  </AlertDescription>
                </Alert>
              ) : (
                matchingTransactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    onClick={() => setSelectedTransactionId(transaction.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedTransactionId === transaction.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{transaction.merchantName || transaction.name}</p>
                          <Badge variant="outline">Score: {transaction.matchScore}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ${transaction.amount.toFixed(2)} • {new Date(transaction.date).toLocaleDateString()} •{" "}
                          {transaction.accountName}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {transaction.matchReasons.map((reason, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {selectedTransactionId === transaction.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          {selectedTransactionId && (
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>
                  Review and adjust the line items extracted from your receipt
                  <br />
                  Total: ${totalLineItems.toFixed(2)} / ${analysis.totalAmount.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`description-${index}`}>Description</Label>
                        <Input
                          id={`description-${index}`}
                          value={item.description}
                          onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`amount-${index}`}>Amount</Label>
                        <Input
                          id={`amount-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`category-${index}`}>Category</Label>
                        <CategorySelect
                          categories={categories}
                          value={item.categoryId || ""}
                          onValueChange={(value) => handleCategoryChange(index, value || null)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`subcategory-${index}`}>Subcategory</Label>
                        <SubcategorySelect
                          categories={categories}
                          categoryId={item.categoryId || ""}
                          value={item.subcategoryId || ""}
                          onValueChange={(value) => handleSubcategoryChange(index, value || null)}
                          disabled={!item.categoryId}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSplit}>Create Split Transaction</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confirm Step */}
      {step === "confirm" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Creating Split Transaction...</h3>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === "complete" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Split Transaction Created!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your transaction has been successfully split into {lineItems.length} items
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => router.push("/transactions")}>View Transactions</Button>
                  <Button variant="outline" onClick={handleReset}>
                    Split Another Receipt
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
