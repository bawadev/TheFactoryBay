'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { updateProductAction, updateVariantAction } from '@/app/actions/admin-products'
import type { ProductCategory, ProductGender, SizeOption, ProductVariant } from '@/lib/types'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'

interface VariantForm {
  id?: string
  size: SizeOption
  color: string
  stockQuantity: number
  images: string[]
  imageInput: string
  isNew?: boolean
}

interface ProductEditClientProps {
  product: ProductWithVariants
}

export default function ProductEditClient({ product }: ProductEditClientProps) {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Product fields
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description)
  const [brand, setBrand] = useState(product.brand)
  const [category, setCategory] = useState<ProductCategory | undefined>(product.category)
  const [gender, setGender] = useState<ProductGender>(product.gender)
  const [stockPrice, setStockPrice] = useState(product.stockPrice.toString())
  const [retailPrice, setRetailPrice] = useState(product.retailPrice.toString())

  // Variants - initialize with existing variants
  const [variants, setVariants] = useState<VariantForm[]>(
    product.variants.map(v => ({
      id: v.id,
      size: v.size,
      color: v.color,
      stockQuantity: v.stockQuantity,
      images: v.images || [],
      imageInput: '',
      isNew: false
    }))
  )

  const categories: ProductCategory[] = ['SHIRT', 'PANTS', 'JACKET', 'DRESS', 'SHOES', 'ACCESSORIES']
  const genders: ProductGender[] = ['MEN', 'WOMEN', 'UNISEX']
  const sizes: SizeOption[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  const addVariant = () => {
    setVariants([...variants, { size: 'M', color: '', stockQuantity: 0, images: [], imageInput: '', isNew: true }])
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

  const addImageToVariant = (index: number) => {
    const imageUrl = variants[index].imageInput.trim()
    if (imageUrl) {
      const newVariants = [...variants]
      newVariants[index].images = [...newVariants[index].images, imageUrl]
      newVariants[index].imageInput = ''
      setVariants(newVariants)
    }
  }

  const removeImageFromVariant = (variantIndex: number, imageIndex: number) => {
    const newVariants = [...variants]
    newVariants[variantIndex].images = newVariants[variantIndex].images.filter((_, i) => i !== imageIndex)
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

      // Update product
      const productUpdates = {
        name,
        description,
        brand,
        category,
        gender,
        stockPrice: stockPriceNum,
        retailPrice: retailPriceNum,
      }

      const productResult = await updateProductAction(product.id, productUpdates)

      if (!productResult.success) {
        setError(productResult.message || 'Failed to update product')
        setLoading(false)
        return
      }

      // Update existing variants and add new ones
      for (const variant of variants) {
        if (variant.isNew) {
          // For new variants, we would need an addVariantAction
          // For now, skip new variants in edit mode
          continue
        }

        if (variant.id) {
          const variantUpdates = {
            size: variant.size,
            color: variant.color,
            stockQuantity: variant.stockQuantity,
            images: variant.images,
          }

          const variantResult = await updateVariantAction(variant.id, variantUpdates)

          if (!variantResult.success) {
            setError(`Failed to update variant: ${variantResult.message}`)
            setLoading(false)
            return
          }
        }
      }

      router.push(`/${locale}/admin/products`)
      router.refresh()
    } catch (err) {
      setError('An error occurred while updating the product')
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
              <h1 className="text-3xl font-bold text-navy-900">Edit Product</h1>
              <p className="mt-1 text-sm text-gray-600">Update product details and variants</p>
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
                  value={category || ''}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                >
                  <option value="">Select a category</option>
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

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (Auto-generated)
                </label>
                <input
                  type="text"
                  value={product.sku}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
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
                <div key={variant.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Variant {index + 1} {variant.isNew && <span className="text-xs text-blue-600">(New)</span>}
                    </h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Images (URLs)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={variant.imageInput}
                        onChange={(e) => updateVariant(index, 'imageInput', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => addImageToVariant(index)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Add
                      </button>
                    </div>
                    {variant.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {variant.images.map((img, imgIndex) => (
                          <div key={imgIndex} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                            <span className="truncate max-w-[150px]">{img}</span>
                            <button
                              type="button"
                              onClick={() => removeImageFromVariant(index, imgIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
