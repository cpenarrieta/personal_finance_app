/**
 * Shared TypeScript types for web and mobile apps
 * This can be imported by both Next.js and React Native projects
 */

// Transaction type from API
export interface Transaction {
  id: string
  plaidTransactionId: string
  accountId: string
  amount_number: number
  isoCurrencyCode: string | null
  date_string: string
  authorized_date_string: string | null
  pending: boolean
  merchantName: string | null
  name: string
  plaidCategory: string | null
  plaidSubcategory: string | null
  paymentChannel: string | null
  logoUrl: string | null
  categoryIconUrl: string | null
  categoryId: string | null
  subcategoryId: string | null
  notes: string | null
  isSplit: boolean
  isManual: boolean
  created_at_string: string
  updated_at_string: string
  account: {
    id: string
    name: string
    type: string
    mask: string | null
  }
  category: {
    id: string
    name: string
    imageUrl: string | null
    isTransferCategory: boolean
  } | null
  subcategory: {
    id: string
    categoryId: string
    name: string
    imageUrl: string | null
  } | null
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string | null
    }
  }>
}

// API Response types
export interface TransactionsResponse {
  transactions: Transaction[]
  count: number
}

export interface ApiError {
  error: string
  details?: string
}

// Category type
export interface Category {
  id: string
  name: string
  imageUrl: string | null
  isTransferCategory: boolean
}

// Tag type
export interface Tag {
  id: string
  name: string
  color: string | null
}

// Account type
export interface Account {
  id: string
  name: string
  type: string
  mask: string | null
}
