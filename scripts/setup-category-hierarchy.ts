#!/usr/bin/env tsx
/**
 * Setup Category Hierarchy
 *
 * Creates the three root hierarchies (Ladies, Gents, Kids) with their subcategories.
 * This script implements a single-parent tree structure for product categorization.
 *
 * Hierarchy Structure:
 * - Ladies (L0)
 *   - Clothing (L1)
 *     - Tops (L2)
 *       - T-Shirts, Blouses, Shirts, Sweaters (L3)
 *     - Bottoms (L2)
 *       - Jeans, Trousers, Skirts, Shorts (L3)
 *     - Dresses (L2)
 *     - Outerwear (L2)
 *   - Footwear (L1)
 *   - Accessories (L1)
 *
 * - Gents (L0)
 *   - Clothing (L1)
 *     - Tops (L2)
 *     - Bottoms (L2)
 *     - Outerwear (L2)
 *   - Footwear (L1)
 *   - Accessories (L1)
 *
 * - Kids (L0)
 *   - Clothing (L1)
 *   - Footwear (L1)
 *   - Accessories (L1)
 *
 * Usage: npm run setup:categories
 */

import { getSession } from '../src/lib/db'
import {
  createCategory,
  getCategoryTree
} from '../src/lib/repositories/category.repository'

interface CategoryDefinition {
  name: string
  children?: CategoryDefinition[]
  isFeatured?: boolean
}

const CATEGORY_STRUCTURE: Record<string, CategoryDefinition[]> = {
  ladies: [
    {
      name: 'Clothing',
      isFeatured: true,
      children: [
        {
          name: 'Tops',
          children: [
            { name: 'T-Shirts' },
            { name: 'Blouses' },
            { name: 'Shirts' },
            { name: 'Sweaters' },
            { name: 'Tank Tops' }
          ]
        },
        {
          name: 'Bottoms',
          children: [
            { name: 'Jeans' },
            { name: 'Trousers' },
            { name: 'Skirts' },
            { name: 'Shorts' },
            { name: 'Leggings' }
          ]
        },
        {
          name: 'Dresses',
          children: [
            { name: 'Casual Dresses' },
            { name: 'Evening Dresses' },
            { name: 'Maxi Dresses' },
            { name: 'Midi Dresses' }
          ]
        },
        {
          name: 'Outerwear',
          children: [
            { name: 'Jackets' },
            { name: 'Coats' },
            { name: 'Blazers' },
            { name: 'Cardigans' }
          ]
        }
      ]
    },
    {
      name: 'Footwear',
      isFeatured: true,
      children: [
        { name: 'Heels' },
        { name: 'Flats' },
        { name: 'Boots' },
        { name: 'Sneakers' },
        { name: 'Sandals' }
      ]
    },
    {
      name: 'Accessories',
      isFeatured: true,
      children: [
        { name: 'Bags' },
        { name: 'Jewelry' },
        { name: 'Scarves' },
        { name: 'Belts' },
        { name: 'Hats' }
      ]
    }
  ],
  gents: [
    {
      name: 'Clothing',
      isFeatured: true,
      children: [
        {
          name: 'Tops',
          children: [
            { name: 'T-Shirts' },
            { name: 'Shirts' },
            { name: 'Polo Shirts' },
            { name: 'Sweaters' },
            { name: 'Hoodies' }
          ]
        },
        {
          name: 'Bottoms',
          children: [
            { name: 'Jeans' },
            { name: 'Trousers' },
            { name: 'Chinos' },
            { name: 'Shorts' },
            { name: 'Track Pants' }
          ]
        },
        {
          name: 'Formal Wear',
          children: [
            { name: 'Suits' },
            { name: 'Dress Shirts' },
            { name: 'Dress Trousers' },
            { name: 'Blazers' },
            { name: 'Ties' }
          ]
        },
        {
          name: 'Outerwear',
          children: [
            { name: 'Jackets' },
            { name: 'Coats' },
            { name: 'Bombers' },
            { name: 'Vests' }
          ]
        }
      ]
    },
    {
      name: 'Footwear',
      isFeatured: true,
      children: [
        { name: 'Sneakers' },
        { name: 'Formal Shoes' },
        { name: 'Boots' },
        { name: 'Sandals' },
        { name: 'Sports Shoes' }
      ]
    },
    {
      name: 'Accessories',
      isFeatured: true,
      children: [
        { name: 'Belts' },
        { name: 'Wallets' },
        { name: 'Watches' },
        { name: 'Bags' },
        { name: 'Caps' }
      ]
    }
  ],
  kids: [
    {
      name: 'Clothing',
      isFeatured: true,
      children: [
        {
          name: 'Boys',
          children: [
            { name: 'T-Shirts' },
            { name: 'Shirts' },
            { name: 'Jeans' },
            { name: 'Shorts' },
            { name: 'Jackets' }
          ]
        },
        {
          name: 'Girls',
          children: [
            { name: 'T-Shirts' },
            { name: 'Dresses' },
            { name: 'Jeans' },
            { name: 'Skirts' },
            { name: 'Jackets' }
          ]
        }
      ]
    },
    {
      name: 'Footwear',
      isFeatured: true,
      children: [
        { name: 'Sneakers' },
        { name: 'Sandals' },
        { name: 'Boots' },
        { name: 'School Shoes' }
      ]
    },
    {
      name: 'Accessories',
      isFeatured: true,
      children: [
        { name: 'Bags' },
        { name: 'Caps' },
        { name: 'Belts' }
      ]
    }
  ]
}

