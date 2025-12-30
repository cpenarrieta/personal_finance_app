# Theming Guidelines

**Rule**: Use shadcn/ui theme variables. Never hardcode Tailwind colors.

## Quick Reference

```tsx
// Text
text-gray-900      → text-foreground
text-gray-600      → text-muted-foreground
text-blue-600      → text-primary
text-green-600     → text-success
text-red-600       → text-destructive

// Backgrounds
bg-gray-50         → bg-background
bg-gray-100        → bg-muted
bg-white           → bg-card
bg-blue-600        → bg-primary

// Borders
border-gray-300    → border-border
```

## Examples

### Financial Amounts
```tsx
// ✅ DO
<span className={amount > 0 ? "text-destructive" : "text-success"}>
  {formatCurrency(amount)}
</span>

// ❌ DON'T
<span className={amount > 0 ? "text-red-600" : "text-green-600"}>
```

### Status Badges
```tsx
// ✅ DO
<Badge className="bg-warning/10 text-warning-foreground">Pending</Badge>
<Badge className="bg-success/10 text-success-foreground">Complete</Badge>

// ❌ DON'T
<Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
```

### Buttons
```tsx
// ✅ DO - shadcn variants
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button className="bg-success text-success-foreground">Confirm</Button>

// ❌ DON'T
<button className="bg-blue-600 text-white">Primary</button>
```

### Page Layout
```tsx
// ✅ DO
<div className="bg-background">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ DON'T
<div className="bg-gray-50">
  <h1 className="text-gray-900">Title</h1>
  <p className="text-gray-600">Description</p>
</div>
```

## Allowed Exceptions

1. **User-defined colors** - Tag colors picked by user
2. **Chart colors** - Data visualization (prefer `hsl(var(--chart-1))` etc.)
3. **Native color picker** - `<input type="color" />`

## Available Variables

Defined in `src/app/globals.css`:

**Core**: `--background`, `--foreground`, `--card`, `--muted`, `--primary`, `--secondary`, `--accent`, `--destructive`

**Custom semantic**: `--success`, `--warning`

**Charts**: `--chart-1` through `--chart-5`

Each has a `-foreground` variant for text on that background.

## Testing

Change theme at [tweakcn.com](https://tweakcn.com), paste CSS into `globals.css`. If any element doesn't update, it's using hardcoded colors.
