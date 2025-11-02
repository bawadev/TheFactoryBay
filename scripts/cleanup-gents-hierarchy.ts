import { config } from 'dotenv'
import neo4j from 'neo4j-driver'

config({ path: '.env.local' })

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
)

interface ProductMove {
  productId: string
  productName: string
  fromCategory: string
  toCategory: string
  toCategoryId: string
}

async function main() {
  const session = driver.session()

  try {
    console.log('🧹 CLEANING UP GENTS HIERARCHY')
    console.log('================================================================================\n')

    // Define the moves based on analysis
    const moves: ProductMove[] = [
      // From Tops (3 products)
      {
        productId: 'ef0d02f1-d904-496e-898f-4742fdf07865',
        productName: 'Designer Polo Shirt',
        fromCategory: 'Tops',
        toCategory: 'Polo Shirts',
        toCategoryId: '6b43b337-e99c-42ea-8d28-658aa0d209f5'
      },
      {
        productId: '7bc80d6e-63ee-491b-8a4d-42df2be7a950',
        productName: 'Premium Cotton T-Shirt',
        fromCategory: 'Tops',
        toCategory: 'T-Shirts',
        toCategoryId: '6181a53a-9b21-4062-8190-6009b064b1af'
      },
      {
        productId: '3ab31437-e954-47a0-9010-74b694ef00ae',
        productName: 'asdf',
        fromCategory: 'Tops',
        toCategory: 'T-Shirts', // Default since name is unclear
        toCategoryId: '6181a53a-9b21-4062-8190-6009b064b1af'
      }
    ]

    console.log(`📦 Found ${moves.length} products to move from Tops\n`)

    // Get Accessories and Footwear products
    const accessoriesResult = await session.run(`
      MATCH (c:Category {name: 'Accessories', hierarchy: 'gents'})-[:HAS_PRODUCT]->(p:Product)
      RETURN p.id as id, p.name as name
    `)

    const footwearResult = await session.run(`
      MATCH (c:Category {name: 'Footwear', hierarchy: 'gents'})-[:HAS_PRODUCT]->(p:Product)
      RETURN p.id as id, p.name as name
    `)

    console.log(`\n📦 Found ${accessoriesResult.records.length} products in Accessories (parent category)`)
    accessoriesResult.records.forEach(r => {
      console.log(`  - ${r.get('name')} (${r.get('id')})`)
    })

    console.log(`\n📦 Found ${footwearResult.records.length} products in Footwear (parent category)`)
    footwearResult.records.forEach(r => {
      console.log(`  - ${r.get('name')} (${r.get('id')})`)
    })

    console.log(`\n⚠️  Note: Accessories and Footwear products need manual review to determine correct subcategory`)
    console.log(`   Accessories children: Watches, Belts`)
    console.log(`   Footwear children: Boots, Sneakers, Formal Shoes\n`)

    // Execute moves for Tops products
    console.log('🔄 Executing moves...\n')

    for (const move of moves) {
      console.log(`Moving "${move.productName}"`)
      console.log(`  From: ${move.fromCategory}`)
      console.log(`  To: ${move.toCategory}`)

      // Remove from parent category
      const deleteResult = await session.run(`
        MATCH (from:Category {name: $fromCategory, hierarchy: 'gents'})-[r:HAS_PRODUCT]->(p:Product {id: $productId})
        DELETE r
        RETURN p.name as productName
      `, {
        fromCategory: move.fromCategory,
        productId: move.productId
      })

      if (deleteResult.records.length === 0) {
        console.log(`  ⚠️  Product not found in ${move.fromCategory}`)
        continue
      }

      // Add to leaf category
      await session.run(`
        MATCH (p:Product {id: $productId})
        MATCH (to:Category {id: $toCategoryId})
        CREATE (to)-[:HAS_PRODUCT]->(p)
      `, {
        productId: move.productId,
        toCategoryId: move.toCategoryId
      })

      console.log(`  ✅ Moved successfully\n`)
    }

    // Verify results
    console.log('\n📊 VERIFICATION')
    console.log('================================================================================\n')

    const verifyResult = await session.run(`
      MATCH (tops:Category {name: 'Tops', hierarchy: 'gents'})
      OPTIONAL MATCH (tops)-[:HAS_PRODUCT]->(directP:Product)
      OPTIONAL MATCH (tops)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(p:Product)
      WITH tops, count(DISTINCT directP) as directCount, count(DISTINCT p) as totalCount
      RETURN directCount, totalCount
    `)

    const record = verifyResult.records[0]
    const directCount = record.get('directCount').toNumber ? record.get('directCount').toNumber() : record.get('directCount')
    const totalCount = record.get('totalCount').toNumber ? record.get('totalCount').toNumber() : record.get('totalCount')

    console.log(`Tops category:`)
    console.log(`  Direct products: ${directCount} (should be 0)`)
    console.log(`  Total with descendants: ${totalCount}`)

    if (directCount === 0) {
      console.log(`  ✅ Tops no longer has direct products!`)
    } else {
      console.log(`  ⚠️  Tops still has ${directCount} direct products`)
    }

    // Check child categories
    const childrenResult = await session.run(`
      MATCH (tops:Category {name: 'Tops', hierarchy: 'gents'})-[:HAS_CHILD]->(child:Category)
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
    console.log('\n✅ Cleanup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Manually review Accessories products (3) - move to Watches or Belts')
    console.log('   2. Manually review Footwear products (6) - move to Boots, Sneakers, or Formal Shoes')
    console.log('   3. Run this script again for Ladies and Kids hierarchies if needed')
    console.log('   4. Refresh homepage to see corrected counts\n')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
