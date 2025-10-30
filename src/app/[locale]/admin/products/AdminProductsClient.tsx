'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import {
  deleteProductAction,
  createProductAction,
  updateProductAction,
  searchProductsByNameAction,
  checkProductNameExistsAction,
  getAllBrandsAction,
  addVariantImageAction,
  removeVariantImageAction,
} from '@/app/actions/admin-products'
import { uploadMultipleImages, deleteImage } from '@/app/actions/upload'
import {
  getAllPromotionalCategoriesAction,
  addProductToCategoryAction,
} from '@/app/actions/promotional-categories'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'
import type { ProductCategory, ProductGender, Product, PromotionalCategory } from '@/lib/types'

interface AdminProductsClientProps {
  products: ProductWithVariants[]
}

type FormData = {
  name: string
  description: string
  brand: string
  category: ProductCategory
  gender: ProductGender
  stockPrice: string
  retailPrice: string
  sku: string
}

const CATEGORIES: ProductCategory[] = ['SHIRT', 'PANTS', 'JACKET', 'DRESS', 'SHOES', 'ACCESSORIES']
const GENDERS: ProductGender[] = ['MEN', 'WOMEN', 'UNISEX']

export default function AdminProductsClient({ products: initialProducts }: AdminProductsClientProps) {
  const locale = useLocale()
  const [products, setProducts] = useState(initialProducts)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    brand: '',
    category: 'SHIRT',
    gender: 'UNISEX',
    stockPrice: '',
    retailPrice: '',
    sku: '',
  })

  // Autocomplete state
  const [nameSuggestions, setNameSuggestions] = useState<ProductWithVariants[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Brand autocomplete state
  const [allBrands, setAllBrands] = useState<string[]>([])
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([])
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false)

  // Image management state
  const [uploadingImages, setUploadingImages] = useState<{ [variantId: string]: boolean }>({})
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRefs = useRef<{ [variantId: string]: HTMLInputElement | null }>({})

  // Form collapse state
  const [isFormExpanded, setIsFormExpanded] = useState(true)
  const [allowAutoMinimize, setAllowAutoMinimize] = useState(true)

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'price' | 'variants' | 'stock'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Section assignment state
  const [showSectionDialog, setShowSectionDialog] = useState(false)
  const [selectedProductForSection, setSelectedProductForSection] = useState<ProductWithVariants | null>(null)
  const [promotionalCategories, setPromotionalCategories] = useState<PromotionalCategory[]>([])
  const [sectionQuantities, setSectionQuantities] = useState<Record<string, number>>({})
  const [assigningSections, setAssigningSections] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const brandInputRef = useRef<HTMLInputElement>(null)
  const brandSuggestionsRef = useRef<HTMLDivElement>(null)

  // Load all brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      const result = await getAllBrandsAction()
      if (result.success && result.data) {
        setAllBrands(result.data.brands)
      }
    }
    loadBrands()
  }, [])

  // ESC key handler for image viewer
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && viewingImage) {
        setViewingImage(null)
      }
    }

    document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [viewingImage])

  // Scroll handler to minimize form
  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // If scrolling down and scrolled past 100px, minimize the form (only if allowed)
      if (allowAutoMinimize && currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsFormExpanded(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [allowAutoMinimize])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }

      if (
        brandSuggestionsRef.current &&
        !brandSuggestionsRef.current.contains(event.target as Node) &&
        brandInputRef.current &&
        !brandInputRef.current.contains(event.target as Node)
      ) {
        setShowBrandSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search for product names as user types
  useEffect(() => {
    const searchProducts = async () => {
      if (formData.name.length < 2) {
        setNameSuggestions([])
        return
      }

      const result = await searchProductsByNameAction(formData.name)
      if (result.success && result.data) {
        setNameSuggestions(result.data.products)
      }
    }

    const debounceTimer = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounceTimer)
  }, [formData.name])

  // Filter brands as user types
  useEffect(() => {
    if (formData.brand.length === 0) {
      setBrandSuggestions([])
      return
    }

    const filtered = allBrands.filter(brand =>
      brand.toLowerCase().includes(formData.brand.toLowerCase())
    ).slice(0, 10) // Limit to 10 suggestions

    setBrandSuggestions(filtered)
  }, [formData.brand, allBrands])

  // Check for duplicates on blur
  const handleNameBlur = async () => {
    if (!formData.name.trim()) {
      setDuplicateWarning(null)
      return
    }

    const result = await checkProductNameExistsAction(formData.name, editingId || undefined)

    if (result.success && result.data?.exists && result.data.product) {
      const existingProduct = result.data.product
      setDuplicateWarning(
        `A product with this name already exists (${existingProduct.brand} - ${existingProduct.category}). Click to load it.`
      )
    } else {
      setDuplicateWarning(null)
    }
  }

  const handleLoadExistingProduct = async () => {
    if (!formData.name.trim()) return

    const result = await checkProductNameExistsAction(formData.name, editingId || undefined)

    if (result.success && result.data?.exists && result.data.product) {
      loadProductIntoForm(result.data.product)
      setDuplicateWarning(null)
    }
  }

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This will also delete all its variants.`)) {
      return
    }

    setDeletingId(productId)

    const result = await deleteProductAction(productId)

    if (result.success) {
      setProducts(products.filter(p => p.id !== productId))
      // If we're editing this product, reset the form
      if (editingId === productId) {
        resetForm()
      }
    } else {
      alert(result.message || 'Failed to delete product')
    }

    setDeletingId(null)
  }

  const handleOpenSectionDialog = async (product: ProductWithVariants) => {
    setSelectedProductForSection(product)
    setOpenDropdownId(null)

    // Load promotional categories
    const result = await getAllPromotionalCategoriesAction(false)
    if (result.success && result.data) {
      setPromotionalCategories(result.data)
    }

    setShowSectionDialog(true)
  }

  const handleAssignToSections = async () => {
    if (!selectedProductForSection) return

    const selectedSections = Object.entries(sectionQuantities).filter(([_, qty]) => qty > 0)
    if (selectedSections.length === 0) {
      alert('Please enter at least one quantity')
      return
    }

    const totalStock = selectedProductForSection.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
    const totalAllocated = selectedSections.reduce((sum, [_, qty]) => sum + qty, 0)

    if (totalAllocated > totalStock) {
      alert(`Total allocated (${totalAllocated}) cannot exceed available stock (${totalStock})`)
      return
    }

    setAssigningSections(true)

    // Assign to each selected section
    for (const [categoryId, quantity] of selectedSections) {
      const result = await addProductToCategoryAction(categoryId, selectedProductForSection.id, quantity)
      if (!result.success) {
        alert(`Failed to add to section: ${result.message}`)
      }
    }

    setAssigningSections(false)
    setShowSectionDialog(false)
    setSectionQuantities({})
    setSelectedProductForSection(null)

    alert('Product assigned to sections successfully!')
  }

  const loadProductIntoForm = (product: ProductWithVariants) => {
    setIsEditing(true)
    setEditingId(product.id)
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      gender: product.gender,
      stockPrice: product.stockPrice.toString(),
      retailPrice: product.retailPrice.toString(),
      sku: product.sku,
    })
    setDuplicateWarning(null)
    setShowSuggestions(false)
    setShowBrandSuggestions(false)
    setIsFormExpanded(true)

    // Disable auto-minimize temporarily to prevent immediate collapse
    setAllowAutoMinimize(false)
    setTimeout(() => {
      setAllowAutoMinimize(true)
    }, 500) // Wait 500ms before allowing auto-minimize again

    // Set first variant as selected
    setSelectedVariantId(product.variants.length > 0 ? product.variants[0].id : null)
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingId(null)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      brand: '',
      category: 'SHIRT',
      gender: 'UNISEX',
      stockPrice: '',
      retailPrice: '',
      sku: '',
    })
    setDuplicateWarning(null)
    setShowSuggestions(false)
    setShowBrandSuggestions(false)
    setSelectedVariantId(null)
  }

  // Image management functions
  const handleImageUpload = async (variantId: string, files: FileList) => {
    if (!files || files.length === 0) return

    setUploadingImages(prev => ({ ...prev, [variantId]: true }))

    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const uploadResult = await uploadMultipleImages(formData)

      if (uploadResult.success && uploadResult.urls) {
        // Add each uploaded image to the variant
        for (const url of uploadResult.urls) {
          const result = await addVariantImageAction(variantId, url)
          if (!result.success) {
            alert(`Failed to add image: ${result.message}`)
          }
        }

        // Refresh the editing product
        if (editingProduct) {
          const updatedProduct = products.find(p => p.id === editingProduct.id)
          if (updatedProduct) {
            setEditingProduct(updatedProduct)
          }
        }

        alert('Images uploaded successfully!')
      } else {
        alert(uploadResult.message || 'Failed to upload images')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('An error occurred while uploading images')
    } finally {
      setUploadingImages(prev => ({ ...prev, [variantId]: false }))
    }
  }

  const handleImageRemove = async (variantId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return

    try {
      // Remove from variant
      const result = await removeVariantImageAction(variantId, imageUrl)

      if (result.success) {
        // Delete from storage
        await deleteImage(imageUrl)

        // Update editing product
        if (editingProduct) {
          const updatedVariants = editingProduct.variants.map(v =>
            v.id === variantId
              ? { ...v, images: v.images.filter(img => img !== imageUrl) }
              : v
          )
          setEditingProduct({ ...editingProduct, variants: updatedVariants })

          // Update products list
          setProducts(products.map(p =>
            p.id === editingProduct.id
              ? { ...p, variants: updatedVariants }
              : p
          ))
        }

        alert('Image removed successfully!')
      } else {
        alert(result.message || 'Failed to remove image')
      }
    } catch (error) {
      console.error('Remove error:', error)
      alert('An error occurred while removing image')
    }
  }

  // Sorting function
  const handleSort = (column: 'name' | 'category' | 'price' | 'variants' | 'stock') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'category':
        comparison = a.category.localeCompare(b.category)
        break
      case 'price':
        comparison = a.stockPrice - b.stockPrice
        break
      case 'variants':
        comparison = a.variants.length - b.variants.length
        break
      case 'stock':
        const aStock = a.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
        const bStock = b.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
        comparison = aStock - bStock
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim() || !formData.brand.trim()) {
      alert('Please fill in all required fields (Name, Brand)')
      return
    }

    const stockPrice = parseFloat(formData.stockPrice)
    const retailPrice = parseFloat(formData.retailPrice)

    if (isNaN(stockPrice) || isNaN(retailPrice) || stockPrice <= 0 || retailPrice <= 0) {
      alert('Please enter valid prices')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing && editingId) {
        // Update existing product
        const updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>> = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          brand: formData.brand.trim(),
          category: formData.category,
          gender: formData.gender,
          stockPrice,
          retailPrice,
          sku: formData.sku.trim(),
        }

        const result = await updateProductAction(editingId, updates)

        if (result.success) {
          // Refresh the products list
          const updatedProducts = products.map(p =>
            p.id === editingId
              ? { ...p, ...updates }
              : p
          )
          setProducts(updatedProducts)
          alert('Product updated successfully!')
          resetForm()
        } else {
          alert(result.message || 'Failed to update product')
        }
      } else {
        // Create new product (with empty variants array)
        const newProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          brand: formData.brand.trim(),
          category: formData.category,
          gender: formData.gender,
          stockPrice,
          retailPrice,
          sku: formData.sku.trim(),
        }

        const result = await createProductAction(newProduct, [])

        if (result.success && result.data) {
          setProducts([result.data.product, ...products])
          alert('Product created successfully! You can now add variants.')
          resetForm()
        } else {
          alert(result.message || 'Failed to create product')
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-navy-900">Product Management</h1>
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
        </div>
      </div>

      {/* Sticky Form Section */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-4 ${!isFormExpanded ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (!isFormExpanded) {
                  setIsFormExpanded(true)
                  // Disable auto-minimize temporarily to prevent immediate collapse
                  setAllowAutoMinimize(false)
                  setTimeout(() => {
                    setAllowAutoMinimize(true)
                  }, 500)
                }
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const newExpandedState = !isFormExpanded
                  setIsFormExpanded(newExpandedState)
                  // If expanding, disable auto-minimize temporarily
                  if (newExpandedState) {
                    setAllowAutoMinimize(false)
                    setTimeout(() => {
                      setAllowAutoMinimize(true)
                    }, 500)
                  }
                }}
                className={`p-2 rounded-lg transition-all ${
                  !isFormExpanded && isEditing
                    ? 'animate-pulse bg-blue-100 hover:bg-blue-200 shadow-lg shadow-blue-300 ring-2 ring-blue-400'
                    : 'hover:bg-gray-100'
                }`}
                title={isFormExpanded ? 'Minimize form' : 'Expand form'}
              >
                <svg
                  className={`w-5 h-5 transition-all ${
                    isFormExpanded ? 'rotate-180 text-gray-600' : !isFormExpanded && isEditing ? 'text-blue-700' : 'text-gray-600'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-navy-900">
                  {isEditing ? 'Update Product' : 'Add Product'}
                </h1>
                {!isFormExpanded && (
                  <p className="text-xs text-gray-500">
                    {isEditing ? 'Editing: ' + formData.name : 'Type product name to search'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && editingId && (
                <>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-white bg-coral-600 hover:bg-coral-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Update Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId) {
                        const product = products.find(p => p.id === editingId)
                        if (product) {
                          handleDelete(editingId, product.name)
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                  >
                    Delete Product
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg font-medium transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
              <Link href={`/${locale}/admin/dashboard`} className="text-sm text-navy-600 hover:text-navy-700 font-medium">
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Product Form */}
          {isFormExpanded && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">

            {/* Image Management Section - Split Layout */}
            {isEditing && editingProduct && editingProduct.variants.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Images</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Side: Variant Selector + Image Gallery */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Select Variant</label>
                      <select
                        value={selectedVariantId || ''}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      >
                        {editingProduct.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            Size: {variant.size} | Color: {variant.color} | Stock: {variant.stockQuantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Image Gallery */}
                    {selectedVariantId && (() => {
                      const selectedVariant = editingProduct.variants.find(v => v.id === selectedVariantId)
                      if (!selectedVariant) return null

                      return (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Current Images ({selectedVariant.images?.length || 0})
                          </label>
                          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2 min-h-[88px]"
                            onWheel={(e) => {
                              e.stopPropagation()
                              e.currentTarget.scrollLeft += e.deltaY
                            }}
                          >
                            {selectedVariant.images && selectedVariant.images.length > 0 ? (
                              selectedVariant.images.map((imageUrl, idx) => (
                                <div key={`${selectedVariant.id}-${idx}`} className="relative flex-shrink-0 group">
                                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-white border-2 border-gray-300 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer shadow-sm">
                                    <Image
                                      src={imageUrl}
                                      alt={`${selectedVariant.size} ${selectedVariant.color}`}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                      onClick={() => setViewingImage(imageUrl)}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleImageRemove(selectedVariant.id, imageUrl)}
                                    className="absolute -top-1 -right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
                                    title="Remove image"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center w-full h-20 text-xs text-gray-400 italic border-2 border-dashed border-gray-300 rounded-lg">
                                No images yet
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Right Side: Drag & Drop Upload Component */}
                  {selectedVariantId && (() => {
                    const selectedVariant = editingProduct.variants.find(v => v.id === selectedVariantId)
                    if (!selectedVariant) return null

                    return (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Upload Images</label>
                        <input
                          ref={el => { fileInputRefs.current[selectedVariant.id] = el }}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleImageUpload(selectedVariant.id, e.target.files)
                              setIsDraggingOver(false)
                            }
                          }}
                          className="hidden"
                        />
                        <div
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingOver(true)
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingOver(false)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingOver(false)
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              handleImageUpload(selectedVariant.id, e.dataTransfer.files)
                            }
                          }}
                          onClick={() => !uploadingImages[selectedVariant.id] && fileInputRefs.current[selectedVariant.id]?.click()}
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all ${
                            isDraggingOver
                              ? 'border-blue-500 bg-blue-50'
                              : uploadingImages[selectedVariant.id]
                              ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                          style={{ minHeight: '140px' }}
                        >
                          {uploadingImages[selectedVariant.id] ? (
                            <>
                              <svg className="w-10 h-10 text-blue-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-sm text-gray-600 font-medium">Uploading...</p>
                              <p className="text-xs text-gray-500 mt-1">Please wait</p>
                            </>
                          ) : (
                            <>
                              <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm text-gray-700 font-medium mb-1">
                                {isDraggingOver ? 'Drop images here' : 'Drag & drop images'}
                              </p>
                              <p className="text-xs text-gray-500 mb-2">or</p>
                              <button
                                type="button"
                                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  fileInputRefs.current[selectedVariant.id]?.click()
                                }}
                              >
                                Browse Files
                              </button>
                              <p className="text-xs text-gray-400 mt-3">PNG, JPG, GIF up to 10MB</p>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Product Name with Autocomplete */}
              <div className="relative">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    setShowSuggestions(true)
                    setDuplicateWarning(null)
                  }}
                  onBlur={handleNameBlur}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Type to search existing products..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Start typing to see suggestions</p>

                {/* Autocomplete Suggestions */}
                {showSuggestions && nameSuggestions.length > 0 && formData.name.length >= 2 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {nameSuggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => loadProductIntoForm(product)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.brand} - {product.category}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Duplicate Warning */}
                {duplicateWarning && (
                  <button
                    type="button"
                    onClick={handleLoadExistingProduct}
                    className="mt-1 text-xs text-amber-600 hover:text-amber-700 cursor-pointer underline"
                  >
                    {duplicateWarning}
                  </button>
                )}
              </div>

              {/* Brand with Autocomplete */}
              <div className="relative">
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Brand *
                </label>
                <input
                  ref={brandInputRef}
                  type="text"
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => {
                    setFormData({ ...formData, brand: e.target.value })
                    setShowBrandSuggestions(true)
                  }}
                  onFocus={() => setShowBrandSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Enter brand"
                  required
                />

                {/* Brand Autocomplete Suggestions */}
                {showBrandSuggestions && brandSuggestions.length > 0 && (
                  <div
                    ref={brandSuggestionsRef}
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {brandSuggestions.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, brand })
                          setShowBrandSuggestions(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{brand}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SKU */}
              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Enter SKU (optional)"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as ProductGender })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  required
                >
                  {GENDERS.map((gen) => (
                    <option key={gen} value={gen}>
                      {gen}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Price */}
              <div>
                <label htmlFor="stockPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Price ($) *
                </label>
                <input
                  type="number"
                  id="stockPrice"
                  step="0.01"
                  min="0"
                  value={formData.stockPrice}
                  onChange={(e) => setFormData({ ...formData, stockPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Retail Price */}
              <div>
                <label htmlFor="retailPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Retail Price ($) *
                </label>
                <input
                  type="number"
                  id="retailPrice"
                  step="0.01"
                  min="0"
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-none"
                placeholder="Enter product description"
              />
            </div>


            {/* Submit Button - Only show when adding new product */}
            {!isEditing && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            )}
          </form>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Products</h2>
          <p className="text-xs text-gray-500 italic">Tap on table headers to sort</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Product
                      {sortBy === 'name' && (
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Category
                      {sortBy === 'category' && (
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('price')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Price
                      {sortBy === 'price' && (
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('variants')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Variants
                      {sortBy === 'variants' && (
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('stock')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Stock
                      {sortBy === 'stock' && (
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedProducts.map((product) => {
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
                  const firstImage = product.variants[0]?.images?.[0]

                  return (
                    <tr
                      key={product.id}
                      onClick={() => loadProductIntoForm(product)}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                        editingId === product.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start">
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
                          <div className="ml-4 min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 break-words">{product.name}</div>
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
                            className="text-navy-600 hover:text-navy-700 p-1"
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            title="View product"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenDropdownId(openDropdownId === product.id ? null : product.id)
                              }}
                              className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded"
                              title="More options"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {openDropdownId === product.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenSectionDialog(product)
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 rounded-t-lg"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Add to Sections
                                </button>
                              </div>
                            )}
                          </div>
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
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new product using the form above.</p>
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

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Image
              src={viewingImage}
              alt="Full size"
              width={1200}
              height={1200}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Section Assignment Dialog */}
      {showSectionDialog && selectedProductForSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add to Homepage Sections</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Assign "{selectedProductForSection.name}" to promotional sections
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSectionDialog(false)
                  setSectionQuantities({})
                  setSelectedProductForSection(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Info */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                  {selectedProductForSection.variants[0]?.images[0] && (
                    <Image
                      src={selectedProductForSection.variants[0].images[0]}
                      alt={selectedProductForSection.name}
                      fill
                      className="object-cover rounded"
                      sizes="80px"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedProductForSection.name}</h3>
                  <p className="text-sm text-gray-600">{selectedProductForSection.brand}</p>
                  <p className="text-sm font-medium text-green-600 mt-1">
                    Total Stock: {selectedProductForSection.variants.reduce((sum, v) => sum + v.stockQuantity, 0)} units
                  </p>
                </div>
              </div>
            </div>

            {/* Section List */}
            <div className="px-6 py-4">
              <h3 className="font-semibold text-gray-900 mb-4">Select Sections and Quantities</h3>
              {promotionalCategories.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No promotional sections available</p>
              ) : (
                <div className="space-y-3">
                  {promotionalCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{category.name}</h4>
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
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={sectionQuantities[category.id] || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0
                          setSectionQuantities({
                            ...sectionQuantities,
                            [category.id]: value,
                          })
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none ml-4"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Total Allocated Warning */}
              {Object.values(sectionQuantities).some((qty) => qty > 0) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total to allocate:</strong>{' '}
                    {Object.values(sectionQuantities).reduce((sum, qty) => sum + qty, 0)} units
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Available stock: {selectedProductForSection.variants.reduce((sum, v) => sum + v.stockQuantity, 0)}{' '}
                    units
                  </p>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowSectionDialog(false)
                  setSectionQuantities({})
                  setSelectedProductForSection(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignToSections}
                disabled={assigningSections || Object.values(sectionQuantities).every((qty) => !qty || qty === 0)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningSections ? 'Assigning...' : 'Assign to Sections'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
