'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CustomFilterWithChildren } from '@/lib/repositories/custom-filter.repository'
import {
  createCustomFilterAction,
  updateCustomFilterAction,
  deleteCustomFilterAction,
  getAllFiltersTreeAction,
  updateFilterFeaturedStatusAction,
} from '@/app/actions/custom-filters'

interface CustomFiltersClientProps {
  initialFilters: CustomFilterWithChildren[]
}

export default function CustomFiltersClient({ initialFilters }: CustomFiltersClientProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<CustomFilterWithChildren[]>(initialFilters)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFilterName, setNewFilterName] = useState('')
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([])
  const [editingFilter, setEditingFilter] = useState<{ id: string; name: string } | null>(null)
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set())
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false)

  const refreshFilters = async () => {
    const result = await getAllFiltersTreeAction()
    if (result.success && result.data) {
      setFilters(result.data)
    }
  }

  const handleCreateFilter = async () => {
    if (!newFilterName.trim()) {
      alert('Please enter a filter name')
      return
    }

    const result = await createCustomFilterAction(newFilterName, selectedParentIds)
    if (result.success) {
      alert('Filter created successfully')
      setNewFilterName('')
      setSelectedParentIds([])
      setShowCreateModal(false)
      await refreshFilters()
    } else {
      alert(result.error || 'Failed to create filter')
    }
  }

  const handleUpdateFilter = async (filterId: string, name: string, isActive: boolean) => {
    const result = await updateCustomFilterAction(filterId, name, isActive)
    if (result.success) {
      alert('Filter updated successfully')
      setEditingFilter(null)
      await refreshFilters()
    } else {
      alert(result.error || 'Failed to update filter')
    }
  }

  const handleDeleteFilter = async (filterId: string, filterName: string) => {
    if (!confirm(`Are you sure you want to delete "${filterName}"?`)) {
      return
    }

    const result = await deleteCustomFilterAction(filterId)
    if (result.success) {
      alert('Filter deleted successfully')
      await refreshFilters()
    } else {
      alert(result.error || 'Failed to delete filter')
    }
  }

  const handleToggleFeatured = async (filterId: string, currentFeatured: boolean) => {
    const result = await updateFilterFeaturedStatusAction(filterId, !currentFeatured)
    if (result.success) {
      await refreshFilters()
    } else {
      alert(result.error || 'Failed to update featured status')
    }
  }

  const toggleExpand = (filterId: string) => {
    const newExpanded = new Set(expandedFilters)
    if (newExpanded.has(filterId)) {
      newExpanded.delete(filterId)
    } else {
      newExpanded.add(filterId)
    }
    setExpandedFilters(newExpanded)
  }

  // Flatten the filter tree into a single array
  const flattenFilters = (filters: CustomFilterWithChildren[]): CustomFilterWithChildren[] => {
    const result: CustomFilterWithChildren[] = []
    const flatten = (filterList: CustomFilterWithChildren[]) => {
      filterList.forEach(filter => {
        result.push(filter)
        if (filter.children && filter.children.length > 0) {
          flatten(filter.children)
        }
      })
    }
    flatten(filters)
    return result
  }

  // Group filters by level
  const groupFiltersByLevel = () => {
    const flatFilters = flattenFilters(filters)
    const grouped: { [key: number]: CustomFilterWithChildren[] } = {}
    flatFilters.forEach(filter => {
      if (!grouped[filter.level]) {
        grouped[filter.level] = []
      }
      grouped[filter.level].push(filter)
    })
    return grouped
  }

  const toggleParentSelection = (filterId: string) => {
    setSelectedParentIds(prev => {
      if (prev.includes(filterId)) {
        return prev.filter(id => id !== filterId)
      } else {
        return [...prev, filterId]
      }
    })
  }

  // Filter the tree based on featured status
  const filterTree = (filters: CustomFilterWithChildren[]): CustomFilterWithChildren[] => {
    if (!showOnlyFeatured) return filters

    return filters
      .map(filter => ({
        ...filter,
        children: filterTree(filter.children)
      }))
      .filter(filter => filter.isFeatured || filter.children.length > 0)
  }

  const filteredFilters = filterTree(filters)

  const renderFilter = (filter: CustomFilterWithChildren, depth: number = 0) => {
    const hasChildren = filter.children && filter.children.length > 0
    const isExpanded = expandedFilters.has(filter.id)
    const isEditing = editingFilter?.id === filter.id

    return (
      <div key={filter.id} className="border-l-2 border-gray-200">
        <div
          className="flex items-center gap-3 p-3 hover:bg-gray-50 group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(filter.id)}
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

          {/* Filter Name */}
          {isEditing ? (
            <input
              type="text"
              value={editingFilter.name}
              onChange={(e) => setEditingFilter({ ...editingFilter, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateFilter(filter.id, editingFilter.name, filter.isActive)
                } else if (e.key === 'Escape') {
                  setEditingFilter(null)
                }
              }}
              className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <span className={`font-medium ${filter.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {filter.name}
              </span>
              {filter.isFeatured && (
                <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              )}
            </div>
          )}

          {/* Badge for level */}
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            Level {filter.level}
          </span>

          {/* Featured Toggle */}
          <button
            onClick={() => handleToggleFeatured(filter.id, filter.isFeatured)}
            className={`text-xs px-2 py-1 rounded ${
              filter.isFeatured
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-500'
            }`}
            title={filter.isFeatured ? 'Featured' : 'Not Featured'}
          >
            {filter.isFeatured ? 'Featured' : 'Hidden'}
          </button>

          {/* Active Toggle */}
          <button
            onClick={() => handleUpdateFilter(filter.id, filter.name, !filter.isActive)}
            className={`text-xs px-2 py-1 rounded ${
              filter.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {filter.isActive ? 'Active' : 'Inactive'}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                <button
                  onClick={() => handleUpdateFilter(filter.id, editingFilter.name, filter.isActive)}
                  className="text-green-600 hover:text-green-700 p-1"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingFilter(null)}
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
                    setSelectedParentIds([])
                    setShowCreateModal(true)
                  }}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Add child filter"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingFilter({ id: filter.id, name: filter.name })}
                  className="text-gray-600 hover:text-gray-700 p-1"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteFilter(filter.id, filter.name)}
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
            {filter.children.map((child) => renderFilter(child, depth + 1))}
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
              <h1 className="text-3xl font-bold text-navy-900">Custom Filters</h1>
              <p className="mt-1 text-sm text-gray-600">
                Create and manage hierarchical filters to organize your products
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
                  setSelectedParentIds([])
                  setShowCreateModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + New Filter
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

      {/* Filters Tree */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredFilters.length === 0 ? (
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
                {showOnlyFeatured ? 'No featured filters' : 'No filters'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {showOnlyFeatured
                  ? 'Mark some filters as featured to see them here'
                  : 'Get started by creating a new root filter'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredFilters.map((filter) => renderFilter(filter))}
            </div>
          )}
        </div>
      </div>

      {/* Create Filter Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create Custom Filter
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFilter()
                  } else if (e.key === 'Escape') {
                    setShowCreateModal(false)
                    setNewFilterName('')
                    setSelectedParentIds([])
                  }
                }}
                placeholder="e.g., Premium Office Wares, Evening Dresses"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Filters (optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select parent filters to create a child category. If no parents are selected, this will be a top-level (Level 0) filter.
              </p>

              {filters.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No filters available yet</p>
              ) : (
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {Object.entries(groupFiltersByLevel())
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, levelFilters]) => (
                      <div key={level} className="border-b border-gray-200 last:border-b-0">
                        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                          Level {level}
                        </div>
                        <div className="divide-y divide-gray-100">
                          {levelFilters.map(filter => (
                            <label
                              key={filter.id}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedParentIds.includes(filter.id)}
                                onChange={() => toggleParentSelection(filter.id)}
                                className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{filter.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {selectedParentIds.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: {selectedParentIds.length} parent{selectedParentIds.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewFilterName('')
                  setSelectedParentIds([])
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
