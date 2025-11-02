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
    console.log('🔧 Fixing category parent-child relationships...\n')

    // First, remove any existing HAS_CHILD relationships
    console.log('Removing existing HAS_CHILD relationships...')
    await session.run(`
      MATCH ()-[r:HAS_CHILD]->()
      DELETE r
    `)
    console.log('✓ Removed\n')

    // Create HAS_CHILD relationships based on parentId
    console.log('Creating HAS_CHILD relationships based on parentId...')
    const result = await session.run(`
      MATCH (child:Category)
      WHERE child.parentId IS NOT NULL
      MATCH (parent:Category {id: child.parentId})
      MERGE (parent)-[:HAS_CHILD]->(child)
      RETURN parent.name as parentName, child.name as childName, parent.hierarchy as hierarchy
    `)

    console.log(`✓ Created ${result.records.length} HAS_CHILD relationships\n`)

    // Show summary by hierarchy
    const stats = new Map<string, number>()
    result.records.forEach(r => {
      const hierarchy = r.get('hierarchy')
      stats.set(hierarchy, (stats.get(hierarchy) || 0) + 1)
    })

    console.log('Summary by hierarchy:')
    stats.forEach((count, hierarchy) => {
      console.log(`  ${hierarchy}: ${count} relationships`)
    })

    // Verify the fix
    console.log('\n🔍 Verifying fix...\n')

    const ladiesResult = await session.run(`
      MATCH (c:Category {hierarchy: 'ladies', level: 0})
      OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)
      WITH c, collect(DISTINCT descendant.id) + collect(DISTINCT c.id) as allCategoryIds
      UNWIND allCategoryIds as catId
      MATCH (cat:Category {id: catId})-[:HAS_PRODUCT]->(p:Product)
      RETURN count(DISTINCT p) as productCount
    `)

    if (ladiesResult.records.length > 0) {
      const count = ladiesResult.records[0].get('productCount').toNumber ?
        ladiesResult.records[0].get('productCount').toNumber() :
        ladiesResult.records[0].get('productCount')
      console.log(`✅ Ladies hierarchy now has ${count} products accessible!`)
    }

    const gentsResult = await session.run(`
      MATCH (c:Category {hierarchy: 'gents', level: 0})
      OPTIONAL MATCH (c)-[:HAS_CHILD*0..]->(descendant:Category)
      WITH c, collect(DISTINCT descendant.id) + collect(DISTINCT c.id) as allCategoryIds
      UNWIND allCategoryIds as catId
      MATCH (cat:Category {id: catId})-[:HAS_PRODUCT]->(p:Product)
      RETURN count(DISTINCT p) as productCount
    `)

    if (gentsResult.records.length > 0) {
      const count = gentsResult.records[0].get('productCount').toNumber ?
        gentsResult.records[0].get('productCount').toNumber() :
        gentsResult.records[0].get('productCount')
      console.log(`✅ Gents hierarchy now has ${count} products accessible!`)
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
  .then(() => {
    console.log('\n✅ Category relationships fixed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
