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
    console.log('🔍 Checking Sweaters category products...\n')

    // Check products in Sweaters
    const sweatersResult = await session.run(`
      MATCH (c:Category {name: 'Sweaters', hierarchy: 'ladies'})-[:HAS_PRODUCT]->(p:Product)
      RETURN c.name as category, c.id as categoryId, p.name as productName, p.id as productId
    `)

    console.log(`✓ Found ${sweatersResult.records.length} products in Sweaters:`)
    sweatersResult.records.forEach(record => {
      console.log(`  - ${record.get('productName')} (${record.get('productId')})`)
    })

    // Check products in Dresses for comparison
    console.log('\n🔍 Checking Dresses category products...\n')
    const dressesResult = await session.run(`
      MATCH (c:Category {name: 'Dresses', hierarchy: 'ladies'})-[:HAS_PRODUCT]->(p:Product)
      RETURN c.name as category, p.name as productName, p.id as productId
      LIMIT 5
    `)

    console.log(`✓ Found ${dressesResult.records.length} products in Dresses (showing first 5):`)
    dressesResult.records.forEach(record => {
      console.log(`  - ${record.get('productName')} (${record.get('productId')})`)
    })

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
