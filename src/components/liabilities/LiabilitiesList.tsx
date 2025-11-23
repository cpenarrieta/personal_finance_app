"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

type LiabilitiesData = Awaited<ReturnType<typeof import("@/lib/db/queries").getAllLiabilities>>
type CreditLiability = LiabilitiesData["credit"][number]
type MortgageLiability = LiabilitiesData["mortgage"][number]
type StudentLoanLiability = LiabilitiesData["studentLoan"][number]

interface LiabilitiesListProps {
  liabilities: LiabilitiesData
}

export function LiabilitiesList({ liabilities }: LiabilitiesListProps) {
  const { credit, mortgage, studentLoan } = liabilities

  const hasAnyLiabilities = credit.length > 0 || mortgage.length > 0 || studentLoan.length > 0

  if (!hasAnyLiabilities) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No liabilities data available.</p>
        <p className="text-sm mt-2">Liabilities will appear here after syncing with Plaid.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Credit Card Liabilities */}
      {credit.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-3">Credit Cards</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {credit.map((liability: CreditLiability) => (
              <Card key={liability.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{liability.account.name}</CardTitle>
                    {liability.isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  {liability.account.mask && (
                    <CardDescription>•••• {liability.account.mask}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(liability.account.current_balance_number || 0)}
                    </p>
                  </div>
                  {liability.minimum_payment_amount_number != null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Min Payment</p>
                        <p className="font-semibold">
                          {formatCurrency(liability.minimum_payment_amount_number)}
                        </p>
                      </div>
                      {liability.next_payment_due_date_string && (
                        <div>
                          <p className="text-xs text-muted-foreground">Due Date</p>
                          <p className="font-semibold text-sm">{liability.next_payment_due_date_string}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {liability.account.credit_limit_number != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Credit Limit</p>
                      <p className="text-sm">{formatCurrency(liability.account.credit_limit_number)}</p>
                    </div>
                  )}
                  {liability.last_statement_balance_number != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Last Statement Balance</p>
                      <p className="text-sm">{formatCurrency(liability.last_statement_balance_number)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mortgage Liabilities */}
      {mortgage.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-3">Mortgages</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {mortgage.map((liability: MortgageLiability) => (
              <Card key={liability.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{liability.account.name}</CardTitle>
                  {liability.accountNumber && (
                    <CardDescription>Account: {liability.accountNumber}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(liability.account.current_balance_number || 0)}
                    </p>
                  </div>
                  {liability.next_monthly_payment_number != null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Payment</p>
                        <p className="font-semibold">
                          {formatCurrency(liability.next_monthly_payment_number)}
                        </p>
                      </div>
                      {liability.next_payment_due_date_string && (
                        <div>
                          <p className="text-xs text-muted-foreground">Next Due</p>
                          <p className="font-semibold text-sm">{liability.next_payment_due_date_string}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {liability.interestRate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="text-sm">
                        {(liability.interestRate as any).percentage}% {(liability.interestRate as any).type}
                      </p>
                    </div>
                  )}
                  {liability.loanTerm && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Loan Term</p>
                        <p className="text-sm">{liability.loanTerm}</p>
                      </div>
                      {liability.loanTypeDescription && (
                        <div>
                          <p className="text-xs text-muted-foreground">Loan Type</p>
                          <p className="text-sm">{liability.loanTypeDescription}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {liability.origination_principal_amount_number != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Original Amount</p>
                      <p className="text-sm">{formatCurrency(liability.origination_principal_amount_number)}</p>
                    </div>
                  )}
                  {liability.propertyAddress && (
                    <div>
                      <p className="text-xs text-muted-foreground">Property</p>
                      <p className="text-sm">
                        {(liability.propertyAddress as any).street}, {(liability.propertyAddress as any).city},{" "}
                        {(liability.propertyAddress as any).region} {(liability.propertyAddress as any).postal_code}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Student Loan Liabilities */}
      {studentLoan.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-3">Student Loans</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studentLoan.map((liability: StudentLoanLiability) => (
              <Card key={liability.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{liability.account.name}</CardTitle>
                    {liability.isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  {liability.loanName && <CardDescription>{liability.loanName}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(liability.account.current_balance_number || 0)}
                    </p>
                  </div>
                  {liability.minimum_payment_amount_number != null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Min Payment</p>
                        <p className="font-semibold">
                          {formatCurrency(liability.minimum_payment_amount_number)}
                        </p>
                      </div>
                      {liability.next_payment_due_date_string && (
                        <div>
                          <p className="text-xs text-muted-foreground">Due Date</p>
                          <p className="font-semibold text-sm">{liability.next_payment_due_date_string}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {liability.interest_rate_percentage_number != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="text-sm">{liability.interest_rate_percentage_number}%</p>
                    </div>
                  )}
                  {liability.guarantor && (
                    <div>
                      <p className="text-xs text-muted-foreground">Guarantor</p>
                      <p className="text-sm">{liability.guarantor}</p>
                    </div>
                  )}
                  {liability.loanStatus && (
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm capitalize">{(liability.loanStatus as any).type?.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {liability.repaymentPlan && (
                    <div>
                      <p className="text-xs text-muted-foreground">Repayment Plan</p>
                      <p className="text-sm">{(liability.repaymentPlan as any).description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
