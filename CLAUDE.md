# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

📖 **Detailed Documentation:**
- [Data Fetching Strategy](docs/DATA_FETCHING.md) - Server Components, props pattern, generated columns
- [Architecture](docs/ARCHITECTURE.md) - Database schema, Plaid sync, project structure
- [Development Guide](docs/DEVELOPMENT.md) - Commands, environment setup, testing
- [Generated Columns](docs/GENERATED_COLUMNS.md) - PostgreSQL generated columns for passing data to client components
- [Migrations Guide](docs/MIGRATIONS.md) - Prisma migration best practices and workflows

## Project Overview

A personal finance application built with Next.js 15 (App Router) that integrates with Plaid API to sync financial data (transactions, accounts, investments). Features include transaction categorization (including AI-powered categorization with OpenAI), investment portfolio tracking, custom tags, split transactions, and analytics visualization.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript (strict mode with comprehensive type checking enabled)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Better Auth with OAuth (Google, GitHub)
- **Financial Data**: Plaid API for banking/investment data
- **AI**: OpenAI GPT-4o-mini for transaction categorization
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components, Recharts for visualization
- **Stock Data**: Alpha Vantage API for pricing

## Critical Development Rules

### 1. Data Fetching Pattern ⭐️ MOST IMPORTANT

**ALWAYS fetch reference data (categories, tags) in Server Components and pass as props.**

```typescript
// ✅ DO: Server Component fetches data
export default async function Page() {
  const [transactions, categories, tags] = await Promise.all([
    prisma.transaction.findMany(...),
    prisma.category.findMany({ include: { subcategories: true } }),
    prisma.tag.findMany(),
  ])

  return <ClientComponent categories={categories} tags={tags} />
}

// ❌ DON'T: Client components fetching reference data
'use client'
export function ClientComponent() {
  const [categories, setCategories] = useState([])
  useEffect(() => {
    fetch('/api/categories').then(...)  // ❌ NO!
  }, [])
}
```

**Components that require categories/tags as props:**
- `SearchableTransactionList`
- `EditTransactionModal`
- `SplitTransactionModal`
- `TransactionDetailView`

👉 See [DATA_FETCHING.md](docs/DATA_FETCHING.md) for complete patterns

### 2. UI Components ⭐️ ALWAYS USE shadcn/ui

**Never create custom form inputs, selects, badges, or alerts. Use shadcn/ui components.**

```typescript
// ✅ DO: Use shadcn components
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>

// ❌ DON'T: Use native HTML
<input type="text" className="..." />
<span className="badge">Status</span>
```

**Available shadcn/ui components:**
Input, Select, Label, Textarea, Button, Badge, Alert, Card, Dialog, Checkbox, Switch, Tabs, Table, Popover, Separator, RadioGroup, ScrollArea

