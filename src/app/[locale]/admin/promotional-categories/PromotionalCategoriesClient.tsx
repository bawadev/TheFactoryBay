'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { PromotionalCategory } from '@/lib/types'
import { ProductWithVariants } from '@/lib/repositories/product.repository'
import {
  createPromotionalCategoryAction,
  updatePromotionalCategoryAction,
  deletePromotionalCategoryAction,
  getCategoryItemsWithDetailsAction,
  addProductToCategoryAction,
  removeProductFromCategoryAction,
  updateCategoryItemQuantityAction,
  moveQuantityBetweenCategoriesAction,
  getProductCategoriesAction,
} from '@/app/actions/promotional-categories'
import { searchProductsAction } from '@/app/actions/products'
import Toast, { ToastType } from '@/components/Toast'

interface PromotionalCategoriesClientProps {
  initialCategories: PromotionalCategory[]
}

interface ToastState {
  message: string
  type: ToastType
  show: boolean
}

export default function PromotionalCategoriesClient({
  initialCategories,
}: PromotionalCategoriesClientProps) {
  const locale = useLocale()
  const [categories, setCategories] = useState(initialCategories)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<PromotionalCategory | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<
    Array<{
      product: ProductWithVariants
      allocatedQuantity: number
      soldQuantity: number
      remainingQuantity: number
      totalAllocatedAcrossAllSections?: number
    }>
  >([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductWithVariants[]>([])
  const [productCategoryInfo, setProductCategoryInfo] = useState<
    Record<
      string,
      Array<{
        category: PromotionalCategory
        allocatedQuantity: number
        soldQuantity: number
        remainingQuantity: number
      }>
    >
  >({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', show: false })
  const [showProductView, setShowProductView] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productSearchResults, setProductSearchResults] = useState<ProductWithVariants[]>([])
  const [selectedProductCategories, setSelectedProductCategories] = useState<
    Array<{
      category: PromotionalCategory
      allocatedQuantity: number
      soldQuantity: number
      remainingQuantity: number
    }>
  >([])
  const [viewingProduct, setViewingProduct] = useState<ProductWithVariants | null>(null)
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null)
  const [editQuantityValue, setEditQuantityValue] = useState<number>(0)
  const router = useRouter()

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, show: true })
  }

  const hideToast = () => {
    setToast({ ...toast, show: false })
  }

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    displayOrder: 0,
    isActive: true,
    startDate: '',
    endDate: '',
  })

  const handleCreateCategory = async () => {
    setLoading(true)
    const result = await createPromotionalCategoryAction(formData)
    if (result.success && result.data) {
      setCategories([...categories, result.data])
      setShowCreateForm(false)
      resetForm()
      showToast('Category created successfully!', 'success')
    } else {
      showToast(result.message || 'Failed to create category', 'error')
    }
    setLoading(false)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    setLoading(true)
    const result = await updatePromotionalCategoryAction(editingCategory.id, formData)
    if (result.success && result.data) {
      setCategories(categories.map((c) => (c.id === result.data!.id ? result.data! : c)))
      setEditingCategory(null)
      resetForm()
      showToast('Category updated successfully!', 'success')
    } else {
      showToast(result.message || 'Failed to update category', 'error')
    }
    setLoading(false)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    setLoading(true)
    const result = await deletePromotionalCategoryAction(categoryId)
    if (result.success) {
      setCategories(categories.filter((c) => c.id !== categoryId))
      if (selectedCategory === categoryId) {
        setSelectedCategory(null)
        setCategoryProducts([])
      }
      showToast('Category deleted successfully!', 'success')
    } else {
      showToast(result.message || 'Failed to delete category', 'error')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      displayOrder: 0,
      isActive: true,
      startDate: '',
      endDate: '',
    })
  }

  const loadCategoryProducts = async (categoryId: string) => {
    setSelectedCategory(categoryId)
    setLoading(true)
    const result = await getCategoryItemsWithDetailsAction(categoryId)
    if (result.success && result.data) {
      // Fetch total allocated across all sections for each product
      const productsWithAllocations = await Promise.all(
        result.data.map(async (item) => {
          const categoriesResult = await getProductCategoriesAction(item.product.id)
          const totalAllocated = categoriesResult.success && categoriesResult.data
            ? categoriesResult.data.reduce((sum, cat) => sum + cat.allocatedQuantity, 0)
            : item.allocatedQuantity
          return {
            ...item,
            totalAllocatedAcrossAllSections: totalAllocated
          }
        })
      )
      setCategoryProducts(productsWithAllocations)
    }
    setLoading(false)
  }

  const handleSearchProducts = async (query?: string) => {
    const searchTerm = query || searchQuery
    if (searchTerm.trim().length < 2) {
      setSearchResults([])
      setProductCategoryInfo({})
      return
    }

    setLoading(true)
    const result = await searchProductsAction(searchTerm)
    if (result.success && result.products) {
      setSearchResults(result.products)

      // Fetch category information for each product
      const categoryInfoMap: Record<string, any> = {}
      for (const product of result.products) {
        const catResult = await getProductCategoriesAction(product.id)
        if (catResult.success && catResult.data) {
          categoryInfoMap[product.id] = catResult.data
        } else {
          categoryInfoMap[product.id] = []
        }
      }
      setProductCategoryInfo(categoryInfoMap)
    }
    setLoading(false)
  }

  // Debounced search for live suggestions
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value)

    // Clear existing timeout
    if (typeof window !== 'undefined') {
      const timeoutId = (window as any).searchTimeout
      if (timeoutId) clearTimeout(timeoutId)

      // Set new timeout for debounced search
      (window as any).searchTimeout = setTimeout(() => {
        if (value.trim().length >= 2) {
          handleSearchProducts(value)
        } else {
          setSearchResults([])
          setProductCategoryInfo({})
        }
      }, 500) // 500ms delay
    }
  }

  const handleAddProduct = async (productId: string, quantity: number, availableStock: number) => {
    if (!selectedCategory) return

    if (quantity > availableStock) {
      showToast(`Only ${availableStock} items available in stock`, 'error')
      return
    }

    setLoading(true)
    const result = await addProductToCategoryAction(selectedCategory, productId, quantity)
    if (result.success) {
      await loadCategoryProducts(selectedCategory)
      setSearchQuery('')
      setSearchResults([])
      showToast('Product added successfully!', 'success')
    } else {
      showToast(result.message || 'Failed to add product', 'error')
    }
    setLoading(false)
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedCategory || !confirm('Remove this product from the category?')) return

    setLoading(true)
    const result = await removeProductFromCategoryAction(selectedCategory, productId)
    if (result.success) {
      await loadCategoryProducts(selectedCategory)
      showToast('Product removed successfully!', 'success')
    } else {
      showToast(result.message || 'Failed to remove product', 'error')
    }
    setLoading(false)
  }

  const handleStartEditQuantity = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId)
    setEditQuantityValue(currentQuantity)
  }

  const handleCancelEditQuantity = () => {
    setEditingQuantity(null)
    setEditQuantityValue(0)
  }

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (!selectedCategory) return

    // Get product to check stock
    const productItem = categoryProducts.find(item => item.product.id === productId)
    if (!productItem) return

    const totalStock = productItem.product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
    const totalAllocated = productItem.totalAllocatedAcrossAllSections || 0
    const currentAllocation = productItem.allocatedQuantity
    const availableStock = totalStock - totalAllocated

    // Check if new quantity exceeds available stock
    const difference = newQuantity - currentAllocation
    if (difference > availableStock) {
      showToast(
        `Cannot allocate ${newQuantity}. Only ${availableStock + currentAllocation} available (${totalStock} total stock, ${availableStock} unallocated)`,
        'error'
      )
      return
    }

    setLoading(true)
    const result = await updateCategoryItemQuantityAction(selectedCategory, productId, newQuantity)
    if (result.success) {
      await loadCategoryProducts(selectedCategory)
      setEditingQuantity(null)
      setEditQuantityValue(0)
      showToast('Quantity updated successfully!', 'success')
    } else {
      showToast(result.message || 'Failed to update quantity', 'error')
    }
    setLoading(false)
  }

  const handleSearchProductsForView = async () => {
    if (productSearchQuery.trim().length < 2) return

    setLoading(true)
    const result = await searchProductsAction(productSearchQuery)
    if (result.success && result.products) {
      setProductSearchResults(result.products)
    }
    setLoading(false)
  }

  const handleViewProductCategories = async (product: ProductWithVariants) => {
    setViewingProduct(product)
    setLoading(true)
    const result = await getProductCategoriesAction(product.id)
    if (result.success && result.data) {
      setSelectedProductCategories(result.data)
    } else {
      setSelectedProductCategories([])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-navy-900">Promotional Categories</h1>
                <Link
                  href={`/${locale}/admin/dashboard`}
                  className="text-sm text-navy-600 hover:text-navy-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </Link>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Manage promotional categories and assign products
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              + Create Category
            </button>
          </div>
        </div>
      </div>

      {/* Product View Section */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowProductView(!showProductView)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">View Product Assignments</h2>
              <p className="text-sm text-gray-600 mt-1">
                Search for a product to see which promotional categories it belongs to
              </p>
            </div>
            <svg
              className={`w-6 h-6 text-gray-600 transition-transform ${
                showProductView ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProductView && (
            <div className="px-6 pb-6 border-t border-gray-200">
              {/* Search Section */}
              <div className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search products by name, brand, or SKU..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchProductsForView()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSearchProductsForView}
                    className="bg-navy-600 text-white px-6 py-2 rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    Search
                  </button>
                </div>

                {/* Search Results */}
                {productSearchResults.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {productSearchResults.map((product) => {
                      const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleViewProductCategories(product)}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-colors text-left"
                        >
                          <div className="relative w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                            {product.variants[0]?.images[0] && (
                              <Image
                                src={product.variants[0].images[0]}
                                alt={product.name}
                                fill
                                className="object-cover rounded"
                                sizes="64px"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-gray-600">{product.brand}</p>
                            <p className="text-xs text-green-600 mt-1">Stock: {totalStock}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Product Categories Display */}
              {viewingProduct && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-300">
                    <div className="relative w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                      {viewingProduct.variants[0]?.images[0] && (
                        <Image
                          src={viewingProduct.variants[0].images[0]}
                          alt={viewingProduct.name}
                          fill
                          className="object-cover rounded"
                          sizes="80px"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{viewingProduct.name}</h3>
                      <p className="text-sm text-gray-600">{viewingProduct.brand}</p>
                      <p className="text-sm text-gray-600">SKU: {viewingProduct.sku}</p>
                    </div>
                  </div>

                  {selectedProductCategories.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Promotional Categories ({selectedProductCategories.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedProductCategories.map(
                          ({ category, allocatedQuantity, soldQuantity, remainingQuantity }) => (
                            <div
                              key={category.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-semibold text-gray-900">{category.name}</h5>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      category.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {category.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                {category.description && (
                                  <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                  <span className="text-gray-600">
                                    Allocated: <strong className="text-navy-900">{allocatedQuantity}</strong>
                                  </span>
                                  <span className="text-gray-600">
                                    Sold: <strong className="text-orange-600">{soldQuantity}</strong>
                                  </span>
                                  <span className="text-gray-600">
                                    Remaining: <strong className="text-green-600">{remainingQuantity}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">
                      This product is not assigned to any promotional categories yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedCategory === category.id
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => loadCategoryProducts(category.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-xs text-gray-600 mt-1">Order: {category.displayOrder}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              category.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingCategory(category)
                            setFormData({
                              name: category.name,
                              slug: category.slug,
                              description: category.description || '',
                              displayOrder: category.displayOrder,
                              isActive: category.isActive,
                              startDate: category.startDate || '',
                              endDate: category.endDate || '',
                            })
                          }}
                          className="text-navy-600 hover:text-navy-700 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCategory(category.id)
                          }}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Products */}
          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Products in Category</h2>

                {/* Add Product Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Add Products</h3>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search products by name, brand, or SKU..."
                        value={searchQuery}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchProducts()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      />
                      {loading && searchQuery.length >= 2 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-purple-600 rounded-full border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleSearchProducts()}
                      disabled={loading}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      Search
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-3 space-y-4 max-h-[600px] overflow-y-auto">
                      {searchResults.map((product) => {
                        const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
                        const discountPercent = Math.round(
                          ((product.retailPrice - product.stockPrice) / product.retailPrice) * 100
                        )
                        const existingCategories = productCategoryInfo[product.id] || []
                        const isInCurrentCategory = existingCategories.some(
                          (item) => item.category.id === selectedCategory
                        )

                        return (
                          <div
                            key={product.id}
                            className={`bg-white rounded-lg border-2 p-4 ${
                              isInCurrentCategory ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex gap-4">
                              {/* Product Image */}
                              <div className="relative w-24 h-24 bg-gray-100 rounded flex-shrink-0">
                                {product.variants[0]?.images[0] && (
                                  <Image
                                    src={product.variants[0].images[0]}
                                    alt={product.name}
                                    fill
                                    className="object-cover rounded"
                                    sizes="96px"
                                  />
                                )}
                                {discountPercent > 0 && (
                                  <div className="absolute top-1 right-1 bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                                    {discountPercent}% OFF
                                  </div>
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-base text-gray-900 truncate">{product.name}</h4>
                                    <p className="text-sm text-gray-600">{product.brand}</p>
                                    <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                                  </div>
                                  {isInCurrentCategory && (
                                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded whitespace-nowrap">
                                      Already Added
                                    </span>
                                  )}
                                </div>

                                {/* Pricing */}
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-bold text-navy-900">
                                      ${product.stockPrice.toFixed(2)}
                                    </span>
                                    <span className="text-sm text-gray-500 line-through">
                                      ${product.retailPrice.toFixed(2)}
                                    </span>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      totalStock > 20
                                        ? 'bg-green-100 text-green-700'
                                        : totalStock > 0
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {totalStock} in stock
                                  </span>
                                </div>

                                {/* Existing Categories */}
                                {existingCategories.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-1">
                                      Currently in {existingCategories.length} section(s):
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {existingCategories.map((item) => (
                                        <span
                                          key={item.category.id}
                                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            item.category.id === selectedCategory
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-gray-200 text-gray-700'
                                          }`}
                                        >
                                          {item.category.name} ({item.remainingQuantity} left)
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Add to Category Section */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder="Quantity"
                                    min="1"
                                    max={totalStock}
                                    defaultValue="1"
                                    className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-purple-500 focus:outline-none"
                                    id={`qty-${product.id}`}
                                    disabled={isInCurrentCategory || totalStock === 0}
                                  />
                                  <button
                                    onClick={() => {
                                      const input = document.getElementById(
                                        `qty-${product.id}`
                                      ) as HTMLInputElement
                                      const qty = parseInt(input.value) || 1
                                      handleAddProduct(product.id, qty, totalStock)
                                    }}
                                    disabled={isInCurrentCategory || totalStock === 0}
                                    className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                      isInCurrentCategory || totalStock === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                  >
                                    {isInCurrentCategory ? 'Already Added' : totalStock === 0 ? 'Out of Stock' : 'Add to Section'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Existing Products */}
                <div className="space-y-3">
                  {categoryProducts.map(({ product, allocatedQuantity, soldQuantity, remainingQuantity, totalAllocatedAcrossAllSections }) => {
                    const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
                    const totalAllocated = totalAllocatedAcrossAllSections || allocatedQuantity
                    const availableStock = totalStock - totalAllocated
                    const isEditing = editingQuantity === product.id

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                      >
                        <div className="relative w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                          {product.variants[0]?.images[0] && (
                            <Image
                              src={product.variants[0].images[0]}
                              alt={product.name}
                              fill
                              className="object-cover rounded"
                              sizes="64px"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                          <p className="text-sm text-gray-600">{product.brand}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-navy-600 flex items-center gap-1 group relative">
                              <span>This Section: <strong>{allocatedQuantity}</strong></span>
                              <svg className="w-3 h-3 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10">
                                Quantity allocated to this promotional section
                              </span>
                            </span>
                            <span className="text-orange-600 flex items-center gap-1 group relative">
                              <span>Sold: <strong>{soldQuantity}</strong></span>
                              <svg className="w-3 h-3 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10">
                                Items sold from this section
                              </span>
                            </span>
                            <span className="text-green-600 flex items-center gap-1 group relative">
                              <span>Remaining: <strong>{remainingQuantity}</strong></span>
                              <svg className="w-3 h-3 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10">
                                Items left to sell in this section (Allocated - Sold)
                              </span>
                            </span>
                            <span className="text-gray-600 flex items-center gap-1 group relative">
                              <span>Total Stock: <strong>{totalStock}</strong></span>
                              <svg className="w-3 h-3 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10">
                                Total physical inventory in warehouse
                              </span>
                            </span>
                            <span className={`${availableStock > 0 ? 'text-blue-600' : 'text-red-600'} flex items-center gap-1 group relative`}>
                              <span>Available: <strong>{availableStock}</strong></span>
                              <svg className="w-3 h-3 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10">
                                Unallocated stock available to assign to sections (Total Stock - All Allocated)
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                value={editQuantityValue}
                                onChange={(e) => setEditQuantityValue(parseInt(e.target.value) || 0)}
                                className="w-24 px-3 py-1.5 border border-purple-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                min="0"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateQuantity(product.id, editQuantityValue)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEditQuantity}
                                disabled={loading}
                                className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-400 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEditQuantity(product.id, allocatedQuantity)}
                                className="px-3 py-1.5 bg-navy-600 text-white rounded text-sm font-medium hover:bg-navy-700 transition-colors"
                              >
                                Edit Qty
                              </button>
                              <button
                                onClick={() => handleRemoveProduct(product.id)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {categoryProducts.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No products in this category yet. Use the search above to add products.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Select a category to manage its products</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateForm || editingCategory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Christmas Deals 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., christmas-deals-2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                disabled={loading}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingCategory(null)
                  resetForm()
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  )
}
