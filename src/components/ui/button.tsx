import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110 dark:shadow-primary/25",
        gradient:
          "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110 dark:shadow-primary/25",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent/50 hover:text-accent-foreground hover:border-primary/30 dark:bg-input/20 dark:border-input dark:hover:bg-input/40",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:shadow-sm",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground dark:hover:bg-accent/30",
        link: "text-primary underline-offset-4 hover:underline",
        soft: "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/15 dark:hover:bg-primary/25",
        "soft-destructive":
          "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/15 dark:hover:bg-destructive/25",
        "soft-success": "bg-success/10 text-success hover:bg-success/20 dark:bg-success/15 dark:hover:bg-success/25",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-md gap-1.5 px-4 has-[>svg]:px-3 text-xs",
        lg: "h-11 rounded-lg px-7 has-[>svg]:px-5 text-base",
        xl: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base font-semibold",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
