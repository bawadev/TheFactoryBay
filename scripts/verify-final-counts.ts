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
    console.log('🔍 VERIFYING FINAL PRODUCT COUNTS')
    console.log('================================================================================\n')

    // Get all hierarchies with their total product counts
    const hierarchiesResult = await session.run(`
      MATCH (root:Category {level: 0})
      OPTIONAL MATCH (root)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(p:Product)
      WITH root, count(DISTINCT p) as totalProducts
      RETURN root.name as hierarchy, totalProducts
      ORDER BY root.name
    `)

    console.log('📊 HIERARCHY TOTALS:\n')
    hierarchiesResult.records.forEach(r => {
      const count = r.get('totalProducts').toNumber ? r.get('totalProducts').toNumber() : r.get('totalProducts')
      console.log(`  ${r.get('hierarchy')}: ${count} total products`)
    })

    // Check for any parent categories with direct products (should be 0)
    const problematicResult = await session.run(`
      MATCH (c:Category)
      WHERE EXISTS {
        MATCH (c)-[:HAS_CHILD]->(:Category)
      } AND EXISTS {
        MATCH (c)-[:HAS_PRODUCT]->(:Product)
      }
      RETURN count(c) as problematicCount
    `)

    const problematicCount = problematicResult.records[0].get('problematicCount').toNumber
      ? problematicResult.records[0].get('problematicCount').toNumber()
      : problematicResult.records[0].get('problematicCount')

    console.log(`\n\n✅ VALIDATION CHECKS:\n`)
    console.log(`  Parent categories with direct products: ${problematicCount}`)
    if (problematicCount === 0) {
      console.log(`  ✅ Perfect! All products are in leaf categories only.`)
    } else {
      console.log(`  ⚠️  Found ${problematicCount} parent categories with direct products!`)
    }

    // Detailed breakdown by hierarchy
    console.log('\n\n📋 DETAILED BREAKDOWN BY HIERARCHY:\n')

    for (const hierarchy of ['Gents', 'Ladies', 'Kids']) {
      console.log(`\n${hierarchy.toUpperCase()}`)
      console.log('='.repeat(80))

      const detailResult = await session.run(`
        MATCH (root:Category {name: $hierarchy, level: 0})
        MATCH (root)-[:HAS_CHILD*0..]->(cat:Category)
        OPTIONAL MATCH (cat)-[:HAS_PRODUCT]->(directP:Product)
        OPTIONAL MATCH (cat)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(descP:Product)
        WITH cat,
             count(DISTINCT directP) as directCount,
             count(DISTINCT descP) as descendantCount
        WHERE directCount > 0 OR descendantCount > 0
        RETURN cat.name as name,
               cat.level as level,
               directCount,
               descendantCount
        ORDER BY cat.level, cat.name
      `, { hierarchy })

      detailResult.records.forEach(r => {
        const level = r.get('level').toNumber ? r.get('level').toNumber() : r.get('level')
        const directCount = r.get('directCount').toNumber ? r.get('directCount').toNumber() : r.get('directCount')
        const descendantCount = r.get('descendantCount').toNumber ? r.get('descendantCount').toNumber() : r.get('descendantCount')

        const indent = '  '.repeat(level)
        const warning = directCount > 0 && descendantCount > directCount ? ' ⚠️  HAS DIRECT PRODUCTS' : ''

        console.log(`${indent}[L${level}] ${r.get('name')}`)
        console.log(`${indent}  Direct: ${directCount} | Total: ${descendantCount}${warning}`)
      })
    }

    // List all leaf categories with product counts
    console.log('\n\n📦 LEAF CATEGORIES WITH PRODUCTS:\n')

    const leafResult = await session.run(`
      MATCH (leaf:Category)
      WHERE NOT EXISTS {
        MATCH (leaf)-[:HAS_CHILD]->(:Category)
      }
      OPTIONAL MATCH (leaf)-[:HAS_PRODUCT]->(p:Product)
      WITH leaf, count(p) as productCount
      WHERE productCount > 0
      MATCH (leaf)<-[:HAS_CHILD*0..]-(root:Category {level: 0})
      RETURN root.name as hierarchy,
             leaf.name as name,
             leaf.level as level,
             productCount
      ORDER BY hierarchy, level, name
    `)

    let currentHierarchy = ''
    leafResult.records.forEach(r => {
      const hierarchy = r.get('hierarchy')
      if (hierarchy !== currentHierarchy) {
        currentHierarchy = hierarchy
        console.log(`\n${currentHierarchy}:`)
      }
      const level = r.get('level').toNumber ? r.get('level').toNumber() : r.get('level')
      const productCount = r.get('productCount').toNumber ? r.get('productCount').toNumber() : r.get('productCount')
      console.log(`  [L${level}] ${r.get('name')}: ${productCount} products`)
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
    console.log('\n\n✅ Verification complete!\n')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
