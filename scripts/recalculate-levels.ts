/**
 * Recalculate Filter Levels Script
 *
 * Recalculates all filter levels in the hierarchy based on parent relationships.
 * - Root filters (no parents) are set to level 0
 * - Child filters are set to max(parent levels) + 1
 * - Iterates until no more updates are needed (max 20 iterations)
 * - Tries APOC procedure first, falls back to manual iteration if not available
 *
 * Run this with: npm run filters:recalculate-levels
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'

interface LevelUpdateStats {
  iteration: number
  updatedCount: number
  totalFilters: number
}

/**
 * Check if APOC is available
 */
async function isApocAvailable(session: any): Promise<boolean> {
  try {
    const result = await session.run('RETURN apoc.version() as version')
    const version = result.records[0]?.get('version')
    return !!version
  } catch (error) {
    return false
  }
}

/**
 * Recalculate levels using APOC (if available)
 */
async function recalculateLevelsWithApoc(session: any): Promise<boolean> {
  console.log('  Attempting to use APOC for level calculation...')

  try {
    // Use APOC's path finding to calculate levels efficiently
    const query = `
      CALL apoc.periodic.iterate(
        "MATCH (f:CustomFilter) RETURN f",
        "
          OPTIONAL MATCH path = (f)-[:CHILD_OF*]->(root:CustomFilter)
          WHERE NOT (root)-[:CHILD_OF]->()
          WITH f, CASE WHEN path IS NULL THEN 0 ELSE length(path) END as calculatedLevel
          SET f.level = calculatedLevel,
              f.updatedAt = datetime().epochMillis
        ",
        {batchSize: 100, parallel: false}
      )
      YIELD batches, total, errorMessages
      RETURN batches, total, errorMessages
    `

    const result = await session.run(query)
    const record = result.records[0]
    const total = record.get('total')
    const errorMessages = record.get('errorMessages')

    if (errorMessages && errorMessages.length > 0) {
      console.log('  ⚠️  APOC encountered errors:', errorMessages)
      return false
    }

    console.log(`  ✅ APOC updated ${typeof total === 'number' ? total : total.toNumber()} filters`)
    return true
  } catch (error: any) {
    console.log('  ⚠️  APOC not available or failed:', error.message)
    return false
  }
}

/**
 * Set root filters (no parents) to level 0
 */
async function setRootLevels(session: any): Promise<number> {
  const query = `
    MATCH (f:CustomFilter)
    WHERE NOT (f)-[:CHILD_OF]->()
    SET f.level = 0,
        f.updatedAt = datetime().epochMillis
    RETURN count(f) as count
  `

  const result = await session.run(query)
  const count = result.records[0]?.get('count')
  return typeof count === 'number' ? count : count?.toNumber() || 0
}

/**
 * Update child levels based on parent levels (one iteration)
 */
async function updateChildLevels(session: any): Promise<number> {
  const query = `
    MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
    WITH child, max(parent.level) as maxParentLevel
    WHERE child.level <> maxParentLevel + 1
    SET child.level = maxParentLevel + 1,
        child.updatedAt = datetime().epochMillis
    RETURN count(child) as count
  `

  const result = await session.run(query)
  const count = result.records[0]?.get('count')
  return typeof count === 'number' ? count : count?.toNumber() || 0
}

/**
 * Get total filter count
 */
async function getTotalFilterCount(session: any): Promise<number> {
  const result = await session.run('MATCH (f:CustomFilter) RETURN count(f) as count')
  const count = result.records[0]?.get('count')
  return typeof count === 'number' ? count : count?.toNumber() || 0
}

/**
 * Get level distribution
 */
async function getLevelDistribution(session: any): Promise<Map<number, number>> {
  const query = `
    MATCH (f:CustomFilter)
    RETURN f.level as level, count(f) as count
    ORDER BY level
  `

  const result = await session.run(query)
  const distribution = new Map<number, number>()

  for (const record of result.records) {
    const level = record.get('level')
    const count = record.get('count')
    const levelNum = typeof level === 'number' ? level : level.toNumber()
    const countNum = typeof count === 'number' ? count : count.toNumber()
    distribution.set(levelNum, countNum)
  }

  return distribution
}

