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
    console.log('🔍 FINDING PROBLEMATIC CATEGORY\n')

    // Find the category that has both children AND direct products
    const result = await session.run(`
      MATCH (c:Category)
      WHERE EXISTS {
        MATCH (c)-[:HAS_CHILD]->(:Category)
      } AND EXISTS {
        MATCH (c)-[:HAS_PRODUCT]->(:Product)
      }

      OPTIONAL MATCH (c)-[:HAS_CHILD]->(child:Category)
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)
      OPTIONAL MATCH (c)<-[:HAS_CHILD*0..]-(root:Category {level: 0})

      WITH c, root,
           collect(DISTINCT {id: child.id, name: child.name}) as children,
           collect(DISTINCT {id: p.id, name: p.name, category: p.category}) as products

      RETURN root.name as hierarchy,
             c.id as categoryId,
             c.name as categoryName,
             c.level as level,
             children,
             products
    `)

    if (result.records.length === 0) {
      console.log('✅ No problematic categories found!')
      return
    }

    result.records.forEach(record => {
      const hierarchy = record.get('hierarchy')
      const categoryName = record.get('categoryName')
      const categoryId = record.get('categoryId')
      const level = record.get('level').toNumber ? record.get('level').toNumber() : record.get('level')
      const children = record.get('children').filter((c: any) => c.id !== null)
      const products = record.get('products').filter((p: any) => p.id !== null)

      console.log(`⚠️  PROBLEMATIC CATEGORY FOUND:`)
      console.log(`\nHierarchy: ${hierarchy}`)
      console.log(`Category: ${categoryName} (Level ${level})`)
      console.log(`Category ID: ${categoryId}`)
      console.log(`\nChildren (${children.length}):`)
      children.forEach((child: any) => {
        console.log(`  - ${child.name} (${child.id})`)
      })
      console.log(`\nDirect Products (${products.length}):`)
      products.forEach((product: any) => {
        console.log(`  - ${product.name} (${product.category}) [${product.id}]`)
      })
      console.log('\n' + '='.repeat(80))
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
    console.log('\n✅ Done!\n')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
