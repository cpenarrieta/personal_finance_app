"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  createSubcategorySchema,
  deleteSubcategorySchema,
} from "@/types/api"

/**
 * Create a new category with validation
 */
export async function createCategory(formData: FormData): Promise<void> {
  const rawData = {
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl") || null,
    isTransferCategory: formData.get("isTransferCategory") === "true",
  }

  const parsed = createCategorySchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await prisma.category.create({
    data: {
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl,
      isTransferCategory: parsed.data.isTransferCategory,
    },
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}

/**
 * Update an existing category with validation
 */
export async function updateCategory(formData: FormData): Promise<void> {
  const rawData = {
    id: formData.get("id"),
    isTransferCategory: formData.get("isTransferCategory") === "true",
  }

  const parsed = updateCategorySchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await prisma.category.update({
    where: { id: parsed.data.id },
    data: { isTransferCategory: parsed.data.isTransferCategory },
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}

/**
 * Delete a category with validation
 */
export async function deleteCategory(formData: FormData): Promise<void> {
  const rawData = {
    id: formData.get("id"),
  }

  const parsed = deleteCategorySchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await prisma.category.delete({
    where: { id: parsed.data.id },
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}

/**
 * Create a new subcategory with validation
 */
export async function createSubcategory(formData: FormData): Promise<void> {
  const rawData = {
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl") || null,
  }

  const parsed = createSubcategorySchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await prisma.subcategory.create({
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl,
    },
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}

/**
 * Delete a subcategory with validation
 */
export async function deleteSubcategory(formData: FormData): Promise<void> {
  const rawData = {
    id: formData.get("id"),
  }

  const parsed = deleteSubcategorySchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await prisma.subcategory.delete({
    where: { id: parsed.data.id },
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}
