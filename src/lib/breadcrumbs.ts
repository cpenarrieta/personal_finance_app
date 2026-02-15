/**
 * Breadcrumb configuration and generation utilities
 */

export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Breadcrumb configuration map
 * Maps pathname patterns to breadcrumb labels
 */
const breadcrumbConfig: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/review-transactions": "Review Transactions",
  "/accounts": "Accounts",
  "/investments": "Investments",
  "/investments/holdings": "Holdings",
  "/investments/transactions": "Transactions",
  "/chat": "AI Chat",
  "/settings": "Settings",
  "/settings/connections": "Connections",
  "/settings/manage-categories": "Categories",
  "/settings/category-order": "Category Order",
  "/settings/manage-tags": "Tags",
  "/settings/move-transactions": "Move Transactions",
  "/connect-account": "Connect Account",
  "/registered-accounts": "Registered Accounts",
  "/registered-accounts/tax-data": "Tax Data",
  "/registered-accounts/beneficiaries": "Beneficiaries",
}

/**
 * Generate breadcrumbs from pathname
 * Handles both regular paths and /demo prefixed paths
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Detect demo mode and strip prefix for config lookup
  const isDemo = pathname === "/demo" || pathname.startsWith("/demo/")
  const basePath = isDemo ? "/demo" : ""
  const effectivePath = isDemo ? pathname.replace(/^\/demo/, "") || "/" : pathname

  // Root path
  if (effectivePath === "/") {
    return [{ label: "Dashboard" }]
  }

  // Remove trailing slash
  const cleanPath = effectivePath.endsWith("/") ? effectivePath.slice(0, -1) : effectivePath

  const breadcrumbs: BreadcrumbItem[] = []
  const segments = cleanPath.split("/").filter(Boolean)

  // Always start with Dashboard (with link)
  breadcrumbs.push({ label: "Dashboard", href: `${basePath}/` })

  // Build breadcrumbs progressively
  let currentPath = ""
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (!segment) continue

    currentPath += `/${segment}`
    const isLast = i === segments.length - 1
    const label = breadcrumbConfig[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)

    breadcrumbs.push({
      label,
      ...(isLast ? {} : { href: `${basePath}${currentPath}` }),
    })
  }

  return breadcrumbs
}
