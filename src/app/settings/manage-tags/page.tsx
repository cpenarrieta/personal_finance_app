import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { DeleteButton } from '@/components/DeleteButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manage Tags',
  robots: {
    index: false,
    follow: false,
  },
}

// Server Actions
async function createTag(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  const color = formData.get('color') as string

  await prisma.tag.create({
    data: { name, color },
  })
  revalidatePath('/settings/manage-tags')
}

async function deleteTag(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await prisma.tag.delete({ where: { id } })
  revalidatePath('/settings/manage-tags')
}

async function updateTag(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const color = formData.get('color') as string

  await prisma.tag.update({
    where: { id },
    data: { name, color },
  })
  revalidatePath('/settings/manage-tags')
}

export default async function ManageTagsPage() {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Predefined color palette
  const colorPalette = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#64748B', '#78716C', '#A3A3A3',
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Manage Tags</h1>

      <div className="border rounded-lg p-4">
        {/* Add Tag Form */}
        <form action={createTag} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Add New Tag</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter tag name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag Color
              </label>
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
                <label className="text-sm text-gray-600">Or custom:</label>
                <input
                  type="color"
                  name="color"
                  className="h-8 w-16 rounded border border-gray-300 cursor-pointer"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Tag
            </button>
          </div>
        </form>

        {/* Tags List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Existing Tags</h2>
          {tags.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tags created yet. Add your first tag above!
            </p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Tag Preview */}
                  <div
                    className="px-3 py-1 rounded-full text-white text-sm font-medium flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </div>

                  {/* Tag Info */}
                  <div className="flex-1 text-sm text-gray-600">
                    {tag._count.transactions} transaction{tag._count.transactions !== 1 ? 's' : ''}
                  </div>

                  {/* Edit Form (Inline) */}
                  <form action={updateTag} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={tag.id} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={tag.name}
                      className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                      placeholder="Tag name"
                    />
                    <input
                      type="color"
                      name="color"
                      defaultValue={tag.color}
                      className="h-8 w-12 rounded border border-gray-300 cursor-pointer"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Update
                    </button>
                  </form>

                  {/* Delete Button */}
                  <DeleteButton
                    id={tag.id}
                    action={deleteTag}
                    confirmMessage={`Are you sure you want to delete the tag "${tag.name}"?${tag._count.transactions > 0 ? ` This tag is used in ${tag._count.transactions} transaction(s).` : ''}`}
                    buttonText="Delete"
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
