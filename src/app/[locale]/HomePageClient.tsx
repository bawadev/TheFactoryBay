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
import AdvancedFilterDialog from '@/components/filters/AdvancedFilterDialog'
import Badge from '@/components/ui/Badge'
import {
  getFeaturedFiltersAction,
  getProductsByFiltersAction,
  getFullProductsByFiltersAction,
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
      className="group block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
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
          <div className="absolute top-2 right-2">
            <Badge variant="discount">{discountPercent}% OFF</Badge>
          </div>
        )}
        {totalStock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="out-of-stock">{t('outOfStock')}</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">{product.brand}</p>
        <h3 className="font-semibold text-gray-900 line-clamp-1 mt-1">{product.name}</h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-navy-600">${product.stockPrice.toFixed(2)}</span>
          {product.retailPrice > product.stockPrice && (
            <span className="text-sm text-gray-400 line-through">${product.retailPrice.toFixed(2)}</span>
          )}
        </div>
        {totalStock > 0 && totalStock <= 5 && (
          <div className="mt-2">
            <Badge variant="low-stock">Only {totalStock} left</Badge>
          </div>
        )}
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
  const [filteredProducts, setFilteredProducts] = useState<ProductWithVariants[]>([])
  const [allFilters, setAllFilters] = useState<CustomFilter[]>([])
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false)

  // Hero slider state
  const [currentSlide, setCurrentSlide] = useState(0)
  const heroImages = [
    '/images/hero-bg.jpg',
    '/images/hero-bg-2.jpg',
    '/images/hero-bg-3.jpg',
    '/images/hero-bg-4.jpg',
  ]

  // Group filters by name for deduplication
  interface GroupedFilter {
    name: string
    level: number
    filterIds: string[]
    isActive: boolean
    isFeatured: boolean
  }
  const [groupedFilters, setGroupedFilters] = useState<GroupedFilter[]>([])

  // Auto-rotate hero slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [heroImages.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  // Load featured filters on mount and group by name
  useEffect(() => {
    getFeaturedFiltersAction().then((result) => {
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
              isActive: filter.isActive,
              isFeatured: filter.isFeatured
            })
          } else {
            const existing = filtersByName.get(filter.name)!
            existing.filterIds.push(filter.id)
            // If any instance is active or featured, consider it active/featured
            existing.isActive = existing.isActive || filter.isActive
            existing.isFeatured = existing.isFeatured || filter.isFeatured
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
      // Fetch product IDs for filtering existing sections
      getProductsByFiltersAction(filterIdsArray).then((result) => {
        if (result.success && result.data) {
          setFilteredProductIds(result.data)
        }
      })
      // Fetch full product objects for dedicated filtered section
      getFullProductsByFiltersAction(filterIdsArray).then((result) => {
        if (result.success && result.data) {
          setFilteredProducts(result.data)
        }
      })
    } else {
      setFilteredProductIds([])
      setFilteredProducts([])
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
      {/* Hero Section - Fashion Background Slider */}
      <div className="relative overflow-hidden bg-navy-900 text-white">
        {/* Background Image Slider */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={image}
                alt={`Fashion background ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0}
                quality={90}
              />
            </div>
          ))}
          {/* Dark Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/70"></div>
        </div>

        {/* Slider Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200 group"
          aria-label="Previous slide"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200 group"
          aria-label="Next slide"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          {/* Hero Content */}
          <div className="text-center mb-12 sm:mb-16 animate-scale-up">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 sm:mb-8 border border-white/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
              </span>
              <span className="text-sm font-medium text-white/90">Premium Brands at Factory Prices</span>
            </div>

            {/* Main Heading - Display Scale */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight tracking-tight">
              <span className="block bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent drop-shadow-2xl">
                {t('hero.title')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-12 sm:mb-16 drop-shadow-md max-w-3xl mx-auto leading-relaxed font-light">
              {t('hero.subtitle')}
            </p>

            {/* Value Propositions */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-12 sm:mb-16 text-sm sm:text-base">
              <div className="flex items-center gap-2 text-white/90">
                <svg className="w-5 h-5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Authentic Brands</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <svg className="w-5 h-5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Stock Prices</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <svg className="w-5 h-5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Fast Shipping</span>
              </div>
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-white/20">
              <SearchAutocomplete
                placeholder="Search for branded clothing at stock prices..."
                large={true}
                className="!bg-white !shadow-none"
              />
            </div>
          </div>

          {/* Popular Categories Quick Links */}
          <div className="mt-12 sm:mt-16 text-center">
            <p className="text-sm text-gray-300 mb-4">Popular categories:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Men', 'Women', 'Kids', 'Accessories'].map((category) => (
                <Link
                  key={category}
                  href={`/${locale}/shop?category=${category.toLowerCase()}`}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium text-white transition-all duration-200 border border-white/10 hover:border-white/30 hover:scale-105"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-12 sm:h-16 text-gray-50" preserveAspectRatio="none" viewBox="0 0 1440 48" fill="currentColor">
            <path d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32L1440,48L1360,48C1280,48,1120,48,960,48C800,48,640,48,480,48C320,48,160,48,80,48L0,48Z"></path>
          </svg>
        </div>
      </div>

      {/* Category Filter */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter by Category</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedDialog(true)}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Advanced Filters
              </button>
              {selectedFilterIds.size > 0 && (
                <button
                  onClick={() => setSelectedFilterIds(new Set())}
                  className="text-sm text-navy-600 hover:text-navy-700 font-medium"
                >
                  Clear All ({selectedFilterIds.size} selected)
                </button>
              )}
            </div>
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

      {/* Filtered Products Section - Show when filters are active */}
      {selectedFilterIds.size > 0 && filteredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Filtered Products</h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <Link href={`/${locale}/shop`} className="text-sm font-medium text-navy-600 hover:text-navy-700">
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

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
        <section className="relative bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 text-white py-20 sm:py-24 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-coral-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          </div>

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-500/20 rounded-full mb-6">
              <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">
              {t('cta.title')}
            </h2>
            <p className="text-lg sm:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('cta.subtitle')}
            </p>

            {/* CTA Button - Following Style Guide */}
            <Link
              href={`/${locale}/signup`}
              className="inline-flex items-center gap-2 btn-primary text-lg px-8 py-4 shadow-2xl hover:shadow-coral-500/50"
            >
              {t('cta.createAccount')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            {/* Features Grid */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-gold-400 mb-2">50%+</div>
                <div className="text-sm text-gray-300">Average Savings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gold-400 mb-2">1000+</div>
                <div className="text-sm text-gray-300">Premium Products</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gold-400 mb-2">24/7</div>
                <div className="text-sm text-gray-300">Customer Support</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Advanced Filter Dialog */}
      <AdvancedFilterDialog
        isOpen={showAdvancedDialog}
        onClose={() => setShowAdvancedDialog(false)}
        selectedFilterIds={selectedFilterIds}
        onApplyFilters={setSelectedFilterIds}
      />
    </main>
  )
}
