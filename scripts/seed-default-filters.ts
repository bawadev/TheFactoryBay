/**
 * Seed Default Filters Script
 *
 * Seeds the default filter hierarchy from the backup configuration file.
 * - Reads from config/default-filter-hierarchy.json.backup
 * - Checks if filters already exist and warns user
 * - Sorts filters by level before creating (roots first)
 * - Creates filters with their parent relationships
 * - Validates hierarchy after seeding
 *
 * Run this with: npm run filters:seed
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

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
  isFeatured?: boolean
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
 * Load the backup filter hierarchy configuration
 */
function loadBackupConfig(): HierarchyConfig {
  const backupConfigPath = resolve(__dirname, '../config/default-filter-hierarchy.json.backup')

  if (!existsSync(backupConfigPath)) {
    throw new Error(`Backup configuration file not found at: ${backupConfigPath}`)
  }

  const configData = readFileSync(backupConfigPath, 'utf-8')
  return JSON.parse(configData)
}

/**
 * Count existing filters
 */
async function countExistingFilters(session: any): Promise<number> {
  const result = await session.run('MATCH (f:CustomFilter) RETURN count(f) as count')
  const count = result.records[0]?.get('count')
  return typeof count === 'number' ? count : count?.toNumber() || 0
}

/**
 * Clear all existing filters
 */
async function clearAllFilters(session: any): Promise<number> {
  console.log('\n🗑️  Clearing existing filters...')

  const result = await session.run(`
    MATCH (f:CustomFilter)
    DETACH DELETE f
    RETURN count(f) as count
  `)

  const count = result.records[0]?.get('count')
  const deletedCount = typeof count === 'number' ? count : count?.toNumber() || 0

  console.log(`   ✅ Deleted ${deletedCount} filters`)

  return deletedCount
}

/**
 * Seed filters from configuration
 */
