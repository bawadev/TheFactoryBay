import { config } from 'dotenv'
import neo4j from 'neo4j-driver'

config({ path: '.env.local' })

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
)

async function main() {
  const session = driver.session()

  try {
    console.log('🧹 CLEANING UP LADIES ACCESSORIES\n')

    const productId = 'b572ce03-b894-4135-908b-3d86aded5e77'
    const productName = 'Louis Vuitton High End Vegan Bags Crossbody Bag Lv Vegan Bag Louis Vuitton Vegan Leather Large'
    const bagsCategoryId = '43cfdbd9-958a-46ef-bd54-c6c41af0f217'

    console.log(`Moving "${productName}"`)
    console.log(`  From: Ladies > Accessories`)
    console.log(`  To: Ladies > Accessories > Bags\n`)

    // Remove from Accessories
    const deleteResult = await session.run(`
      MATCH (from:Category {name: 'Accessories', hierarchy: 'ladies'})-[r:HAS_PRODUCT]->(p:Product {id: $productId})
      DELETE r
      RETURN p.name as productName
    `, { productId })

    if (deleteResult.records.length === 0) {
      console.log('⚠️  Product not found in Accessories')
      return
    }

    console.log('✅ Removed from Accessories')

    // Add to Bags
    await session.run(`
      MATCH (p:Product {id: $productId})
      MATCH (to:Category {id: $bagsCategoryId})
      CREATE (to)-[:HAS_PRODUCT]->(p)
    `, {
      productId,
      bagsCategoryId
    })

    console.log('✅ Added to Bags')

    // Verify
    console.log('\n📊 VERIFICATION:\n')

    const verifyResult = await session.run(`
      MATCH (accessories:Category {name: 'Accessories', hierarchy: 'ladies'})
      OPTIONAL MATCH (accessories)-[:HAS_PRODUCT]->(directP:Product)
      OPTIONAL MATCH (accessories)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(p:Product)
      WITH accessories, count(DISTINCT directP) as directCount, count(DISTINCT p) as totalCount
      RETURN directCount, totalCount
    `)

    const record = verifyResult.records[0]
    const directCount = record.get('directCount').toNumber ? record.get('directCount').toNumber() : record.get('directCount')
    const totalCount = record.get('totalCount').toNumber ? record.get('totalCount').toNumber() : record.get('totalCount')

    console.log(`Ladies > Accessories:`)
    console.log(`  Direct products: ${directCount} (should be 0)`)
    console.log(`  Total with descendants: ${totalCount}`)

    if (directCount === 0) {
      console.log(`  ✅ Accessories no longer has direct products!`)
    }

    // Check child categories
    const childrenResult = await session.run(`
      MATCH (accessories:Category {name: 'Accessories', hierarchy: 'ladies'})-[:HAS_CHILD]->(child:Category)
      OPTIONAL MATCH (child)-[:HAS_PRODUCT]->(p:Product)
      WITH child, count(p) as productCount
      RETURN child.name as name, productCount
      ORDER BY child.name
    `)

    console.log(`\nChild categories:`)
    childrenResult.records.forEach(r => {
      const count = r.get('productCount').toNumber ? r.get('productCount').toNumber() : r.get('productCount')
      console.log(`  ${r.get('name')}: ${count} products`)
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
  .then(() => {
    console.log('\n✅ Ladies Accessories cleanup complete!\n')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
