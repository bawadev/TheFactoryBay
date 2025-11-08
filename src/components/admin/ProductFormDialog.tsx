'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { ProductWithVariants } from '@/lib/repositories/product.repository'
import type { ProductCategory, ProductGender, SizeOption, Product } from '@/lib/types'
import type { Category } from '@/lib/repositories/category.repository'
import { getCategoryByIdAction } from '@/app/actions/categories'
import { addProductImageAction, removeProductImageAction } from '@/app/actions/admin-products'
import { uploadMultipleImages, deleteImage } from '@/app/actions/upload'

interface ProductFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: FormData, variants: VariantFormData[]) => Promise<void>
  editingProduct: ProductWithVariants | null
  isEditing: boolean
  allBrands: string[]
  onLoadProduct: (product: ProductWithVariants) => void | Promise<void>
  onOpenCategoryPicker: () => void
  selectedCategoryIds: string[]
}

export type FormData = {
  name: string
  description: string
  brand: string
  categoryIds: string[]
  gender: ProductGender
  stockPrice: string
  retailPrice: string
  sku: string
  images: string[]
}

export type VariantFormData = {
  id?: string
  size: SizeOption
  color: string
  stockQuantity: number
}

const GENDERS: ProductGender[] = ['MEN', 'WOMEN', 'UNISEX']
const SIZES: SizeOption[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function ProductFormDialog({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  isEditing,
  allBrands,
  onLoadProduct,
  onOpenCategoryPicker,
  selectedCategoryIds,
}: ProductFormDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    brand: '',
    categoryIds: [],
    gender: 'UNISEX',
    stockPrice: '',
    retailPrice: '',
    sku: '',
    images: [],
  })

  const [variants, setVariants] = useState<VariantFormData[]>([])
  const [variantForm, setVariantForm] = useState<VariantFormData>({
    size: 'M',
    color: '',
    stockQuantity: 0,
  })
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null)

  // Autocomplete
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false)
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([])
  const brandInputRef = useRef<HTMLInputElement>(null)
  const brandSuggestionsRef = useRef<HTMLDivElement>(null)

  // Selected categories
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])

  // Image management
  const [productImages, setProductImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories when categoryIds change
  useEffect(() => {
    const loadCategories = async () => {
      if (selectedCategoryIds.length > 0) {
        const categories = await Promise.all(
          selectedCategoryIds.map(async (id) => {
            const result = await getCategoryByIdAction(id)
            return result.success && result.data ? result.data : null
          })
        )
        setSelectedCategories(categories.filter((c): c is Category => c !== null))
      } else {
        setSelectedCategories([])
      }
    }
    loadCategories()
  }, [selectedCategoryIds])

  // Filter brands
  useEffect(() => {
    if (formData.brand.length === 0) {
      setBrandSuggestions([])
      return
    }

    const filtered = allBrands
      .filter((brand) => brand.toLowerCase().includes(formData.brand.toLowerCase()))
      .slice(0, 10)

    setBrandSuggestions(filtered)
  }, [formData.brand, allBrands])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Sync categoryIds with selectedCategoryIds
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      categoryIds: selectedCategoryIds
    }))
  }, [selectedCategoryIds])

  // Load product data when editing or reset when dialog closes
  useEffect(() => {
    if (isEditing && editingProduct) {
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description,
        brand: editingProduct.brand,
        categoryIds: selectedCategoryIds,
        gender: editingProduct.gender,
        stockPrice: editingProduct.stockPrice.toString(),
        retailPrice: editingProduct.retailPrice.toString(),
        sku: editingProduct.sku,
        images: editingProduct.images || [],
      })

      setVariants(
        editingProduct.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stockQuantity: v.stockQuantity,
        }))
      )

      // Load product images
      setProductImages(editingProduct.images || [])
    } else if (!isOpen) {
      // Only reset form when dialog closes
      setFormData({
        name: '',
        description: '',
        brand: '',
        categoryIds: [],
        gender: 'UNISEX',
        stockPrice: '',
        retailPrice: '',
        sku: '',
        images: [],
      })
      setVariants([])
      setProductImages([])
    }
  }, [isEditing, editingProduct, isOpen])

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    setUploadingImages(true)

    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const uploadResult = await uploadMultipleImages(formData)

      if (uploadResult.success && uploadResult.urls) {
        // If editing, add images to product in database
        if (isEditing && editingProduct) {
          for (const url of uploadResult.urls) {
            await addProductImageAction(editingProduct.id, url)
          }
        }

        // Update local state
        setProductImages([...productImages, ...uploadResult.urls])
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleImageRemove = async (imageUrl: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return

    try {
      // If editing, remove from product in database
      if (isEditing && editingProduct) {
        await removeProductImageAction(editingProduct.id, imageUrl)
        await deleteImage(imageUrl)
      }

      // Update local state
      setProductImages(productImages.filter((img) => img !== imageUrl))
    } catch (error) {
      console.error('Remove error:', error)
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return

    try {
      // If editing, add image to product in database
      if (isEditing && editingProduct) {
        await addProductImageAction(editingProduct.id, urlInput.trim())
      }

      // Update local state
      setProductImages([...productImages, urlInput.trim()])
      setUrlInput('')
    } catch (error) {
      console.error('URL submit error:', error)
    }
  }

  const handleAddVariant = () => {
    if (!variantForm.size || !variantForm.color.trim()) {
      alert('Please fill in size and color')
      return
    }

    if (editingVariantIndex !== null) {
      const updatedVariants = [...variants]
      updatedVariants[editingVariantIndex] = variantForm
      setVariants(updatedVariants)
      setEditingVariantIndex(null)
    } else {
      setVariants([...variants, variantForm])
    }

    setVariantForm({ size: 'M', color: '', stockQuantity: 0 })
    setShowVariantForm(false)
  }

  const handleEditVariant = (index: number) => {
    setVariantForm(variants[index])
    setEditingVariantIndex(index)
    setShowVariantForm(true)
  }

  const handleDeleteVariant = (index: number) => {
    if (confirm('Are you sure you want to delete this variant?')) {
      setVariants(variants.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Sync categoryIds and images from state before submitting
    const submissionData = {
      ...formData,
      categoryIds: selectedCategoryIds,
      images: productImages
    }
    await onSubmit(submissionData, variants)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Dialog Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isEditing ? 'Update product details and variants' : 'Create a new product with variants'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="Enter product name"
                required
              />
            </div>

            {/* Brand with Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand *
              </label>
              <input
                ref={brandInputRef}
                type="text"
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

              {/* Brand Suggestions */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="Enter SKU (optional)"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories * <span className="text-xs text-gray-500">(Leaf only)</span>
              </label>
              <button
                type="button"
                onClick={onOpenCategoryPicker}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-indigo-500 transition-colors text-left flex items-center justify-between"
              >
                <span className="text-gray-700">
                  {selectedCategoryIds.length > 0
                    ? `${selectedCategoryIds.length} selected`
                    : 'Select categories'}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Price ($) *
              </label>
              <input
                type="number"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retail Price ($) *
              </label>
              <input
                type="number"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-none"
              placeholder="Enter product description"
            />
          </div>

          {/* Product Images Section */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Product Images</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    uploadMode === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    uploadMode === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  URL
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Images are shared across all product variants. Upload up to 5 images.
            </p>

            {/* Current Images */}
            {productImages.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Current Images ({productImages.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {productImages.map((imageUrl, idx) => (
                    <div key={idx} className="relative group">
                      <div className="h-20 w-20 rounded-lg overflow-hidden bg-white border-2 border-gray-300 hover:ring-2 hover:ring-blue-400 transition-all shadow-sm">
                        <Image
                          src={imageUrl}
                          alt={`Product image ${idx + 1}`}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImageRemove(imageUrl)}
                        className="absolute -top-1 -right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
                        title="Remove image"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area */}
            {productImages.length < 5 && (
              <div>
                {uploadMode === 'file' ? (
                  <>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Upload Images</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleImageUpload(e.target.files)
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
                          handleImageUpload(e.dataTransfer.files)
                        }
                      }}
                      onClick={() => !uploadingImages && fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all ${
                        isDraggingOver
                          ? 'border-blue-500 bg-blue-50'
                          : uploadingImages
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                      style={{ minHeight: '120px' }}
                    >
                      {uploadingImages ? (
                        <>
                          <svg className="w-10 h-10 text-blue-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <p className="text-sm text-gray-600 font-medium">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
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
                              fileInputRef.current?.click()
                            }}
                          >
                            Browse Files
                          </button>
                          <p className="text-xs text-gray-400 mt-3">PNG, JPG, GIF up to 5MB each</p>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleUrlSubmit()
                          }
                        }}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Enter the full URL of the image</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Selected Categories Chips */}
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => {
                const hierarchyColor =
                  category.hierarchy === 'ladies'
                    ? 'bg-pink-100 text-pink-800'
                    : category.hierarchy === 'gents'
                    ? 'bg-blue-100 text-blue-800'
                    : category.hierarchy === 'kids'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'

                return (
                  <div
                    key={category.id}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${hierarchyColor}`}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs opacity-70">({category.hierarchy})</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Variants Section */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Product Variants *</h3>
              <button
                type="button"
                onClick={() => setShowVariantForm(!showVariantForm)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                {showVariantForm ? 'Cancel' : '+ Add Variant'}
              </button>
            </div>

            {/* Add/Edit Variant Form */}
            {showVariantForm && (
              <div className="mb-4 p-3 border border-indigo-200 rounded-lg bg-white">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  {editingVariantIndex !== null ? 'Edit Variant' : 'New Variant'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Size *</label>
                    <select
                      value={variantForm.size}
                      onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value as SizeOption })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                    >
                      {SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color *</label>
                    <input
                      type="text"
                      value={variantForm.color}
                      onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Red, Blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Stock *</label>
                    <input
                      type="number"
                      min="0"
                      value={variantForm.stockQuantity}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, stockQuantity: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    {editingVariantIndex !== null ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVariantForm({ size: 'M', color: '', stockQuantity: 0 })
                      setShowVariantForm(false)
                      setEditingVariantIndex(null)
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Variants List */}
            {variants.length > 0 ? (
              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">Size: {variant.size}</span>
                      <span className="text-sm text-gray-600">|</span>
                      <span className="text-sm font-medium text-gray-900">Color: {variant.color}</span>
                      <span className="text-sm text-gray-600">|</span>
                      <span className="text-sm font-medium text-green-600">Stock: {variant.stockQuantity}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditVariant(index)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500 italic">
                No variants added yet. Click &quot;+ Add Variant&quot; to create one.
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 font-medium"
            >
              {isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
