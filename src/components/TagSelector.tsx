"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { TagForClient } from "@/types";

interface TagSelectorProps {
  tags: TagForClient[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  label?: string;
  showManageLink?: boolean;
}

export function TagSelector({
  tags,
  selectedTagIds,
  onToggleTag,
  label = "Tags",
  showManageLink = true,
}: TagSelectorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        {showManageLink && (
          <a
            href="/settings/manage-tags"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80"
          >
            Manage Tags
          </a>
        )}
      </div>
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tags available.{" "}
          {showManageLink && (
            <a
              href="/settings/manage-tags"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Create tags
            </a>
          )}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
              className={`cursor-pointer transition-all ${
                selectedTagIds.includes(tag.id)
                  ? "text-white ring-2 ring-offset-2"
                  : "text-muted-foreground bg-muted hover:bg-muted/80"
              }`}
              style={
                selectedTagIds.includes(tag.id)
                  ? { backgroundColor: tag.color }
                  : undefined
              }
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
