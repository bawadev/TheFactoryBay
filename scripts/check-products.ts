#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'

async function main() {
  const session = getSession()
  try {
    console.log('📊 Checking products in database...\n')

    // Get all products with their current categorization
    const result = await session.run(`
      MATCH (p:Product)
      RETURN
        p.id as id,
        p.name as name,
        p.category as category,
        p.gender as gender,
        p.brand as brand
      ORDER BY p.category, p.name
    `)

    const products = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      category: record.get('category'),
      gender: record.get('gender'),
      brand: record.get('brand')
    }))

    console.log(`Total products: ${products.length}\n`)

    // Group by category
    const byCategory = products.reduce((acc, p) => {
      const cat = p.category || 'uncategorized'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(p)
      return acc
    }, {} as Record<string, typeof products>)

    console.log('Products by category:')
    Object.entries(byCategory).forEach(([cat, prods]) => {
      console.log(`  ${cat}: ${prods.length} products`)
    })

    console.log('\nSample products:')
    products.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name} (${p.category}, ${p.gender}, ${p.brand})`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await session.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
