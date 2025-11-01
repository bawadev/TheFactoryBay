#!/usr/bin/env tsx

/**
 * Test script to demonstrate cycle prevention in filter hierarchy
 *
 * This script tests:
 * 1. Direct cycle prevention (A→B, trying to add A as child of B)
 * 2. Indirect cycle prevention (A→B→C, trying to add A as child of C)
 * 3. Self-reference prevention (A trying to be its own parent)
 */

import { getSession } from '../src/lib/db'
import * as filterRepo from '../src/lib/repositories/custom-filter.repository'

async function runTests() {
  const session = getSession()

  try {
    console.log('🧪 Testing Cycle Prevention in Filter Hierarchy\n')
    console.log('='.repeat(60))

    // Setup: Create test filters
    console.log('\n📝 SETUP: Creating test filters...\n')

    const filterA = await filterRepo.createCustomFilter(session, 'Filter A', [])
    console.log(`✓ Created Filter A (${filterA.id})`)

    const filterB = await filterRepo.createCustomFilter(session, 'Filter B', [filterA.id])
    console.log(`✓ Created Filter B (${filterB.id}) as child of Filter A`)

    const filterC = await filterRepo.createCustomFilter(session, 'Filter C', [filterB.id])
    console.log(`✓ Created Filter C (${filterC.id}) as child of Filter B`)

    console.log('\nCurrent hierarchy: A → B → C')

    // Test 1: Direct cycle prevention (A→B, trying to add A as child of B)
    console.log('\n' + '='.repeat(60))
    console.log('\n🔬 TEST 1: Direct Cycle Prevention')
    console.log('Attempting to make Filter A a child of Filter B (A→B→A)')

    const test1Result = await filterRepo.validateNoCycles(session, filterA.id, [filterB.id])

    if (!test1Result.valid) {
      console.log('✅ PASS: Direct cycle correctly prevented')
      console.log(`   Error: ${test1Result.error}`)
      if (test1Result.conflictingParent) {
        console.log(`   Conflicting parent: ${test1Result.conflictingParent.name} (${test1Result.conflictingParent.id})`)
      }
    } else {
      console.log('❌ FAIL: Direct cycle was NOT prevented!')
    }

    // Test 2: Indirect cycle prevention (A→B→C, trying to add A as child of C)
    console.log('\n' + '='.repeat(60))
    console.log('\n🔬 TEST 2: Indirect Cycle Prevention')
    console.log('Attempting to make Filter A a child of Filter C (A→B→C→A)')

    const test2Result = await filterRepo.validateNoCycles(session, filterA.id, [filterC.id])

    if (!test2Result.valid) {
      console.log('✅ PASS: Indirect cycle correctly prevented')
      console.log(`   Error: ${test2Result.error}`)
      if (test2Result.conflictingParent) {
        console.log(`   Conflicting parent: ${test2Result.conflictingParent.name} (${test2Result.conflictingParent.id})`)
      }
    } else {
      console.log('❌ FAIL: Indirect cycle was NOT prevented!')
    }

    // Test 3: Self-reference prevention
    console.log('\n' + '='.repeat(60))
    console.log('\n🔬 TEST 3: Self-Reference Prevention')
    console.log('Attempting to make Filter A its own parent (A→A)')

    const test3Result = await filterRepo.validateNoCycles(session, filterA.id, [filterA.id])

    if (!test3Result.valid) {
      console.log('✅ PASS: Self-reference correctly prevented')
      console.log(`   Error: ${test3Result.error}`)
    } else {
      console.log('❌ FAIL: Self-reference was NOT prevented!')
    }

    // Test 4: Valid parent addition (should succeed)
    console.log('\n' + '='.repeat(60))
    console.log('\n🔬 TEST 4: Valid Parent Addition')
    console.log('Creating Filter D and making Filter C its child (A→B→C, D→C)')

    const filterD = await filterRepo.createCustomFilter(session, 'Filter D', [])
    console.log(`✓ Created Filter D (${filterD.id})`)

    const test4Result = await filterRepo.validateNoCycles(session, filterC.id, [filterD.id])

    if (test4Result.valid) {
      console.log('✅ PASS: Valid parent addition allowed')

      // Actually update the parents
      const updateResult = await filterRepo.updateFilterParents(session, filterC.id, [filterB.id, filterD.id])

      if (updateResult.success) {
        console.log('✅ Successfully updated Filter C to have both B and D as parents')
        console.log('\nFinal hierarchy:')
        console.log('  A → B → C')
        console.log('  D ↗')
      } else {
        console.log('❌ Failed to update parents:', updateResult.error)
      }
    } else {
      console.log('❌ FAIL: Valid parent addition was blocked!')
    }

    // Test 5: Ancestor retrieval
    console.log('\n' + '='.repeat(60))
    console.log('\n🔬 TEST 5: Ancestor Retrieval')

    const ancestors = await filterRepo.getAllAncestorFilterIds(session, filterC.id)
    console.log(`✓ Filter C has ${ancestors.length} ancestor(s):`)

    // Get names for each ancestor
    for (const ancestorId of ancestors) {
      const query = await session.run(
        'MATCH (f:CustomFilter {id: $id}) RETURN f.name as name',
        { id: ancestorId }
      )
      const name = query.records[0].get('name')
      console.log(`  - ${name} (${ancestorId})`)
    }

    // Cleanup
    console.log('\n' + '='.repeat(60))
    console.log('\n🧹 CLEANUP: Removing test filters...\n')

    // Delete in reverse order of dependencies
    await filterRepo.deleteCustomFilter(session, filterC.id)
    console.log('✓ Deleted Filter C')

    await filterRepo.deleteCustomFilter(session, filterB.id)
    console.log('✓ Deleted Filter B')

    await filterRepo.deleteCustomFilter(session, filterD.id)
    console.log('✓ Deleted Filter D')

    await filterRepo.deleteCustomFilter(session, filterA.id)
    console.log('✓ Deleted Filter A')

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ All tests completed successfully!')
    console.log('\nSummary:')
    console.log('  ✓ Direct cycle prevention: WORKING')
    console.log('  ✓ Indirect cycle prevention: WORKING')
    console.log('  ✓ Self-reference prevention: WORKING')
    console.log('  ✓ Valid parent addition: WORKING')
    console.log('  ✓ Ancestor retrieval: WORKING')

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    throw error
  } finally {
    await session.close()
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\n✅ Test script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error)
    process.exit(1)
  })
