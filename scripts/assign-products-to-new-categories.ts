#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'

/**
 * Mapping from old product.category to new Category system
 * Maps: (gender, oldCategory) => [hierarchy, categoryPath]
 */
const categoryMapping: Record<string, Record<string, { hierarchy: string; path: string[] }>> = {
  WOMEN: {
    SHIRT: { hierarchy: 'ladies', path: ['Ladies', 'Clothing', 'Tops', 'Shirts'] },
    DRESS: { hierarchy: 'ladies', path: ['Ladies', 'Dresses'] },
    JACKET: { hierarchy: 'ladies', path: ['Ladies', 'Clothing', 'Outerwear'] },
    PANTS: { hierarchy: 'ladies', path: ['Ladies', 'Clothing', 'Bottoms', 'Pants'] },
    SHOES: { hierarchy: 'ladies', path: ['Ladies', 'Footwear'] },
    ACCESSORIES: { hierarchy: 'ladies', path: ['Ladies', 'Accessories'] },
  },
  MEN: {
    SHIRT: { hierarchy: 'gents', path: ['Gents', 'Clothing', 'Tops', 'Shirts'] },
    JACKET: { hierarchy: 'gents', path: ['Gents', 'Clothing', 'Outerwear'] },
    PANTS: { hierarchy: 'gents', path: ['Gents', 'Clothing', 'Bottoms', 'Pants'] },
    SHOES: { hierarchy: 'gents', path: ['Gents', 'Footwear'] },
    ACCESSORIES: { hierarchy: 'gents', path: ['Gents', 'Accessories'] },
  },
  UNISEX: {
    SHIRT: { hierarchy: 'gents', path: ['Gents', 'Clothing', 'Tops'] },
    JACKET: { hierarchy: 'gents', path: ['Gents', 'Clothing', 'Outerwear'] },
    PANTS: { hierarchy: 'gents', path: ['Gents', 'Clothing', 'Bottoms'] },
    SHOES: { hierarchy: 'gents', path: ['Gents', 'Footwear'] },
    ACCESSORIES: { hierarchy: 'gents', path: ['Gents', 'Accessories'] },
  },
}

async function main() {
  const session = getSession()
  try {
    console.log('🔄 Assigning products to new category system...\n')

    // First, remove all existing HAS_PRODUCT relationships
    console.log('Removing existing category-product relationships...')
    await session.run(`
      MATCH (:Category)-[r:HAS_PRODUCT]->(:Product)
      DELETE r
    `)
    console.log('✓ Existing relationships removed\n')

    // Get all products
    const productsResult = await session.run(`
      MATCH (p:Product)
      RETURN p.id as id, p.name as name, p.category as category, p.gender as gender
    `)

    const products = productsResult.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      category: record.get('category'),
      gender: record.get('gender')
    }))

    console.log(`Found ${products.length} products to assign\n`)

    let assigned = 0
    let skipped = 0
    const errors: string[] = []

    for (const product of products) {
      const gender = product.gender?.toUpperCase() || 'UNISEX'
      const category = product.category?.toUpperCase() || 'UNKNOWN'

      // Get mapping
      const genderMapping = categoryMapping[gender]
      if (!genderMapping) {
        errors.push(`No mapping for gender: ${gender} (${product.name})`)
        skipped++
        continue
      }

      const catMapping = genderMapping[category]
      if (!catMapping) {
        errors.push(`No mapping for ${gender}/${category} (${product.name})`)
        skipped++
        continue
      }

      // Find the category node by following the path
      const targetCategoryName = catMapping.path[catMapping.path.length - 1]

      try {
        // First, find the category and check if it's a leaf (has no children)
        const categoryCheck = await session.run(`
          MATCH (c:Category {name: $name, hierarchy: $hierarchy})
          OPTIONAL MATCH (c)<-[:CHILD_OF]-(child:Category)
          WITH c, count(child) as childCount
          RETURN c.id as categoryId, c.name as categoryName, childCount
        `, {
          name: targetCategoryName,
          hierarchy: catMapping.hierarchy
        })

        if (categoryCheck.records.length === 0) {
          errors.push(`Category not found: ${catMapping.hierarchy}/${targetCategoryName} for ${product.name}`)
          skipped++
          continue
        }

        const catId = categoryCheck.records[0].get('categoryId')
        const catName = categoryCheck.records[0].get('categoryName')
        const childCountRaw = categoryCheck.records[0].get('childCount')
        const childCount = typeof childCountRaw === 'object' && childCountRaw?.toNumber
          ? childCountRaw.toNumber()
          : Number(childCountRaw)

        // Validate that category is a leaf (no children)
        if (childCount > 0) {
          errors.push(
            `Cannot assign "${product.name}" to parent category "${catName}". ` +
            `This category has ${childCount} child ${childCount === 1 ? 'category' : 'categories'}. ` +
            `Please assign to a leaf category.`
          )
          skipped++
          continue
        }

        // Assign product to category
        await session.run(`
          MATCH (c:Category {id: $categoryId})
          MATCH (p:Product {id: $productId})
          MERGE (c)-[:HAS_PRODUCT]->(p)
        `, {
          categoryId: catId,
          productId: product.id
        })

        console.log(`✓ ${product.name} → ${catMapping.hierarchy}/${catName}`)
        assigned++
      } catch (error: any) {
        errors.push(`Error assigning ${product.name}: ${error.message}`)
        skipped++
      }
    }

    // Update product counts for all categories
    console.log('\n📊 Updating product counts...')
    await session.run(`
      MATCH (c:Category)
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)
      WITH c, count(p) as count
      SET c.productCount = count
      RETURN count(c) as totalCategories
    `)
    console.log('✓ Product counts updated\n')

    // Show summary
    console.log('═══════════════════════════════════════')
    console.log('📊 Assignment Summary:')
    console.log('═══════════════════════════════════════')
    console.log(`✅ Successfully assigned: ${assigned}`)
    console.log(`⚠️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      errors.forEach(err => console.log(`   - ${err}`))
    }

    // Show category statistics
    console.log('\n📈 Category Statistics:')
    const stats = await session.run(`
      MATCH (c:Category)
      WHERE c.productCount > 0
      RETURN c.hierarchy as hierarchy, c.name as name, c.level as level, c.productCount as count
      ORDER BY c.hierarchy, c.level, c.name
    `)

    let currentHierarchy = ''
    stats.records.forEach(record => {
      const hierarchy = record.get('hierarchy')
      const name = record.get('name')
      const levelRaw = record.get('level')
      const countRaw = record.get('count')

      // Handle Neo4j Integer objects
      const level = typeof levelRaw === 'object' && levelRaw?.toNumber ? levelRaw.toNumber() : Number(levelRaw)
      const count = typeof countRaw === 'object' && countRaw?.toNumber ? countRaw.toNumber() : Number(countRaw)

      if (hierarchy !== currentHierarchy) {
        console.log(`\n${hierarchy.toUpperCase()}:`)
        currentHierarchy = hierarchy
      }

      const indent = '  '.repeat(level)
      console.log(`${indent}${name}: ${count} products`)
    })

  } catch (error) {
    console.error('❌ Fatal error:', error)
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
