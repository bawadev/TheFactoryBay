'use client'

import { useState, useEffect } from 'react'
import type { CustomFilterExtended } from '@/lib/repositories/custom-filter.repository'
import {
  getAllFiltersWithParentsAction,
  getChildFiltersAction,
  getProductCountsForFiltersAction,
} from '@/app/actions/custom-filters'

interface AdvancedFilterDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedFilterIds: Set<string>
  onApplyFilters: (filterIds: Set<string>) => void
}

export default function AdvancedFilterDialog({
  isOpen,
  onClose,
  selectedFilterIds: initialSelectedIds,
  onApplyFilters,
}: AdvancedFilterDialogProps) {
  const [allFilters, setAllFilters] = useState<CustomFilterExtended[]>([])
  const [selectedFilterIds, setSelectedFilterIds] = useState<Set<string>>(new Set(initialSelectedIds))
  const [expandedFilterIds, setExpandedFilterIds] = useState<Set<string>>(new Set())
  const [currentPath, setCurrentPath] = useState<CustomFilterExtended[]>([])
  const [currentLevelFilters, setCurrentLevelFilters] = useState<CustomFilterExtended[]>([])
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [countsLoading, setCountsLoading] = useState(false)

  // Load all filters on mount
  useEffect(() => {
    if (isOpen) {
      loadAllFilters()
    }
  }, [isOpen])

  // Load product counts when filters change
  useEffect(() => {
    if (currentLevelFilters.length > 0) {
      loadProductCounts(currentLevelFilters.map(f => f.id))
    }
  }, [currentLevelFilters])

  const loadAllFilters = async () => {
    setLoading(true)
    const result = await getAllFiltersWithParentsAction()
    if (result.success && result.data) {
      const activeFilters = result.data.filter(f => f.isActive)
      setAllFilters(activeFilters)

      // Show root filters initially (filters with no parents)
      const rootFilters = activeFilters.filter(f => f.parentIds.length === 0)
      setCurrentLevelFilters(rootFilters)
      setCurrentPath([])
    }
    setLoading(false)
  }

  const loadProductCounts = async (filterIds: string[]) => {
    setCountsLoading(true)
    const result = await getProductCountsForFiltersAction(filterIds)
    if (result.success && result.data) {
      setProductCounts(prev => ({ ...prev, ...result.data }))
    }
    setCountsLoading(false)
  }

  const navigateToFilter = async (filter: CustomFilterExtended) => {
    // Get children of this filter (filters that have this filter as a parent)
    const children = allFilters.filter(f => f.parentIds.includes(filter.id))

    if (children.length > 0) {
      setCurrentLevelFilters(children)
      setCurrentPath([...currentPath, filter])
    }
  }

  const navigateBack = () => {
    if (currentPath.length === 0) return

    const newPath = [...currentPath]
    const parent = newPath.pop()

    if (newPath.length === 0) {
      // Back to root
      const rootFilters = allFilters.filter(f => f.parentIds.length === 0)
      setCurrentLevelFilters(rootFilters)
    } else {
      // Back to parent's children
      const grandparent = newPath[newPath.length - 1]
      const siblings = allFilters.filter(f => f.parentIds.includes(grandparent.id))
      setCurrentLevelFilters(siblings)
    }

    setCurrentPath(newPath)
  }

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Navigate to root
      const rootFilters = allFilters.filter(f => f.parentIds.length === 0)
      setCurrentLevelFilters(rootFilters)
      setCurrentPath([])
    } else {
      const filter = currentPath[index]
      const children = allFilters.filter(f => f.parentIds.includes(filter.id))
      setCurrentLevelFilters(children)
      setCurrentPath(currentPath.slice(0, index + 1))
    }
  }

  const toggleFilter = (filterId: string) => {
    const newSelected = new Set(selectedFilterIds)
    const filter = allFilters.find(f => f.id === filterId)

    if (newSelected.has(filterId)) {
      // Deselecting - remove this filter AND all its descendants
      newSelected.delete(filterId)

      // Remove all descendants recursively
      const removeAllDescendants = (parentFilterId: string) => {
        const children = allFilters.filter(f => f.parentIds.includes(parentFilterId))
        children.forEach(child => {
          newSelected.delete(child.id)
          // Recursively remove children's children
          removeAllDescendants(child.id)
        })
      }
      removeAllDescendants(filterId)

      // Check if we should uncheck parents
      // A parent should only be unchecked if no other children are selected
      if (filter?.parentIds && filter.parentIds.length > 0) {
        const checkParentSelection = (parentId: string) => {
          // Find all children of this parent
          const siblings = allFilters.filter(f => f.parentIds.includes(parentId))
          const hasSelectedSibling = siblings.some(s => newSelected.has(s.id))

          if (!hasSelectedSibling) {
            newSelected.delete(parentId)
            // Recursively check grandparents
            const parent = allFilters.find(f => f.id === parentId)
            if (parent?.parentIds && parent.parentIds.length > 0) {
              parent.parentIds.forEach(grandparentId => {
                checkParentSelection(grandparentId)
              })
            }
          }
        }

        // Check all direct parents
        filter.parentIds.forEach(parentId => {
          checkParentSelection(parentId)
        })
      }
    } else {
      // Selecting - add this filter and all its parents recursively
      newSelected.add(filterId)

      // Add all parent filters up the hierarchy
      if (filter?.parentIds && filter.parentIds.length > 0) {
        const addAllAncestors = (parentIds: string[]) => {
          parentIds.forEach(parentId => {
            newSelected.add(parentId)
            // Find this parent and add its parents too
            const parent = allFilters.find(f => f.id === parentId)
            if (parent?.parentIds && parent.parentIds.length > 0) {
              addAllAncestors(parent.parentIds)
            }
          })
        }
        addAllAncestors(filter.parentIds)
      }
    }
    setSelectedFilterIds(newSelected)
  }

  const handleApply = () => {
    onApplyFilters(selectedFilterIds)
    onClose()
  }

  const handleClearAll = () => {
    setSelectedFilterIds(new Set())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Advanced Filters</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm overflow-x-auto">
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className="text-navy-600 hover:text-navy-700 font-medium whitespace-nowrap"
            >
              All Categories
            </button>
            {currentPath.map((filter, index) => (
              <div key={filter.id} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className="text-navy-600 hover:text-navy-700 font-medium whitespace-nowrap"
                >
                  {filter.name}
                </button>
              </div>
            ))}
          </div>

          {/* Selection count */}
          {selectedFilterIds.size > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              {selectedFilterIds.size} filter{selectedFilterIds.size > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
            </div>
          ) : currentLevelFilters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No filters available at this level</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentLevelFilters.map((filter) => {
                const hasChildren = allFilters.some(f => f.parentIds.includes(filter.id))
                const isSelected = selectedFilterIds.has(filter.id)
                const count = productCounts[filter.id]

                return (
                  <div
                    key={filter.id}
                    className={`
                      border-2 rounded-lg p-4 transition-all cursor-pointer
                      ${isSelected
                        ? 'border-navy-600 bg-navy-50'
                        : 'border-gray-200 hover:border-navy-400'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFilter(filter.id)}
                          className="mt-0.5 h-5 w-5 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{filter.name}</span>
                            {count !== undefined && (
                              <span className="text-sm text-gray-500">
                                ({countsLoading ? '...' : count})
                              </span>
                            )}
                          </div>

                          {filter.level > 0 && (
                            <div className="mt-1">
                              <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                Level {filter.level}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Navigate button if has children */}
                      {hasChildren && (
                        <button
                          onClick={() => navigateToFilter(filter)}
                          className="text-navy-600 hover:text-navy-700 p-1"
                          title="View subcategories"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Back button */}
          {currentPath.length > 0 && (
            <button
              onClick={navigateBack}
              className="mt-6 flex items-center gap-2 text-navy-600 hover:text-navy-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleClearAll}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear All
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
