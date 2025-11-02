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
    console.log('🔧 Fixing product assignments...\n')

    // Get the 2 products that should ONLY be in Sweaters
    const productIds = [
      'b6dc6bec-01a3-4c7e-854d-5e219900b56f', // Floral Summer Dress
      '9ff6f74c-17ae-415c-9949-70b90d2ec698'  // Elegant Black Evening Dress
    ]

    for (const productId of productIds) {
      // Remove from Dresses (correct direction!)
      const removeResult = await session.run(`
        MATCH (c:Category {name: 'Dresses', hierarchy: 'ladies'})-[r:HAS_PRODUCT]->(p:Product {id: $productId})
        DELETE r
        RETURN p.name as productName
      `, { productId })

      if (removeResult.records.length > 0) {
        const productName = removeResult.records[0].get('productName')
        console.log(`✓ Removed "${productName}" from Dresses`)
      } else {
        console.log(`⚠️  Product ${productId} was not in Dresses`)
      }
    }

    // Verify counts
    console.log('\n📊 Verification:\n')

    const dressesCount = await session.run(`
      MATCH (c:Category {name: 'Dresses', hierarchy: 'ladies'})-[:HAS_PRODUCT]->(p:Product)
      RETURN count(p) as count
    `)

    const sweatersCount = await session.run(`
      MATCH (c:Category {name: 'Sweaters', hierarchy: 'ladies'})-[:HAS_PRODUCT]->(p:Product)
      RETURN count(p) as count
    `)

    const topsCount = await session.run(`
      MATCH (c:Category {name: 'Tops', hierarchy: 'ladies'})
      OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)-[:HAS_PRODUCT]->(p:Product)
      RETURN count(DISTINCT p) as count
    `)

    const clothingCount = await session.run(`
      MATCH (c:Category {name: 'Clothing', hierarchy: 'ladies'})
      OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)-[:HAS_PRODUCT]->(p:Product)
      RETURN count(DISTINCT p) as count
    `)

    console.log('Dresses:', dressesCount.records[0].get('count').toNumber())
    console.log('Sweaters:', sweatersCount.records[0].get('count').toNumber())
    console.log('Tops (with descendants):', topsCount.records[0].get('count').toNumber())
    console.log('Clothing (with descendants):', clothingCount.records[0].get('count').toNumber())

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await session.close()
    await driver.close()
  }
}

main()
  .then(() => {
    console.log('\n✅ Product assignments fixed!')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
