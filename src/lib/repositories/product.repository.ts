import { getSession } from '../db'
import neo4j from 'neo4j-driver'
import type { Product, ProductVariant, ProductCategory, ProductGender } from '../types'

export interface ProductFilters {
  category?: ProductCategory
  brand?: string
  gender?: ProductGender
  minPrice?: number
  maxPrice?: number
  search?: string
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
}

/**
 * Get all products with optional filtering
 */
export async function getAllProducts(
  filters?: ProductFilters,
  limit: number = 50
): Promise<ProductWithVariants[]> {
  const session = getSession()
  try {
    let query = 'MATCH (p:Product)'
    const params: Record<string, any> = { limit: neo4j.int(limit) }
    const conditions: string[] = []

    if (filters?.category) {
      conditions.push('p.category = $category')
      params.category = filters.category
    }

    if (filters?.brand) {
      conditions.push('p.brand = $brand')
      params.brand = filters.brand
    }

    if (filters?.gender) {
      conditions.push('p.gender = $gender')
      params.gender = filters.gender
    }

    if (filters?.minPrice !== undefined) {
      conditions.push('p.stockPrice >= $minPrice')
      params.minPrice = filters.minPrice
    }

    if (filters?.maxPrice !== undefined) {
      conditions.push('p.stockPrice <= $maxPrice')
      params.maxPrice = filters.maxPrice
    }

    if (filters?.search) {
      conditions.push('(toLower(p.name) CONTAINS toLower($search) OR toLower(p.brand) CONTAINS toLower($search))')
      params.search = filters.search
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += `
      OPTIONAL MATCH (v:ProductVariant)-[:VARIANT_OF]->(p)
      WITH p, collect(v {.*}) as variants
      RETURN p {.*, variants: variants}
      ORDER BY p.createdAt DESC
      LIMIT $limit
    `

    const result = await session.run(query, params)
    return result.records.map((record) => record.get('p'))
  } finally {
    await session.close()
  }
}

/**
 * Get a single product by ID with all its variants
 */
export async function getProductById(id: string): Promise<ProductWithVariants | null> {
  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (p:Product {id: $id})
      OPTIONAL MATCH (v:ProductVariant)-[:VARIANT_OF]->(p)
      WITH p, collect(v {.*}) as variants
      RETURN p {.*, variants: variants}
      `,
      { id }
    )

    const product = result.records[0]?.get('p')
    return product || null
  } finally {
    await session.close()
  }
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  category: ProductCategory,
  limit: number = 50
): Promise<ProductWithVariants[]> {
  return getAllProducts({ category }, limit)
}

/**
 * Search products by name or brand
 */
export async function searchProducts(
  query: string,
  limit: number = 50
): Promise<ProductWithVariants[]> {
  return getAllProducts({ search: query }, limit)
}

/**
 * Get unique brands from all products
 */
export async function getAllBrands(): Promise<string[]> {
  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (p:Product)
      RETURN DISTINCT p.brand as brand
      ORDER BY brand
      `
    )

    return result.records.map((record) => record.get('brand'))
  } finally {
    await session.close()
  }
}

/**
 * Get product variant by ID
 */
export async function getVariantById(variantId: string): Promise<ProductVariant | null> {
  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (v:ProductVariant {id: $variantId})
      RETURN v {.*}
      `,
      { variantId }
    )

    const variant = result.records[0]?.get('v')
    return variant || null
  } finally {
    await session.close()
  }
}

/**
 * Get variant with its associated product details
 */
export async function getVariantWithProduct(variantId: string): Promise<{
  variant: ProductVariant
  product: {
    id: string
    name: string
    brand: string
    category: string
    gender: string
    stockPrice: number
    retailPrice: number
    sku: string
  }
} | null> {
  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (v:ProductVariant {id: $variantId})-[:VARIANT_OF]->(p:Product)
      RETURN v {.*} as variant,
             p {.id, .name, .brand, .category, .gender, .stockPrice, .retailPrice, .sku} as product
      `,
      { variantId }
    )

    if (result.records.length === 0) {
      return null
    }

    const record = result.records[0]
    return {
      variant: record.get('variant'),
      product: record.get('product'),
    }
  } finally {
    await session.close()
  }
}

/**
 * Get product count (for statistics)
 */
