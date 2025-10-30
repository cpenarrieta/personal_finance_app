import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { DeleteButton } from "@/components/DeleteButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { PrismaTagWithCount } from "@/types";

export const metadata: Metadata = {
  title: "Manage Tags",
  robots: {
    index: false,
    follow: false,
  },
};

// Server Actions
async function createTag(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  await prisma.tag.create({
    data: { name, color },
  });
  revalidatePath("/settings/manage-tags");
}

async function deleteTag(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/settings/manage-tags");
}

async function updateTag(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  await prisma.tag.update({
    where: { id },
    data: { name, color },
  });
  revalidatePath("/settings/manage-tags");
}

export default async function ManageTagsPage() {
  const tags = (await prisma.tag.findMany({
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  })) as PrismaTagWithCount[];

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
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-primary hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Manage Tags</h1>

      <div className="border rounded-lg p-4">
        {/* Add Tag Form */}
        <form action={createTag} className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Add New Tag</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                type="text"
                name="name"
                placeholder="Enter tag name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tag Color</Label>
              <div className="grid grid-cols-10 gap-2 mb-2">
                {colorPalette.map((color) => (
                  <label
                    key={color}
                    className="relative cursor-pointer group"
                    title={color}
                  >
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      required
                      className="sr-only peer"
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-300 peer-checked:border-gray-900 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-gray-900 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm text-muted-foreground">Or custom:</label>
                <input
                  type="color"
                  name="color"
                  className="h-8 w-16 rounded border cursor-pointer"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Add Tag
            </Button>
          </div>
        </form>

        {/* Tags List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Existing Tags</h2>
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tags created yet. Add your first tag above!
            </p>
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
                  Tag Info
                  <div className="flex-1 text-sm text-muted-foreground">
                    {tag._count.transactions} transaction
                    {tag._count.transactions !== 1 ? "s" : ""}
                  </div>
                  {/* Edit Form (Inline) */}
                  <form action={updateTag} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={tag.id} />
                    <Input
                      type="text"
                      name="name"
                      defaultValue={tag.name}
                      className="w-32 h-8 text-sm"
                      placeholder="Tag name"
                    />
                    <input
                      type="color"
                      name="color"
                      defaultValue={tag.color}
                      className="h-8 w-12 rounded border cursor-pointer"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-success hover:bg-success/90"
                    >
                      Update
                    </Button>
                  </form>
                  {/* Delete Button */}
                  <DeleteButton
                    id={tag.id}
                    action={deleteTag}
                    confirmMessage={`Are you sure you want to delete the tag "${
                      tag.name
                    }"?${
                      tag._count.transactions > 0
                        ? ` This tag is used in ${tag._count.transactions} transaction(s).`
                        : ""
                    }`}
                    buttonText="Delete"
                    className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
