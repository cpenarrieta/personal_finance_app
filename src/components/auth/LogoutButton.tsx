"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { useState } from "react";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function LogoutButton({
  variant = "outline",
  size = "default",
  className
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
