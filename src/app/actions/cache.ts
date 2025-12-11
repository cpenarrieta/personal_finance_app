"use server"

import { revalidatePath } from "next/cache"

/**
 * Revalidate the cache for a given path
 */
export async function revalidatePageCache(path: string) {
  try {
    revalidatePath(path, "page")
    return { success: true }
  } catch (error) {
    console.error("Error revalidating path:", error)
    return { success: false, error: "Failed to revalidate cache" }
  }
}
