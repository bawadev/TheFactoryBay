import ProductCard from './ProductCard'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'

interface ProductGridProps {
  products: ProductWithVariants[]
  emptyMessage?: string
}

export default function ProductGrid({
  products,
  emptyMessage = 'No products found',
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">{emptyMessage}</p>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your filters
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
