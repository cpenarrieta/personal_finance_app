"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTransition } from "react";
import type { TransferCategoryToggleProps } from "@/types";

export function TransferCategoryToggle({
  categoryId,
  isTransferCategory,
  updateAction,
}: TransferCategoryToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (checked: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", categoryId);
      formData.set("isTransferCategory", checked ? "true" : "false");
      await updateAction(formData);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`is-transfer-${categoryId}`}
        checked={isTransferCategory}
        onCheckedChange={handleChange}
        disabled={isPending}
      />
      <Label
        htmlFor={`is-transfer-${categoryId}`}
        className="text-xs font-normal cursor-pointer text-muted-foreground"
      >
        Transfer category
      </Label>
    </div>
  );
}
