#!/usr/bin/env tsx

/**
 * Seed Simple Categories
 *
 * Creates a simplified three-hierarchy category system:
 * Ladies -> Gents -> Kids
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'
import { createCategory } from '../src/lib/repositories/category.repository'

interface CategoryDefinition {
  name: string
  hierarchy: 'ladies' | 'gents' | 'kids'
  isFeatured?: boolean
  children?: CategoryDefinition[]
}

const defaultCategories: CategoryDefinition[] = [
  // LADIES HIERARCHY
  {
    name: 'Ladies',
    hierarchy: 'ladies',
    isFeatured: true,
    children: [
      {
        name: 'Clothing',
        hierarchy: 'ladies',
        isFeatured: true,
        children: [
          {
            name: 'Tops',
            hierarchy: 'ladies',
            isFeatured: true,
            children: [
              { name: 'Shirts', hierarchy: 'ladies' },
              { name: 'Blouses', hierarchy: 'ladies' },
              { name: 'T-Shirts', hierarchy: 'ladies' }
            ]
          },
          {
            name: 'Bottoms',
            hierarchy: 'ladies',
            isFeatured: true,
            children: [
              { name: 'Jeans', hierarchy: 'ladies' },
              { name: 'Pants', hierarchy: 'ladies' },
              { name: 'Skirts', hierarchy: 'ladies' }
            ]
          },
          { name: 'Dresses', hierarchy: 'ladies', isFeatured: true },
          { name: 'Outerwear', hierarchy: 'ladies' }
        ]
      },
      {
        name: 'Footwear',
        hierarchy: 'ladies',
        isFeatured: true,
        children: [
          { name: 'Heels', hierarchy: 'ladies' },
          { name: 'Flats', hierarchy: 'ladies' },
          { name: 'Boots', hierarchy: 'ladies' }
        ]
      },
      {
        name: 'Accessories',
        hierarchy: 'ladies',
        children: [
          { name: 'Bags', hierarchy: 'ladies' },
          { name: 'Jewelry', hierarchy: 'ladies' }
        ]
      }
    ]
  },

  // GENTS HIERARCHY
  {
    name: 'Gents',
    hierarchy: 'gents',
    isFeatured: true,
    children: [
      {
        name: 'Clothing',
        hierarchy: 'gents',
        isFeatured: true,
        children: [
          {
            name: 'Tops',
            hierarchy: 'gents',
            isFeatured: true,
            children: [
              { name: 'Shirts', hierarchy: 'gents' },
              { name: 'T-Shirts', hierarchy: 'gents' },
              { name: 'Polo Shirts', hierarchy: 'gents' }
            ]
          },
          {
            name: 'Bottoms',
            hierarchy: 'gents',
            isFeatured: true,
            children: [
              { name: 'Jeans', hierarchy: 'gents' },
              { name: 'Pants', hierarchy: 'gents' },
              { name: 'Shorts', hierarchy: 'gents' }
            ]
          },
          { name: 'Suits', hierarchy: 'gents', isFeatured: true },
          { name: 'Outerwear', hierarchy: 'gents' }
        ]
      },
      {
        name: 'Footwear',
        hierarchy: 'gents',
        isFeatured: true,
        children: [
          { name: 'Formal Shoes', hierarchy: 'gents' },
          { name: 'Sneakers', hierarchy: 'gents' },
          { name: 'Boots', hierarchy: 'gents' }
        ]
      },
      {
        name: 'Accessories',
        hierarchy: 'gents',
        children: [
          { name: 'Watches', hierarchy: 'gents' },
          { name: 'Belts', hierarchy: 'gents' }
        ]
      }
    ]
  },

  // KIDS HIERARCHY
  {
    name: 'Kids',
    hierarchy: 'kids',
    isFeatured: true,
    children: [
      {
        name: 'Girls',
        hierarchy: 'kids',
        isFeatured: true,
        children: [
          { name: 'Dresses', hierarchy: 'kids' },
          { name: 'Tops', hierarchy: 'kids' },
          { name: 'Bottoms', hierarchy: 'kids' }
        ]
      },
      {
        name: 'Boys',
        hierarchy: 'kids',
        isFeatured: true,
        children: [
          { name: 'Tops', hierarchy: 'kids' },
          { name: 'Bottoms', hierarchy: 'kids' },
          { name: 'Outerwear', hierarchy: 'kids' }
        ]
      },
      {
        name: 'Footwear',
        hierarchy: 'kids',
        children: [
          { name: 'Sneakers', hierarchy: 'kids' },
          { name: 'Sandals', hierarchy: 'kids' }
        ]
      }
    ]
  }
]

async function seedCategoriesRecursive(
  session: any,
  categories: CategoryDefinition[],
  parentId: string | null = null
): Promise<void> {
  for (const catDef of categories) {
    const category = await createCategory(
      session,
      catDef.name,
      catDef.hierarchy,
      parentId,
      catDef.isFeatured || false
    )

    console.log(
      `✓ Created: ${catDef.hierarchy}/${catDef.name} (ID: ${category.id}, Level: ${category.level})`
    )

    // Recursively create children
    if (catDef.children && catDef.children.length > 0) {
      await seedCategoriesRecursive(session, catDef.children, category.id)
    }
  }
}

async function main() {
  const session = getSession()

  try {
    console.log('🌱 Seeding simple categories (Ladies/Gents/Kids)...\n')

    // Check if categories already exist
    const checkResult = await session.run('MATCH (c:Category) RETURN count(c) as count')
    const existingCount = checkResult.records[0].get('count').toNumber()

    if (existingCount > 0) {
      console.log(`⚠️  Warning: ${existingCount} categories already exist in the database.`)

      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer: string = await new Promise(resolve => {
        rl.question('Do you want to clear existing categories and reseed? (yes/no): ', resolve)
      })
      rl.close()

      if (answer.toLowerCase() !== 'yes') {
        console.log('Seeding cancelled.')
        return
      }

      console.log('🗑️  Clearing existing categories...')
      await session.run('MATCH (c:Category) DETACH DELETE c')
      console.log('✓ Categories cleared.\n')
    }

    // Seed categories
    await seedCategoriesRecursive(session, defaultCategories)

    console.log('\n✅ Category seeding completed successfully!')

    // Show summary
    const stats = await session.run(`
      MATCH (c:Category)
      RETURN
        count(c) as total,
        sum(CASE WHEN c.hierarchy = 'ladies' THEN 1 ELSE 0 END) as ladies,
        sum(CASE WHEN c.hierarchy = 'gents' THEN 1 ELSE 0 END) as gents,
        sum(CASE WHEN c.hierarchy = 'kids' THEN 1 ELSE 0 END) as kids,
        sum(CASE WHEN c.isFeatured THEN 1 ELSE 0 END) as featured
    `)

    const record = stats.records[0]
    console.log('\n📊 Category Summary:')
    console.log(`   Total: ${record.get('total').toNumber()}`)
    console.log(`   Ladies: ${record.get('ladies').toNumber()}`)
    console.log(`   Gents: ${record.get('gents').toNumber()}`)
    console.log(`   Kids: ${record.get('kids').toNumber()}`)
    console.log(`   Featured: ${record.get('featured').toNumber()}`)

    // Find duplicate names
    const duplicates = await session.run(`
      MATCH (c:Category)
      WITH c.name as name, collect(c.hierarchy) as hierarchies
      WHERE size(hierarchies) > 1
      RETURN name, hierarchies
      ORDER BY name
    `)

    if (duplicates.records.length > 0) {
      console.log('\n🔄 Duplicate category names across hierarchies:')
      duplicates.records.forEach(record => {
        console.log(`   "${record.get('name')}" in: ${record.get('hierarchies').join(', ')}`)
      })
    }
  } catch (error) {
    console.error('❌ Error seeding categories:', error)
    throw error
  } finally {
    await session.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
