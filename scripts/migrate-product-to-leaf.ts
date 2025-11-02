#!/usr/bin/env tsx

/**
 * Migration Helper Script: Move Product from Parent Category to Leaf Category
 *
 * Usage:
 *   npm run tsx scripts/migrate-product-to-leaf.ts <productId> <fromCategoryId> <toCategoryId>
 *
 * Example:
 *   npm run tsx scripts/migrate-product-to-leaf.ts prod-123 cat-parent cat-leaf
 *
 * This script helps migrate products that were incorrectly assigned to parent categories
 * to appropriate leaf categories (categories without children).
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 3) {
    console.error('❌ Invalid arguments')
    console.log('\nUsage:')
    console.log('  npm run tsx scripts/migrate-product-to-leaf.ts <productId> <fromCategoryId> <toCategoryId>')
    console.log('\nExample:')
    console.log('  npm run tsx scripts/migrate-product-to-leaf.ts prod-123 cat-parent cat-leaf')
    console.log('\nDescription:')
    console.log('  - productId: The ID of the product to migrate')
    console.log('  - fromCategoryId: The current (parent) category ID')
    console.log('  - toCategoryId: The target leaf category ID (must have no children)')
    process.exit(1)
  }

  const [productId, fromCategoryId, toCategoryId] = args

  const session = getSession()
  try {
    console.log('🔄 Product Migration to Leaf Category')
    console.log('═══════════════════════════════════════\n')

    // Step 1: Validate product exists
    console.log('📦 Validating product...')
    const productResult = await session.run(
      `MATCH (p:Product {id: $productId})
       RETURN p.name as name, p.id as id`,
      { productId }
    )

    if (productResult.records.length === 0) {
      console.error(`❌ Product with ID "${productId}" not found`)
      process.exit(1)
    }

    const productName = productResult.records[0].get('name')
    console.log(`✓ Product found: "${productName}" (${productId})\n`)

    // Step 2: Validate source category
    console.log('📂 Validating source category...')
    const fromCategoryResult = await session.run(
      `MATCH (c:Category {id: $categoryId})
       OPTIONAL MATCH (c)<-[:CHILD_OF]-(child:Category)
       OPTIONAL MATCH (p:Product {id: $productId})-[:HAS_CATEGORY]->(c)
       WITH c, count(DISTINCT child) as childCount, count(p) > 0 as hasProduct
       RETURN c.name as name, c.hierarchy as hierarchy, c.level as level,
              childCount, hasProduct`,
      { categoryId: fromCategoryId, productId }
    )

    if (fromCategoryResult.records.length === 0) {
      console.error(`❌ Source category with ID "${fromCategoryId}" not found`)
      process.exit(1)
    }

    const fromRecord = fromCategoryResult.records[0]
    const fromName = fromRecord.get('name')
    const fromHierarchy = fromRecord.get('hierarchy')
    const fromLevel = fromRecord.get('level')
    const fromChildCountRaw = fromRecord.get('childCount')
    const fromChildCount = typeof fromChildCountRaw === 'object' && fromChildCountRaw?.toNumber
      ? fromChildCountRaw.toNumber()
      : Number(fromChildCountRaw)
    const hasProductInFrom = fromRecord.get('hasProduct')

    console.log(`✓ Source: "${fromName}" (${fromHierarchy}, Level ${fromLevel})`)
    console.log(`  - Has ${fromChildCount} child ${fromChildCount === 1 ? 'category' : 'categories'}`)

    if (!hasProductInFrom) {
      console.log(`⚠️  Warning: Product "${productName}" is not assigned to this category`)
      console.log('   Continuing anyway...')
    }
    console.log('')

    // Step 3: Validate target category is a leaf
    console.log('🎯 Validating target category...')
    const toCategoryResult = await session.run(
      `MATCH (c:Category {id: $categoryId})
       OPTIONAL MATCH (c)<-[:CHILD_OF]-(child:Category)
       WITH c, count(child) as childCount
       RETURN c.name as name, c.hierarchy as hierarchy, c.level as level, childCount`,
      { categoryId: toCategoryId }
    )

    if (toCategoryResult.records.length === 0) {
      console.error(`❌ Target category with ID "${toCategoryId}" not found`)
      process.exit(1)
    }

    const toRecord = toCategoryResult.records[0]
    const toName = toRecord.get('name')
    const toHierarchy = toRecord.get('hierarchy')
    const toLevel = toRecord.get('level')
    const toChildCountRaw = toRecord.get('childCount')
    const toChildCount = typeof toChildCountRaw === 'object' && toChildCountRaw?.toNumber
      ? toChildCountRaw.toNumber()
      : Number(toChildCountRaw)

    console.log(`✓ Target: "${toName}" (${toHierarchy}, Level ${toLevel})`)

    // CRITICAL: Validate target is a leaf category
    if (toChildCount > 0) {
      console.error(`\n❌ VALIDATION FAILED: Target category "${toName}" is not a leaf category!`)
      console.error(`   It has ${toChildCount} child ${toChildCount === 1 ? 'category' : 'categories'}.`)
      console.error(`\n   Products can ONLY be assigned to leaf categories (categories without children).`)
      console.error(`   Please select a different target category that has no children.`)
      process.exit(1)
    }

    console.log('✓ Target is a leaf category (no children)\n')

    // Step 4: Confirm migration
    console.log('📋 Migration Summary:')
    console.log(`   Product: "${productName}"`)
    console.log(`   From:    "${fromName}" (${fromHierarchy})`)
    console.log(`   To:      "${toName}" (${toHierarchy})`)
    console.log('')

    // Step 5: Perform migration
    console.log('🔄 Performing migration...')

    // Remove old relationship (if exists)
    await session.run(
      `MATCH (p:Product {id: $productId})-[r:HAS_CATEGORY]->(c:Category {id: $fromCategoryId})
       DELETE r`,
      { productId, fromCategoryId }
    )

    // Create new relationship
    await session.run(
      `MATCH (p:Product {id: $productId})
       MATCH (c:Category {id: $toCategoryId})
       MERGE (p)-[:HAS_CATEGORY]->(c)`,
      { productId, toCategoryId }
    )

    console.log('✓ Migration completed successfully!\n')

    // Step 6: Show updated product assignments
    console.log('📊 Current product category assignments:')
    const assignmentsResult = await session.run(
      `MATCH (p:Product {id: $productId})-[:HAS_CATEGORY]->(c:Category)
       RETURN c.name as categoryName, c.hierarchy as hierarchy, c.level as level
       ORDER BY c.hierarchy, c.level`,
      { productId }
    )

    assignmentsResult.records.forEach(record => {
      const catName = record.get('categoryName')
      const hierarchy = record.get('hierarchy')
      const level = record.get('level')
      console.log(`   - ${catName} (${hierarchy}, Level ${level})`)
    })

    console.log('\n✅ Migration complete!')

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
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
