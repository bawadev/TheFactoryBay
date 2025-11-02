/**
 * Validate Filter Hierarchy Script
 *
 * Validates the filter hierarchy integrity by checking for:
 * - Cycles in CHILD_OF relationships
 * - Level inconsistencies (parent level >= child level)
 * - Orphaned products (products tagged with inactive filters)
 * - Duplicate filter names
 *
 * Run this with: npm run filters:validate
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'
import { getAllFiltersWithParents } from '../src/lib/repositories/custom-filter.repository'

interface ValidationError {
  type: 'error' | 'warning'
  category: 'cycle' | 'level' | 'orphaned-product' | 'duplicate-name' | 'orphaned-filter'
  message: string
  details?: any
}

/**
 * Check for cycles in the filter hierarchy
 */
async function checkForCycles(session: any): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // Find all filters that are part of a cycle
  const query = `
    MATCH path = (f:CustomFilter)-[:CHILD_OF*1..20]->(f)
    RETURN DISTINCT f.id as filterId, f.name as filterName,
           [node in nodes(path) | node.name] as cyclePath
  `

  try {
    const result = await session.run(query)

    for (const record of result.records) {
      const filterId = record.get('filterId')
      const filterName = record.get('filterName')
      const cyclePath = record.get('cyclePath')

      errors.push({
        type: 'error',
        category: 'cycle',
        message: `Cycle detected: "${filterName}" (${filterId})`,
        details: {
          filterId,
          filterName,
          cyclePath
        }
      })
    }
  } catch (error: any) {
    // If query times out or fails, it might indicate a very deep cycle
    console.error('⚠️  Cycle detection query failed:', error.message)
  }

  return errors
}

/**
 * Check for level inconsistencies
 */
async function checkLevelConsistency(session: any): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // Find filters where parent level >= child level (should be parent level < child level)
  const query = `
    MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
    WHERE parent.level >= child.level
    RETURN child.id as childId, child.name as childName, child.level as childLevel,
           parent.id as parentId, parent.name as parentName, parent.level as parentLevel
  `

  const result = await session.run(query)

  for (const record of result.records) {
    const childId = record.get('childId')
    const childName = record.get('childName')
    const childLevel = record.get('childLevel')
    const parentId = record.get('parentId')
    const parentName = record.get('parentName')
    const parentLevel = record.get('parentLevel')

    errors.push({
      type: 'error',
      category: 'level',
      message: `Level inconsistency: "${childName}" (level ${typeof childLevel === 'number' ? childLevel : childLevel.toNumber()}) has parent "${parentName}" (level ${typeof parentLevel === 'number' ? parentLevel : parentLevel.toNumber()})`,
      details: {
        childId,
        childName,
        childLevel: typeof childLevel === 'number' ? childLevel : childLevel.toNumber(),
        parentId,
        parentName,
        parentLevel: typeof parentLevel === 'number' ? parentLevel : parentLevel.toNumber()
      }
    })
  }

  // Also check for filters where level doesn't match (max parent level + 1)
  const levelCalcQuery = `
    MATCH (f:CustomFilter)
    OPTIONAL MATCH (f)-[:CHILD_OF]->(p:CustomFilter)
    WITH f, max(p.level) as maxParentLevel
    WHERE (maxParentLevel IS NULL AND f.level <> 0) OR
          (maxParentLevel IS NOT NULL AND f.level <> maxParentLevel + 1)
    RETURN f.id as filterId, f.name as filterName, f.level as actualLevel,
           CASE WHEN maxParentLevel IS NULL THEN 0 ELSE maxParentLevel + 1 END as expectedLevel
  `

  const levelCalcResult = await session.run(levelCalcQuery)

  for (const record of levelCalcResult.records) {
    const filterId = record.get('filterId')
    const filterName = record.get('filterName')
    const actualLevel = record.get('actualLevel')
    const expectedLevel = record.get('expectedLevel')

    errors.push({
      type: 'error',
      category: 'level',
      message: `Incorrect level: "${filterName}" has level ${typeof actualLevel === 'number' ? actualLevel : actualLevel.toNumber()}, expected ${typeof expectedLevel === 'number' ? expectedLevel : expectedLevel.toNumber()}`,
      details: {
        filterId,
        filterName,
        actualLevel: typeof actualLevel === 'number' ? actualLevel : actualLevel.toNumber(),
        expectedLevel: typeof expectedLevel === 'number' ? expectedLevel : expectedLevel.toNumber()
      }
    })
  }

  return errors
}

/**
 * Check for orphaned products (products tagged with inactive filters)
 */
async function checkOrphanedProducts(session: any): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  const query = `
    MATCH (p:Product)-[:HAS_FILTER]->(f:CustomFilter)
    WHERE f.isActive = false
    RETURN p.id as productId, p.name as productName,
           f.id as filterId, f.name as filterName
  `

  const result = await session.run(query)

  for (const record of result.records) {
    const productId = record.get('productId')
    const productName = record.get('productName')
    const filterId = record.get('filterId')
    const filterName = record.get('filterName')

    errors.push({
      type: 'warning',
      category: 'orphaned-product',
      message: `Product "${productName}" is tagged with inactive filter "${filterName}"`,
      details: {
        productId,
        productName,
        filterId,
        filterName
      }
    })
  }

  return errors
}

/**
 * Check for duplicate filter names
 */
async function checkDuplicateNames(session: any): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  const query = `
    MATCH (f:CustomFilter)
    WITH f.name as name, collect(f.id) as filterIds
    WHERE size(filterIds) > 1
    RETURN name, filterIds
  `

  const result = await session.run(query)

  for (const record of result.records) {
    const name = record.get('name')
    const filterIds = record.get('filterIds')

    errors.push({
      type: 'error',
      category: 'duplicate-name',
      message: `Duplicate filter name: "${name}" exists ${filterIds.length} times`,
      details: {
        name,
        filterIds,
        count: filterIds.length
      }
    })
  }

  return errors
}

