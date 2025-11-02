import { getSession } from '../src/lib/db'

async function main() {
  const session = getSession()

  try {
    // Check Ladies category products
    console.log('🔍 Checking Ladies category products...\n')
    const result = await session.run(`
      MATCH (c:Category {hierarchy: 'ladies'})-[:HAS_PRODUCT]->(p:Product)
      RETURN c.name as category, c.id as catId, c.level as level, count(p) as productCount
      ORDER BY c.level
    `)

    console.log('Ladies categories with products:')
    result.records.forEach(r => {
      const level = r.get('level').toNumber ? r.get('level').toNumber() : r.get('level')
      const count = r.get('productCount').toNumber ? r.get('productCount').toNumber() : r.get('productCount')
      console.log(`  L${level} ${r.get('category')} (${r.get('catId')}): ${count} products`)
    })

    // Check top-level Ladies category specifically
    console.log('\n🔍 Checking top-level Ladies category (L0)...\n')
    const topResult = await session.run(`
      MATCH (c:Category {hierarchy: 'ladies', level: 0})
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)
      RETURN c.id as catId, c.name as name, count(p) as directProducts
    `)

    if (topResult.records.length > 0) {
      const catId = topResult.records[0].get('catId')
      const name = topResult.records[0].get('name')
      const directCount = topResult.records[0].get('directProducts').toNumber ?
        topResult.records[0].get('directProducts').toNumber() :
        topResult.records[0].get('directProducts')
      console.log(`Ladies (L0) category:`)
      console.log(`  ID: ${catId}`)
      console.log(`  Name: ${name}`)
      console.log(`  Direct products: ${directCount}`)

      // Check descendants
      console.log('\n🔍 Checking descendants...\n')
      const descResult = await session.run(`
        MATCH (c:Category {id: $catId})
        OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)
        WITH collect(DISTINCT descendant.id) + collect(DISTINCT c.id) as allCategoryIds
        RETURN size(allCategoryIds) as categoryCount, allCategoryIds
      `, { catId })

      const catCount = descResult.records[0].get('categoryCount').toNumber ?
        descResult.records[0].get('categoryCount').toNumber() :
        descResult.records[0].get('categoryCount')
      const allIds = descResult.records[0].get('allCategoryIds')
      console.log(`Total categories (including descendants): ${catCount}`)
      console.log(`Category IDs: ${allIds.join(', ')}`)

      // Check products in those categories
      console.log('\n🔍 Checking products in all Ladies categories...\n')
      const prodResult = await session.run(`
        MATCH (c:Category {id: $catId})
        OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)
        WITH collect(DISTINCT descendant.id) + collect(DISTINCT c.id) as allCategoryIds
        UNWIND allCategoryIds as catId
        MATCH (cat:Category {id: catId})-[:HAS_PRODUCT]->(p:Product)
        RETURN DISTINCT p.id as productId, p.name as productName
      `, { catId })

      console.log(`Found ${prodResult.records.length} products:`)
      prodResult.records.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.get('productName')} (${r.get('productId')})`)
      })
    } else {
      console.log('❌ No top-level Ladies category found!')
    }

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