/**
 * Recalculate levels manually (iterative approach)
 */
async function recalculateLevelsManually(session: any): Promise<LevelUpdateStats[]> {
  console.log('  Using manual iterative approach...\n')

  const stats: LevelUpdateStats[] = []
  const maxIterations = 20
  const totalFilters = await getTotalFilterCount(session)

  // First, set all root filters to level 0
  console.log('  Step 1: Setting root filter levels...')
  const rootCount = await setRootLevels(session)
  console.log(`    ✅ Set ${rootCount} root filters to level 0\n`)

  // Then iteratively update child levels
  console.log('  Step 2: Updating child filter levels...')
  let iteration = 1
  let updatedCount = 0

  do {
    updatedCount = await updateChildLevels(session)

    stats.push({
      iteration,
      updatedCount,
      totalFilters
    })

    if (updatedCount > 0) {
      console.log(`    Iteration ${iteration}: Updated ${updatedCount} filters`)
    }

    iteration++

    if (iteration > maxIterations) {
      console.log(`\n  ⚠️  Warning: Reached maximum iterations (${maxIterations})`)
      console.log('     This might indicate a cycle in the hierarchy')
      break
    }
  } while (updatedCount > 0)

  console.log(`\n  ✅ Completed in ${iteration - 1} iterations`)

  return stats
}

/**
 * Display level distribution
 */
function displayLevelDistribution(distribution: Map<number, number>): void {
  console.log('\n📊 Level Distribution:')
  console.log('-'.repeat(50))

  const maxLevel = Math.max(...Array.from(distribution.keys()))
  let totalFilters = 0

  for (let level = 0; level <= maxLevel; level++) {
    const count = distribution.get(level) || 0
    totalFilters += count

    // Create a simple bar chart
    const barLength = Math.ceil((count / Math.max(...Array.from(distribution.values()))) * 30)
    const bar = '█'.repeat(barLength)

    console.log(`  Level ${level}: ${count.toString().padStart(4)} filters ${bar}`)
  }

  console.log('-'.repeat(50))
  console.log(`  Total:  ${totalFilters.toString().padStart(4)} filters\n`)
}

/**
 * Main recalculation function
 */
async function recalculateLevels(): Promise<void> {
  const session = getSession()

  try {
    console.log('\n🔧 Recalculating filter levels...\n')

    // Get initial state
    const totalFilters = await getTotalFilterCount(session)
    console.log(`  Total filters in database: ${totalFilters}`)

    if (totalFilters === 0) {
      console.log('\n  ⚠️  No filters found in database. Nothing to recalculate.')
      return
    }

    console.log('\n📐 Starting level recalculation...\n')

    // Try APOC first
    const apocSuccess = await recalculateLevelsWithApoc(session)

    // If APOC not available or failed, use manual approach
    if (!apocSuccess) {
      await recalculateLevelsManually(session)
    }

    // Display final distribution
    const distribution = await getLevelDistribution(session)
    displayLevelDistribution(distribution)

    console.log('✅ Level recalculation complete!')

    // Verify results
    console.log('\n🔍 Verifying results...')

    // Check for any remaining inconsistencies
    const verifyQuery = `
      MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
      WHERE parent.level >= child.level
      RETURN count(child) as count
    `

    const verifyResult = await session.run(verifyQuery)
    const inconsistentCount = verifyResult.records[0]?.get('count')
    const inconsistentNum = typeof inconsistentCount === 'number' ? inconsistentCount : inconsistentCount?.toNumber() || 0

    if (inconsistentNum > 0) {
      console.log(`  ⚠️  Warning: Found ${inconsistentNum} filters with level inconsistencies`)
      console.log('     This might indicate cycles in the hierarchy')
      console.log('     Run "npm run filters:validate" for detailed analysis')
    } else {
      console.log('  ✅ All filters have consistent levels')
    }

  } catch (error) {
    console.error('\n❌ Level recalculation failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Factory Bay - Filter Level Recalculator\n')
  console.log('='.repeat(60))

  try {
    await recalculateLevels()
    await closeDriver()

    console.log('\n' + '='.repeat(60))
    console.log('✅ All done!\n')
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

export { recalculateLevels, setRootLevels, updateChildLevels, getLevelDistribution }