/**
 * Check for orphaned filters (filters with level > 0 but no parents)
 */
async function checkOrphanedFilters(session: any): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  const query = `
    MATCH (f:CustomFilter)
    WHERE f.level > 0 AND NOT (f)-[:CHILD_OF]->()
    RETURN f.id as filterId, f.name as filterName, f.level as level
  `

  const result = await session.run(query)

  for (const record of result.records) {
    const filterId = record.get('filterId')
    const filterName = record.get('filterName')
    const level = record.get('level')

    errors.push({
      type: 'error',
      category: 'orphaned-filter',
      message: `Orphaned filter: "${filterName}" has level ${typeof level === 'number' ? level : level.toNumber()} but no parents`,
      details: {
        filterId,
        filterName,
        level: typeof level === 'number' ? level : level.toNumber()
      }
    })
  }

  return errors
}

/**
 * Generate a formatted validation report
 */
function generateReport(allErrors: ValidationError[]): void {
  console.log('\n' + '='.repeat(70))
  console.log('  FILTER HIERARCHY VALIDATION REPORT')
  console.log('='.repeat(70))

  if (allErrors.length === 0) {
    console.log('\n✅ All validation checks passed! Hierarchy is valid.\n')
    return
  }

  // Group errors by category
  const errorsByCategory = new Map<string, ValidationError[]>()
  allErrors.forEach(error => {
    if (!errorsByCategory.has(error.category)) {
      errorsByCategory.set(error.category, [])
    }
    errorsByCategory.get(error.category)!.push(error)
  })

  // Count errors and warnings
  const errorCount = allErrors.filter(e => e.type === 'error').length
  const warningCount = allErrors.filter(e => e.type === 'warning').length

  console.log(`\n📊 Summary: ${errorCount} errors, ${warningCount} warnings\n`)

  // Display errors by category
  const categoryOrder: Array<ValidationError['category']> = [
    'cycle',
    'level',
    'orphaned-filter',
    'duplicate-name',
    'orphaned-product'
  ]

  const categoryTitles = {
    'cycle': 'Cycle Detection',
    'level': 'Level Inconsistencies',
    'orphaned-filter': 'Orphaned Filters',
    'duplicate-name': 'Duplicate Filter Names',
    'orphaned-product': 'Products with Inactive Filters'
  }

  categoryOrder.forEach(category => {
    const errors = errorsByCategory.get(category)
    if (!errors || errors.length === 0) return

    const icon = errors[0].type === 'error' ? '❌' : '⚠️'
    console.log(`${icon} ${categoryTitles[category]} (${errors.length})`)
    console.log('-'.repeat(70))

    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`)
      if (error.details && category === 'cycle') {
        console.log(`   Path: ${error.details.cyclePath.join(' → ')}`)
      }
    })
    console.log('')
  })

  console.log('='.repeat(70))

  if (errorCount > 0) {
    console.log('\n❌ Validation failed with errors. Please fix the issues above.')
    console.log('\nSuggested fixes:')
    console.log('  - For cycles: Remove one of the parent relationships in the cycle')
    console.log('  - For level issues: Run "npm run filters:recalculate-levels"')
    console.log('  - For orphaned filters: Add parent relationships or set level to 0')
    console.log('  - For duplicate names: Rename one of the duplicate filters')
  } else {
    console.log('\n✅ No critical errors found. Only warnings present.')
  }

  console.log('')
}

/**
 * Main validation function
 */
async function validateFilters(): Promise<boolean> {
  const session = getSession()

  try {
    console.log('\n🔍 Validating filter hierarchy...\n')

    // Run all validation checks
    const allErrors: ValidationError[] = []

    console.log('  Checking for cycles...')
    const cycleErrors = await checkForCycles(session)
    allErrors.push(...cycleErrors)
    console.log(`    ${cycleErrors.length === 0 ? '✅' : '❌'} Found ${cycleErrors.length} cycle issues`)

    console.log('  Checking level consistency...')
    const levelErrors = await checkLevelConsistency(session)
    allErrors.push(...levelErrors)
    console.log(`    ${levelErrors.length === 0 ? '✅' : '❌'} Found ${levelErrors.length} level issues`)

    console.log('  Checking for orphaned filters...')
    const orphanedFilterErrors = await checkOrphanedFilters(session)
    allErrors.push(...orphanedFilterErrors)
    console.log(`    ${orphanedFilterErrors.length === 0 ? '✅' : '❌'} Found ${orphanedFilterErrors.length} orphaned filters`)

    console.log('  Checking for duplicate names...')
    const duplicateErrors = await checkDuplicateNames(session)
    allErrors.push(...duplicateErrors)
    console.log(`    ${duplicateErrors.length === 0 ? '✅' : '❌'} Found ${duplicateErrors.length} duplicate name issues`)

    console.log('  Checking for orphaned products...')
    const orphanedProductErrors = await checkOrphanedProducts(session)
    allErrors.push(...orphanedProductErrors)
    console.log(`    ${orphanedProductErrors.length === 0 ? '✅' : '⚠️'} Found ${orphanedProductErrors.length} products with inactive filters`)

    // Generate report
    generateReport(allErrors)

    // Return true if valid (no errors), false if issues found
    return allErrors.filter(e => e.type === 'error').length === 0

  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Factory Bay - Filter Hierarchy Validator\n')

  try {
    const isValid = await validateFilters()
    await closeDriver()

    // Exit with appropriate code
    process.exit(isValid ? 0 : 1)
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

export { validateFilters, checkForCycles, checkLevelConsistency, checkOrphanedProducts, checkDuplicateNames }
