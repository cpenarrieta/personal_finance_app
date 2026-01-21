"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { createTagSchema, updateTagSchema, deleteTagSchema } from "@/types/api"

/**
 * Create a new tag with validation
 */
export async function createTag(formData: FormData): Promise<void> {
  const rawData = {
    name: formData.get("name"),
    color: formData.get("color"),
  }

  const parsed = createTagSchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await fetchMutation(api.tags.create, {
    name: parsed.data.name,
    color: parsed.data.color,
  })

  revalidatePath("/settings/manage-tags")
  revalidateTag("tags", "max")
}

/**
 * Update an existing tag with validation
 */
export async function updateTag(formData: FormData): Promise<void> {
  const rawData = {
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    color: formData.get("color") || undefined,
  }

  const parsed = updateTagSchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await fetchMutation(api.tags.update, {
    id: parsed.data.id as Id<"tags">,
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.color && { color: parsed.data.color }),
  })

  revalidatePath("/settings/manage-tags")
  revalidateTag("tags", "max")
}

/**
 * Delete a tag with validation
 */
export async function deleteTag(formData: FormData): Promise<void> {
  const rawData = {
    id: formData.get("id"),
  }

  const parsed = deleteTagSchema.safeParse(rawData)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input")
  }

  await fetchMutation(api.tags.remove, {
    id: parsed.data.id as Id<"tags">,
  })

  revalidatePath("/settings/manage-tags")
  revalidateTag("tags", "max")
}
