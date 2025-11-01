/**
 * Assign Products to Filters Script
 *
 * Intelligently assigns existing products to appropriate filters based on:
 * - Product gender
 * - Product category
 * - Product brand (for premium items)
 * - Product name/description parsing
 *
 * Run this with: npm run filters:assign
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'
import { getAllFilters, tagProductWithFilters } from '../src/lib/repositories/custom-filter.repository'

interface HierarchyConfig {
  version: string
  description: string
  filters: any[]
  premiumBrands: string[]
  categoryMappings: Record<string, string[]>
  genderMappings: Record<string, string>
  productNamePatterns: Record<string, string[]>
}

interface Product {
  id: string
  name: string
  brand: string
  category?: string
  gender: string
  description: string
}

interface AssignmentStats {
  totalProducts: number
  assignedProducts: number
  unassignedProducts: number
  totalAssignments: number
  assignmentsByFilter: Map<string, number>
}

/**
 * Load the filter hierarchy configuration
 */
function loadConfig(): HierarchyConfig {
  const configPath = resolve(__dirname, '../config/default-filter-hierarchy.json')
  const configData = readFileSync(configPath, 'utf-8')
  return JSON.parse(configData)
}

/**
 * Get all products from the database
 */
async function getAllProducts(session: any): Promise<Product[]> {
  const result = await session.run(`
    MATCH (p:Product)
    RETURN p.id as id,
           p.name as name,
           p.brand as brand,
           p.category as category,
           p.gender as gender,
           p.description as description
    ORDER BY p.createdAt DESC
  `)

  return result.records.map((record: any) => ({
    id: record.get('id'),
    name: record.get('name'),
    brand: record.get('brand'),
    category: record.get('category'),
    gender: record.get('gender'),
    description: record.get('description') || '',
  }))
}

/**
 * Build a filter name to ID map
 */
async function buildFilterMap(session: any): Promise<Map<string, string>> {
  const filters = await getAllFilters(session)
  const filterMap = new Map<string, string>()

  for (const filter of filters) {
    filterMap.set(filter.name, filter.id)
  }

  return filterMap
}

/**
 * Determine which filters a product should be tagged with
 */
function determineFiltersForProduct(
  product: Product,
  config: HierarchyConfig,
  filterMap: Map<string, string>
): string[] {
  const filterNames = new Set<string>()

  // 1. Gender mapping
  if (product.gender && config.genderMappings[product.gender]) {
    const genderFilter = config.genderMappings[product.gender]
    if (filterMap.has(genderFilter)) {
      filterNames.add(genderFilter)
    }
  }

  // 2. Category mapping (legacy category field)
  if (product.category && config.categoryMappings[product.category]) {
    const categoryFilters = config.categoryMappings[product.category]
    for (const filterName of categoryFilters) {
      if (filterMap.has(filterName)) {
        filterNames.add(filterName)
      }
    }
  }

  // 3. Premium brand detection
  if (product.brand && config.premiumBrands.includes(product.brand)) {
    if (filterMap.has('Premium Items')) {
      filterNames.add('Premium Items')
    }
  }

  // 4. Product name pattern matching
  const searchText = `${product.name} ${product.description}`.toLowerCase()

  for (const [pattern, associatedFilters] of Object.entries(config.productNamePatterns)) {
    if (searchText.includes(pattern.toLowerCase())) {
      for (const filterName of associatedFilters) {
        if (filterMap.has(filterName)) {
          filterNames.add(filterName)
        }
      }
    }
  }

  // 5. New arrivals (products created recently - within last 30 days)
  // Note: This requires createdAt to be checked, but we'll add the logic here
  // For now, we'll skip this and let manual assignment handle it

  // Convert filter names to IDs
  const filterIds: string[] = []
  for (const filterName of filterNames) {
    const filterId = filterMap.get(filterName)
    if (filterId) {
      filterIds.push(filterId)
    }
  }

  return filterIds
}

/**
 * Assign products to filters
 */
