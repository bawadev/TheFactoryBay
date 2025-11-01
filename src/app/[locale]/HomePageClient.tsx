'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'
import type { PromotionalCategory } from '@/lib/types'
import type { CustomFilter } from '@/lib/repositories/custom-filter.repository'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import {
  getAllFiltersAction,
  getProductsByFiltersAction,
  getAllChildFilterIdsAction,
  getAllParentFilterIdsAction
} from '@/app/actions/custom-filters'

interface HomePageClientProps {
  isAuthenticated: boolean
  recommendations: ProductWithVariants[]
  recentlyViewed: ProductWithVariants[]
  newArrivals: ProductWithVariants[]
  promotionalCategories: Array<{
    category: PromotionalCategory
    products: ProductWithVariants[]
  }>
}

function ProductCard({ product }: { product: ProductWithVariants }) {
  const locale = useLocale()
  const t = useTranslations('common')
  const firstImage = product.variants.find(v => v.images?.length > 0)?.images?.[0]
  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
  const discountPercent = Math.round(
    ((product.retailPrice - product.stockPrice) / product.retailPrice) * 100
  )

  return (
    <Link
      href={`/${locale}/product/${product.id}`}
      className="group block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-gray-100">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <span className="text-sm">No image</span>
          </div>
        )}
        {discountPercent > 0 && (
          <div className="absolute top-2 right-2 bg-coral-600 text-white px-2 py-1 rounded-full text-xs font-bold">
            {discountPercent}% OFF
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{product.brand}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-navy-900">${product.stockPrice.toFixed(2)}</span>
          <span className="text-sm text-gray-500 line-through">${product.retailPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {totalStock > 0 ? `${totalStock} ${t('inStock')}` : t('outOfStock')}
        </p>
      </div>
    </Link>
  )
}

export default function HomePageClient({
  isAuthenticated,
  recommendations,
  recentlyViewed,
  newArrivals,
  promotionalCategories,
}: HomePageClientProps) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('home')
  const [selectedFilterIds, setSelectedFilterIds] = useState<Set<string>>(new Set())
  const [filteredProductIds, setFilteredProductIds] = useState<string[]>([])
  const [allFilters, setAllFilters] = useState<CustomFilter[]>([])

  // Group filters by name for deduplication
  interface GroupedFilter {
    name: string
    level: number
    filterIds: string[]
    isActive: boolean
  }
  const [groupedFilters, setGroupedFilters] = useState<GroupedFilter[]>([])

  // Load all filters on mount and group by name
  useEffect(() => {
    getAllFiltersAction().then((result) => {
      if (result.success && result.data) {
        setAllFilters(result.data)

        // Group filters by name to deduplicate display
        const filtersByName = new Map<string, GroupedFilter>()

        result.data.forEach(filter => {
          if (!filtersByName.has(filter.name)) {
            filtersByName.set(filter.name, {
              name: filter.name,
              level: filter.level,
              filterIds: [filter.id],
              isActive: filter.isActive
            })
          } else {
            const existing = filtersByName.get(filter.name)!
            existing.filterIds.push(filter.id)
            // If any instance is active, consider it active
            existing.isActive = existing.isActive || filter.isActive
          }
        })

        // Sort by level first, then by name
        const grouped = Array.from(filtersByName.values()).sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level
          return a.name.localeCompare(b.name)
        })

        setGroupedFilters(grouped)
      }
    })
  }, [])

  // Fetch products when selected filters change
  useEffect(() => {
    if (selectedFilterIds.size > 0) {
      const filterIdsArray = Array.from(selectedFilterIds)
      getProductsByFiltersAction(filterIdsArray).then((result) => {
        if (result.success && result.data) {
          setFilteredProductIds(result.data)
        }
      })
    } else {
      setFilteredProductIds([])
    }
  }, [selectedFilterIds])

  const toggleGroupedFilter = async (groupedFilter: GroupedFilter) => {
    const newSelected = new Set(selectedFilterIds)

    // Check if any of the filter IDs in this group are selected
    const anySelected = groupedFilter.filterIds.some(id => newSelected.has(id))

    if (anySelected) {
      // Deselecting: remove this filter and all items that have it as a parent
      const deselectedIds = new Set<string>()
      for (const filterId of groupedFilter.filterIds) {
        newSelected.delete(filterId)
        deselectedIds.add(filterId)
      }

      // Remove all items that have the deselected filter as a parent
      const allSelectedArray = Array.from(newSelected)
      const filtersToRemove = new Set<string>()

      for (const selectedId of allSelectedArray) {
        const parentsResult = await getAllParentFilterIdsAction(selectedId)
        if (parentsResult.success && parentsResult.data) {
          // Check if this filter has any of the deselected filters as a parent
          const hasDeselectedParent = parentsResult.data.some(parentId => deselectedIds.has(parentId))

          if (hasDeselectedParent) {
            // This filter has a deselected parent
            // Get the parent's level to determine if we should remove this item
            // First, collect all parent filters with their levels
            const parentFiltersWithLevels = parentsResult.data.map(parentId => {
              const parentFilter = allFilters.find(f => f.id === parentId)
              return parentFilter ? { id: parentId, level: parentFilter.level } : null
            }).filter(p => p !== null)

            // Get level-0 parents only
            const level0ParentIds = parentFiltersWithLevels
              .filter(p => p!.level === 0)
              .map(p => p!.id)

            // Check if any level-0 parents are still selected
            const hasSelectedLevel0Parent = level0ParentIds.some(parentId => newSelected.has(parentId))

            if (!hasSelectedLevel0Parent && level0ParentIds.length > 0) {
              // Has level-0 parents but none are selected anymore, remove it
              filtersToRemove.add(selectedId)
            }
          } else if (parentsResult.data.length > 0) {
            // Only check for orphaned items if they actually have parents
            // Top-level items (with no parents) should remain selected
            const hasSelectedParent = parentsResult.data.some(parentId => newSelected.has(parentId))
            if (!hasSelectedParent) {
              filtersToRemove.add(selectedId)
            }
          }
        }
      }

      // Remove filters that should be deselected
      filtersToRemove.forEach(id => newSelected.delete(id))
    } else {
      // Selecting: add all filter IDs in this group, their parents, and their children
      for (const filterId of groupedFilter.filterIds) {
        newSelected.add(filterId)

        // Get all parent filter IDs and add them
        const parentsResult = await getAllParentFilterIdsAction(filterId)
        if (parentsResult.success && parentsResult.data) {
          parentsResult.data.forEach((parentId) => newSelected.add(parentId))
        }

        // Get all child filter IDs and add them
        const childrenResult = await getAllChildFilterIdsAction(filterId)
        if (childrenResult.success && childrenResult.data) {
          childrenResult.data.forEach((childId) => newSelected.add(childId))
        }
      }
    }

    setSelectedFilterIds(newSelected)
  }

  // Filter products based on selected filters
  const filterProducts = (products: ProductWithVariants[]) => {
    if (selectedFilterIds.size === 0) {
      return products
    }
    return products.filter(product => filteredProductIds.includes(product.id))
  }

  // Filter all sections
  const filteredRecommendations = filterProducts(recommendations)
  const filteredRecentlyViewed = filterProducts(recentlyViewed)
  const filteredNewArrivals = filterProducts(newArrivals)
  const filteredPromotionalCategories = promotionalCategories && promotionalCategories.length > 0
    ? promotionalCategories.map(({ category, products }) => ({
        category,
        products: filterProducts(products)
      })).filter(({ products }) => products.length > 0)
    : []

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section with Background Image and Search */}
      <div
        className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 text-white"
        style={{
          backgroundImage: 'url(/images/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg">
              {t('hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-white mb-12 drop-shadow-md max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Large Search Bar */}
          <div className="max-w-3xl mx-auto">
            <SearchAutocomplete
              placeholder="Search for branded clothing at stock prices..."
              large={true}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter by Category</h3>
            {selectedFilterIds.size > 0 && (
              <button
                onClick={() => setSelectedFilterIds(new Set())}
                className="text-sm text-navy-600 hover:text-navy-700 font-medium"
              >
                Clear All ({selectedFilterIds.size} selected)
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-3">
            {groupedFilters.map((groupedFilter) => {
              // Check if any of the filter IDs in this group are selected
              const isSelected = groupedFilter.filterIds.some(id => selectedFilterIds.has(id))

              // Level-based styling
              const levelStyles = {
                0: 'text-base font-bold',
                1: 'text-sm font-semibold',
                2: 'text-sm font-medium'
              }
              const levelStyle = levelStyles[groupedFilter.level as keyof typeof levelStyles] || 'text-sm'

              return (
                <button
                  key={groupedFilter.name}
                  onClick={() => toggleGroupedFilter(groupedFilter)}
                  className={`
                    px-4 py-2 rounded-full transition-all duration-200
                    flex items-center gap-2
                    ${levelStyle}
                    ${
                      isSelected
                        ? 'bg-navy-600 text-white shadow-md transform scale-105'
                        : groupedFilter.isActive
                        ? 'bg-white text-gray-700 border-2 border-gray-200 hover:border-navy-400 hover:text-navy-600'
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-100 cursor-not-allowed'
                    }
                  `}
                  disabled={!groupedFilter.isActive}
                >
                  <span>{groupedFilter.name}</span>

                  {/* Level indicator badge */}
                  {groupedFilter.level > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-navy-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      L{groupedFilter.level}
                    </span>
                  )}

                  {/* Show count if multiple filter IDs */}
                  {groupedFilter.filterIds.length > 1 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-navy-500 text-white'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      ×{groupedFilter.filterIds.length}
                    </span>
                  )}

                  {!groupedFilter.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                      Inactive
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recently Viewed - Only for authenticated users and if has filtered products */}
      {isAuthenticated && filteredRecentlyViewed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('recentlyViewed')}</h2>
            <Link href={`/${locale}/shop`} className="text-sm font-medium text-navy-600 hover:text-navy-700">
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredRecentlyViewed.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Personalized Recommendations - Only for authenticated users and if has filtered products */}
      {isAuthenticated && filteredRecommendations.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('recommendedForYou')}</h2>
              <p className="text-sm text-gray-600 mt-1">{t('recommendedSubtitle')}</p>
            </div>
            <Link href={`/${locale}/shop`} className="text-sm font-medium text-navy-600 hover:text-navy-700">
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredRecommendations.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Promotional Categories Sections - Filtered */}
      {filteredPromotionalCategories.map(({ category, products }) => (
        <section key={category.id} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              )}
            </div>
            <Link
              href={`/${locale}/shop?promo=${category.slug}`}
              className="text-sm font-medium text-navy-600 hover:text-navy-700"
            >
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}

      {/* New Arrivals - Only if has filtered products */}
      {filteredNewArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('newArrivals')}</h2>
              <p className="text-sm text-gray-600 mt-1">{t('newArrivalsSubtitle')}</p>
            </div>
            <Link href={`/${locale}/shop`} className="text-sm font-medium text-navy-600 hover:text-navy-700">
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredNewArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Call to Action */}
      {!isAuthenticated && (
        <section className="bg-navy-900 text-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-navy-100 mb-8 max-w-2xl mx-auto">
              {t('cta.subtitle')}
            </p>
            <Link href={`/${locale}/signup`} className="bg-white text-navy-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block">
              {t('cta.createAccount')}
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
