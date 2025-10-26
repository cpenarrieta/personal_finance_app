/**
 * Transaction-specific utilities and serialization functions
 *
 * This file contains utility functions for working with transactions and categories.
 * Type definitions have been moved to centralized type files.
 */

import type { Tag, PlaidAccount, CustomSubcategory } from '@prisma/client'
import type { TransactionWithRelations } from './prisma'
import type {
  SerializedTransaction,
  CustomCategoryWithSubcategories,
  SerializedTag,
  SerializedPlaidAccountFull,
} from './api'
import {
  PrismaIncludes,
  type CustomCategoryWithSubcategories as PrismaCustomCategoryWithSubcategories,
} from './prisma'

/**
 * Serializes a Prisma transaction with relations to a plain object
 * suitable for passing to client components
 */
export function serializeTransaction(t: TransactionWithRelations): SerializedTransaction {
  return {
    id: t.id,
    plaidTransactionId: t.plaidTransactionId,
    accountId: t.accountId,
    amount: t.amount.toString(),
    isoCurrencyCode: t.isoCurrencyCode,
    date: t.date.toISOString(),
    authorizedDate: t.authorizedDate?.toISOString() || null,
    pending: t.pending,
    merchantName: t.merchantName,
    name: t.name,
    category: t.category,
    subcategory: t.subcategory,
    paymentChannel: t.paymentChannel,
    pendingTransactionId: t.pendingTransactionId,
    logoUrl: t.logoUrl,
    categoryIconUrl: t.categoryIconUrl,
    customCategoryId: t.customCategoryId,
    customSubcategoryId: t.customSubcategoryId,
    notes: t.notes,
    tags: t.tags.map((tt) => ({
      id: tt.tag.id,
      name: tt.tag.name,
      color: tt.tag.color,
    })),
    // Split transaction fields
    isSplit: t.isSplit,
    parentTransactionId: t.parentTransactionId,
    originalTransactionId: t.originalTransactionId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account
      ? {
          id: t.account.id,
          name: t.account.name,
          type: t.account.type,
          mask: t.account.mask,
        }
      : null,
    customCategory: t.customCategory
      ? {
          id: t.customCategory.id,
          name: t.customCategory.name,
          imageUrl: t.customCategory.imageUrl,
          createdAt: t.customCategory.createdAt.toISOString(),
          updatedAt: t.customCategory.updatedAt.toISOString(),
        }
      : null,
    customSubcategory: t.customSubcategory
      ? {
          id: t.customSubcategory.id,
          categoryId: t.customSubcategory.categoryId,
          name: t.customSubcategory.name,
          imageUrl: t.customSubcategory.imageUrl,
          createdAt: t.customSubcategory.createdAt.toISOString(),
          updatedAt: t.customSubcategory.updatedAt.toISOString(),
          category: t.customSubcategory.category
            ? {
                id: t.customSubcategory.category.id,
                name: t.customSubcategory.category.name,
                imageUrl: t.customSubcategory.category.imageUrl,
                createdAt: t.customSubcategory.category.createdAt.toISOString(),
                updatedAt: t.customSubcategory.category.updatedAt.toISOString(),
              }
            : undefined,
        }
      : null,
  }
}

/**
 * Serializes a Prisma custom category with subcategories to a plain object
 * suitable for passing to client components
 */
export function serializeCustomCategory(
  category: PrismaCustomCategoryWithSubcategories
): CustomCategoryWithSubcategories {
  return {
    id: category.id,
    name: category.name,
    imageUrl: category.imageUrl,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    subcategories: category.subcategories.map((sub: CustomSubcategory) => ({
      id: sub.id,
      categoryId: sub.categoryId,
      name: sub.name,
      imageUrl: sub.imageUrl,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  }
}

/**
 * Serializes a Prisma tag to a plain object suitable for passing to client components
 */
export function serializeTag(tag: Tag): SerializedTag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }
}

/**
 * Serializes a Prisma PlaidAccount to a full serialized account object
 * suitable for passing to client components (e.g., for dropdowns, forms)
 */
export function serializePlaidAccount(account: PlaidAccount): SerializedPlaidAccountFull {
  return {
    id: account.id,
    plaidAccountId: account.plaidAccountId,
    itemId: account.itemId,
    name: account.name,
    officialName: account.officialName,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
    currency: account.currency,
    currentBalance: account.currentBalance?.toString() ?? null,
    availableBalance: account.availableBalance?.toString() ?? null,
    creditLimit: account.creditLimit?.toString() ?? null,
    balanceUpdatedAt: account.balanceUpdatedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }
}

/**
 * Standard transaction include clause for Prisma queries
 * Use this to ensure consistent data fetching across the app
 *
 * @deprecated Use PrismaIncludes.transaction from './prisma' instead
 */
export const TRANSACTION_INCLUDE = PrismaIncludes.transaction
