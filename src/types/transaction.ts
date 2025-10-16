// Shared transaction types and utilities

export interface SerializedTag {
  id: string;
  name: string;
  color: string;
}

export interface SerializedTransaction {
  id: string;
  plaidTransactionId: string;
  accountId: string;
  amount: string;
  isoCurrencyCode: string | null;
  date: string;
  authorizedDate: string | null;
  pending: boolean;
  merchantName: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  paymentChannel: string | null;
  pendingTransactionId: string | null;
  logoUrl: string | null;
  categoryIconUrl: string | null;
  customCategoryId: string | null;
  customSubcategoryId: string | null;
  notes: string | null;
  tags: SerializedTag[];
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
    type: string;
    mask: string | null;
  } | null;
  customCategory: {
    id: string;
    name: string;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  customSubcategory: {
    id: string;
    categoryId: string;
    name: string;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    category?: {
      id: string;
      name: string;
      imageUrl: string | null;
      createdAt: string;
      updatedAt: string;
    };
  } | null;
}

/**
 * Serializes a Prisma transaction with relations to a plain object
 * suitable for passing to client components
 */
export function serializeTransaction(t: any): SerializedTransaction {
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
    tags: t.tags?.map((tt: any) => ({
      id: tt.tag.id,
      name: tt.tag.name,
      color: tt.tag.color,
    })) || [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account ? {
      id: t.account.id,
      name: t.account.name,
      type: t.account.type,
      mask: t.account.mask,
    } : null,
    customCategory: t.customCategory ? {
      id: t.customCategory.id,
      name: t.customCategory.name,
      imageUrl: t.customCategory.imageUrl,
      createdAt: t.customCategory.createdAt.toISOString(),
      updatedAt: t.customCategory.updatedAt.toISOString(),
    } : null,
    customSubcategory: t.customSubcategory ? {
      id: t.customSubcategory.id,
      categoryId: t.customSubcategory.categoryId,
      name: t.customSubcategory.name,
      imageUrl: t.customSubcategory.imageUrl,
      createdAt: t.customSubcategory.createdAt.toISOString(),
      updatedAt: t.customSubcategory.updatedAt.toISOString(),
      category: t.customSubcategory.category ? {
        id: t.customSubcategory.category.id,
        name: t.customSubcategory.category.name,
        imageUrl: t.customSubcategory.category.imageUrl,
        createdAt: t.customSubcategory.category.createdAt.toISOString(),
        updatedAt: t.customSubcategory.category.updatedAt.toISOString(),
      } : undefined,
    } : null,
  };
}

/**
 * Standard transaction include clause for Prisma queries
 * Use this to ensure consistent data fetching across the app
 */
export const TRANSACTION_INCLUDE = {
  account: true,
  customCategory: true,
  customSubcategory: {
    include: {
      category: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
} as const;
