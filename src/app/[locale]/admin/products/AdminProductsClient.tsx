'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { deleteProductAction } from '@/app/actions/admin-products'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'

interface AdminProductsClientProps {
  products: ProductWithVariants[]
}

export default function AdminProductsClient({ products: initialProducts }: AdminProductsClientProps) {
  const locale = useLocale()
  const [products, setProducts] = useState(initialProducts)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This will also delete all its variants.`)) {
      return
    }

    setDeletingId(productId)

    const result = await deleteProductAction(productId)

    if (result.success) {
      setProducts(products.filter(p => p.id !== productId))
    } else {
      alert(result.message || 'Failed to delete product')
    }

    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy-900">Product Management</h1>
              <p className="mt-1 text-sm text-gray-600">Manage your product catalog</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/admin/products/new`} className="btn-primary">
                + Add Product
              </Link>
              <Link href={`/${locale}/admin/dashboard`} className="text-sm text-navy-600 hover:text-navy-700 font-medium">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
                  const firstImage = product.variants[0]?.images?.[0]

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            {firstImage ? (
                              <Image
                                src={firstImage}
                                alt={product.name}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.brand}</div>
                            <div className="text-xs text-gray-400">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.category}</div>
                        <div className="text-xs text-gray-500">{product.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">${product.stockPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 line-through">${product.retailPrice.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.variants.length} variants</div>
                        <div className="text-xs text-gray-500">
                          {product.variants.map(v => v.size).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${totalStock === 0 ? 'text-red-600' : totalStock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {totalStock} units
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${locale}/product/${product.id}`}
                            className="text-navy-600 hover:text-navy-700"
                            target="_blank"
                          >
                            View
                          </Link>
                          <Link
                            href={`/${locale}/admin/products/${product.id}/edit`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={deletingId === product.id}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === product.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
              <div className="mt-6">
                <Link href={`/${locale}/admin/products/new`} className="btn-primary inline-block">
                  + Add Product
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {products.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <p>Showing {products.length} products</p>
            <p>Total stock: {products.reduce((sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.stockQuantity, 0), 0)} units</p>
          </div>
        )}
      </div>
    </div>
  )
}
