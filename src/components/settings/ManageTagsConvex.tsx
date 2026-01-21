"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Predefined color palette
const colorPalette = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#64748B",
  "#78716C",
  "#A3A3A3",
]

function ManageTagsSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    </div>
  )
}

export function ManageTagsConvex() {
  const tags = useQuery(api.tags.getAllWithCounts)
  const createTag = useMutation(api.tags.create)
  const updateTag = useMutation(api.tags.update)
  const removeTag = useMutation(api.tags.remove)

  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("")
  const [customColor, setCustomColor] = useState("#3B82F6")
  const [isCreating, setIsCreating] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  if (tags === undefined) {
    return <ManageTagsSkeleton />
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) {
      toast.error("Tag name is required")
      return
    }
    const color = newTagColor || customColor
    if (!color) {
      toast.error("Please select a color")
      return
    }

    setIsCreating(true)
    try {
      await createTag({ name: newTagName.trim(), color })
      setNewTagName("")
      setNewTagColor("")
      toast.success("Tag created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tag")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTag = async (tagId: string) => {
    if (!editName.trim()) {
      toast.error("Tag name is required")
      return
    }

    try {
      await updateTag({
        id: tagId as Id<"tags">,
        name: editName.trim(),
        color: editColor,
      })
      setEditingTagId(null)
      toast.success("Tag updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update tag")
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      await removeTag({ id: tagId as Id<"tags"> })
      toast.success("Tag deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tag")
    }
  }

  return (
    <div className="border rounded-lg p-4">
      {/* Add Tag Form */}
      <form onSubmit={handleCreateTag} className="mb-6 p-4 bg-muted/50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Add New Tag</h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Tag Name</Label>
            <Input
              id="tag-name"
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Tag Color</Label>
            <div className="grid grid-cols-10 gap-2 mb-2">
              {colorPalette.map((color) => (
                <label key={color} className="relative cursor-pointer group" title={color}>
                  <input
                    type="radio"
                    name="newColor"
                    value={color}
                    checked={newTagColor === color}
                    onChange={() => setNewTagColor(color)}
                    className="sr-only peer"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-border peer-checked:border-foreground peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-foreground hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-sm text-muted-foreground">Or custom:</label>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  setNewTagColor("")
                }}
                className="h-8 w-16 rounded border cursor-pointer"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? "Creating..." : "Add Tag"}
          </Button>
        </div>
      </form>

      {/* Tags List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Existing Tags</h2>
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No tags created yet. Add your first tag above!</p>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Tag Preview */}
                <div
                  className="px-3 py-1 rounded-full text-white text-sm font-medium flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {tag._count.transactions} transaction{tag._count.transactions !== 1 ? "s" : ""}
                </div>

                {editingTagId === tag.id ? (
                  /* Edit Form */
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-32 h-8 text-sm"
                      placeholder="Tag name"
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-8 w-12 rounded border cursor-pointer"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="bg-success hover:bg-success/90"
                      onClick={() => handleUpdateTag(tag.id)}
                    >
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingTagId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  /* View/Action Buttons */
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTagId(tag.id)
                        setEditName(tag.name)
                        setEditColor(tag.color)
                      }}
                    >
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the tag "{tag.name}"?
                            {tag._count.transactions > 0 && (
                              <> This tag is used in {tag._count.transactions} transaction(s).</>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTag(tag.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
