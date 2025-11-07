# Theming Guidelines

**Use shadcn/ui theme variables exclusively.** Never hardcode Tailwind colors. All colors reference CSS variables from `globals.css` for instant theme switching.

## Core Principle

✅ Use shadcn semantic tokens
❌ Never hardcode Tailwind colors

## Color Token Reference

### Text Colors

| Use Case | Token | Example |
|----------|-------|---------|
| Primary text | `text-foreground` | Main headings, body text |
| Secondary/muted text | `text-muted-foreground` | Descriptions, labels, placeholders |
| Links/interactive | `text-primary` | Links, active states |
| Success/positive | `text-success` | Income, gains, positive metrics |
| Error/negative | `text-destructive` | Expenses, losses, errors |
| Warning/pending | `text-warning-foreground` | Pending transactions, alerts |

### Background Colors

| Use Case | Token | Example |
|----------|-------|---------|
| Page background | `bg-background` | Main page wrapper |
| Card/container | `bg-card` | Content cards, modals |
| Muted background | `bg-muted` | Disabled states, subtle backgrounds |
| Muted (lighter) | `bg-muted/50` | Hover states, very subtle backgrounds |
| Primary action | `bg-primary` | Primary buttons |
| Success action | `bg-success` | Confirm buttons |
| Destructive action | `bg-destructive` | Delete buttons |
| Warning/alert | `bg-warning/10` | Warning banners |

### Border Colors

| Use Case | Token |
|----------|-------|
| Default borders | `border-border` |
| Input borders | `border-input` |
| Focus rings | `focus:ring-primary` |

### Semantic Tokens (Custom)

Our app extends shadcn with these custom semantic colors:

```css
--success: oklch(0.6 0.15 145);           /* Green for income/positive */
--success-foreground: oklch(0.985 0 0);   /* Text on success bg */
--warning: oklch(0.75 0.15 85);           /* Yellow for pending/alerts */
--warning-foreground: oklch(0.2 0 0);     /* Text on warning bg */
```

## Common Patterns

### Financial Amounts (Income/Expense)

```tsx
// ✅ DO
<span className={amount > 0 ? "text-destructive" : "text-success"}>
  {formatCurrency(amount)}
</span>

// ❌ DON'T
<span className={amount > 0 ? "text-red-600" : "text-green-600"}>
  {formatCurrency(amount)}
</span>
```

### Status Badges

```tsx
// ✅ DO
<Badge className="bg-warning/10 text-warning-foreground">Pending</Badge>
<Badge className="bg-success/10 text-success-foreground">Complete</Badge>
<Badge className="bg-destructive/10 text-destructive">Failed</Badge>

// ❌ DON'T
<Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
<Badge className="bg-green-100 text-green-800">Complete</Badge>
<Badge className="bg-red-100 text-red-800">Failed</Badge>
```

### Buttons

```tsx
// ✅ DO (use shadcn Button variants)
<Button variant="default">Primary</Button>      {/* Uses bg-primary */}
<Button variant="destructive">Delete</Button>   {/* Uses bg-destructive */}
<Button variant="secondary">Cancel</Button>     {/* Uses bg-secondary */}
<Button variant="ghost">Subtle</Button>

// For custom success buttons
<Button className="bg-success text-success-foreground hover:bg-success/90">
  Confirm
</Button>

// ❌ DON'T
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Primary
</button>
```

### Page Layouts

```tsx
// ✅ DO
<div className="p-6 bg-background min-h-screen">
  <Link href="/" className="text-primary hover:underline">
    ← Back
  </Link>
  <h1 className="text-3xl font-bold text-foreground">Page Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ DON'T
<div className="p-6 bg-gray-50 min-h-screen">
  <Link href="/" className="text-blue-600 hover:underline">
    ← Back
  </Link>
  <h1 className="text-3xl font-bold text-gray-900">Page Title</h1>
  <p className="text-gray-600">Description</p>
</div>
```

### Filter Chips/Active States

