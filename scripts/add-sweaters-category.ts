import { config } from 'dotenv'
import neo4j from 'neo4j-driver'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
config({ path: '.env.local' })

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
)

async function main() {
  const session = driver.session()

  try {
    console.log('🎯 Creating Sweaters category under Ladies > Clothing > Tops...\n')

    // First, find the "Tops" category under Ladies > Clothing
    const topsResult = await session.run(`
      MATCH (c:Category {name: 'Tops', hierarchy: 'ladies'})
      WHERE EXISTS((c)<-[:HAS_CHILD]-(:Category {name: 'Clothing'}))
      RETURN c.id as id, c.name as name, c.level as level
    `)

    if (topsResult.records.length === 0) {
      console.log('❌ Could not find Ladies > Clothing > Tops category')
      return
    }

    const topsId = topsResult.records[0].get('id')
    const topsLevel = topsResult.records[0].get('level').toNumber ?
      topsResult.records[0].get('level').toNumber() :
      topsResult.records[0].get('level')

    console.log(`✓ Found Tops category: ${topsId} (Level ${topsLevel})`)

    // Create Sweaters category
    const sweatersId = uuidv4()
    const now = Date.now()
    const sweatersLevel = topsLevel + 1

    await session.run(`
      CREATE (c:Category {
        id: $id,
        name: 'Sweaters',
        slug: 'sweaters',
        hierarchy: 'ladies',
        parentId: $parentId,
        level: $level,
        isActive: true,
        isFeatured: false,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
    `, {
      id: sweatersId,
      parentId: topsId,
      level: sweatersLevel,
      createdAt: now,
      updatedAt: now
    })

    console.log(`✓ Created Sweaters category: ${sweatersId} (Level ${sweatersLevel})`)

    // Create HAS_CHILD relationship
    await session.run(`
      MATCH (parent:Category {id: $parentId})
      MATCH (child:Category {id: $childId})
      MERGE (parent)-[:HAS_CHILD]->(child)
    `, { parentId: topsId, childId: sweatersId })

    console.log('✓ Created HAS_CHILD relationship')

    // Now let's assign 2 products to Sweaters
    // We'll take 2 products from the Dresses category and move them to Sweaters
    console.log('\n📦 Assigning products to Sweaters...\n')

    const dressProducts = await session.run(`
      MATCH (c:Category {name: 'Dresses', hierarchy: 'ladies'})-[:HAS_PRODUCT]->(p:Product)
      RETURN p.id as id, p.name as name
      LIMIT 2
    `)

    if (dressProducts.records.length === 0) {
      console.log('⚠️  No products found to assign')
    } else {
      for (const record of dressProducts.records) {
        const productId = record.get('id')
        const productName = record.get('name')

        // Remove from Dresses
        await session.run(`
          MATCH (p:Product {id: $productId})-[r:HAS_PRODUCT]->(c:Category {name: 'Dresses'})
          DELETE r
        `, { productId })

        // Add to Sweaters
        await session.run(`
          MATCH (p:Product {id: $productId})
          MATCH (c:Category {id: $categoryId})
          CREATE (c)-[:HAS_PRODUCT]->(p)
        `, { productId, categoryId: sweatersId })

        console.log(`✓ Assigned "${productName}" to Sweaters`)
      }
    }

    // Verify
    console.log('\n🔍 Verification:\n')
    const verifyResult = await session.run(`
      MATCH (c:Category {id: $id})
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)
      WITH c, count(p) as productCount
      OPTIONAL MATCH (parent:Category)-[:HAS_CHILD]->(c)
      RETURN c.name as name, c.level as level, c.hierarchy as hierarchy,
             parent.name as parentName, productCount
    `, { id: sweatersId })

    const result = verifyResult.records[0]
    const productCount = result.get('productCount').toNumber ?
      result.get('productCount').toNumber() :
      result.get('productCount')

    console.log(`Category: ${result.get('name')}`)
    console.log(`Hierarchy: ${result.get('hierarchy')}`)
    console.log(`Level: ${result.get('level')}`)
    console.log(`Parent: ${result.get('parentName')}`)
    console.log(`Products: ${productCount}`)

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
    console.log('\n✅ Sweaters category created successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
