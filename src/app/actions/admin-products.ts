'use server'

import { isAdmin } from '@/lib/auth'
import {
  getAllProducts,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  type ProductWithVariants,
} from '@/lib/repositories/product.repository'
import type { ActionResponse } from './types'
import type { Product, ProductVariant } from '@/lib/types'

/**
 * Get all products for admin view
 */
export async function getAdminProductsAction(): Promise<
  ActionResponse<{ products: ProductWithVariants[] }>
> {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    const products = await getAllProducts({}, 100) // Get up to 100 products

    return {
      success: true,
      data: { products },
    }
  } catch (error) {
    console.error('Get admin products error:', error)
    return {
      success: false,
      message: 'Failed to fetch products',
    }
  }
}

/**
 * Get a single product for admin editing
 */
export async function getAdminProductAction(
  productId: string
): Promise<ActionResponse<{ product: ProductWithVariants }>> {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    const product = await getProductById(productId)

    if (!product) {
      return {
        success: false,
        message: 'Product not found',
      }
    }

    return {
      success: true,
      data: { product },
    }
  } catch (error) {
    console.error('Get admin product error:', error)
    return {
      success: false,
      message: 'Failed to fetch product',
    }
  }
}

/**
 * Delete a product
 */
export async function deleteProductAction(
  productId: string
): Promise<ActionResponse<null>> {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    await deleteProduct(productId)

    return {
      success: true,
      message: 'Product deleted successfully',
    }
  } catch (error) {
    console.error('Delete product error:', error)
    return {
      success: false,
      message: 'Failed to delete product',
    }
  }
}

/**
 * Create a new product with variants
 */
export async function createProductAction(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  variants: Omit<ProductVariant, 'id' | 'productId'>[]
): Promise<ActionResponse<{ product: ProductWithVariants }>> {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    const newProduct = await createProduct(product, variants)

    return {
      success: true,
      message: 'Product created successfully',
      data: { product: newProduct },
    }
  } catch (error) {
    console.error('Create product error:', error)
    return {
      success: false,
      message: 'Failed to create product',
    }
  }
}

/**
 * Update a product
 */
export async function updateProductAction(
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ActionResponse<null>> {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    await updateProduct(productId, updates)

    return {
      success: true,
      message: 'Product updated successfully',
    }
  } catch (error) {
    console.error('Update product error:', error)
    return {
      success: false,
      message: 'Failed to update product',
    }
  }
}

/**
 * Update a product variant
 */
export async function updateVariantAction(
  variantId: string,
  updates: Partial<Omit<ProductVariant, 'id' | 'productId'>>
): Promise<ActionResponse<null>> {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    await updateVariant(variantId, updates)

    return {
      success: true,
      message: 'Variant updated successfully',
    }
  } catch (error) {
    console.error('Update variant error:', error)
    return {
      success: false,
      message: 'Failed to update variant',
    }
  }
}
