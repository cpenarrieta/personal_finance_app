"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TransitionLinkProps } from "@/types";

/**
 * Link component with useTransition for smooth client-side navigation
 * Shows loading state during navigation
 */
export function TransitionLink({
  href,
  children,
  loadingText = "Loading...",
  disabled,
  variant,
  size,
  className,
}: TransitionLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isPending}
      variant={variant}
      size={size}
      className={className}
    >
      {isPending ? loadingText : children}
    </Button>
  );
}