async function assignProducts(clearExisting: boolean = false): Promise<AssignmentStats> {
  const session = getSession()

  const stats: AssignmentStats = {
    totalProducts: 0,
    assignedProducts: 0,
    unassignedProducts: 0,
    totalAssignments: 0,
    assignmentsByFilter: new Map(),
  }

  try {
    console.log('\n📦 Loading configuration and filters...')
    const config = loadConfig()
    const filterMap = await buildFilterMap(session)
    console.log(`   Found ${filterMap.size} filters`)

    console.log('\n📦 Loading products...')
    const products = await getAllProducts(session)
    stats.totalProducts = products.length
    console.log(`   Found ${products.length} products`)

    if (products.length === 0) {
      console.log('\n⚠️  No products found in database.')
      console.log('   Run "npm run db:seed" to create sample products first.')
      return stats
    }

    // Clear existing assignments if requested
    if (clearExisting) {
      console.log('\n🗑️  Clearing existing product-filter assignments...')
      const clearResult = await session.run(`
        MATCH (p:Product)-[r:TAGGED_WITH]->(:CustomFilter)
        DELETE r
        RETURN count(r) as count
      `)
      const clearedCount = clearResult.records[0]?.get('count')
      console.log(`   Cleared ${typeof clearedCount === 'number' ? clearedCount : clearedCount?.toNumber() || 0} assignments`)
    }

    console.log('\n🏷️  Assigning products to filters...\n')

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const filterIds = determineFiltersForProduct(product, config, filterMap)

      if (filterIds.length > 0) {
        await tagProductWithFilters(session, product.id, filterIds)
        stats.assignedProducts++
        stats.totalAssignments += filterIds.length

        // Track assignments by filter
        for (const filterId of filterIds) {
          const filterName = Array.from(filterMap.entries())
            .find(([_, id]) => id === filterId)?.[0] || 'Unknown'

          stats.assignmentsByFilter.set(
            filterName,
            (stats.assignmentsByFilter.get(filterName) || 0) + 1
          )
        }

        const filterNames = filterIds
          .map(id => Array.from(filterMap.entries()).find(([_, fid]) => fid === id)?.[0])
          .filter(Boolean)

        console.log(`   ✓ [${i + 1}/${products.length}] ${product.name}`)
        console.log(`     → ${filterNames.join(', ')} (${filterIds.length} filters)`)
      } else {
        stats.unassignedProducts++
        console.log(`   ⚠️  [${i + 1}/${products.length}] ${product.name} - No matching filters`)
      }
    }

    console.log(`\n✅ Product assignment complete!`)
    console.log(`   Total products: ${stats.totalProducts}`)
    console.log(`   Assigned products: ${stats.assignedProducts}`)
    console.log(`   Unassigned products: ${stats.unassignedProducts}`)
    console.log(`   Total assignments: ${stats.totalAssignments}`)
    console.log(`   Average filters per product: ${(stats.totalAssignments / stats.assignedProducts).toFixed(2)}`)

  } catch (error) {
    console.error('\n❌ Product assignment failed:', error)
    throw error
  } finally {
    await session.close()
  }

  return stats
}

/**
 * Display detailed statistics
 */
function displayDetailedStats(stats: AssignmentStats): void {
  console.log('\n📊 Assignment Statistics by Filter:\n')

  // Sort by assignment count (descending)
  const sortedFilters = Array.from(stats.assignmentsByFilter.entries())
    .sort((a, b) => b[1] - a[1])

  for (const [filterName, count] of sortedFilters) {
    const percentage = ((count / stats.totalProducts) * 100).toFixed(1)
    const bar = '█'.repeat(Math.ceil((count / stats.totalProducts) * 50))
    console.log(`   ${filterName.padEnd(25)} ${count.toString().padStart(3)} (${percentage.padStart(5)}%) ${bar}`)
  }
}

/**
 * Verify assignments
 */
async function verifyAssignments(): Promise<void> {
  const session = getSession()

  try {
    console.log('\n🔍 Verifying assignments...\n')

    // Products with no filters
    const untaggedResult = await session.run(`
      MATCH (p:Product)
      WHERE NOT (p)-[:TAGGED_WITH]->(:CustomFilter)
      RETURN count(p) as count
    `)
    const untaggedCount = untaggedResult.records[0]?.get('count')
    console.log(`   Products with no filters: ${typeof untaggedCount === 'number' ? untaggedCount : untaggedCount?.toNumber() || 0}`)

    // Products with filters
    const taggedResult = await session.run(`
      MATCH (p:Product)-[:TAGGED_WITH]->(:CustomFilter)
      RETURN count(DISTINCT p) as count
    `)
    const taggedCount = taggedResult.records[0]?.get('count')
    console.log(`   Products with filters: ${typeof taggedCount === 'number' ? taggedCount : taggedCount?.toNumber() || 0}`)

    // Average filters per product
    const avgResult = await session.run(`
      MATCH (p:Product)-[:TAGGED_WITH]->(f:CustomFilter)
      WITH p, count(f) as filterCount
      RETURN avg(filterCount) as avgFilters
    `)
    const avgFilters = avgResult.records[0]?.get('avgFilters')
    if (avgFilters !== null && avgFilters !== undefined) {
      console.log(`   Average filters per product: ${avgFilters.toFixed(2)}`)
    }

    // Filters with no products
    const emptyFiltersResult = await session.run(`
      MATCH (f:CustomFilter)
      WHERE NOT (f)<-[:TAGGED_WITH]-(:Product)
      RETURN f.name as name
      ORDER BY f.name
    `)

    if (emptyFiltersResult.records.length > 0) {
      console.log(`\n   ⚠️  Filters with no products (${emptyFiltersResult.records.length}):`)
      for (const record of emptyFiltersResult.records) {
        console.log(`     - ${record.get('name')}`)
      }
    }

    console.log('\n✅ Verification complete!')

  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Factory Bay - Product Filter Assignment\n')
  console.log('=' .repeat(50))

  try {
    // Check for --clear flag
    const clearExisting = process.argv.includes('--clear')

    if (clearExisting) {
      console.log('\n⚠️  This will clear all existing product-filter assignments.')
    }

    // Assign products
    const stats = await assignProducts(clearExisting)

    // Display detailed statistics
    if (stats.assignedProducts > 0) {
      displayDetailedStats(stats)
    }

    // Verify assignments
    await verifyAssignments()

    await closeDriver()
    console.log('\n✅ All done!')
    console.log('=' .repeat(50))

  } catch (error) {
    console.error('\n❌ Error:', error)
    await closeDriver()
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { assignProducts, verifyAssignments }
