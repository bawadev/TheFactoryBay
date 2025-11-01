'use client'

import { useState, useEffect } from 'react'
import type { CustomFilter } from '@/lib/repositories/custom-filter.repository'
import {
  getRootFiltersAction,
  getChildFiltersAction,
  getAllParentFilterIdsAction,
  getAllChildFilterIdsAction,
} from '@/app/actions/custom-filters'

interface FilterPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedFilterIds: string[]) => void
  initialSelectedIds?: string[]
}

interface BreadcrumbItem {
  id: string | null
  name: string
}

export default function FilterPickerDialog({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedIds = [],
}: FilterPickerDialogProps) {
  const [currentFilters, setCurrentFilters] = useState<CustomFilter[]>([])
  const [selectedFilterIds, setSelectedFilterIds] = useState<Set<string>>(
    new Set(initialSelectedIds)
  )
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'All Filters' },
  ])
  const [loading, setLoading] = useState(false)

  // Load root filters initially
  useEffect(() => {
    if (isOpen) {
      loadRootFilters()
    }
  }, [isOpen])

  const loadRootFilters = async () => {
    setLoading(true)
    const result = await getRootFiltersAction()
    if (result.success && result.data) {
      setCurrentFilters(result.data)
      setBreadcrumbs([{ id: null, name: 'All Filters' }])
    }
    setLoading(false)
  }

  const loadChildFilters = async (parentId: string, parentName: string) => {
    setLoading(true)
    const result = await getChildFiltersAction(parentId)
    if (result.success && result.data) {
      setCurrentFilters(result.data)
      setBreadcrumbs([...breadcrumbs, { id: parentId, name: parentName }])
    }
    setLoading(false)
  }

  const navigateToBreadcrumb = async (index: number) => {
    const breadcrumb = breadcrumbs[index]
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(newBreadcrumbs)

    if (breadcrumb.id === null) {
      await loadRootFilters()
    } else {
      setLoading(true)
      const result = await getChildFiltersAction(breadcrumb.id)
      if (result.success && result.data) {
        setCurrentFilters(result.data)
      }
      setLoading(false)
    }
  }

  const toggleFilter = async (filterId: string) => {
    const newSelected = new Set(selectedFilterIds)

    if (newSelected.has(filterId)) {
      // Deselecting: remove this filter and all its children
      newSelected.delete(filterId)

      // Get all child filter IDs and remove them
      const childrenResult = await getAllChildFilterIdsAction(filterId)
      if (childrenResult.success && childrenResult.data) {
        childrenResult.data.forEach((childId) => newSelected.delete(childId))
      }
    } else {
      // Selecting: add this filter and all its parents
      newSelected.add(filterId)

      // Get all parent filter IDs and add them
      const parentsResult = await getAllParentFilterIdsAction(filterId)
      if (parentsResult.success && parentsResult.data) {
        parentsResult.data.forEach((parentId) => newSelected.add(parentId))
      }
    }

    setSelectedFilterIds(newSelected)
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedFilterIds))
    onClose()
  }

  const handleCancel = () => {
    setSelectedFilterIds(new Set(initialSelectedIds))
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Select Filters</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mt-3 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`${
                    index === breadcrumbs.length - 1
                      ? 'text-indigo-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : currentFilters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No filters available at this level</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedFilterIds.has(filter.id)}
                      onChange={() => toggleFilter(filter.id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />

                    {/* Filter Name */}
                    <span className={`font-medium ${filter.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {filter.name}
                    </span>

                    {/* Level Badge */}
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      Level {filter.level}
                    </span>

                    {!filter.isActive && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Navigate Button */}
                  <button
                    onClick={() => loadChildFilters(filter.id, filter.name)}
                    className="ml-3 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                  >
                    <span>View Children</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedFilterIds.size} filter{selectedFilterIds.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
