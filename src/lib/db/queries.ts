/**
 * Cached Prisma queries with Next.js 16+ caching
 * All queries are cached for 24 hours and tagged for invalidation
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"
import type { CategoryForClient, PlaidAccountForClient, TagForClient } from "@/types"

/**
 * Get all transactions with full relations
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getAllTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  return prisma.transaction.findMany({
    where: {
      isSplit: false, // Filter out parent transactions that have been split
    },
    orderBy: { datetime: "desc" },
    select: {
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true, // Generated column
      isoCurrencyCode: true,
      datetime: true,
      authorizedDatetime: true,
      pending: true,
      merchantName: true,
      name: true,
      plaidCategory: true,
      plaidSubcategory: true,
      paymentChannel: true,
      pendingTransactionId: true,
      logoUrl: true,
      categoryIconUrl: true,
      categoryId: true,
      subcategoryId: true,
      notes: true,
      isSplit: true,
      parentTransactionId: true,
      originalTransactionId: true,
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isTransferCategory: true,
          created_at_string: true, // Generated column
          updated_at_string: true, // Generated column
        },
      },
      subcategory: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true, // Generated column
          updated_at_string: true, // Generated column
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
              created_at_string: true, // Generated column
              updated_at_string: true, // Generated column
            },
          },
        },
      },
    },
  })
}

/**
 * Get all categories with subcategories
 * Cached with 24h expiration, tagged with "categories"
 */
export async function getAllCategories() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("categories")

  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      groupType: true,
      displayOrder: true,
      isTransferCategory: true,
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
      subcategories: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true, // Generated column
          updated_at_string: true, // Generated column
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ groupType: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
  }) as Promise<CategoryForClient[]>
}

/**
 * Get all tags
 * Cached with 24h expiration, tagged with "tags"
 */
export async function getAllTags() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("tags")

  return prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
    },
    orderBy: { name: "asc" },
  }) as Promise<TagForClient[]>
}

/**
 * Get all accounts
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAllAccounts() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return prisma.plaidAccount.findMany({
    select: {
      id: true,
      plaidAccountId: true,
      itemId: true,
      name: true,
      officialName: true,
      mask: true,
      type: true,
      subtype: true,
      currency: true,
      current_balance_number: true, // Generated column
      available_balance_number: true, // Generated column
      credit_limit_number: true, // Generated column
      balance_updated_at_string: true, // Generated column
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
    },
    orderBy: { name: "asc" },
  }) as Promise<PlaidAccountForClient[]>
}

/**
 * Get all accounts with full institution details
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAllAccountsWithInstitution() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return prisma.plaidAccount.findMany({
    select: {
      id: true,
      plaidAccountId: true,
      itemId: true,
      name: true,
      officialName: true,
      mask: true,
      type: true,
      subtype: true,
      currency: true,
      current_balance_number: true,
      available_balance_number: true,
      credit_limit_number: true,
      balance_updated_at_string: true,
      created_at_string: true,
      updated_at_string: true,
      item: {
        select: {
          id: true,
          plaidItemId: true,
          accessToken: true,
          lastTransactionsCursor: true,
          lastInvestmentsCursor: true,
          status: true,
          created_at_string: true,
          updated_at_string: true,
          institution: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              shortName: true,
              created_at_string: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

/**
 * Get all holdings with relations
 * Cached with 24h expiration, tagged with "holdings"
 */
export async function getAllHoldings() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("holdings")

  return prisma.holding.findMany({
    select: {
      id: true,
      accountId: true,
      securityId: true,
      quantity_number: true,
      cost_basis_number: true,
      institution_price_number: true,
      institution_price_as_of_string: true,
      isoCurrencyCode: true,
      created_at_string: true,
      updated_at_string: true,
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      account: {
        select: {
          id: true,
          plaidAccountId: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
        },
      },
    },
  })
}

/**
 * Get all investment transactions with relations
 * Cached with 24h expiration, tagged with "investments"
 */
