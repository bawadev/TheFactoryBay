import { getTranslations } from 'next-intl/server'
import { getProductsAction } from '@/app/actions/products'
import ProductGrid from '@/components/products/ProductGrid'

export default async function ShopPage() {
  const t = await getTranslations('shop')
  const { products } = await getProductsAction()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-navy-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('subtitle')}
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
