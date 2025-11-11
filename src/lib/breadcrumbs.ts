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
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/accounts': 'Accounts',
  '/investments': 'Investments',
  '/investments/holdings': 'Holdings',
  '/investments/transactions': 'Transactions',
  '/chat': 'AI Chat',
  '/settings': 'Settings',
  '/settings/connections': 'Connections',
  '/settings/manage-categories': 'Categories',
  '/settings/category-order': 'Category Order',
  '/settings/manage-tags': 'Tags',
  '/settings/move-transactions': 'Move Transactions',
  '/connect-account': 'Connect Account',
}

/**
 * Generate breadcrumbs from pathname
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Root path
  if (pathname === '/') {
    return [{ label: 'Dashboard' }]
  }

  // Remove trailing slash
  const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  const breadcrumbs: BreadcrumbItem[] = []
  const segments = cleanPath.split('/').filter(Boolean)

  // Always start with Dashboard (with link)
  breadcrumbs.push({ label: 'Dashboard', href: '/' })

  // Build breadcrumbs progressively
  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (!segment) continue

    currentPath += `/${segment}`
    const isLast = i === segments.length - 1
    const label = breadcrumbConfig[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)

    breadcrumbs.push({
      label,
      ...(isLast ? {} : { href: currentPath }),
    })
  }

  return breadcrumbs
}
