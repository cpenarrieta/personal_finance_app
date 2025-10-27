import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { DeleteButton } from "@/components/DeleteButton";
import { getCategoryImage } from "@/lib/categoryImages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { CategoryWithSubcategories } from "@/types";

export const metadata: Metadata = {
  title: "Manage Categories",
  robots: {
    index: false,
    follow: false,
  },
};

// Server Actions
async function createCategory(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const imageUrl = formData.get("imageUrl") as string;

  await prisma.category.create({
    data: { name, imageUrl: imageUrl || null },
  });
  revalidatePath("/settings/manage-categories");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.category.delete({ where: { id } });
  revalidatePath("/settings/manage-categories");
}

async function createSubcategory(formData: FormData) {
  "use server";
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const imageUrl = formData.get("imageUrl") as string;

  await prisma.subcategory.create({
    data: { categoryId, name, imageUrl: imageUrl || null },
  });
  revalidatePath("/settings/manage-categories");
}

async function deleteSubcategory(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.subcategory.delete({ where: { id } });
  revalidatePath("/settings/manage-categories");
}

export default async function ManageCategoriesPage() {
  const categories = (await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { name: "asc" },
  })) as CategoryWithSubcategories[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Categories
          </h1>
          <p className="text-gray-600 mt-1">
            Create and organize your categories and subcategories
          </p>
        </div>

        {/* Add Category Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add New Category
          </h2>
          <form action={createCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name *</Label>
                <Input
                  id="category-name"
                  type="text"
                  name="name"
                  placeholder="e.g., Income, Food, Transportation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-image">Image URL (optional)</Label>
                <Input
                  id="category-image"
                  type="text"
                  name="imageUrl"
                  placeholder="https://example.com/icon.png"
                />
              </div>
            </div>
            <Button type="submit">+ Add Category</Button>
          </form>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Categories ({categories.length})
          </h2>

          {categories.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">
                No categories yet. Create your first category above!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      {getCategoryImage(cat.name, cat.imageUrl) && (
                        <div className="flex-shrink-0">
                          <Image
                            src={getCategoryImage(cat.name, cat.imageUrl)!}
                            alt={cat.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {cat.subcategories.length === 0
                            ? "No subcategories"
                            : `${cat.subcategories.length} subcategory${
                                cat.subcategories.length > 1 ? "ies" : ""
                              }`}
                        </p>
                      </div>
                      <DeleteButton
                        id={cat.id}
                        action={deleteCategory}
                        confirmMessage={`Are you sure you want to delete "${
                          cat.name
                        }"?${
                          cat.subcategories.length > 0
                            ? ` This will also delete ${cat.subcategories.length} subcategory(ies).`
                            : ""
                        }`}
                        buttonText="Delete Category"
                        className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                      />
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div className="p-4">
                    {cat.subcategories.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {cat.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {getCategoryImage(sub.name, sub.imageUrl) && (
                              <Image
                                src={getCategoryImage(sub.name, sub.imageUrl)!}
                                alt={sub.name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded object-cover border border-gray-200"
                              />
                            )}
                            <span className="flex-1 text-gray-900 font-medium">
                              {sub.name}
                            </span>
                            <DeleteButton
                              id={sub.id}
                              action={deleteSubcategory}
                              confirmMessage={`Are you sure you want to delete "${sub.name}"?`}
                              buttonText="Remove"
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Subcategory Form */}
                    <form
                      action={createSubcategory}
                      className="border-t border-gray-200 pt-4 space-y-2"
                    >
                      <input type="hidden" name="categoryId" value={cat.id} />
                      <Label>Add Subcategory</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          name="name"
                          placeholder="Subcategory name"
                          className="flex-1"
                        />
                        <Input
                          type="text"
                          name="imageUrl"
                          placeholder="Image URL (optional)"
                          className="w-48"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          + Add
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