async function createCategoryRecursively(
  session: any,
  hierarchy: 'ladies' | 'gents' | 'kids',
  definition: CategoryDefinition,
  parentId: string | null = null
): Promise<string | null> {
  const { name, children, isFeatured = false } = definition

  try {
    // Create the category
    const category = await createCategory(session, name, hierarchy, parentId, isFeatured)

    const indent = '  '.repeat((category.level || 0) + 1)
    console.log(`${indent}✓ Created: ${name} (L${category.level})${isFeatured ? ' [Featured]' : ''}`)

    // Recursively create children
    if (children && children.length > 0) {
      for (const child of children) {
        await createCategoryRecursively(session, hierarchy, child, category.id)
      }
    }

    return category.id
  } catch (error: any) {
    // Category might already exist, skip it
    if (error.message && error.message.includes('already exists')) {
      console.log(`  ⊗ Skipped (already exists): ${name}`)
      return null
    }
    throw error
  }
}

async function setupCategoryHierarchy() {
  const session = getSession()

  try {
    console.log('🏗️  Setting up category hierarchy...\n')

    // Create categories for each hierarchy
    for (const [hierarchy, categories] of Object.entries(CATEGORY_STRUCTURE)) {
      console.log(`\n📦 Creating ${hierarchy.toUpperCase()} hierarchy:`)

      for (const categoryDef of categories) {
        await createCategoryRecursively(
          session,
          hierarchy as 'ladies' | 'gents' | 'kids',
          categoryDef
        )
      }
    }

    // Display final tree
    console.log('\n\n✅ Category hierarchy setup complete!\n')
    console.log('📊 Final category tree:\n')

    const tree = await getCategoryTree(session)

    for (const hierarchy of ['ladies', 'gents', 'kids']) {
      const hierarchyTree = tree.filter(cat => cat.hierarchy === hierarchy)
      if (hierarchyTree.length > 0) {
        console.log(`\n${hierarchy.toUpperCase()} (${hierarchyTree[0].children?.length || 0} top-level categories)`)
        displayTree(hierarchyTree, 1)
      }
    }

    console.log('\n✨ Done! You can now:')
    console.log('   1. View categories in the admin panel at /admin/categories')
    console.log('   2. Assign products to leaf categories')
    console.log('   3. See category filters on the homepage\n')

  } catch (error) {
    console.error('❌ Error setting up category hierarchy:', error)
    throw error
  } finally {
    await session.close()
  }
}

function displayTree(categories: any[], depth: number = 0) {
  const indent = '  '.repeat(depth)

  for (const cat of categories) {
    const productInfo = cat.productCount !== undefined ? ` (${cat.productCount} products)` : ''
    const featuredBadge = cat.isFeatured ? ' ⭐' : ''
    console.log(`${indent}├─ ${cat.name} [L${cat.level}]${featuredBadge}${productInfo}`)

    if (cat.children && cat.children.length > 0) {
      displayTree(cat.children, depth + 1)
    }
  }
}

// Run the script
setupCategoryHierarchy()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
