import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'

interface FilterDefinition {
  name: string
  level: number
  parents?: string[] // Array of parent names
}

interface CategoryConfig {
  filters: FilterDefinition[]
}

// Load filter definitions from JSON config file
function loadFilterDefinitions(): FilterDefinition[] {
  const configPath = resolve(__dirname, '../config/category-hierarchy.json')
  try {
    const configContent = readFileSync(configPath, 'utf-8')
    const config: CategoryConfig = JSON.parse(configContent)
    console.log(`✓ Loaded ${config.filters.length} filters from config file`)
    return config.filters
  } catch (error) {
    console.error('Error loading category config:', error)
    console.error('Please ensure config/category-hierarchy.json exists')
    process.exit(1)
  }
}

async function clearCustomFilters() {
  const session = getSession()
  try {
    console.log('Clearing existing custom filters...')
    await session.run('MATCH (f:CustomFilter) DETACH DELETE f')
    console.log('✓ Cleared all custom filters')
  } finally {
    await session.close()
  }
}

async function createGraphHierarchy(filterDefinitions: FilterDefinition[]) {
  const session = getSession()
  try {
    // Step 1: Create all filter nodes (using name as ID)
    console.log('\nCreating filter nodes...')
    for (const filter of filterDefinitions) {
      const slug = filter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      await session.run(
        `
        MERGE (f:CustomFilter {name: $name})
        SET f.id = $name,
            f.slug = $slug,
            f.level = $level,
            f.isActive = true,
            f.createdAt = datetime().epochMillis,
            f.updatedAt = datetime().epochMillis
        `,
        { name: filter.name, slug, level: filter.level }
      )

      console.log(`  ✓ ${filter.name} (Level ${filter.level})`)
    }

    // Step 2: Create parent-child relationships
    console.log('\nCreating relationships...')
    for (const filter of filterDefinitions) {
      if (filter.parents && filter.parents.length > 0) {
        for (const parentName of filter.parents) {
          await session.run(
            `
            MATCH (child:CustomFilter {name: $childName})
            MATCH (parent:CustomFilter {name: $parentName})
            MERGE (child)-[:CHILD_OF]->(parent)
            `,
            { childName: filter.name, parentName }
          )
          console.log(`  ✓ ${filter.name} → ${parentName}`)
        }
      }
    }

    console.log('\n✓ Graph hierarchy created successfully!')
  } finally {
    await session.close()
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Setting up Flexible Category Hierarchy')
  console.log('Reading configuration from: config/category-hierarchy.json')
  console.log('='.repeat(60))

  // Load filter definitions from JSON config
  const filterDefinitions = loadFilterDefinitions()

  await clearCustomFilters()
  await createGraphHierarchy(filterDefinitions)

  console.log('\n' + '='.repeat(60))
  console.log('✓ Hierarchy created successfully!')
  console.log('='.repeat(60))

  // Display hierarchy summary grouped by level
  const levels = new Map<number, string[]>()
  filterDefinitions.forEach(filter => {
    if (!levels.has(filter.level)) {
      levels.set(filter.level, [])
    }
    levels.get(filter.level)!.push(filter.name)
  })

  console.log('\nHierarchy Summary:')
  Array.from(levels.keys()).sort().forEach(level => {
    const filters = levels.get(level)!
    console.log(`\nLevel ${level}: ${filters.join(', ')}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('To modify the hierarchy:')
  console.log('1. Edit config/category-hierarchy.json')
  console.log('2. Run: npm run setup:filters (or tsx scripts/setup-graph-hierarchy.ts)')
  console.log('\nYou can add any categories: Pets, Kids, etc.')
  console.log('The system supports infinite levels and multiple parents!')
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
