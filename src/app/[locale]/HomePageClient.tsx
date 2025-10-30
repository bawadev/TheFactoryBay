'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'
import type { PromotionalCategory, ProductCategory } from '@/lib/types'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import CategoryFilterChips from '@/components/CategoryFilterChips'

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
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([])

  const handleCategoryChange = (categories: ProductCategory[]) => {
    setSelectedCategories(categories)
  }

  // Filter products based on selected categories
  const filterProducts = (products: ProductWithVariants[]) => {
    if (selectedCategories.length === 0) {
      return products
    }
    return products.filter(product => selectedCategories.includes(product.category))
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

      {/* Category Filter Chips */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter by Category</h3>
            {selectedCategories.length > 0 && (
              <button
                onClick={() => setSelectedCategories([])}
                className="text-sm text-navy-600 hover:text-navy-700 font-medium"
              >
                Clear All ({selectedCategories.length} selected)
              </button>
            )}
          </div>
          <CategoryFilterChips
            selectedCategories={selectedCategories}
            onCategoriesChange={handleCategoryChange}
          />
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
