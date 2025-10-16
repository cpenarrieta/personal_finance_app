// Mapping of category names to local image files
// Falls back to database imageUrl if no local image is found

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  // Map category names (after emoji removal) to local images
  'transfers': '/images/categories/transfers.png',
  'moving money between your own accounts (e.g., checking to savings)': '/images/categories/transfers.png',
  'income': '/images/categories/income.png',
  'food': '/images/categories/food.png',
  'transportation': '/images/categories/transportation.png',
  'health & wellness': '/images/categories/personal.png',
  'entertainment & fun': '/images/categories/fun_entertaiment.png',
  'family': '/images/categories/family.png',
  'debt repayment': '/images/categories/Debt_Repayment.png',
  'personal & giving': '/images/categories/personal.png',
  'core housing': '/images/categories/house_core.png',
  'utilities': '/images/categories/utilities.png',
  'home upkeep': '/images/categories/Home_Upkeep.png',
  'savings': '/images/categories/Savings.png',
  'groceries': '/images/categories/groceries_category.png',
}

/**
 * Remove emojis from a string
 */
function removeEmojis(str: string): string {
  return str.replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, '').trim()
}

/**
 * Get the image URL for a category
 * Prioritizes local images over database imageUrl
 *
 * @param categoryName - The name of the category
 * @param dbImageUrl - The imageUrl from the database (optional fallback)
 * @returns The image path to use, or null if no image is available
 */
export function getCategoryImage(categoryName: string, dbImageUrl?: string | null): string | null {
  if (!categoryName) return dbImageUrl || null

  // Remove emojis and normalize the category name for lookup (lowercase, trim)
  const normalizedName = removeEmojis(categoryName).toLowerCase().trim()

  // Check if we have a local image for this category
  const localImage = CATEGORY_IMAGE_MAP[normalizedName]
  if (localImage) {
    return localImage
  }

  // Fall back to database imageUrl
  return dbImageUrl || null
}

/**
 * Get all available local category images
 * Useful for displaying available options in UI
 */
export function getAvailableCategoryImages(): Array<{ name: string; path: string }> {
  return Object.entries(CATEGORY_IMAGE_MAP)
    .filter(([key]) => !key.includes('_')) // Only include display names
    .map(([name, path]) => ({ name, path }))
}
