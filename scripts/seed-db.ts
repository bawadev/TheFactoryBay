/**
 * Database seeding script
 * Run this with: npm run db:seed
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'
import { v4 as uuidv4 } from 'uuid'

// Sample product data
const products = [
  // Men's Shirts
  {
    name: 'Classic White Oxford Shirt',
    brand: 'Ralph Lauren',
    category: 'SHIRT',
    gender: 'MEN',
    description: 'Timeless Oxford shirt crafted from premium cotton. Perfect for both casual and formal occasions.',
    retailPrice: 89.99,
    stockPrice: 45.00,
    variants: [
      { size: 'S', color: 'White', stock: 15, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000'] },
      { size: 'M', color: 'White', stock: 25, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000'] },
      { size: 'L', color: 'White', stock: 20, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000'] },
      { size: 'XL', color: 'White', stock: 12, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000'] },
    ],
  },
  {
    name: 'Slim Fit Navy Blue Shirt',
    brand: 'Tommy Hilfiger',
    category: 'SHIRT',
    gender: 'MEN',
    description: 'Modern slim fit shirt in navy blue. Wrinkle-resistant fabric for all-day comfort.',
    retailPrice: 79.99,
    stockPrice: 39.99,
    variants: [
      { size: 'S', color: 'Navy', stock: 18, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1000'] },
      { size: 'M', color: 'Navy', stock: 22, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1000'] },
      { size: 'L', color: 'Navy', stock: 15, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1000'] },
    ],
  },

  // Men's Pants
  {
    name: 'Slim Fit Chinos',
    brand: 'Levi\'s',
    category: 'PANTS',
    gender: 'MEN',
    description: 'Classic chino pants with a modern slim fit. Versatile and comfortable for everyday wear.',
    retailPrice: 69.99,
    stockPrice: 35.00,
    variants: [
      { size: 'M', color: 'Khaki', stock: 20, images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=1000'] },
      { size: 'L', color: 'Khaki', stock: 25, images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=1000'] },
      { size: 'XL', color: 'Khaki', stock: 15, images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=1000'] },
      { size: 'M', color: 'Navy', stock: 18, images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=1000'] },
      { size: 'L', color: 'Navy', stock: 22, images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=1000'] },
    ],
  },

  // Men's Jackets
  {
    name: 'Leather Bomber Jacket',
    brand: 'Zara',
    category: 'JACKET',
    gender: 'MEN',
    description: 'Premium leather bomber jacket with ribbed cuffs and hem. A timeless piece for your wardrobe.',
    retailPrice: 299.99,
    stockPrice: 149.99,
    variants: [
      { size: 'M', color: 'Black', stock: 8, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000'] },
      { size: 'L', color: 'Black', stock: 10, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000'] },
      { size: 'XL', color: 'Black', stock: 6, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000'] },
      { size: 'M', color: 'Brown', stock: 5, images: ['https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&h=1000'] },
    ],
  },

  // Women's Dresses
  {
    name: 'Floral Summer Dress',
    brand: 'H&M',
    category: 'DRESS',
    gender: 'WOMEN',
    description: 'Light and breezy floral dress perfect for summer days. Features adjustable straps and a flattering fit.',
    retailPrice: 59.99,
    stockPrice: 29.99,
    variants: [
      { size: 'S', color: 'Floral Blue', stock: 20, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000'] },
      { size: 'M', color: 'Floral Blue', stock: 25, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000'] },
      { size: 'L', color: 'Floral Blue', stock: 18, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000'] },
    ],
  },
  {
    name: 'Elegant Black Evening Dress',
    brand: 'Zara',
    category: 'DRESS',
    gender: 'WOMEN',
    description: 'Sophisticated evening dress with a timeless silhouette. Perfect for special occasions.',
    retailPrice: 149.99,
    stockPrice: 74.99,
    variants: [
      { size: 'S', color: 'Black', stock: 12, images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1000'] },
      { size: 'M', color: 'Black', stock: 15, images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1000'] },
      { size: 'L', color: 'Black', stock: 10, images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1000'] },
    ],
  },

  // Women's Shirts
  {
    name: 'Silk Blouse',
    brand: 'Mango',
    category: 'SHIRT',
    gender: 'WOMEN',
    description: 'Luxurious silk blouse with a relaxed fit. Versatile piece that pairs well with anything.',
    retailPrice: 79.99,
    stockPrice: 39.99,
    variants: [
      { size: 'S', color: 'Cream', stock: 15, images: ['https://images.unsplash.com/photo-1589992085991-098e618d0c1b?w=800&h=1000'] },
      { size: 'M', color: 'Cream', stock: 20, images: ['https://images.unsplash.com/photo-1589992085991-098e618d0c1b?w=800&h=1000'] },
      { size: 'S', color: 'Black', stock: 12, images: ['https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=1000'] },
      { size: 'M', color: 'Black', stock: 18, images: ['https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=1000'] },
    ],
  },

  // Shoes
  {
    name: 'Classic White Sneakers',
    brand: 'Adidas',
    category: 'SHOES',
    gender: 'UNISEX',
    description: 'Iconic white sneakers with the classic three stripes. Comfortable and stylish for everyday wear.',
    retailPrice: 89.99,
    stockPrice: 44.99,
    variants: [
      { size: 'M', color: 'White', stock: 30, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000'] },
      { size: 'L', color: 'White', stock: 25, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000'] },
      { size: 'XL', color: 'White', stock: 20, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000'] },
    ],
  },
  {
    name: 'Running Shoes Pro',
    brand: 'Nike',
    category: 'SHOES',
    gender: 'UNISEX',
    description: 'High-performance running shoes with advanced cushioning technology. Built for speed and comfort.',
    retailPrice: 159.99,
    stockPrice: 79.99,
    variants: [
      { size: 'M', color: 'Black/Red', stock: 15, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000'] },
      { size: 'L', color: 'Black/Red', stock: 18, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000'] },
      { size: 'XL', color: 'Black/Red', stock: 12, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000'] },
    ],
  },

  // Accessories
  {
    name: 'Leather Belt Classic',
    brand: 'Calvin Klein',
    category: 'ACCESSORIES',
    gender: 'UNISEX',
    description: 'Premium leather belt with a sleek buckle. Essential accessory for any outfit.',
    retailPrice: 49.99,
    stockPrice: 24.99,
    variants: [
      { size: 'M', color: 'Black', stock: 25, images: ['https://images.unsplash.com/photo-1624222247344-550fb60583f2?w=800&h=1000'] },
      { size: 'L', color: 'Black', stock: 20, images: ['https://images.unsplash.com/photo-1624222247344-550fb60583f2?w=800&h=1000'] },
      { size: 'M', color: 'Brown', stock: 22, images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=1000'] },
      { size: 'L', color: 'Brown', stock: 18, images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=1000'] },
    ],
  },
]

async function seedProducts() {
  console.log('🌱 Seeding products...\n')

  const session = getSession()
  let productCount = 0
  let variantCount = 0

  try {
    for (const product of products) {
      const productId = uuidv4()
      const sku = `FB-${product.category.substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      const now = new Date().toISOString()

      // Create product
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
          sku,
          createdAt: now,
          updatedAt: now,
        }
      )

      productCount++
      console.log(`✓ Created: ${product.name} (${product.brand})`)

      // Create variants
      for (const variant of product.variants) {
        const variantId = uuidv4()

        await session.run(
          `
          MATCH (p:Product {id: $productId})
          CREATE (v:ProductVariant {
            id: $id,
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
            stockQuantity: variant.stock,
            images: variant.images,
          }
        )

        variantCount++
      }
    }

    console.log(`\n✅ Seeding complete!`)
    console.log(`   Products created: ${productCount}`)
    console.log(`   Variants created: ${variantCount}`)

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

async function main() {
  console.log('🚀 Factory Bay - Database Seeding\n')

  try {
    await seedProducts()
    await closeDriver()
    console.log('\n✅ All done!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
