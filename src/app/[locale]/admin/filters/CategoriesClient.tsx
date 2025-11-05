'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CategoryWithChildren, CategoryTree } from '@/lib/repositories/category.repository'
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  getCategoryTreeAction,
} from '@/app/actions/categories'

interface CategoriesClientProps {
  initialCategories: CategoryTree
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categoryTree, setCategoryTree] = useState<CategoryTree>(initialCategories)

  // Flatten tree to array for easier processing
  const categories = [
    ...categoryTree.ladies,
    ...categoryTree.gents,
    ...categoryTree.kids
  ]
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedHierarchy, setSelectedHierarchy] = useState<'ladies' | 'gents' | 'kids'>('ladies')
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false)

  const refreshCategories = async () => {
    const result = await getCategoryTreeAction()
    if (result.success && result.data) {
      setCategoryTree(result.data)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name')
      return
    }

    const result = await createCategoryAction(
      newCategoryName,
      selectedHierarchy,
      selectedParentId,
      false
    )
    if (result.success) {
      alert('Category created successfully')
      setNewCategoryName('')
      setSelectedParentId(null)
      setShowCreateModal(false)
      await refreshCategories()
    } else {
      alert(result.error || 'Failed to create category')
    }
  }

  const handleUpdateCategory = async (categoryId: string, name: string, isActive: boolean) => {
    const result = await updateCategoryAction(categoryId, { name, isActive })
    if (result.success) {
      alert('Category updated successfully')
      setEditingCategory(null)
      await refreshCategories()
    } else {
      alert(result.error || 'Failed to update category')
    }
  }

  const handleToggleFeatured = async (categoryId: string, currentFeatured: boolean) => {
    const result = await updateCategoryAction(categoryId, { isFeatured: !currentFeatured })
    if (result.success) {
      await refreshCategories()
    } else {
      alert(result.error || 'Failed to update featured status')
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This will also delete all child categories.`)) {
      return
    }

    const result = await deleteCategoryAction(categoryId)
    if (result.success) {
      alert('Category deleted successfully')
      await refreshCategories()
    } else {
      alert(result.error || 'Failed to delete category')
    }
  }

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Flatten the category tree into a single array
  const flattenCategories = (categories: CategoryWithChildren[]): CategoryWithChildren[] => {
    const result: CategoryWithChildren[] = []
    const flatten = (categoryList: CategoryWithChildren[]) => {
      categoryList.forEach(category => {
        result.push(category)
        if (category.children && category.children.length > 0) {
          flatten(category.children)
        }
      })
    }
    flatten(categories)
    return result
  }

  // Filter the tree based on featured status
  const filterTree = (categories: CategoryWithChildren[]): CategoryWithChildren[] => {
    if (!showOnlyFeatured) return categories

    return categories
      .map(category => ({
        ...category,
        children: filterTree(category.children)
      }))
      .filter(category => category.isFeatured || category.children.length > 0)
  }

  const filteredCategories = filterTree(categories)

  const renderCategory = (category: CategoryWithChildren, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const isEditing = editingCategory?.id === category.id

    return (
      <div key={category.id} className="border-l-2 border-gray-200">
        <div
          className="flex items-center gap-3 p-3 hover:bg-gray-50 group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-5 h-5" />
          )}

          {/* Category Name */}
          {isEditing ? (
            <input
              type="text"
              value={editingCategory.name}
              onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateCategory(category.id, editingCategory.name, category.isActive)
                } else if (e.key === 'Escape') {
                  setEditingCategory(null)
                }
              }}
              className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <span className={`font-medium ${category.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {category.name}
              </span>
              {category.isFeatured && (
                <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              )}
            </div>
          )}

          {/* Hierarchy Badge */}
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            category.hierarchy === 'ladies' ? 'bg-pink-100 text-pink-700' :
            category.hierarchy === 'gents' ? 'bg-blue-100 text-blue-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {category.hierarchy.charAt(0).toUpperCase() + category.hierarchy.slice(1)}
          </span>

          {/* Level Badge */}
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            L{category.level}
          </span>

          {/* Product Count */}
          {category.productCount !== undefined && category.productCount > 0 && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
              {category.productCount} products
            </span>
          )}

          {/* Featured Toggle */}
          <button
            onClick={() => handleToggleFeatured(category.id, category.isFeatured)}
            className={`text-xs px-2 py-1 rounded ${
              category.isFeatured
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-500'
            }`}
            title={category.isFeatured ? 'Featured' : 'Not Featured'}
          >
            {category.isFeatured ? 'Featured' : 'Hidden'}
          </button>

          {/* Active Toggle */}
          <button
            onClick={() => handleUpdateCategory(category.id, category.name, !category.isActive)}
            className={`text-xs px-2 py-1 rounded ${
              category.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {category.isActive ? 'Active' : 'Inactive'}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                <button
                  onClick={() => handleUpdateCategory(category.id, editingCategory.name, category.isActive)}
                  className="text-green-600 hover:text-green-700 p-1"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="text-gray-600 hover:text-gray-700 p-1"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSelectedParentId(category.id)
                    setSelectedHierarchy(category.hierarchy)
                    setShowCreateModal(true)
                  }}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Add child category"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                  className="text-gray-600 hover:text-gray-700 p-1"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy-900">Categories</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your product category hierarchy (Ladies, Gents, Kids)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOnlyFeatured(!showOnlyFeatured)}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  showOnlyFeatured
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showOnlyFeatured ? 'Show All' : 'Show Featured Only'}
              </button>
              <button
                onClick={() => {
                  setSelectedParentId(null)
                  setShowCreateModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + New Category
              </button>
              <Link
                href="/en/admin"
                className="text-sm text-navy-600 hover:text-navy-700 font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Tree */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {showOnlyFeatured ? 'No featured categories' : 'No categories'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {showOnlyFeatured
                  ? 'Mark some categories as featured to see them here'
                  : 'Get started by creating a new root category'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCategories.map((category) => renderCategory(category))}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create Category
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory()
                  } else if (e.key === 'Escape') {
                    setShowCreateModal(false)
                    setNewCategoryName('')
                    setSelectedParentId(null)
                  }
                }}
                placeholder="e.g., Tops, Bottoms, Shoes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {!selectedParentId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hierarchy <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(['ladies', 'gents', 'kids'] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setSelectedHierarchy(h)}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 transition-colors font-medium ${
                        selectedHierarchy === h
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {h.charAt(0).toUpperCase() + h.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedParentId && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Creating subcategory under: <span className="font-medium">
                    {flattenCategories(categories).find(c => c.id === selectedParentId)?.name}
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewCategoryName('')
                  setSelectedParentId(null)
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
