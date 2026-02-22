import { getTranslations } from 'next-intl/server'
import { getProductsAction } from '@/app/actions/products'
import {
  getPromotionalCategoryBySlugAction,
  getProductsByCategoryAction,
} from '@/app/actions/promotional-categories'
import ProductGrid from '@/components/products/ProductGrid'
import { ProductWithVariants } from '@/lib/repositories/product.repository'
import { PromotionalCategory } from '@/lib/types'

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>
}) {
  const t = await getTranslations('shop')
  const params = await searchParams
  const promoSlug = params.promo

  let products: ProductWithVariants[] = []
  let promoCategory: PromotionalCategory | null = null

  if (promoSlug) {
    const catResult = await getPromotionalCategoryBySlugAction(promoSlug)
    if (catResult.success && catResult.data) {
      promoCategory = catResult.data
      const prodResult = await getProductsByCategoryAction(promoCategory.id)
      products = prodResult.data || []
    }
  }

  if (!promoSlug || !promoCategory) {
    const result = await getProductsAction()
    products = result.products
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-navy-900">
            {promoCategory ? promoCategory.name : t('title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {promoCategory ? promoCategory.description || t('subtitle') : t('subtitle')}
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('productsCount', { count: products.length })}
          </p>
        </div>

        <ProductGrid products={products} />
      </div>
    </div>
  )
}
