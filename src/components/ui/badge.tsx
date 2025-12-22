import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90 [a&]:hover:shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-white shadow-sm [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80",
        success:
          "border-transparent bg-success text-success-foreground shadow-sm [a&]:hover:bg-success/90 dark:bg-success/80",
        outline:
          "text-foreground border-border [a&]:hover:bg-accent/50 [a&]:hover:text-accent-foreground [a&]:hover:border-primary/30",
        soft: "border-transparent bg-primary/10 text-primary [a&]:hover:bg-primary/20 dark:bg-primary/15",
        "soft-destructive":
          "border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20 dark:bg-destructive/15",
        "soft-success":
          "border-transparent bg-success/10 text-success [a&]:hover:bg-success/20 dark:bg-success/15",
        "soft-secondary":
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
