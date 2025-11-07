"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

interface TransitionLinkProps extends Omit<ButtonProps, "onClick"> {
  href: string;
  children: React.ReactNode;
  loadingText?: string;
}

/**
 * Link component with useTransition for smooth client-side navigation
 * Shows loading state during navigation
 */
export function TransitionLink({
  href,
  children,
  loadingText = "Loading...",
  disabled,
  ...props
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
      {...props}
    >
      {isPending ? loadingText : children}
    </Button>
  );
}
