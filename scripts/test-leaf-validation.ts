#!/usr/bin/env tsx

/**
 * Test Script: Leaf Category Validation
 *
 * This script tests the new validation system that prevents products
 * from being assigned to parent categories (non-leaf categories).
 *
 * Usage:
 *   npm run tsx scripts/test-leaf-validation.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'
import {
  validateLeafCategoryForProduct,
  assignProductToCategories,
  getLeafCategories,
  getCategoryTree
} from '../src/lib/repositories/category.repository'

async function main() {
  const session = getSession()
  try {
    console.log('🧪 Leaf Category Validation Test Suite')
    console.log('═══════════════════════════════════════\n')

    // Test 1: Get all leaf categories
    console.log('Test 1: Get All Leaf Categories')
    console.log('─────────────────────────────────────')
    const leafCategories = await getLeafCategories(session)
    console.log(`Found ${leafCategories.length} leaf categories:\n`)

    const groupedByHierarchy: Record<string, typeof leafCategories> = {
      ladies: [],
      gents: [],
      kids: []
    }

    leafCategories.forEach(cat => {
      groupedByHierarchy[cat.hierarchy]?.push(cat)
    })

    for (const [hierarchy, cats] of Object.entries(groupedByHierarchy)) {
      if (cats.length > 0) {
        console.log(`${hierarchy.toUpperCase()}:`)
        cats.forEach(cat => {
          console.log(`  - ${cat.name} (Level ${cat.level}, ${cat.productCount || 0} products)`)
        })
        console.log('')
      }
    }

    // Test 2: Get category tree and identify parent categories
    console.log('\nTest 2: Identify Parent Categories')
    console.log('─────────────────────────────────────')
    const tree = await getCategoryTree(session)
    const allCategories = [...tree.ladies, ...tree.gents, ...tree.kids]

    function findParentCategories(categories: any[], parents: any[] = []): any[] {
      for (const cat of categories) {
        if (cat.children && cat.children.length > 0) {
          parents.push(cat)
          findParentCategories(cat.children, parents)
        }
      }
      return parents
    }

    const parentCategories = findParentCategories(allCategories)
    console.log(`Found ${parentCategories.length} parent categories:\n`)

    parentCategories.slice(0, 10).forEach(cat => {
      console.log(`  - ${cat.name} (${cat.hierarchy}, Level ${cat.level}, ${cat.children.length} children)`)
    })

    if (parentCategories.length > 10) {
      console.log(`  ... and ${parentCategories.length - 10} more`)
    }
    console.log('')

    // Test 3: Validate leaf categories
    if (leafCategories.length > 0) {
      console.log('\nTest 3: Validate Leaf Categories')
      console.log('─────────────────────────────────────')
      const sampleLeaf = leafCategories[0]
      const validation = await validateLeafCategoryForProduct(session, sampleLeaf.id)

      console.log(`Testing: "${sampleLeaf.name}" (${sampleLeaf.hierarchy})`)
      console.log(`Result: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`)
      if (validation.error) {
        console.log(`Error: ${validation.error}`)
      }
      console.log('')
    }

    // Test 4: Validate parent categories (should fail)
    if (parentCategories.length > 0) {
      console.log('\nTest 4: Validate Parent Categories (Should Fail)')
      console.log('─────────────────────────────────────')
      const sampleParent = parentCategories[0]
      const validation = await validateLeafCategoryForProduct(session, sampleParent.id)

      console.log(`Testing: "${sampleParent.name}" (${sampleParent.hierarchy})`)
      console.log(`Result: ${validation.valid ? '✅ VALID' : '❌ INVALID (Expected)'}`)
      if (validation.error) {
        console.log(`Error: ${validation.error}`)
      }
      console.log('')
    }

    // Test 5: Attempt to assign product to parent category
    console.log('\nTest 5: Attempt Product Assignment to Parent')
    console.log('─────────────────────────────────────')

    // Get a test product
    const productResult = await session.run(
      `MATCH (p:Product)
       RETURN p.id as id, p.name as name
       LIMIT 1`
    )

    if (productResult.records.length > 0 && parentCategories.length > 0) {
      const testProduct = {
        id: productResult.records[0].get('id'),
        name: productResult.records[0].get('name')
      }
      const testParent = parentCategories[0]

      console.log(`Attempting to assign "${testProduct.name}" to parent category "${testParent.name}"...`)

      try {
        await assignProductToCategories(session, testProduct.id, [testParent.id])
        console.log('❌ ERROR: Assignment succeeded when it should have failed!')
      } catch (error: any) {
        console.log('✅ Assignment correctly rejected!')
        console.log(`   Error message: ${error.message}`)
      }
      console.log('')
    } else {
      console.log('⚠️  Skipped: No test product or parent category available')
      console.log('')
    }

    // Test 6: Successful assignment to leaf category
    console.log('\nTest 6: Successful Product Assignment to Leaf')
    console.log('─────────────────────────────────────')

    if (productResult.records.length > 0 && leafCategories.length > 0) {
      const testProduct = {
        id: productResult.records[0].get('id'),
        name: productResult.records[0].get('name')
      }
      const testLeaf = leafCategories[0]

      console.log(`Attempting to assign "${testProduct.name}" to leaf category "${testLeaf.name}"...`)

      try {
        await assignProductToCategories(session, testProduct.id, [testLeaf.id])
        console.log('✅ Assignment successful!')

        // Verify assignment
        const verifyResult = await session.run(
          `MATCH (p:Product {id: $productId})-[:HAS_CATEGORY]->(c:Category {id: $categoryId})
           RETURN count(*) as count`,
          { productId: testProduct.id, categoryId: testLeaf.id }
        )

        const countRaw = verifyResult.records[0].get('count')
        const count = typeof countRaw === 'object' && countRaw?.toNumber
          ? countRaw.toNumber()
          : Number(countRaw)

        console.log(`   Verified: ${count > 0 ? 'Relationship exists ✓' : 'Relationship missing ✗'}`)
      } catch (error: any) {
        console.log(`❌ Assignment failed: ${error.message}`)
      }
      console.log('')
    } else {
      console.log('⚠️  Skipped: No test product or leaf category available')
      console.log('')
    }

    // Test Summary
    console.log('\n═══════════════════════════════════════')
    console.log('📊 Test Summary')
    console.log('═══════════════════════════════════════')
    console.log(`Total Categories: ${leafCategories.length + parentCategories.length}`)
    console.log(`Leaf Categories (can accept products): ${leafCategories.length}`)
    console.log(`Parent Categories (cannot accept products): ${parentCategories.length}`)
    console.log('')
    console.log('✅ All validation tests completed!')

    // Show categories with products assigned to parents (if any)
    console.log('\n🔍 Checking for existing invalid assignments...')
    const invalidAssignments = await session.run(
      `MATCH (c:Category)<-[:CHILD_OF]-(child:Category)
       MATCH (c)-[:HAS_PRODUCT]->(p:Product)
       WITH c, count(DISTINCT child) as childCount, collect(DISTINCT p.name)[0..5] as sampleProducts,
            count(DISTINCT p) as productCount
       WHERE childCount > 0
       RETURN c.name as categoryName, c.hierarchy as hierarchy, c.level as level,
              childCount, productCount, sampleProducts
       ORDER BY productCount DESC
       LIMIT 10`
    )

    if (invalidAssignments.records.length > 0) {
      console.log('\n⚠️  WARNING: Found parent categories with products assigned:')
      invalidAssignments.records.forEach(record => {
        const catName = record.get('categoryName')
        const hierarchy = record.get('hierarchy')
        const level = record.get('level')
        const childCountRaw = record.get('childCount')
        const childCount = typeof childCountRaw === 'object' && childCountRaw?.toNumber
          ? childCountRaw.toNumber()
          : Number(childCountRaw)
        const productCountRaw = record.get('productCount')
        const productCount = typeof productCountRaw === 'object' && productCountRaw?.toNumber
          ? productCountRaw.toNumber()
          : Number(productCountRaw)
        const sampleProducts = record.get('sampleProducts')

        console.log(`\n   "${catName}" (${hierarchy}, Level ${level})`)
        console.log(`   - Has ${childCount} children but ${productCount} products assigned!`)
        if (sampleProducts.length > 0) {
          console.log(`   - Sample products: ${sampleProducts.join(', ')}`)
        }
      })
      console.log('\n   These should be migrated to leaf categories using:')
      console.log('   npm run tsx scripts/migrate-product-to-leaf.ts')
    } else {
      console.log('✅ No invalid assignments found!')
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
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
