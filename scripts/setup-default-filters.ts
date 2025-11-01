/**
 * Setup Default Filters Script
 *
 * Creates the complete filter hierarchy from the configuration file.
 * Handles multi-parent relationships and ensures idempotency.
 *
 * Run this with: npm run filters:setup
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'
import { createCustomFilter, getAllFilters } from '../src/lib/repositories/custom-filter.repository'

interface FilterConfig {
  name: string
  level: number
  parents: string[]
  description?: string
  category?: string
}

interface HierarchyConfig {
  version: string
  description: string
  filters: FilterConfig[]
  premiumBrands?: string[]
  categoryMappings?: Record<string, string[]>
  genderMappings?: Record<string, string>
  productNamePatterns?: Record<string, string[]>
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
 * Clear all existing filters
 */
async function clearExistingFilters(session: any): Promise<number> {
  const result = await session.run(`
    MATCH (f:CustomFilter)
    DETACH DELETE f
    RETURN count(f) as count
  `)

  const count = result.records[0]?.get('count')
  return typeof count === 'number' ? count : count?.toNumber() || 0
}

/**
 * Create filters in the correct order (by level)
 */
async function createFilters(
  config: HierarchyConfig,
  clearExisting: boolean = false
): Promise<void> {
  const session = getSession()

  try {
    // Step 1: Clear existing filters if requested
    if (clearExisting) {
      console.log('\n🗑️  Clearing existing filters...')
      const deletedCount = await clearExistingFilters(session)
      console.log(`   Deleted ${deletedCount} existing filters`)
    } else {
      // Check if filters already exist
      const existingFilters = await getAllFilters(session)
      if (existingFilters.length > 0) {
        console.log('\n⚠️  Warning: Filters already exist in the database.')
        console.log('   Use --clear flag to remove existing filters first.')
        console.log(`   Found ${existingFilters.length} existing filters.`)
        return
      }
    }

    // Step 2: Sort filters by level to create parents before children
    const sortedFilters = [...config.filters].sort((a, b) => a.level - b.level)

    // Step 3: Create a map to store filter IDs by name
    const filterIdMap = new Map<string, string>()

    // Step 4: Create filters level by level
    console.log('\n📦 Creating filters...\n')

    let createdCount = 0
    const levelGroups = new Map<number, FilterConfig[]>()

    // Group filters by level
    for (const filter of sortedFilters) {
      if (!levelGroups.has(filter.level)) {
        levelGroups.set(filter.level, [])
      }
      levelGroups.get(filter.level)!.push(filter)
    }

    // Create filters level by level
    for (let level = 0; level <= Math.max(...config.filters.map(f => f.level)); level++) {
      const filtersAtLevel = levelGroups.get(level) || []

      if (filtersAtLevel.length === 0) continue

      console.log(`📁 Level ${level}: Creating ${filtersAtLevel.length} filters`)

      for (const filter of filtersAtLevel) {
        // Resolve parent IDs from parent names
        const parentIds: string[] = []
        for (const parentName of filter.parents) {
          const parentId = filterIdMap.get(parentName)
          if (!parentId) {
            console.error(`   ❌ Error: Parent "${parentName}" not found for "${filter.name}"`)
            throw new Error(`Parent "${parentName}" not found for "${filter.name}"`)
          }
          parentIds.push(parentId)
        }

        // Create the filter
        const createdFilter = await createCustomFilter(session, filter.name, parentIds)
        filterIdMap.set(filter.name, createdFilter.id)
        createdCount++

        const parentInfo = parentIds.length > 0
          ? ` (parents: ${filter.parents.join(', ')})`
          : ' (root)'

        console.log(`   ✓ ${filter.name}${parentInfo}`)
      }
    }

    console.log(`\n✅ Filter creation complete!`)
    console.log(`   Total filters created: ${createdCount}`)
    console.log(`   Levels: 0-${Math.max(...config.filters.map(f => f.level))}`)

    // Step 5: Display summary by level
    console.log('\n📊 Summary by level:')
    for (let level = 0; level <= Math.max(...config.filters.map(f => f.level)); level++) {
      const filtersAtLevel = sortedFilters.filter(f => f.level === level)
      if (filtersAtLevel.length > 0) {
        console.log(`   Level ${level}: ${filtersAtLevel.length} filters`)
      }
    }

  } catch (error) {
    console.error('\n❌ Filter creation failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Verify the created hierarchy
 */
async function verifyHierarchy(): Promise<void> {
  const session = getSession()

  try {
    console.log('\n🔍 Verifying hierarchy...\n')

    // Count total filters
    const countResult = await session.run('MATCH (f:CustomFilter) RETURN count(f) as count')
    const totalCount = countResult.records[0]?.get('count')
    console.log(`   Total filters: ${typeof totalCount === 'number' ? totalCount : totalCount.toNumber()}`)

    // Count by level
    const levelResult = await session.run(`
      MATCH (f:CustomFilter)
      RETURN f.level as level, count(f) as count
      ORDER BY level
    `)

    console.log('\n   Filters by level:')
    for (const record of levelResult.records) {
      const level = record.get('level')
      const count = record.get('count')
      console.log(`     Level ${typeof level === 'number' ? level : level.toNumber()}: ${typeof count === 'number' ? count : count.toNumber()} filters`)
    }

    // Check for orphaned filters (filters that should have parents but don't)
    const orphanResult = await session.run(`
      MATCH (f:CustomFilter)
      WHERE f.level > 0 AND NOT (f)-[:CHILD_OF]->()
      RETURN f.name as name, f.level as level
    `)

    if (orphanResult.records.length > 0) {
      console.log('\n   ⚠️  Warning: Found orphaned filters:')
      for (const record of orphanResult.records) {
        console.log(`     - ${record.get('name')} (Level ${record.get('level')})`)
      }
    }

    // Check multi-parent filters
    const multiParentResult = await session.run(`
      MATCH (f:CustomFilter)-[:CHILD_OF]->(p:CustomFilter)
      WITH f, count(p) as parentCount
      WHERE parentCount > 1
      RETURN f.name as name, parentCount
      ORDER BY parentCount DESC
      LIMIT 10
    `)

    if (multiParentResult.records.length > 0) {
      console.log('\n   🔗 Multi-parent filters:')
      for (const record of multiParentResult.records) {
        const name = record.get('name')
        const count = record.get('parentCount')
        console.log(`     - ${name}: ${typeof count === 'number' ? count : count.toNumber()} parents`)
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
  console.log('🚀 Factory Bay - Default Filter Setup\n')
  console.log('=' .repeat(50))

  try {
    // Check for --clear flag
    const clearExisting = process.argv.includes('--clear')

    if (clearExisting) {
      console.log('\n⚠️  WARNING: This will delete all existing filters!')
      console.log('   Proceeding in 3 seconds...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Load configuration
    console.log('\n📖 Loading configuration...')
    const config = loadConfig()
    console.log(`   Version: ${config.version}`)
    console.log(`   Description: ${config.description}`)
    console.log(`   Total filters to create: ${config.filters.length}`)

    // Create filters
    await createFilters(config, clearExisting)

    // Verify hierarchy
    await verifyHierarchy()

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

export { loadConfig, createFilters, verifyHierarchy }
