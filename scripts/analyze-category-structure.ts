import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

async function analyzeCategoryStructure() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  console.log('='.repeat(80));
  console.log('CATEGORY STRUCTURE ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Get all categories with their actual parent-child relationships
    console.log('Step 1: Analyzing actual category relationships...\n');

    const structureQuery = `
      MATCH (c:Category)
      OPTIONAL MATCH (parent:Category)-[:PARENT_OF]->(c)
      OPTIONAL MATCH (c)-[:PARENT_OF]->(child:Category)
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)

      RETURN c.id as id,
             c.name as name,
             c.level as level,
             parent.name as parentName,
             parent.id as parentId,
             COLLECT(DISTINCT child.name) as childrenNames,
             COUNT(DISTINCT child) as childrenCount,
             COUNT(DISTINCT p) as directProductCount
      ORDER BY c.level, c.name
    `;

    const result = await session.run(structureQuery);

    console.log('ALL CATEGORIES WITH RELATIONSHIPS:');
    console.log('-'.repeat(80));
    console.log();

    const categoryMap = new Map();

    for (const record of result.records) {
      const id = record.get('id');
      const name = record.get('name');
      const level = neo4j.isInt(record.get('level')) ? record.get('level').toNumber() : record.get('level');
      const parentName = record.get('parentName');
      const parentId = record.get('parentId');
      const childrenNames = record.get('childrenNames');
      const childrenCount = neo4j.isInt(record.get('childrenCount')) ? record.get('childrenCount').toNumber() : record.get('childrenCount');
      const directProductCount = neo4j.isInt(record.get('directProductCount')) ? record.get('directProductCount').toNumber() : record.get('directProductCount');

      categoryMap.set(id, {
        id,
        name,
        level,
        parentName,
        parentId,
        childrenNames,
        childrenCount,
        directProductCount
      });

      console.log(`Category: ${name} (ID: ${id})`);
      console.log(`  Level: ${level}`);
      console.log(`  Parent: ${parentName || 'NONE'} ${parentId ? `(${parentId})` : ''}`);
      console.log(`  Children (${childrenCount}): ${childrenNames.length > 0 ? childrenNames.join(', ') : 'NONE'}`);
      console.log(`  Direct Products: ${directProductCount}`);
      console.log();
    }

    // 2. Build hierarchy trees
    console.log();
    console.log('='.repeat(80));
    console.log('HIERARCHY TREES:');
    console.log('='.repeat(80));
    console.log();

    // Get root categories (level 0)
    const rootQuery = `
      MATCH (root:Category {level: 0})
      RETURN root.id as id, root.name as name
      ORDER BY root.name
    `;

    const rootResult = await session.run(rootQuery);

    for (const record of rootResult.records) {
      const rootId = record.get('id');
      const rootName = record.get('name');

      console.log(`\n${rootName} (Root - Level 0)`);
      console.log('═'.repeat(80));

      // Get full tree for this root
      const treeQuery = `
        MATCH path = (root:Category {id: $rootId})-[:PARENT_OF*0..]->(descendant:Category)
        OPTIONAL MATCH (descendant)-[:HAS_PRODUCT]->(p:Product)
        WITH descendant, LENGTH(path) as depth, COUNT(DISTINCT p) as directProducts
        ORDER BY depth, descendant.name
        RETURN descendant.id as id,
               descendant.name as name,
               descendant.level as level,
               depth,
               directProducts
      `;

      const treeResult = await session.run(treeQuery, { rootId });

      for (const treeRecord of treeResult.records) {
        const name = treeRecord.get('name');
        const level = neo4j.isInt(treeRecord.get('level')) ? treeRecord.get('level').toNumber() : treeRecord.get('level');
        const depth = neo4j.isInt(treeRecord.get('depth')) ? treeRecord.get('depth').toNumber() : treeRecord.get('depth');
        const directProducts = neo4j.isInt(treeRecord.get('directProducts')) ? treeRecord.get('directProducts').toNumber() : treeRecord.get('directProducts');

        const indent = '  '.repeat(depth);
        const productInfo = directProducts > 0 ? ` [${directProducts} products]` : '';
        console.log(`${indent}${name} (L${level})${productInfo}`);
      }
    }

    // 3. Find orphaned categories (no parent but not level 0)
    console.log();
    console.log();
    console.log('='.repeat(80));
    console.log('ORPHANED CATEGORIES (No parent but not root):');
    console.log('='.repeat(80));
    console.log();

    const orphanQuery = `
      MATCH (c:Category)
      WHERE c.level > 0 AND NOT EXISTS((c)<-[:PARENT_OF]-(:Category))
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)
      RETURN c.id as id,
             c.name as name,
             c.level as level,
             COUNT(DISTINCT p) as directProducts
      ORDER BY c.level, c.name
    `;

    const orphanResult = await session.run(orphanQuery);

    if (orphanResult.records.length === 0) {
      console.log('✓ No orphaned categories found\n');
    } else {
      console.log(`Found ${orphanResult.records.length} orphaned categories:\n`);

      for (const record of orphanResult.records) {
        const name = record.get('name');
        const id = record.get('id');
        const level = neo4j.isInt(record.get('level')) ? record.get('level').toNumber() : record.get('level');
        const directProducts = neo4j.isInt(record.get('directProducts')) ? record.get('directProducts').toNumber() : record.get('directProducts');

        console.log(`  ${name} (ID: ${id})`);
        console.log(`    Level: ${level} (should have a parent!)`);
        console.log(`    Direct Products: ${directProducts}`);
        console.log();
      }
    }

    // 4. Check for the specific issue mentioned: Gents > Clothing > Tops
    console.log();
    console.log('='.repeat(80));
    console.log('SPECIFIC ISSUE: Gents > Clothing > Tops (showing 9) vs Shirts (showing 6)');
    console.log('='.repeat(80));
    console.log();

    const specificQuery = `
      // Find Gents > Clothing > Tops
      MATCH (gents:Category {name: 'Gents'})-[:PARENT_OF]->(clothing:Category {name: 'Clothing'})-[:PARENT_OF]->(tops:Category {name: 'Tops'})

      // Get direct products of Tops
      OPTIONAL MATCH (tops)-[:HAS_PRODUCT]->(topsProduct:Product)

      // Get all children of Tops
      OPTIONAL MATCH (tops)-[:PARENT_OF]->(topsChild:Category)

      // Get products from Tops children
      OPTIONAL MATCH (tops)-[:PARENT_OF*]->(topsDescendant:Category)-[:HAS_PRODUCT]->(descendantProduct:Product)

      // Get Shirts specifically
      OPTIONAL MATCH (tops)-[:PARENT_OF]->(shirts:Category {name: 'Shirts'})
      OPTIONAL MATCH (shirts)-[:HAS_PRODUCT]->(shirtsProduct:Product)

      RETURN
        tops.id as topsId,
        tops.name as topsName,
        COUNT(DISTINCT topsProduct) as topsDirectProducts,
        COUNT(DISTINCT topsChild) as topsChildrenCount,
        COLLECT(DISTINCT topsChild.name) as topsChildrenNames,
        COUNT(DISTINCT descendantProduct) as topsDescendantProducts,
        COUNT(DISTINCT topsProduct) + COUNT(DISTINCT descendantProduct) as topsTotalProducts,
        shirts.id as shirtsId,
        COUNT(DISTINCT shirtsProduct) as shirtsProducts,
        COLLECT(DISTINCT shirtsProduct.name) as shirtsProductNames,
        COLLECT(DISTINCT topsProduct.name) as topsProductNames,
        COLLECT(DISTINCT descendantProduct.name) as allDescendantProductNames
    `;

    const specificResult = await session.run(specificQuery);

    if (specificResult.records.length === 0) {
      console.log('Could not find Gents > Clothing > Tops hierarchy\n');
    } else {
      const record = specificResult.records[0];

      const topsDirectProducts = neo4j.isInt(record.get('topsDirectProducts')) ? record.get('topsDirectProducts').toNumber() : record.get('topsDirectProducts');
      const topsChildrenCount = neo4j.isInt(record.get('topsChildrenCount')) ? record.get('topsChildrenCount').toNumber() : record.get('topsChildrenCount');
      const topsDescendantProducts = neo4j.isInt(record.get('topsDescendantProducts')) ? record.get('topsDescendantProducts').toNumber() : record.get('topsDescendantProducts');
      const topsTotalProducts = neo4j.isInt(record.get('topsTotalProducts')) ? record.get('topsTotalProducts').toNumber() : record.get('topsTotalProducts');
      const shirtsProducts = neo4j.isInt(record.get('shirtsProducts')) ? record.get('shirtsProducts').toNumber() : record.get('shirtsProducts');

      console.log('TOPS Category:');
      console.log(`  ID: ${record.get('topsId')}`);
      console.log(`  Direct Products: ${topsDirectProducts}`);
      console.log(`  Children Count: ${topsChildrenCount}`);
      console.log(`  Children Names: ${record.get('topsChildrenNames').join(', ')}`);
      console.log(`  Descendant Products: ${topsDescendantProducts}`);
      console.log(`  Total Products: ${topsTotalProducts}`);
      console.log(`  Tops Direct Product Names: ${record.get('topsProductNames').join(', ')}`);
      console.log();

      console.log('SHIRTS Category (child of Tops):');
      console.log(`  ID: ${record.get('shirtsId') || 'NOT FOUND'}`);
      console.log(`  Direct Products: ${shirtsProducts}`);
      console.log(`  Product Names: ${record.get('shirtsProductNames').join(', ')}`);
      console.log();

      console.log('All Descendant Products from Tops:');
      console.log(`  ${record.get('allDescendantProductNames').join(', ')}`);
      console.log();

      // Explanation
      console.log('ANALYSIS:');
      if (topsDirectProducts > 0 && topsChildrenCount > 0) {
        console.log('  ⚠ ISSUE: Tops has both direct products AND children');
        console.log('  This causes the count to be: direct + descendant = ' + topsTotalProducts);
        console.log('  But it should only show descendant products from children.');
      }

      if (topsTotalProducts !== topsDescendantProducts + topsDirectProducts) {
        console.log('  ⚠ ISSUE: Total calculation mismatch');
      }

      if (topsTotalProducts > shirtsProducts && topsChildrenCount === 1) {
        console.log('  ⚠ ISSUE: Tops shows more products than Shirts (its only child)');
        console.log('  This is because Tops has direct products attached to it.');
      }
    }

    // 5. Summary statistics
    console.log();
    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY STATISTICS:');
    console.log('='.repeat(80));
    console.log();

    const summaryQuery = `
      MATCH (c:Category)
      OPTIONAL MATCH (c)-[:PARENT_OF]->(child:Category)
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(p:Product)
      WITH c, COUNT(DISTINCT child) as childCount, COUNT(DISTINCT p) as productCount

      RETURN
        SUM(CASE WHEN c.level = 0 THEN 1 ELSE 0 END) as rootCategories,
        SUM(CASE WHEN c.level = 1 THEN 1 ELSE 0 END) as level1Categories,
        SUM(CASE WHEN c.level = 2 THEN 1 ELSE 0 END) as level2Categories,
        SUM(CASE WHEN c.level = 3 THEN 1 ELSE 0 END) as level3Categories,
        SUM(CASE WHEN c.level > 3 THEN 1 ELSE 0 END) as deeperLevelCategories,
        SUM(CASE WHEN childCount > 0 AND productCount > 0 THEN 1 ELSE 0 END) as categoriesWithBothChildrenAndProducts,
        SUM(CASE WHEN childCount = 0 AND productCount = 0 THEN 1 ELSE 0 END) as emptyLeafCategories,
        SUM(CASE WHEN childCount > 0 THEN 1 ELSE 0 END) as categoriesWithChildren,
        SUM(CASE WHEN productCount > 0 THEN 1 ELSE 0 END) as categoriesWithProducts
    `;

    const summaryResult = await session.run(summaryQuery);
    const summary = summaryResult.records[0];

    console.log(`Root Categories (L0): ${summary.get('rootCategories')}`);
    console.log(`Level 1 Categories: ${summary.get('level1Categories')}`);
    console.log(`Level 2 Categories: ${summary.get('level2Categories')}`);
    console.log(`Level 3 Categories: ${summary.get('level3Categories')}`);
    console.log(`Deeper Level Categories: ${summary.get('deeperLevelCategories')}`);
    console.log();
    console.log(`Categories with children: ${summary.get('categoriesWithChildren')}`);
    console.log(`Categories with products: ${summary.get('categoriesWithProducts')}`);
    console.log(`Categories with BOTH children AND products: ${summary.get('categoriesWithBothChildrenAndProducts')}`);
    console.log(`Empty leaf categories: ${summary.get('emptyLeafCategories')}`);
    console.log();

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the analysis
analyzeCategoryStructure()
  .then(() => {
    console.log('\n✓ Analysis completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Analysis failed:', error);
    process.exit(1);
  });
