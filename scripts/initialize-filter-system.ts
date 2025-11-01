/**
 * Initialize Filter System Script
 *
 * Combined script that runs both filter setup and product assignment.
 * This is the single command to run for complete filter system initialization.
 *
 * Run this with: npm run filters:init
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import readline from 'readline'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { closeDriver } from '../src/lib/db'
import { createFilters, verifyHierarchy, loadConfig } from './setup-default-filters'
import { assignProducts, verifyAssignments } from './assign-products-to-filters'

interface InitOptions {
  clearFilters: boolean
  clearAssignments: boolean
  skipConfirmation: boolean
}

/**
 * Parse command line arguments
 */
function parseArgs(): InitOptions {
  const args = process.argv.slice(2)

  return {
    clearFilters: args.includes('--clear-filters') || args.includes('--clear-all'),
    clearAssignments: args.includes('--clear-assignments') || args.includes('--clear-all'),
    skipConfirmation: args.includes('--yes') || args.includes('-y'),
  }
}

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Display welcome banner
 */
function displayBanner(): void {
  console.log('\n' + '═'.repeat(60))
  console.log('🏪  Factory Bay - Filter System Initialization')
  console.log('═'.repeat(60))
  console.log('\nThis script will:')
  console.log('  1. Create the complete filter hierarchy')
  console.log('  2. Assign all products to appropriate filters')
  console.log('  3. Verify the setup')
  console.log()
}

/**
 * Display summary
 */
function displaySummary(options: InitOptions): void {
  console.log('\n' + '─'.repeat(60))
  console.log('📋 Configuration:')
  console.log('─'.repeat(60))
  console.log(`  Clear existing filters:     ${options.clearFilters ? '✓ Yes' : '✗ No'}`)
  console.log(`  Clear existing assignments: ${options.clearAssignments ? '✓ Yes' : '✗ No'}`)
  console.log('─'.repeat(60))
}

/**
 * Step 1: Create filter hierarchy
 */
async function step1_CreateFilters(clearFilters: boolean): Promise<void> {
  console.log('\n' + '┌'.repeat(60))
  console.log('📁 STEP 1: Creating Filter Hierarchy')
  console.log('└'.repeat(60))

  try {
    const config = loadConfig()
    console.log(`\n   Loading configuration: ${config.filters.length} filters to create`)

    await createFilters(config, clearFilters)
    await verifyHierarchy()

    console.log('\n✅ Step 1 Complete: Filter hierarchy created successfully')
  } catch (error) {
    console.error('\n❌ Step 1 Failed:', error)
    throw error
  }
}

/**
 * Step 2: Assign products to filters
 */
async function step2_AssignProducts(clearAssignments: boolean): Promise<void> {
  console.log('\n' + '┌'.repeat(60))
  console.log('🏷️  STEP 2: Assigning Products to Filters')
  console.log('└'.repeat(60))

  try {
    const stats = await assignProducts(clearAssignments)

    console.log('\n✅ Step 2 Complete: Products assigned successfully')
    console.log(`   Assigned ${stats.assignedProducts}/${stats.totalProducts} products`)
    console.log(`   Total filter assignments: ${stats.totalAssignments}`)
  } catch (error) {
    console.error('\n❌ Step 2 Failed:', error)
    throw error
  }
}

/**
 * Step 3: Final verification
 */
async function step3_FinalVerification(): Promise<void> {
  console.log('\n' + '┌'.repeat(60))
  console.log('🔍 STEP 3: Final Verification')
  console.log('└'.repeat(60))

  try {
    await verifyAssignments()
    console.log('\n✅ Step 3 Complete: Verification successful')
  } catch (error) {
    console.error('\n❌ Step 3 Failed:', error)
    throw error
  }
}

/**
 * Display success message with next steps
 */
function displaySuccess(): void {
  console.log('\n' + '═'.repeat(60))
  console.log('🎉 SUCCESS: Filter System Initialized!')
  console.log('═'.repeat(60))
  console.log('\n📚 Next Steps:')
  console.log('  1. Visit the admin panel to manage filters')
  console.log('  2. Review product assignments and adjust as needed')
  console.log('  3. Test the filter functionality on the frontend')
  console.log('\n💡 Useful Commands:')
  console.log('  npm run filters:setup      - Recreate filters only')
  console.log('  npm run filters:assign     - Reassign products only')
  console.log('  npm run filters:init --yes - Skip confirmation prompts')
  console.log('  npm run filters:init --clear-all - Clear and recreate everything')
  console.log('\n' + '═'.repeat(60))
}

/**
 * Main function
 */
async function main() {
  try {
    // Display banner
    displayBanner()

    // Parse command line arguments
    const options = parseArgs()

    // Display summary
    displaySummary(options)

    // Get user confirmation if needed
    if (!options.skipConfirmation) {
      console.log()
      const proceed = await confirm('Do you want to proceed?')

      if (!proceed) {
        console.log('\n❌ Operation cancelled by user.')
        process.exit(0)
      }
    }

    console.log('\n🚀 Starting initialization...')

    // Track start time
    const startTime = Date.now()

    // Step 1: Create filters
    await step1_CreateFilters(options.clearFilters)

    // Step 2: Assign products
    await step2_AssignProducts(options.clearAssignments)

    // Step 3: Final verification
    await step3_FinalVerification()

    // Calculate elapsed time
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2)

    // Display success message
    displaySuccess()

    console.log(`\n⏱️  Total time: ${elapsedTime} seconds\n`)

    await closeDriver()
    process.exit(0)
  } catch (error) {
    console.error('\n' + '═'.repeat(60))
    console.error('❌ INITIALIZATION FAILED')
    console.error('═'.repeat(60))
    console.error('\nError:', error)
    console.error('\n💡 Troubleshooting:')
    console.error('  1. Ensure Neo4j is running')
    console.error('  2. Check database credentials in .env.local')
    console.error('  3. Run "npm run db:init" to initialize the database')
    console.error('  4. Check the error message above for details')
    console.error('\n' + '═'.repeat(60) + '\n')

    await closeDriver()
    process.exit(1)
  }
}

// Display help message
function displayHelp(): void {
  console.log(`
Factory Bay - Filter System Initialization

USAGE:
  npm run filters:init [OPTIONS]

OPTIONS:
  --clear-filters      Clear existing filters before creating new ones
  --clear-assignments  Clear existing product-filter assignments
  --clear-all          Clear both filters and assignments
  --yes, -y            Skip confirmation prompts
  --help, -h           Display this help message

EXAMPLES:
  npm run filters:init
    Initialize filters and assignments (keeps existing data)

  npm run filters:init --clear-all --yes
    Clear everything and recreate (no confirmation)

  npm run filters:init --clear-assignments
    Keep filters but reassign all products

  npm run filters:init --clear-filters
    Recreate filters but keep product assignments

RELATED COMMANDS:
  npm run filters:setup   - Create filters only
  npm run filters:assign  - Assign products only
  npm run db:seed         - Seed sample products

For more information, see README-FILTER-SETUP.md
`)
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  displayHelp()
  process.exit(0)
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { step1_CreateFilters, step2_AssignProducts, step3_FinalVerification }
