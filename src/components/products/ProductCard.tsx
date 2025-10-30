'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'

interface ProductCardProps {
  product: ProductWithVariants
}

export default function ProductCard({ product }: ProductCardProps) {
  const locale = useLocale()

  // Get first variant for display image and check stock
  const firstVariant = product.variants[0]
  const hasStock = product.variants.some((v) => v.stockQuantity > 0)
  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)

  // Calculate discount percentage
  const discountPercent = Math.round(
    ((product.retailPrice - product.stockPrice) / product.retailPrice) * 100
  )

  return (
    <Link href={`/${locale}/product/${product.id}`}>
      <div className="card-hover group overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg bg-gray-100">
          {firstVariant?.images?.[0] ? (
            <Image
              src={firstVariant.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No Image
            </div>
          )}

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute right-3 top-3 rounded-full bg-gold-600 px-3 py-1 text-xs font-bold text-navy-900 shadow-lg">
              -{discountPercent}%
            </div>
          )}

          {/* Stock Status */}
          {!hasStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
              <span className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white">
                Out of Stock
              </span>
            </div>
          )}

          {hasStock && totalStock < 10 && (
            <div className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
              Low Stock
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Brand */}
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            {product.brand}
          </p>

          {/* Product Name */}
          <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2 group-hover:text-navy-600 transition-colors">
            {product.name}
          </h3>

          {/* Category & Gender */}
          <p className="mt-1 text-xs text-gray-500">
            {product.category} • {product.gender}
          </p>

          {/* Prices */}
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-navy-600">
                ${product.stockPrice.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 line-through">
                ${product.retailPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Available Colors */}
          {product.variants.length > 1 && (
            <div className="mt-3 flex items-center gap-1">
              {Array.from(new Set(product.variants.map((v) => v.color)))
                .slice(0, 4)
                .map((color, index) => (
                  <div
                    key={index}
                    className="h-4 w-4 rounded-full border border-gray-300"
                    style={{
                      backgroundColor:
                        color.toLowerCase() === 'white'
                          ? '#ffffff'
                          : color.toLowerCase() === 'black'
                          ? '#000000'
                          : color.toLowerCase() === 'navy'
                          ? '#1e40af'
                          : color.toLowerCase() === 'khaki'
                          ? '#c3b091'
                          : color.toLowerCase() === 'brown'
                          ? '#8b4513'
                          : color.toLowerCase() === 'cream'
                          ? '#fffdd0'
                          : '#e5e7eb',
                    }}
                    title={color}
                  />
                ))}
              {Array.from(new Set(product.variants.map((v) => v.color)))
                .length > 4 && (
                <span className="text-xs text-gray-500">
                  +
                  {Array.from(new Set(product.variants.map((v) => v.color)))
                    .length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
