'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, Link2, Trash2 } from 'lucide-react'
import { getAllFiltersTreeAction, getProductCountsForFiltersAction } from '@/app/actions/custom-filters'
import type { CustomFilterWithChildren } from '@/lib/repositories/custom-filter.repository'

interface FilterHierarchyTreeProps {
  onAddChild?: (filterId: string) => void
  onAddParent?: (filterId: string) => void
  onDelete?: (filterId: string) => void
  showProductCounts?: boolean
}

interface FilterNodeProps {
  filter: CustomFilterWithChildren
  depth: number
  productCounts?: Record<string, number>
  onAddChild?: (filterId: string) => void
  onAddParent?: (filterId: string) => void
  onDelete?: (filterId: string) => void
  showProductCounts?: boolean
}

function FilterNode({
  filter,
  depth,
  productCounts,
  onAddChild,
  onAddParent,
  onDelete,
  showProductCounts,
}: FilterNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2) // Auto-expand first 2 levels
  const hasChildren = filter.children && filter.children.length > 0
  const productCount = showProductCounts && productCounts ? productCounts[filter.id] : undefined

  return (
    <div className="filter-node">
      {/* Node Header */}
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md transition-colors group"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
          disabled={!hasChildren}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        {/* Filter Name */}
        <span className="flex-grow font-medium text-gray-900">{filter.name}</span>

        {/* Level Badge */}
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-navy-100 text-navy-700">
          L{filter.level}
        </span>

        {/* Featured Badge */}
        {filter.isFeatured && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gold-500 text-white">
            Featured
          </span>
        )}

        {/* Status Badge */}
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            filter.isActive
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-300 text-gray-700'
          }`}
        >
          {filter.isActive ? 'Active' : 'Inactive'}
        </span>

        {/* Product Count */}
        {showProductCounts && productCount !== undefined && (
          <span className="px-2 py-0.5 text-xs font-mono font-medium text-gray-600 bg-gray-100 rounded">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </span>
        )}

        {/* Action Buttons (shown on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAddChild && (
            <button
              onClick={() => onAddChild(filter.id)}
              className="p-1.5 text-navy-600 hover:bg-navy-50 rounded transition-colors"
              title="Add child filter"
              aria-label="Add child filter"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {onAddParent && (
            <button
              onClick={() => onAddParent(filter.id)}
              className="p-1.5 text-navy-600 hover:bg-navy-50 rounded transition-colors"
              title="Add parent filter"
              aria-label="Add parent filter"
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(filter.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete filter"
              aria-label="Delete filter"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Children (recursive) */}
      {hasChildren && isExpanded && (
        <div className="filter-children">
          {filter.children.map((child) => (
            <FilterNode
              key={child.id}
              filter={child}
              depth={depth + 1}
              productCounts={productCounts}
              onAddChild={onAddChild}
              onAddParent={onAddParent}
              onDelete={onDelete}
              showProductCounts={showProductCounts}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterHierarchyTree({
  onAddChild,
  onAddParent,
  onDelete,
  showProductCounts = false,
}: FilterHierarchyTreeProps) {
  const [treeData, setTreeData] = useState<CustomFilterWithChildren[]>([])
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTreeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadTreeData() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAllFiltersTreeAction()

      if (!result.success) {
        setError(result.error || 'Failed to load filter tree')
        return
      }

      setTreeData(result.data || [])

      // Load product counts if requested
      if (showProductCounts && result.data) {
        await loadProductCounts(result.data)
      }
    } catch (err) {
      console.error('Error loading filter tree:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadProductCounts(filters: CustomFilterWithChildren[]) {
    // Collect all filter IDs recursively
    const allFilterIds: string[] = []

    function collectIds(filterList: CustomFilterWithChildren[]) {
      for (const filter of filterList) {
        allFilterIds.push(filter.id)
        if (filter.children && filter.children.length > 0) {
          collectIds(filter.children)
        }
      }
    }

    collectIds(filters)

    // Fetch counts
    const countsResult = await getProductCountsForFiltersAction(allFilterIds)
    if (countsResult.success && countsResult.data) {
      setProductCounts(countsResult.data)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-navy-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">{error}</p>
        <button
          onClick={loadTreeData}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  if (treeData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No filters found. Create your first filter to get started.</p>
      </div>
    )
  }

  return (
    <div className="filter-hierarchy-tree bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filter Hierarchy</h3>
        <button
          onClick={loadTreeData}
          className="text-sm text-navy-600 hover:text-navy-700 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-1">
        {treeData.map((filter) => (
          <FilterNode
            key={filter.id}
            filter={filter}
            depth={0}
            productCounts={productCounts}
            onAddChild={onAddChild}
            onAddParent={onAddParent}
            onDelete={onDelete}
            showProductCounts={showProductCounts}
          />
        ))}
      </div>
    </div>
  )
}