**Exception:** Native `<select>` with `<optgroup>` is allowed (shadcn doesn't support optgroups yet)

**When building new features:**
1. Check if shadcn component exists before creating custom UI
2. Install if missing: `npx shadcn@latest add [component-name]`
3. Keep styling minimal - design overhaul is planned
4. Always pair Label with form inputs for accessibility

### 3. Component Patterns

- **Server Components by default** - Use `'use client'` only when needed
- **Client components**: Forms, interactive elements, Plaid Link, modals
- **All UI components** in `src/components/ui/` (shadcn/ui)
- **Use cn() utility** from `src/lib/utils.ts` for conditional Tailwind classes

### 4. Type Safety

- Strict TypeScript mode enabled
- Use `@/*` path alias for imports
- Use `Prisma.Decimal` for monetary amounts

## Common Tasks

### Adding a New Page with Reference Data

1. ✅ Fetch categories/tags in Server Component (page.tsx)
3. ✅ Pass as props to Client Components
4. ✅ Update TypeScript interfaces in `types/components.ts`
5. ❌ Never fetch categories/tags in client components with useEffect

### Creating a Form

1. ✅ Use shadcn Input, Label, Select, Textarea components
2. ✅ Wrap in `<div className="space-y-2">` for spacing
3. ✅ Pair Label with input using `htmlFor` and `id`
4. ✅ Use Select for dropdowns (except optgroups)

### Displaying Status/Tags

1. ✅ Use Badge component for all status indicators
2. ✅ Use variants: `default`, `secondary`, `destructive`, `outline`
3. ✅ For custom colors: `<Badge style={{ backgroundColor: color }}>`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   ├── transactions/       # Transaction pages
│   ├── accounts/           # Account pages
│   ├── investments/        # Investment pages
│   └── settings/           # Settings pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── ...                 # Feature components
├── lib/                    # Utilities
│   ├── auth.ts             # Better Auth config
│   ├── plaid.ts            # Plaid client
│   ├── sync.ts             # Sync logic
│   └── prisma.ts           # Prisma client
└── types/                  # TypeScript types
```

## UI Components Strategy

### shadcn/ui Component Usage

**Always use shadcn/ui components** for all UI elements. This app has migrated to shadcn/ui for consistent theming and design.

#### Available Components

All shadcn/ui components are in `src/components/ui/`:
- `Input` - Text inputs, date inputs, number inputs
- `Select` - Dropdowns with SelectTrigger, SelectContent, SelectItem
- `Label` - Form labels (always pair with inputs)
- `Textarea` - Multi-line text inputs
- `Button` - Already in use throughout the app
- `Badge` - Status indicators, tags, filter chips
- `Alert` - Error messages, warnings, info boxes
- `Card` - Container components (already in use)
- `Dialog` - Modals and dialogs (already in use)
- `Checkbox` - Boolean inputs
- `Switch` - Toggle switches
- `Tabs` - Tabbed navigation
- `Table` - Data tables
- `Popover` - Dropdown menus and popovers
- `Separator` - Visual dividers
- `RadioGroup` - Radio button groups
- `ScrollArea` - Scrollable areas

#### Component Usage Rules

**Forms:**
```typescript
// ✅ DO: Use shadcn/ui components with Label
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter email" />
</div>

// ❌ DON'T: Use native HTML inputs
<input type="text" className="..." />
```

**Select Dropdowns:**
```typescript
// ✅ DO: Use shadcn Select component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>

// ❌ DON'T: Use native select (except for optgroups - shadcn doesn't support them yet)
<select className="...">
  <option>Option 1</option>
</select>

// ⚠️ EXCEPTION: Native select is OK for optgroups
<select>
  <optgroup label="Group 1">
    <option>Option 1</option>
  </optgroup>
</select>
```

**Status Indicators:**
```typescript
// ✅ DO: Use Badge component
import { Badge } from "@/components/ui/badge"

<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Error</Badge>
<Badge className="bg-custom-color">Custom</Badge>

// ❌ DON'T: Use custom spans
<span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Pending</span>
```

**Alerts and Messages:**
```typescript
// ✅ DO: Use Alert component
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>

// ❌ DON'T: Use custom divs
<div className="bg-red-50 border border-red-200 p-4">Error message</div>
```

#### Styling Guidelines

1. **Keep components unopinionated**: Avoid adding too many custom styles. The app will undergo a design overhaul in the future.

2. **Use Tailwind for customization**: Apply Tailwind classes via `className` prop
   ```typescript
   <Input className="w-full" />
   <Badge className="bg-blue-100 text-blue-800">Custom</Badge>
   ```

3. **Dynamic styles with inline styles**: For user-defined colors (tags, etc.)
   ```typescript
   <Badge style={{ backgroundColor: tag.color }} className="text-white">
     {tag.name}
   </Badge>
   ```

4. **Use cn() utility for conditional classes**:
   ```typescript
   import { cn } from "@/lib/utils"

   <Button className={cn("px-4 py-2", isActive && "bg-blue-600")} />
   ```

#### Theme Customization

The app uses CSS variables for theming (defined in `globals.css`). All shadcn components respect these variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... more variables */
}
```

To change the entire app theme, modify these CSS variables or use tools like [tweakcn.com](https://tweakcn.com/).

#### Migration Status

**Completed (Major Components):**
- ✅ **ChartsView.tsx** - All filters (Select, Input, Button, Checkbox, Switch), Tables, Tab buttons, Badge filter chips
- ✅ **SearchableTransactionList.tsx** - All filters, selects, buttons, badges, bulk update panel
- ✅ **EditTransactionModal.tsx** - Forms (Input, Textarea, Label), Buttons, Badge for tags
- ✅ **TransactionItem.tsx** - Checkbox for bulk select, Button for details link
- ✅ **manage-categories/page.tsx** - Button components for add/update actions
- ✅ **manage-tags/page.tsx** - Button components for add/update actions
- ✅ **login/page.tsx** - Alert component for error messages

**Remaining to Migrate (Optional - for consistency):**
- ⏳ **SplitTransactionModal.tsx** - Buttons, Input fields, Textarea, Alert, Select (11 instances)
- ⏳ **TransactionDetailView.tsx** - Buttons for "Split" and "Edit" actions (2 instances)
- ⏳ **DeleteButton.tsx** - Native button element (1 instance)
- ⏳ **move-transactions/page.tsx** - Buttons and Select dropdowns (5+ instances)

**Exceptions (Intentionally Kept as Native HTML):**
- ✅ Category/subcategory selects with `<optgroup>` (shadcn Select doesn't support optgroups) - EditTransactionModal.tsx line 132-145
- ✅ Native `<input type="color">` for color picker (no shadcn alternative) - manage-tags/page.tsx
- ✅ Hidden `<input type="hidden">` in server action forms (standard practice)

#### When Building New Features

1. **Always check if a shadcn component exists** before creating custom UI
2. **Install missing components**: `npx shadcn@latest add [component-name]`
3. **Follow the patterns** in existing migrated components (see EditTransactionModal, SearchableTransactionList)
4. **Pair Labels with inputs** for accessibility
5. **Keep styling minimal** - major design changes are planned

## Quick Commands

```bash
# Development
npm run dev              # Start dev server (never run - always running locally)
npm run build            # Build for production

# Database Migrations ⭐️ ALWAYS use migrate dev, NEVER db push
npx prisma migrate dev --name change_description  # Create & apply migration
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Open database GUI
npx prisma migrate status  # Check migration status

# Plaid Sync
npm run sync             # Sync financial data
```

👉 See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for complete setup and commands

## Authentication

- Single-user app: Only `ALLOWED_EMAIL` can access
- Better Auth with OAuth (Google/GitHub)
- Email validation in `src/lib/auth-helpers.ts`
- All pages require auth except `/login` and `/api/auth/*`

## Important Notes

- **Never run** `npm run dev` (always running locally)
- **Never run** `npm run categorize:gpt` (AI categorization)
- **Never use** `npx prisma db push` on databases with real data (use `migrate dev` instead)
- **Always commit** migration files to git (never delete them)
- **Sync preserves** user customizations (renamed accounts, custom prices)
- **TypeScript strict mode** enabled - full type safety required