export async function getAllInvestmentTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("investments")

  return prisma.investmentTransaction.findMany({
    select: {
      id: true,
      plaidInvestmentTransactionId: true,
      accountId: true,
      securityId: true,
      type: true,
      amount_number: true,
      price_number: true,
      quantity_number: true,
      fees_number: true,
      isoCurrencyCode: true,
      transactionDatetime: true,
      name: true,
      created_at_string: true,
      updated_at_string: true,
      account: {
        select: {
          id: true,
          plaidAccountId: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
        },
      },
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
    },
    orderBy: { transactionDatetime: "desc" },
  })
}

/**
 * Get account by ID with full relations
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAccountById(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return prisma.plaidAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      plaidAccountId: true,
      itemId: true,
      name: true,
      officialName: true,
      mask: true,
      type: true,
      subtype: true,
      currency: true,
      current_balance_number: true,
      available_balance_number: true,
      credit_limit_number: true,
      balance_updated_at_string: true,
      created_at_string: true,
      updated_at_string: true,
      item: {
        select: {
          id: true,
          plaidItemId: true,
          accessToken: true,
          lastTransactionsCursor: true,
          lastInvestmentsCursor: true,
          status: true,
          created_at_string: true,
          updated_at_string: true,
          institution: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              shortName: true,
              created_at_string: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Get transactions for a specific account
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  return prisma.transaction.findMany({
    where: {
      accountId,
      isSplit: false,
    },
    orderBy: { datetime: "desc" },
    select: {
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true,
      isoCurrencyCode: true,
      datetime: true,
      authorizedDatetime: true,
      pending: true,
      merchantName: true,
      name: true,
      plaidCategory: true,
      plaidSubcategory: true,
      paymentChannel: true,
      pendingTransactionId: true,
      logoUrl: true,
      categoryIconUrl: true,
      categoryId: true,
      subcategoryId: true,
      notes: true,
      isSplit: true,
      parentTransactionId: true,
      originalTransactionId: true,
      created_at_string: true,
      updated_at_string: true,
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isTransferCategory: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
              created_at_string: true,
              updated_at_string: true,
            },
          },
        },
      },
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
    },
  })
}

/**
 * Get holdings for a specific account
 * Cached with 24h expiration, tagged with "holdings"
 */
export async function getHoldingsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("holdings")

  return prisma.holding.findMany({
    where: { accountId },
    select: {
      id: true,
      accountId: true,
      securityId: true,
      quantity_number: true,
      cost_basis_number: true,
      institution_price_number: true,
      institution_price_as_of_string: true,
      isoCurrencyCode: true,
      created_at_string: true,
      updated_at_string: true,
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
    },
  })
}

/**
 * Get investment transactions for a specific account
 * Cached with 24h expiration, tagged with "investments"
 */
export async function getInvestmentTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("investments")

  return prisma.investmentTransaction.findMany({
    where: { accountId },
    select: {
      id: true,
      plaidInvestmentTransactionId: true,
      accountId: true,
      securityId: true,
      type: true,
      amount_number: true,
      price_number: true,
      quantity_number: true,
      fees_number: true,
      isoCurrencyCode: true,
      transactionDatetime: true,
      name: true,
      created_at_string: true,
      updated_at_string: true,
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
    },
    orderBy: { transactionDatetime: "desc" },
  })
}

/**
 * Get all connected Plaid items with institution info
 * Cached with 24h expiration, tagged with "items"
 */
