"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Loader2, Check } from "lucide-react"
import type { TagForClient } from "@/types"

interface InlineEditableTagsProps {
  transactionId: string
  tags: TagForClient[]
  initialSelectedIds: string[]
}

export function InlineEditableTags({ transactionId, tags, initialSelectedIds }: InlineEditableTagsProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [savingTagId, setSavingTagId] = useState<string | null>(null)
  const [savedTagId, setSavedTagId] = useState<string | null>(null)

  const handleToggleTag = useCallback(
    async (tagId: string) => {
      const newSelectedIds = selectedIds.includes(tagId)
        ? selectedIds.filter((id) => id !== tagId)
        : [...selectedIds, tagId]

      // Optimistic update
      setSelectedIds(newSelectedIds)
      setSavingTagId(tagId)

      try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: newSelectedIds }),
        })

        if (!response.ok) {
          throw new Error("Failed to update tags")
        }

        setSavedTagId(tagId)
        setTimeout(() => setSavedTagId(null), 1500)
        router.refresh()
      } catch {
        // Revert on error
        setSelectedIds(selectedIds)
        toast.error("Failed to update tags")
      } finally {
        setSavingTagId(null)
      }
    },
    [transactionId, selectedIds, router],
  )

  if (tags.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Tags</Label>
          <a
            href="/settings/manage-tags"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80"
          >
            Manage Tags
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          No tags available.{" "}
          <a
            href="/settings/manage-tags"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Create tags
          </a>
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Tags</Label>
        <a
          href="/settings/manage-tags"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:text-primary/80"
        >
          Manage Tags
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedIds.includes(tag.id)
          const isSaving = savingTagId === tag.id
          const isSaved = savedTagId === tag.id

          return (
            <Badge
              key={tag.id}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-all relative ${
                isSelected
                  ? "text-white ring-2 ring-offset-2 border-0"
                  : "text-muted-foreground bg-background hover:bg-muted"
              } ${isSaving ? "opacity-70" : ""}`}
              style={isSelected ? { backgroundColor: tag.color } : undefined}
              onClick={() => !isSaving && handleToggleTag(tag.id)}
            >
              {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {isSaved && !isSaving && <Check className="h-3 w-3 mr-1" />}
              {tag.name}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
