import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { revalidatePath } from 'next/cache'
import { DeleteButton } from '@/components/DeleteButton'
import { getCategoryImage } from '@/lib/categoryImages'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Category Groups',
  robots: {
    index: false,
    follow: false,
  },
}

// Server Actions
async function createGroup(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  await prisma.categoryGroup.create({ data: { name } })
  revalidatePath('/settings/category-groups')
}

async function deleteGroup(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.categoryGroup.delete({ where: { id } })
  revalidatePath('/settings/category-groups')
}

async function addCategoryToGroup(formData: FormData) {
  'use server'
  const groupId = formData.get('groupId') as string
  const categoryId = formData.get('categoryId') as string

  try {
    await prisma.categoryGroupItem.create({
      data: { groupId, categoryId },
    })
  } catch {
    // Ignore duplicate errors
  }
  revalidatePath('/settings/category-groups')
}

async function removeCategoryFromGroup(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.categoryGroupItem.delete({ where: { id } })
  revalidatePath('/settings/category-groups')
}

export default async function CategoryGroupsPage() {
  const categories = await prisma.customCategory.findMany({
    include: { subcategories: true },
    orderBy: { name: 'asc' },
  })

  const groups = await prisma.categoryGroup.findMany({
    include: {
      items: {
        include: { category: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Link href="/settings/manage-categories" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Manage Categories
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Home
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Category Groups</h1>
          <p className="text-gray-600 mt-1">Organize your categories into custom groups for better financial tracking</p>
        </div>

        {/* Add Group Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Group</h2>
          <form action={createGroup} className="space-y-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <div className="flex gap-2">
                <input
                  id="group-name"
                  type="text"
                  name="name"
                  placeholder="e.g., Essential Expenses, Discretionary, Savings Goals"
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  + Create Group
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Groups List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Groups ({groups.length})</h2>

          {groups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No groups yet. Create your first group above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Group Header */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-500">
                          {group.items.length === 0
                            ? 'No categories'
                            : `${group.items.length} category${group.items.length > 1 ? 'ies' : ''}`}
                        </p>
                      </div>
                      <DeleteButton
                        id={group.id}
                        action={deleteGroup}
                        confirmMessage={`Are you sure you want to delete the group "${group.name}"?${group.items.length > 0 ? ` This will remove ${group.items.length} category(ies) from this group.` : ''}`}
                        buttonText="Delete Group"
                        className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                      />
                    </div>
                  </div>

                  {/* Categories in Group */}
                  <div className="p-4">
                    {group.items.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {getCategoryImage(item.category.name, item.category.imageUrl) && (
                              <Image
                                src={getCategoryImage(item.category.name, item.category.imageUrl)!}
                                alt={item.category.name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded object-cover border border-gray-200"
                              />
                            )}
                            <span className="flex-1 text-gray-900 font-medium">{item.category.name}</span>
                            <form action={removeCategoryFromGroup}>
                              <input type="hidden" name="id" value={item.id} />
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition-colors"
                              >
                                Remove
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Category to Group */}
                    <form action={addCategoryToGroup} className="border-t border-gray-200 pt-4">
                      <input type="hidden" name="groupId" value={group.id} />
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Category to Group
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="categoryId"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          required
                        >
                          <option value="">Select a category...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                        >
                          + Add
                        </button>
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
  )
}