async function seedFilters(
  config: HierarchyConfig,
  clearExisting: boolean = false
): Promise<void> {
  const session = getSession()

  try {
    // Step 1: Check for existing filters
    const existingCount = await countExistingFilters(session)

    if (existingCount > 0) {
      if (clearExisting) {
        console.log(`\n⚠️  Found ${existingCount} existing filters`)
        await clearAllFilters(session)
      } else {
        console.log(`\n⚠️  Warning: Database already contains ${existingCount} filters`)
        console.log('   Use --clear flag to remove existing filters first')
        console.log('\n   Skipping seed operation to prevent duplicates.')
        return
      }
    }

    // Step 2: Sort filters by level (roots first)
    console.log('\n📦 Preparing filters for creation...')
    const sortedFilters = [...config.filters].sort((a, b) => {
      // Sort by level first, then by name for consistent ordering
      if (a.level !== b.level) {
        return a.level - b.level
      }
      return a.name.localeCompare(b.name)
    })

    console.log(`   Total filters to create: ${sortedFilters.length}`)

    // Get level statistics
    const levelCounts = new Map<number, number>()
    sortedFilters.forEach(f => {
      levelCounts.set(f.level, (levelCounts.get(f.level) || 0) + 1)
    })

    console.log('   Filters by level:')
    Array.from(levelCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, count]) => {
        console.log(`     Level ${level}: ${count} filters`)
      })

    // Step 3: Create a map to store filter IDs by name
    const filterIdMap = new Map<string, string>()

    // Step 4: Create filters level by level
    console.log('\n🌱 Seeding filters...\n')

    let createdCount = 0
    const maxLevel = Math.max(...config.filters.map(f => f.level))

    for (let currentLevel = 0; currentLevel <= maxLevel; currentLevel++) {
      const filtersAtLevel = sortedFilters.filter(f => f.level === currentLevel)

      if (filtersAtLevel.length === 0) continue

      console.log(`📁 Level ${currentLevel}: Creating ${filtersAtLevel.length} filters`)

      for (const filter of filtersAtLevel) {
        try {
          // Resolve parent IDs from parent names
          const parentIds: string[] = []
          for (const parentName of filter.parents) {
            const parentId = filterIdMap.get(parentName)
            if (!parentId) {
              throw new Error(`Parent filter "${parentName}" not found for "${filter.name}"`)
            }
            parentIds.push(parentId)
          }

          // Create the filter
          const isFeatured = filter.isFeatured || false
          const createdFilter = await createCustomFilter(session, filter.name, parentIds, isFeatured)

          // Store the ID in the map
          filterIdMap.set(filter.name, createdFilter.id)
          createdCount++

          // Format output
          const parentInfo = parentIds.length > 0
            ? ` (parents: ${filter.parents.join(', ')})`
            : ' (root)'
          const featuredInfo = isFeatured ? ' ⭐' : ''

          console.log(`   ✅ ${filter.name}${parentInfo}${featuredInfo}`)
        } catch (error: any) {
          console.error(`   ❌ Failed to create "${filter.name}": ${error.message}`)
          throw error
        }
      }

      console.log('')
    }

    console.log(`✅ Filter seeding complete!`)
    console.log(`   Total filters created: ${createdCount}`)
    console.log(`   Levels: 0-${maxLevel}`)

    // Step 5: Display featured filters
    const featuredFilters = config.filters.filter(f => f.isFeatured)
    if (featuredFilters.length > 0) {
      console.log(`\n⭐ Featured filters: ${featuredFilters.length}`)
      console.log('   Featured filter names:')
      featuredFilters
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        .forEach(f => {
          console.log(`     - ${f.name} (Level ${f.level})`)
        })
    }

  } catch (error) {
    console.error('\n❌ Filter seeding failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Validate the seeded hierarchy
 */
async function validateSeededHierarchy(): Promise<boolean> {
  const session = getSession()

  try {
    console.log('\n🔍 Validating seeded hierarchy...\n')

    let isValid = true

    // Check 1: Total filter count
    const countResult = await session.run('MATCH (f:CustomFilter) RETURN count(f) as count')
    const totalCount = countResult.records[0]?.get('count')
    const totalFilters = typeof totalCount === 'number' ? totalCount : totalCount.toNumber()
    console.log(`   Total filters: ${totalFilters}`)

    // Check 2: Root filters (level 0, no parents)
    const rootResult = await session.run(`
      MATCH (f:CustomFilter)
      WHERE f.level = 0 AND NOT (f)-[:CHILD_OF]->()
      RETURN count(f) as count
    `)
    const rootCount = rootResult.records[0]?.get('count')
    const rootFilters = typeof rootCount === 'number' ? rootCount : rootCount.toNumber()
    console.log(`   Root filters: ${rootFilters}`)

    // Check 3: Orphaned filters (level > 0 but no parents)
    const orphanResult = await session.run(`
      MATCH (f:CustomFilter)
      WHERE f.level > 0 AND NOT (f)-[:CHILD_OF]->()
      RETURN count(f) as count, collect(f.name)[0..5] as examples
    `)
    const orphanCount = orphanResult.records[0]?.get('count')
    const orphanedFilters = typeof orphanCount === 'number' ? orphanCount : orphanCount.toNumber()

    if (orphanedFilters > 0) {
      const examples = orphanResult.records[0]?.get('examples')
      console.log(`   ❌ Orphaned filters: ${orphanedFilters}`)
      console.log(`      Examples: ${examples.join(', ')}`)
      isValid = false
    } else {
      console.log(`   ✅ Orphaned filters: 0`)
    }

    // Check 4: Level inconsistencies
    const levelCheckResult = await session.run(`
      MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
      WHERE parent.level >= child.level
      RETURN count(child) as count
    `)
    const levelIssues = levelCheckResult.records[0]?.get('count')
    const levelIssueCount = typeof levelIssues === 'number' ? levelIssues : levelIssues.toNumber()

    if (levelIssueCount > 0) {
      console.log(`   ❌ Level inconsistencies: ${levelIssueCount}`)
      isValid = false
    } else {
      console.log(`   ✅ Level consistency: Valid`)
    }

    // Check 5: Cycles
    const cycleCheckResult = await session.run(`
      MATCH path = (f:CustomFilter)-[:CHILD_OF*1..20]->(f)
      RETURN count(DISTINCT f) as count
      LIMIT 1
    `)
    const cycleCount = cycleCheckResult.records[0]?.get('count')
    const cyclesFound = typeof cycleCount === 'number' ? cycleCount : cycleCount.toNumber()

    if (cyclesFound > 0) {
      console.log(`   ❌ Cycles detected: ${cyclesFound}`)
      isValid = false
    } else {
      console.log(`   ✅ Cycles: None detected`)
    }

    // Check 6: Level distribution
    const levelDistResult = await session.run(`
      MATCH (f:CustomFilter)
      RETURN f.level as level, count(f) as count
      ORDER BY level
    `)

    console.log('\n   Level distribution:')
    for (const record of levelDistResult.records) {
      const level = record.get('level')
      const count = record.get('count')
      const levelNum = typeof level === 'number' ? level : level.toNumber()
      const countNum = typeof count === 'number' ? count : count.toNumber()
      console.log(`     Level ${levelNum}: ${countNum} filters`)
    }

    console.log('')

    if (isValid) {
      console.log('✅ Validation passed! Hierarchy is valid.\n')
    } else {
      console.log('❌ Validation failed. Please check the issues above.\n')
      console.log('Suggested fixes:')
      console.log('  - Run "npm run filters:recalculate-levels" to fix level issues')
      console.log('  - Run "npm run filters:validate" for detailed analysis\n')
    }

    return isValid

  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    return false
  } finally {
    await session.close()
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Factory Bay - Seed Default Filters\n')
  console.log('='.repeat(60))

  try {
    // Check for --clear flag
    const clearExisting = process.argv.includes('--clear')

    if (clearExisting) {
      console.log('\n⚠️  WARNING: This will delete all existing filters!')
      console.log('   Proceeding in 3 seconds...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Load backup configuration
    console.log('\n📖 Loading backup configuration...')
    const config = loadBackupConfig()
    console.log(`   Version: ${config.version}`)
    console.log(`   Description: ${config.description}`)
    console.log(`   Total filters in config: ${config.filters.length}`)

    // Seed filters
    await seedFilters(config, clearExisting)

    // Validate seeded hierarchy
    const isValid = await validateSeededHierarchy()

    await closeDriver()

    console.log('='.repeat(60))

    if (isValid) {
      console.log('✅ All done! Filters seeded successfully.\n')
    } else {
      console.log('⚠️  Done with warnings. Please review validation results.\n')
      process.exit(1)
    }

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

export { loadBackupConfig, seedFilters, validateSeededHierarchy }
