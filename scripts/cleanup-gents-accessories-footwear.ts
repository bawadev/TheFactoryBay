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
    console.log('🧹 CLEANING UP GENTS ACCESSORIES AND FOOTWEAR')
    console.log('================================================================================\n')

    // First, get the actual products in Accessories and Footwear
    console.log('📦 Analyzing current state...\n')

    const accessoriesResult = await session.run(`
      MATCH (c:Category {name: 'Accessories', hierarchy: 'gents'})-[:HAS_PRODUCT]->(p:Product)
      RETURN p.id as id, p.name as name, p.category as category
    `)

    const footwearResult = await session.run(`
      MATCH (c:Category {name: 'Footwear', hierarchy: 'gents'})-[:HAS_PRODUCT]->(p:Product)
      RETURN p.id as id, p.name as name, p.category as category
    `)

    console.log(`Accessories products (${accessoriesResult.records.length}):`)
    const accessoriesProducts = accessoriesResult.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      category: r.get('category')
    }))
    accessoriesProducts.forEach(p => {
      console.log(`  - ${p.name} (${p.category}) [${p.id}]`)
    })

    console.log(`\nFootwear products (${footwearResult.records.length}):`)
    const footwearProducts = footwearResult.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      category: r.get('category')
    }))
    footwearProducts.forEach(p => {
      console.log(`  - ${p.name} (${p.category}) [${p.id}]`)
    })

    // Get available child categories
    console.log('\n📋 Available child categories:\n')

    const accessoriesChildrenResult = await session.run(`
      MATCH (parent:Category {name: 'Accessories', hierarchy: 'gents'})-[:HAS_CHILD]->(child:Category)
      RETURN child.id as id, child.name as name
      ORDER BY child.name
    `)
    console.log('Accessories children:')
    accessoriesChildrenResult.records.forEach(r => {
      console.log(`  - ${r.get('name')} (${r.get('id')})`)
    })

    const footwearChildrenResult = await session.run(`
      MATCH (parent:Category {name: 'Footwear', hierarchy: 'gents'})-[:HAS_CHILD]->(child:Category)
      RETURN child.id as id, child.name as name
      ORDER BY child.name
    `)
    console.log('\nFootwear children:')
    footwearChildrenResult.records.forEach(r => {
      console.log(`  - ${r.get('name')} (${r.get('id')})`)
    })

    // Define moves based on product analysis
    const moves: ProductMove[] = []

    // Accessories: All "Leather Belt Classic" → Belts
    const beltsCategory = accessoriesChildrenResult.records.find(r => r.get('name') === 'Belts')
    if (beltsCategory) {
      const beltsCategoryId = beltsCategory.get('id')
      accessoriesProducts.forEach(product => {
        if (product.name.toLowerCase().includes('belt')) {
          moves.push({
            productId: product.id,
            productName: product.name,
            fromCategory: 'Accessories',
            toCategory: 'Belts',
            toCategoryId: beltsCategoryId
          })
        } else if (product.name.toLowerCase().includes('watch')) {
          const watchesCategory = accessoriesChildrenResult.records.find(r => r.get('name') === 'Watches')
          if (watchesCategory) {
            moves.push({
              productId: product.id,
              productName: product.name,
              fromCategory: 'Accessories',
              toCategory: 'Watches',
              toCategoryId: watchesCategory.get('id')
            })
          }
        }
      })
    }

    // Footwear: Sneakers and Running Shoes → Sneakers
    const sneakersCategory = footwearChildrenResult.records.find(r => r.get('name') === 'Sneakers')
    if (sneakersCategory) {
      const sneakersCategoryId = sneakersCategory.get('id')
      footwearProducts.forEach(product => {
        const name = product.name.toLowerCase()
        if (name.includes('sneaker') || name.includes('running')) {
          moves.push({
            productId: product.id,
            productName: product.name,
            fromCategory: 'Footwear',
            toCategory: 'Sneakers',
            toCategoryId: sneakersCategoryId
          })
        } else if (name.includes('boot')) {
          const bootsCategory = footwearChildrenResult.records.find(r => r.get('name') === 'Boots')
          if (bootsCategory) {
            moves.push({
              productId: product.id,
              productName: product.name,
              fromCategory: 'Footwear',
              toCategory: 'Boots',
              toCategoryId: bootsCategory.get('id')
            })
          }
        } else if (name.includes('formal') || name.includes('oxford') || name.includes('derby')) {
          const formalCategory = footwearChildrenResult.records.find(r => r.get('name') === 'Formal Shoes')
          if (formalCategory) {
            moves.push({
              productId: product.id,
              productName: product.name,
              fromCategory: 'Footwear',
              toCategory: 'Formal Shoes',
              toCategoryId: formalCategory.get('id')
            })
          }
        }
      })
    }

    console.log(`\n\n🔄 Executing ${moves.length} moves...\n`)

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

    const verifyAccessories = await session.run(`
      MATCH (accessories:Category {name: 'Accessories', hierarchy: 'gents'})
      OPTIONAL MATCH (accessories)-[:HAS_PRODUCT]->(directP:Product)
      OPTIONAL MATCH (accessories)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(p:Product)
      WITH accessories, count(DISTINCT directP) as directCount, count(DISTINCT p) as totalCount
      RETURN directCount, totalCount
    `)

    const accRecord = verifyAccessories.records[0]
    const accDirectCount = accRecord.get('directCount').toNumber ? accRecord.get('directCount').toNumber() : accRecord.get('directCount')
    const accTotalCount = accRecord.get('totalCount').toNumber ? accRecord.get('totalCount').toNumber() : accRecord.get('totalCount')

    console.log(`Accessories category:`)
    console.log(`  Direct products: ${accDirectCount} (should be 0)`)
    console.log(`  Total with descendants: ${accTotalCount}`)

    if (accDirectCount === 0) {
      console.log(`  ✅ Accessories no longer has direct products!`)
    } else {
      console.log(`  ⚠️  Accessories still has ${accDirectCount} direct products`)
    }

    const verifyFootwear = await session.run(`
      MATCH (footwear:Category {name: 'Footwear', hierarchy: 'gents'})
      OPTIONAL MATCH (footwear)-[:HAS_PRODUCT]->(directP:Product)
      OPTIONAL MATCH (footwear)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(p:Product)
      WITH footwear, count(DISTINCT directP) as directCount, count(DISTINCT p) as totalCount
      RETURN directCount, totalCount
    `)

    const footRecord = verifyFootwear.records[0]
    const footDirectCount = footRecord.get('directCount').toNumber ? footRecord.get('directCount').toNumber() : footRecord.get('directCount')
    const footTotalCount = footRecord.get('totalCount').toNumber ? footRecord.get('totalCount').toNumber() : footRecord.get('totalCount')

    console.log(`\nFootwear category:`)
    console.log(`  Direct products: ${footDirectCount} (should be 0)`)
    console.log(`  Total with descendants: ${footTotalCount}`)

    if (footDirectCount === 0) {
      console.log(`  ✅ Footwear no longer has direct products!`)
    } else {
      console.log(`  ⚠️  Footwear still has ${footDirectCount} direct products`)
    }

    // Check child categories
    console.log(`\n\nAccessories child categories:`)
    const accChildrenVerify = await session.run(`
      MATCH (accessories:Category {name: 'Accessories', hierarchy: 'gents'})-[:HAS_CHILD]->(child:Category)
      OPTIONAL MATCH (child)-[:HAS_PRODUCT]->(p:Product)
      WITH child, count(p) as productCount
      RETURN child.name as name, productCount
      ORDER BY child.name
    `)
    accChildrenVerify.records.forEach(r => {
      const count = r.get('productCount').toNumber ? r.get('productCount').toNumber() : r.get('productCount')
      console.log(`  ${r.get('name')}: ${count} products`)
    })

    console.log(`\nFootwear child categories:`)
    const footChildrenVerify = await session.run(`
      MATCH (footwear:Category {name: 'Footwear', hierarchy: 'gents'})-[:HAS_CHILD]->(child:Category)
      OPTIONAL MATCH (child)-[:HAS_PRODUCT]->(p:Product)
      WITH child, count(p) as productCount
      RETURN child.name as name, productCount
      ORDER BY child.name
    `)
    footChildrenVerify.records.forEach(r => {
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
    console.log('\n✅ Gents Accessories and Footwear cleanup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Analyze Ladies hierarchy for similar issues')
    console.log('   2. Analyze Kids hierarchy for similar issues')
    console.log('   3. Refresh homepage to verify all counts are correct\n')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
