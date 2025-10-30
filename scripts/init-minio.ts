/**
 * Initialize MinIO bucket
 * Run this with: npm run minio:init
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { initializeBucket, getMinioClient } from '../src/lib/minio'

async function main() {
  console.log('🚀 Factory Bay - MinIO Initialization\n')

  try {
    // Test MinIO connection
    console.log('Testing MinIO connection...')
    const client = getMinioClient()

    // Try to list buckets to verify connection
    const buckets = await client.listBuckets()
    console.log(`✅ Connected to MinIO successfully!`)
    console.log(`   Found ${buckets.length} existing bucket(s)\n`)

    // Initialize product images bucket
    console.log('Initializing product images bucket...')
    await initializeBucket()

    console.log('\n✅ MinIO initialization complete!')
    console.log('\n📊 MinIO Console: http://localhost:9001')
    console.log('   Username: factorybay')
    console.log('   Password: factorybay123')
  } catch (error) {
    console.error('❌ MinIO initialization failed:', error)
    process.exit(1)
  }
}

main()
