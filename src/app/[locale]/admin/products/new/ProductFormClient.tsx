'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createProductAction } from '@/app/actions/admin-products'
import ImageUpload from '@/components/ui/ImageUpload'
import type { ProductCategory, ProductGender, SizeOption, Product, ProductVariant } from '@/lib/types'

interface VariantForm {
  size: SizeOption
  color: string
  stockQuantity: number
  images: string[]
}

export default function ProductFormClient() {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Product fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<ProductCategory>('SHIRT')
  const [gender, setGender] = useState<ProductGender>('UNISEX')
  const [stockPrice, setStockPrice] = useState('')
  const [retailPrice, setRetailPrice] = useState('')

  // Variants
  const [variants, setVariants] = useState<VariantForm[]>([
    { size: 'M', color: '', stockQuantity: 0, images: [] }
  ])

  const categories: ProductCategory[] = ['SHIRT', 'PANTS', 'JACKET', 'DRESS', 'SHOES', 'ACCESSORIES']
  const genders: ProductGender[] = ['MEN', 'WOMEN', 'UNISEX']
  const sizes: SizeOption[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  const addVariant = () => {
    setVariants([...variants, { size: 'M', color: '', stockQuantity: 0, images: [] }])
  }

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index))
    }
  }

  const updateVariant = (index: number, field: keyof VariantForm, value: any) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
  }

  const handleVariantImagesUpdate = (index: number, urls: string[]) => {
    const newVariants = [...variants]
    newVariants[index].images = urls
    setVariants(newVariants)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate
      if (!name || !brand || !description) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const stockPriceNum = parseFloat(stockPrice)
      const retailPriceNum = parseFloat(retailPrice)

      if (isNaN(stockPriceNum) || isNaN(retailPriceNum)) {
        setError('Prices must be valid numbers')
        setLoading(false)
        return
      }

      if (stockPriceNum >= retailPriceNum) {
        setError('Stock price must be less than retail price')
        setLoading(false)
        return
      }

      // Validate variants
      for (const variant of variants) {
        if (!variant.color) {
          setError('All variants must have a color')
          setLoading(false)
          return
        }
        if (variant.stockQuantity < 0) {
          setError('Stock quantity cannot be negative')
          setLoading(false)
          return
        }
      }

      // Generate SKU
      const sku = `FB-${category.substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        description,
        brand,
        category,
        gender,
        stockPrice: stockPriceNum,
        retailPrice: retailPriceNum,
        sku,
      }

      const productVariants: Omit<ProductVariant, 'id' | 'productId'>[] = variants.map(v => ({
        size: v.size,
        color: v.color,
        stockQuantity: v.stockQuantity,
        images: v.images,
      }))

      const result = await createProductAction(product, productVariants)

      if (result.success) {
        router.push(`/${locale}/admin/products`)
      } else {
        setError(result.message || 'Failed to create product')
      }
    } catch (err) {
      setError('An error occurred while creating the product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy-900">Add New Product</h1>
              <p className="mt-1 text-sm text-gray-600">Create a new product with variants</p>
            </div>
            <Link href={`/${locale}/admin/products`} className="text-sm text-navy-600 hover:text-navy-700 font-medium">
              ← Back to Products
            </Link>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Product Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Brand *
                </label>
                <input
                  type="text"
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as ProductGender)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                >
                  {genders.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="stockPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Price ($) *
                </label>
                <input
                  type="number"
                  id="stockPrice"
                  value={stockPrice}
                  onChange={(e) => setStockPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="retailPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Retail Price ($) *
                </label>
                <input
                  type="number"
                  id="retailPrice"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Product Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm font-medium text-navy-600 hover:text-navy-700"
              >
                + Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Variant {index + 1}</h3>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Size *
                      </label>
                      <select
                        value={variant.size}
                        onChange={(e) => updateVariant(index, 'size', e.target.value as SizeOption)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                      >
                        {sizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color *
                      </label>
                      <input
                        type="text"
                        value={variant.color}
                        onChange={(e) => updateVariant(index, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        value={variant.stockQuantity}
                        onChange={(e) => updateVariant(index, 'stockQuantity', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Images */}
                  <div className="mt-3">
                    <ImageUpload
                      multiple={true}
                      maxFiles={5}
                      initialImages={variant.images}
                      onUploadComplete={(urls) => handleVariantImagesUpdate(index, urls)}
                      label={`Variant ${index + 1} Images`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/${locale}/admin/products`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-md hover:bg-navy-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
