"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  createCategorySchema,
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
  }

  const parsed = createCategorySchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  const isTransfer = formData.get("isTransferCategory") === "true"

  await fetchMutation(api.categories.create, {
    name: parsed.data.name,
    imageUrl: parsed.data.imageUrl || undefined,
    groupType: isTransfer ? "TRANSFER" : undefined,
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}

/**
 * Update a category's groupType (toggle transfer status)
 */
export async function updateCategoryGroupType(formData: FormData): Promise<void> {
  const id = formData.get("id") as string
  const isTransfer = formData.get("isTransferCategory") === "true"

  if (!id) {
    throw new Error("Category ID is required")
  }

  await fetchMutation(api.categories.update, {
    id: id as Id<"categories">,
    groupType: isTransfer ? "TRANSFER" : undefined,
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

  await fetchMutation(api.categories.remove, {
    id: parsed.data.id as Id<"categories">,
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

  await fetchMutation(api.categories.createSubcategory, {
    categoryId: parsed.data.categoryId as Id<"categories">,
    name: parsed.data.name,
    imageUrl: parsed.data.imageUrl || undefined,
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

  await fetchMutation(api.categories.removeSubcategory, {
    id: parsed.data.id as Id<"subcategories">,
  })

  revalidatePath("/settings/manage-categories")
  revalidateTag("categories", "max")
}