export async function getProductCount(filters?: ProductFilters): Promise<number> {
  const session = getSession()
  try {
    let query = 'MATCH (p:Product)'
    const params: Record<string, any> = {}
    const conditions: string[] = []

    if (filters?.category) {
      conditions.push('p.category = $category')
      params.category = filters.category
    }

    if (filters?.brand) {
      conditions.push('p.brand = $brand')
      params.brand = filters.brand
    }

    if (filters?.gender) {
      conditions.push('p.gender = $gender')
      params.gender = filters.gender
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' RETURN count(p) as count'

    const result = await session.run(query, params)
    return result.records[0]?.get('count').toNumber() || 0
  } finally {
    await session.close()
  }
}

/**
 * Delete a product and all its variants
 */
export async function deleteProduct(productId: string): Promise<void> {
  const session = getSession()
  try {
    // Delete all variants first, then the product
    await session.run(
      `
      MATCH (p:Product {id: $productId})
      OPTIONAL MATCH (v:ProductVariant)-[:VARIANT_OF]->(p)
      DETACH DELETE v, p
      `,
      { productId }
    )
  } finally {
    await session.close()
  }
}

/**
 * Create a new product with variants
 */
export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  variants: Omit<ProductVariant, 'id' | 'productId'>[]
): Promise<ProductWithVariants> {
  const session = getSession()
  try {
    const productId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create the product
    await session.run(
      `
      CREATE (p:Product {
        id: $id,
        name: $name,
        description: $description,
        brand: $brand,
        category: $category,
        gender: $gender,
        stockPrice: $stockPrice,
        retailPrice: $retailPrice,
        sku: $sku,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      `,
      {
        id: productId,
        name: product.name,
        description: product.description,
        brand: product.brand,
        category: product.category,
        gender: product.gender,
        stockPrice: product.stockPrice,
        retailPrice: product.retailPrice,
        sku: product.sku,
        createdAt: now,
        updatedAt: now,
      }
    )

    // Create variants
    for (const variant of variants) {
      const variantId = crypto.randomUUID()
      await session.run(
        `
        MATCH (p:Product {id: $productId})
        CREATE (v:ProductVariant {
          id: $id,
          productId: $productId,
          size: $size,
          color: $color,
          stockQuantity: $stockQuantity,
          images: $images
        })
        CREATE (v)-[:VARIANT_OF]->(p)
        `,
        {
          productId,
          id: variantId,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stockQuantity,
          images: variant.images,
        }
      )
    }

    // Return the created product with variants
    const result = await getProductById(productId)
    if (!result) {
      throw new Error('Failed to create product')
    }
    return result
  } finally {
    await session.close()
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Product> {
  const session = getSession()
  try {
    const now = new Date().toISOString()

    const result = await session.run(
      `
      MATCH (p:Product {id: $productId})
      SET p += $updates, p.updatedAt = $updatedAt
      RETURN p {.*}
      `,
      {
        productId,
        updates,
        updatedAt: now,
      }
    )

    const product = result.records[0]?.get('p')
    if (!product) {
      throw new Error('Product not found')
    }
    return product
  } finally {
    await session.close()
  }
}

/**
 * Update a product variant
 */
export async function updateVariant(
  variantId: string,
  updates: Partial<Omit<ProductVariant, 'id' | 'productId'>>
): Promise<ProductVariant> {
  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (v:ProductVariant {id: $variantId})
      SET v += $updates
      RETURN v {.*}
      `,
      {
        variantId,
        updates,
      }
    )

    const variant = result.records[0]?.get('v')
    if (!variant) {
      throw new Error('Variant not found')
    }
    return variant
  } finally {
    await session.close()
  }
}

/**
 * Add a variant to an existing product
 */
export async function addVariant(
  productId: string,
  variant: Omit<ProductVariant, 'id' | 'productId'>
): Promise<ProductVariant> {
  const session = getSession()
  try {
    const variantId = crypto.randomUUID()

    await session.run(
      `
      MATCH (p:Product {id: $productId})
      CREATE (v:ProductVariant {
        id: $id,
        productId: $productId,
        size: $size,
        color: $color,
        stockQuantity: $stockQuantity,
        images: $images
      })
      CREATE (v)-[:VARIANT_OF]->(p)
      `,
      {
        productId,
        id: variantId,
        size: variant.size,
        color: variant.color,
        stockQuantity: variant.stockQuantity,
        images: variant.images,
      }
    )

    const result = await getVariantById(variantId)
    if (!result) {
      throw new Error('Failed to create variant')
    }
    return result
  } finally {
    await session.close()
  }
}

/**
 * Delete a variant
 */
export async function deleteVariant(variantId: string): Promise<void> {
  const session = getSession()
  try {
    await session.run(
      `
      MATCH (v:ProductVariant {id: $variantId})
      DETACH DELETE v
      `,
      { variantId }
    )
  } finally {
    await session.close()
  }
}
