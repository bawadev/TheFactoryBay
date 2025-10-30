'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'

interface HomePageClientProps {
  isAuthenticated: boolean
  recommendations: ProductWithVariants[]
  recentlyViewed: ProductWithVariants[]
  newArrivals: ProductWithVariants[]
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
}: HomePageClientProps) {
  const locale = useLocale()
  const t = useTranslations('home')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-navy-600 to-navy-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              {t('hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-navy-100 mb-8">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link href={`/${locale}/signup`} className="bg-white text-navy-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    {t('hero.getStarted')}
                  </Link>
                  <Link href={`/${locale}/login`} className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-navy-900 transition-colors">
                    {t('hero.signIn')}
                  </Link>
                </>
              ) : (
                <Link href={`/${locale}/shop`} className="bg-white text-navy-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  {t('hero.shopNow')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed - Only for authenticated users */}
      {isAuthenticated && recentlyViewed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('recentlyViewed')}</h2>
            <Link href={`/${locale}/shop`} className="text-sm font-medium text-navy-600 hover:text-navy-700">
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Personalized Recommendations - Only for authenticated users */}
      {isAuthenticated && recommendations.length > 0 && (
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
            {recommendations.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
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
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

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
