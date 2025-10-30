import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'factorybay123')
)

async function debugNeo4j() {
  const session = driver.session()
  try {
    console.log('=== Neo4j Database Debug ===\n')

    // Check connection
    console.log('1. Testing connection...')
    await session.run('RETURN 1')
    console.log('✅ Connection successful\n')

    // Count all nodes
    console.log('2. Counting nodes by label...')
    const countResult = await session.run(`
      MATCH (n)
      RETURN labels(n) as label, count(*) as count
      ORDER BY count DESC
    `)
    countResult.records.forEach(record => {
      console.log(`   ${record.get('label')[0]}: ${record.get('count')}`)
    })
    console.log()

    // Check for User nodes
    console.log('3. Checking User nodes...')
    const userResult = await session.run(`
      MATCH (u:User)
      RETURN u.id as id, u.email as email
      LIMIT 5
    `)
    if (userResult.records.length > 0) {
      console.log('   Found User nodes:')
      userResult.records.forEach(record => {
        console.log(`   - ID: ${record.get('id')}, Email: ${record.get('email')}`)
      })
    } else {
      console.log('   ⚠️  No User nodes found')
    }
    console.log()

    // Check for Product nodes
    console.log('4. Checking Product nodes...')
    const productResult = await session.run(`
      MATCH (p:Product)
      RETURN p.id as id, p.name as name
      LIMIT 5
    `)
    if (productResult.records.length > 0) {
      console.log('   Found Product nodes:')
      productResult.records.forEach(record => {
        console.log(`   - ID: ${record.get('id')}, Name: ${record.get('name')}`)
      })
    } else {
      console.log('   ⚠️  No Product nodes found')
    }
    console.log()

    // Check for ProductView nodes
    console.log('5. Checking ProductView nodes...')
    const viewResult = await session.run(`
      MATCH (v:ProductView)
      RETURN v.id as id, v.userId as userId, v.productId as productId, v.viewedAt as viewedAt
      LIMIT 5
    `)
    if (viewResult.records.length > 0) {
      console.log('   Found ProductView nodes:')
      viewResult.records.forEach(record => {
        console.log(`   - ID: ${record.get('id')}, UserID: ${record.get('userId')}, ProductID: ${record.get('productId')}`)
      })
    } else {
      console.log('   ⚠️  No ProductView nodes found')
    }
    console.log()

    // Check for UserPreference nodes
    console.log('6. Checking UserPreference nodes...')
    const prefResult = await session.run(`
      MATCH (p:UserPreference)
      RETURN p.id as id, p.userId as userId
      LIMIT 5
    `)
    if (prefResult.records.length > 0) {
      console.log('   Found UserPreference nodes:')
      prefResult.records.forEach(record => {
        console.log(`   - ID: ${record.get('id')}, UserID: ${record.get('userId')}`)
      })
    } else {
      console.log('   ⚠️  No UserPreference nodes found')
    }
    console.log()

    // Check for UserMeasurements nodes
    console.log('7. Checking UserMeasurements nodes...')
    const measResult = await session.run(`
      MATCH (m:UserMeasurements)
      RETURN m.id as id, m.userId as userId
      LIMIT 5
    `)
    if (measResult.records.length > 0) {
      console.log('   Found UserMeasurements nodes:')
      measResult.records.forEach(record => {
        console.log(`   - ID: ${record.get('id')}, UserID: ${record.get('userId')}`)
      })
    } else {
      console.log('   ⚠️  No UserMeasurements nodes found')
    }
    console.log()

    // Test trackProductView with actual user and product
    console.log('8. Testing trackProductView query...')
    const testUser = userResult.records[0]
    const testProduct = productResult.records[0]

    if (testUser && testProduct) {
      const userId = testUser.get('id')
      const productId = testProduct.get('id')
      console.log(`   Using User: ${userId}`)
      console.log(`   Using Product: ${productId}`)

      try {
        const viewId = crypto.randomUUID()
        const now = new Date().toISOString()

        const createResult = await session.run(
          `
          MATCH (u:User {id: $userId})
          MATCH (p:Product {id: $productId})
          CREATE (v:ProductView {
            id: $viewId,
            userId: $userId,
            productId: $productId,
            viewedAt: $viewedAt
          })
          CREATE (v)-[:VIEWED_BY]->(u)
          CREATE (v)-[:VIEWED_PRODUCT]->(p)
          RETURN v.id as viewId
          `,
          { userId, productId, viewId, viewedAt: now }
        )

        if (createResult.records.length > 0) {
          console.log(`   ✅ Successfully created ProductView: ${createResult.records[0].get('viewId')}`)
        } else {
          console.log('   ⚠️  Query succeeded but no records returned')
        }
      } catch (error: any) {
        console.log(`   ❌ Failed to create ProductView: ${error.message}`)
      }
    } else {
      console.log('   ⚠️  Cannot test - missing User or Product nodes')
    }

  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    await session.close()
    await driver.close()
  }
}

debugNeo4j()
