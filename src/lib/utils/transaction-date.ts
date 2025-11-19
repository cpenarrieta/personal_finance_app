/**
 * Transaction Date Utilities
 *
 * These utilities ensure consistent date handling for transactions across all components,
 * regardless of timezone or environment (localhost vs production).
 *
 * Key principle: Since Plaid transactions have no time component (always midnight UTC),
 * we extract and work with date strings (YYYY-MM-DD) to avoid timezone conversion issues.
 */

/**
 * Extracts the date portion from a transaction datetime string
 * @param datetime - ISO datetime string (e.g., "2025-11-16T00:00:00Z")
 * @returns Date string in YYYY-MM-DD format (e.g., "2025-11-16")
 */
export function getTransactionDate(datetime: string): string {
  return datetime.split("T")[0]
}

/**
 * Formats a transaction datetime for display
 * @param datetime - ISO datetime string (e.g., "2025-11-16T00:00:00Z")
 * @param formatType - Display format type (default: "medium")
 * @returns Formatted date string
 *
 * Format types:
 * - "short": "Nov 16" (month day)
 * - "medium": "Nov 16, 2025" (month day year)
 * - "long": "November 16, 2025" (full month day year)
 * - "weekday": "Saturday" (day of week)
 * - "iso": "2025-11-16" (YYYY-MM-DD)
 */
export function formatTransactionDate(
  datetime: string,
  formatType: "short" | "medium" | "long" | "weekday" | "iso" = "medium",
): string {
  const dateStr = getTransactionDate(datetime)
  const [year, month, day] = dateStr.split("-").map(Number)

  // Create date in local timezone (no UTC conversion)
  const date = new Date(year, month - 1, day)

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  switch (formatType) {
    case "short":
      return `${monthShort[month - 1]} ${day}`
    case "medium":
      return `${monthShort[month - 1]} ${day}, ${year}`
    case "long":
      return `${monthNames[month - 1]} ${day}, ${year}`
    case "weekday":
      return weekdays[date.getDay()]
    case "iso":
      return dateStr
    default:
      return `${monthShort[month - 1]} ${day}, ${year}`
  }
}

/**
 * Compare two transaction datetime strings for sorting
 * @param a - First datetime string
 * @param b - Second datetime string
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareTransactionDates(a: string, b: string): number {
  const dateA = getTransactionDate(a)
  const dateB = getTransactionDate(b)
  return dateA.localeCompare(dateB)
}

/**
 * Check if a transaction datetime falls within a date range
 * @param datetime - Transaction datetime string
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns True if datetime is within range (inclusive)
 */
export function isTransactionInDateRange(datetime: string, startDate: string, endDate: string): boolean {
  const date = getTransactionDate(datetime)
  return date >= startDate && date <= endDate
}

/**
 * Get year-month string for grouping transactions by month
 * @param datetime - Transaction datetime string
 * @returns Year-month string (e.g., "2025-11")
 */
export function getTransactionMonth(datetime: string): string {
  return getTransactionDate(datetime).substring(0, 7)
}

/**
 * Format year-month string for display
 * @param yearMonth - Year-month string (e.g., "2025-11")
 * @returns Formatted string (e.g., "Nov 2025")
 */
export function formatTransactionMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number)
  const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${monthShort[month - 1]} ${year}`
}

/**
 * Check if two transaction datetimes are on the same day
 * @param datetime1 - First datetime string
 * @param datetime2 - Second datetime string
 * @returns True if both are on the same date
 */
export function isSameTransactionDay(datetime1: string, datetime2: string): boolean {
  return getTransactionDate(datetime1) === getTransactionDate(datetime2)
}

/**
 * Compare a transaction datetime with a JavaScript Date object
 * Used for filtering with date picker values
 * @param datetime - Transaction datetime string
 * @param date - JavaScript Date object
 * @returns True if they represent the same day
 */
export function isTransactionOnDate(datetime: string, date: Date): boolean {
  const transactionDate = getTransactionDate(datetime)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const compareDate = `${year}-${month}-${day}`
  return transactionDate === compareDate
}

/**
 * Convert JavaScript Date to YYYY-MM-DD string
 * @param date - JavaScript Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function dateToString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
