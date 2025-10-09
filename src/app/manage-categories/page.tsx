import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

// Server Actions
async function createCategory(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  const imageUrl = formData.get('imageUrl') as string

  await prisma.customCategory.create({
    data: { name, imageUrl: imageUrl || null },
  })
  revalidatePath('/manage-categories')
}

async function deleteCategory(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.customCategory.delete({ where: { id } })
  revalidatePath('/manage-categories')
}

async function createSubcategory(formData: FormData) {
  'use server'
  const categoryId = formData.get('categoryId') as string
  const name = formData.get('name') as string
  const imageUrl = formData.get('imageUrl') as string

  await prisma.customSubcategory.create({
    data: { categoryId, name, imageUrl: imageUrl || null },
  })
  revalidatePath('/manage-categories')
}

async function deleteSubcategory(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.customSubcategory.delete({ where: { id } })
  revalidatePath('/manage-categories')
}

async function createGroup(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  await prisma.categoryGroup.create({ data: { name } })
  revalidatePath('/manage-categories')
}

async function deleteGroup(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.categoryGroup.delete({ where: { id } })
  revalidatePath('/manage-categories')
}

async function addCategoryToGroup(formData: FormData) {
  'use server'
  const groupId = formData.get('groupId') as string
  const categoryId = formData.get('categoryId') as string

  try {
    await prisma.categoryGroupItem.create({
      data: { groupId, categoryId },
    })
  } catch (error) {
    // Ignore duplicate errors
  }
  revalidatePath('/manage-categories')
}

async function removeCategoryFromGroup(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.categoryGroupItem.delete({ where: { id } })
  revalidatePath('/manage-categories')
}

export default async function ManageCategoriesPage() {
  const categories = await prisma.customCategory.findMany({
    include: { subcategories: true },
  })

  const groups = await prisma.categoryGroup.findMany({
    include: {
      items: {
        include: { category: true },
      },
    },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Manage Custom Categories</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Categories</h2>

          {/* Add Category Form */}
          <form action={createCategory} className="mb-4 p-3 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Add New Category</h3>
            <input
              type="text"
              name="name"
              placeholder="Category name"
              required
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <input
              type="text"
              name="imageUrl"
              placeholder="Image URL (optional)"
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Category
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="border rounded p-3">
                <div className="flex items-start gap-2">
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{cat.name}</div>
                    {cat.subcategories.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {cat.subcategories.length} subcategories
                      </div>
                    )}
                  </div>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {/* Subcategories */}
                {cat.subcategories.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1">
                    {cat.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 text-sm">
                        {sub.imageUrl && (
                          <img src={sub.imageUrl} alt="" className="w-6 h-6 rounded" />
                        )}
                        <span className="flex-1">{sub.name}</span>
                        <form action={deleteSubcategory}>
                          <input type="hidden" name="id" value={sub.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Subcategory Form */}
                <form action={createSubcategory} className="mt-2 ml-4">
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="name"
                      placeholder="Add subcategory"
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                    <input
                      type="text"
                      name="imageUrl"
                      placeholder="Image URL"
                      className="w-32 px-2 py-1 border rounded text-sm"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </div>

        {/* Category Groups Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Category Groups</h2>

          {/* Add Group Form */}
          <form action={createGroup} className="mb-4 p-3 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Create New Group</h3>
            <div className="flex gap-2">
              <input
                type="text"
                name="name"
                placeholder="Group name"
                required
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>

          {/* Groups List */}
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{group.name}</h3>
                  <form action={deleteGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete Group
                    </button>
                  </form>
                </div>

                {/* Categories in Group */}
                <div className="space-y-1 mb-2">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.category.imageUrl && (
                        <img
                          src={item.category.imageUrl}
                          alt=""
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <span className="flex-1">{item.category.name}</span>
                      <form action={removeCategoryFromGroup}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  ))}
                </div>

                {/* Add Category to Group */}
                <form action={addCategoryToGroup}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <div className="flex gap-2">
                    <select
                      name="categoryId"
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      required
                    >
                      <option value="">Select category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
