-- Migration: Rename category models and transaction fields
-- This migration:
-- 1. Renames Transaction.category/subcategory to plaidCategory/plaidSubcategory
-- 2. Renames Transaction.customCategoryId/customSubcategoryId to categoryId/subcategoryId
-- 3. Renames CustomCategory table to Category
-- 4. Renames CustomSubcategory table to Subcategory

-- Rename Transaction columns for Plaid categories
ALTER TABLE "Transaction" RENAME COLUMN category TO "plaidCategory";
ALTER TABLE "Transaction" RENAME COLUMN subcategory TO "plaidSubcategory";

-- Rename Transaction foreign key columns for custom categories
ALTER TABLE "Transaction" RENAME COLUMN "customCategoryId" TO "categoryId";
ALTER TABLE "Transaction" RENAME COLUMN "customSubcategoryId" TO "subcategoryId";

-- Rename CustomCategory table to Category
ALTER TABLE "CustomCategory" RENAME TO "Category";

-- Rename CustomSubcategory table to Subcategory
ALTER TABLE "CustomSubcategory" RENAME TO "Subcategory";

-- Rename the foreign key constraint in Subcategory table
ALTER TABLE "Subcategory" RENAME CONSTRAINT "CustomSubcategory_categoryId_fkey" TO "Subcategory_categoryId_fkey";

-- Rename foreign key constraints in Transaction table
ALTER TABLE "Transaction" RENAME CONSTRAINT "Transaction_customCategoryId_fkey" TO "Transaction_categoryId_fkey";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Transaction_customSubcategoryId_fkey" TO "Transaction_subcategoryId_fkey";

