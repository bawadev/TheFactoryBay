import { config } from 'dotenv'
import neo4j from 'neo4j-driver'

// Load environment variables
config({ path: '.env.local' })

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
)

async function main() {
  const session = driver.session()

  try {
    const ladiesCatId = '5c48a3fb-f4cf-49ad-a53b-4afc5978eacb'

    console.log('🔍 Checking Ladies category...\n')

    // Check if category exists
    const catResult = await session.run(`
      MATCH (c:Category {id: $catId})
      RETURN c.id as id, c.name as name, c.level as level, c.hierarchy as hierarchy
    `, { catId: ladiesCatId })

    if (catResult.records.length === 0) {
      console.log('❌ Category with ID', ladiesCatId, 'NOT FOUND!')

      // Find the actual Ladies category
      const findResult = await session.run(`
        MATCH (c:Category {hierarchy: 'ladies', level: 0})
        RETURN c.id as id, c.name as name
      `)

      if (findResult.records.length > 0) {
        console.log('\n✅ Found actual Ladies (L0) category:')
        console.log('   ID:', findResult.records[0].get('id'))
        console.log('   Name:', findResult.records[0].get('name'))
      }
    } else {
      const cat = catResult.records[0]
      console.log('✅ Category found:')
      console.log('   ID:', cat.get('id'))
      console.log('   Name:', cat.get('name'))
      const level = cat.get('level').toNumber ? cat.get('level').toNumber() : cat.get('level')
      console.log('   Level:', level)
      console.log('   Hierarchy:', cat.get('hierarchy'))
    }

    // Check direct products
    console.log('\n🔍 Checking direct products...')
    const directResult = await session.run(`
      MATCH (c:Category {id: $catId})-[:HAS_PRODUCT]->(p:Product)
      RETURN count(p) as count, collect(p.name)[0..5] as sampleNames
    `, { catId: ladiesCatId })

    if (directResult.records.length > 0) {
      const count = directResult.records[0].get('count').toNumber ?
        directResult.records[0].get('count').toNumber() :
        directResult.records[0].get('count')
      console.log('Direct products:', count)
      if (count > 0) {
        console.log('Sample:', directResult.records[0].get('sampleNames'))
      }
    }

    // Check descendants
    console.log('\n🔍 Checking descendants...')
    const descResult = await session.run(`
      MATCH (c:Category {id: $catId})
      OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)
      WITH collect(DISTINCT descendant.id) + collect(DISTINCT c.id) as allCategoryIds
      RETURN size(allCategoryIds) as count, allCategoryIds[0..10] as sample
    `, { catId: ladiesCatId })

    if (descResult.records.length > 0) {
      const count = descResult.records[0].get('count').toNumber ?
        descResult.records[0].get('count').toNumber() :
        descResult.records[0].get('count')
      console.log('Total categories (including descendants):', count)
      console.log('Sample IDs:', descResult.records[0].get('sample'))
    }

    // Check products in all descendants
    console.log('\n🔍 Checking products in descendants...')
    const prodResult = await session.run(`
      MATCH (c:Category {id: $catId})
      OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)
      WITH collect(DISTINCT descendant.id) + collect(DISTINCT c.id) as allCategoryIds
      UNWIND allCategoryIds as catId
      MATCH (cat:Category {id: catId})-[:HAS_PRODUCT]->(p:Product)
      RETURN count(DISTINCT p) as productCount, collect(DISTINCT p.name)[0..10] as sampleProducts
    `, { catId: ladiesCatId })

    if (prodResult.records.length > 0) {
      const count = prodResult.records[0].get('productCount').toNumber ?
        prodResult.records[0].get('productCount').toNumber() :
        prodResult.records[0].get('productCount')
      console.log('Products in all descendants:', count)
      if (count > 0) {
        console.log('Sample products:', prodResult.records[0].get('sampleProducts'))
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await session.close()
    await driver.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
