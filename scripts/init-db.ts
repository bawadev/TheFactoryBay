/**
 * Database initialization script
 * Run this with: npx tsx scripts/init-db.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { testConnection, closeDriver } from '../src/lib/db'
import { initializeSchema, getDatabaseStats } from '../src/lib/schema'

async function main() {
  console.log('🚀 Factory Bay - Database Initialization\n')

  // Test connection
  console.log('Testing Neo4j connection...')
  const connected = await testConnection()

  if (!connected) {
    console.error('❌ Failed to connect to Neo4j')
    console.error('Please ensure Neo4j is running and credentials are correct')
    console.error('Check your .env.local file\n')
    process.exit(1)
  }

  console.log('✅ Connected to Neo4j successfully!\n')

  // Initialize schema
  await initializeSchema()

  // Show stats
  console.log('\n📊 Database Statistics:')
  const stats = await getDatabaseStats()
  if (stats.length === 0) {
    console.log('Database is empty (no nodes yet)')
  } else {
    stats.forEach((stat: any) => {
      console.log(`  ${stat.label}: ${stat.count}`)
    })
  }

  // Close connection
  await closeDriver()
  console.log('\n✅ Database initialization complete!')
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