export async function getAllConnectedItems() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("items")

  return prisma.item.findMany({
    select: {
      id: true,
      plaidItemId: true,
      accessToken: true,
      status: true,
      created_at_string: true,
      updated_at_string: true,
      institution: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          shortName: true,
        },
      },
      accounts: {
        select: {
          id: true,
          name: true,
          type: true,
          subtype: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Get transactions that need review (uncategorized or tagged "for-review")
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getReviewTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  // First, try to get the "for-review" tag ID
  const forReviewTag = await prisma.tag.findUnique({
    where: { name: "for-review" },
    select: { id: true },
  })

  return prisma.transaction.findMany({
    where: {
      AND: [
        { isSplit: false }, // Filter out parent transactions that have been split
        {
          OR: [
            { categoryId: null }, // Uncategorized transactions
            ...(forReviewTag
              ? [
                  {
                    tags: {
                      some: {
                        tagId: forReviewTag.id,
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    },
    orderBy: { datetime: "desc" },
    select: {
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true,
      isoCurrencyCode: true,
      datetime: true,
      authorizedDatetime: true,
      pending: true,
      merchantName: true,
      name: true,
      plaidCategory: true,
      plaidSubcategory: true,
      paymentChannel: true,
      pendingTransactionId: true,
      logoUrl: true,
      categoryIconUrl: true,
      categoryId: true,
      subcategoryId: true,
      notes: true,
      isSplit: true,
      parentTransactionId: true,
      originalTransactionId: true,
      created_at_string: true,
      updated_at_string: true,
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isTransferCategory: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
              created_at_string: true,
              updated_at_string: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Get all liabilities (credit, mortgage, student loans) with account info
 * Cached with 24h expiration, tagged with "liabilities"
 */
export async function getAllLiabilities() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("liabilities")

  const [creditLiabilities, mortgageLiabilities, studentLoanLiabilities] = await Promise.all([
    prisma.creditLiability.findMany({
      select: {
        id: true,
        accountId: true,
        aprs: true,
        isOverdue: true,
        last_payment_amount_number: true,
        last_payment_date_string: true,
        last_statement_issue_date_string: true,
        last_statement_balance_number: true,
        minimum_payment_amount_number: true,
        next_payment_due_date_string: true,
        created_at_string: true,
        updated_at_string: true,
        account: {
          select: {
            id: true,
            name: true,
            mask: true,
            type: true,
            subtype: true,
            current_balance_number: true,
            available_balance_number: true,
            credit_limit_number: true,
          },
        },
      },
    }),
    prisma.mortgageLiability.findMany({
      select: {
        id: true,
        accountId: true,
        accountNumber: true,
        current_late_fee_number: true,
        escrow_balance_number: true,
        hasPmi: true,
        hasPrepaymentPenalty: true,
        interestRate: true,
        last_payment_amount_number: true,
        last_payment_date_string: true,
        loanTypeDescription: true,
        loanTerm: true,
        maturity_date_string: true,
        next_monthly_payment_number: true,
        next_payment_due_date_string: true,
        origination_date_string: true,
        origination_principal_amount_number: true,
        past_due_amount_number: true,
        propertyAddress: true,
        ytd_interest_paid_number: true,
        ytd_principal_paid_number: true,
        created_at_string: true,
        updated_at_string: true,
        account: {
          select: {
            id: true,
            name: true,
            mask: true,
            type: true,
            subtype: true,
            current_balance_number: true,
          },
        },
      },
    }),
    prisma.studentLoanLiability.findMany({
      select: {
        id: true,
        accountId: true,
        accountNumber: true,
        disbursementDates: true,
        expected_payoff_date_string: true,
        guarantor: true,
        interest_rate_percentage_number: true,
        isOverdue: true,
        last_payment_amount_number: true,
        last_payment_date_string: true,
        last_statement_balance_number: true,
        last_statement_issue_date_string: true,
        loanName: true,
        loanStatus: true,
        minimum_payment_amount_number: true,
        next_payment_due_date_string: true,
        origination_date_string: true,
        origination_principal_amount_number: true,
        outstanding_interest_amount_number: true,
        paymentReferenceNumber: true,
        repaymentPlan: true,
        sequenceNumber: true,
        servicerAddress: true,
        ytd_interest_paid_number: true,
        ytd_principal_paid_number: true,
        created_at_string: true,
        updated_at_string: true,
        account: {
          select: {
            id: true,
            name: true,
            mask: true,
            type: true,
            subtype: true,
            current_balance_number: true,
          },
        },
      },
    }),
  ])

  return {
    credit: creditLiabilities,
    mortgage: mortgageLiabilities,
    studentLoan: studentLoanLiabilities,
  }
}
