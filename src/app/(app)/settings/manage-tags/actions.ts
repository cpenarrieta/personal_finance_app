"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/db/prisma"
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

  await prisma.tag.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
    },
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

  await prisma.tag.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.color && { color: parsed.data.color }),
    },
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

  await prisma.tag.delete({
    where: { id: parsed.data.id },
  })

  revalidatePath("/settings/manage-tags")
  revalidateTag("tags", "max")
}
