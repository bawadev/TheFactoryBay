/**
 * Fix broken image URLs in the database
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'

const BROKEN_URL = 'https://images.unsplash.com/photo-1564257577112-55a74684ba2d?w=800&h=1000'
const NEW_URL = 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=1000'

async function fixImages() {
  console.log('🔧 Fixing broken image URLs...\n')

  const session = getSession()

  try {
    // Find and update all product variants with the broken image URL
    const result = await session.run(
      `
      MATCH (v:ProductVariant)
      WHERE $brokenUrl IN v.images
      SET v.images = [url IN v.images | CASE WHEN url = $brokenUrl THEN $newUrl ELSE url END]
      RETURN count(v) as updatedCount
      `,
      {
        brokenUrl: BROKEN_URL,
        newUrl: NEW_URL,
      }
    )

    const updatedCount = result.records[0].get('updatedCount').toInt()
    console.log(`✅ Updated ${updatedCount} product variant(s)`)

  } catch (error) {
    console.error('❌ Fix failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

async function main() {
  console.log('🚀 Factory Bay - Fix Broken Images\n')

  try {
    await fixImages()
    await closeDriver()
    console.log('\n✅ All done!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