```tsx
// ✅ DO
<Badge className="bg-primary/10 text-primary">
  ✓ Category
  <Button className="hover:bg-primary/20">×</Button>
</Badge>

// ❌ DON'T
<Badge className="bg-blue-100 text-blue-800">
  ✓ Category
  <Button className="hover:bg-blue-200">×</Button>
</Badge>
```

## Exceptions (Allowed)

These are the ONLY cases where non-theme colors are acceptable:

### 1. User-Defined Colors
```tsx
// ✅ OK - User picks tag color
<Badge style={{ backgroundColor: tag.color }} className="text-white">
  {tag.name}
</Badge>
```

### 2. Data Visualization
```tsx
// ✅ OK - Chart colors from palette
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", ...];
<Cell fill={COLORS[index % COLORS.length]} />
```

**Note:** Consider migrating charts to use theme colors:
```tsx
// Better approach for charts
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];
```

### 3. Native Color Picker
```tsx
// ✅ OK - Native input
<input type="color" value={color} onChange={...} />
```

## Migration Checklist

When building new features:

- [ ] No `text-gray-*` classes (use `text-foreground` or `text-muted-foreground`)
- [ ] No `bg-gray-*` classes (use `bg-background`, `bg-card`, `bg-muted`)
- [ ] No `text-blue-*` classes (use `text-primary`)
- [ ] No `bg-blue-*` classes (use `bg-primary`)
- [ ] No `text-red-*` classes (use `text-destructive`)
- [ ] No `text-green-*` classes (use `text-success`)
- [ ] No `bg-yellow-*`/`text-yellow-*` (use `bg-warning/10`, `text-warning-foreground`)
- [ ] No `border-gray-*` (use `border-border`)
- [ ] All buttons use shadcn `<Button>` with variants
- [ ] All badges use shadcn `<Badge>` with theme colors

## Testing Theme Changes

To verify theming works:

1. Go to [tweakcn.com](https://tweakcn.com)
2. Select a theme (e.g., "Bubblegum", "Violet")
3. Copy the generated CSS
4. Replace `:root` and `.dark` sections in `src/app/globals.css`
5. Entire app should update instantly

If any UI elements don't change → they're using hardcoded colors and need migration.

## Available Theme Variables

See `src/app/globals.css` for full list:

**Light mode (`:root`):**
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--success`, `--success-foreground`
- `--warning`, `--warning-foreground`
- `--border`, `--input`, `--ring`
- `--chart-1` through `--chart-5`

**Dark mode (`.dark`):**
All same variables with different values.

## Quick Reference

```tsx
// Common replacements
text-gray-900      → text-foreground
text-gray-600/700  → text-muted-foreground
text-gray-500      → text-muted-foreground
text-gray-400      → text-muted-foreground/60

bg-gray-50         → bg-background or bg-muted/50
bg-gray-100        → bg-muted
bg-white           → bg-card

text-blue-600      → text-primary
bg-blue-600        → bg-primary
hover:bg-blue-700  → hover:bg-primary/90

text-green-600     → text-success
bg-green-600       → bg-success

text-red-600       → text-destructive
bg-red-600         → bg-destructive

text-yellow-800    → text-warning-foreground
bg-yellow-100      → bg-warning/10

border-gray-300    → border-border
```

## Questions?

- **"What color for disabled states?"** → `bg-muted` + `text-muted-foreground` + `opacity-50`
- **"What for hover states?"** → Same color + `/90` or `/80` (e.g., `hover:bg-primary/90`)
- **"What for subtle backgrounds?"** → Use `/10`, `/20`, `/50` opacity (e.g., `bg-primary/10`)
- **"Can I use inline styles?"** → Only for user-defined colors (tags) or data viz

## Summary

**Golden Rule:** If you're about to type a color like `blue-600`, `gray-500`, etc. → STOP and use a theme variable instead.

This ensures the entire app can switch themes instantly by just changing CSS variables in `globals.css`.
