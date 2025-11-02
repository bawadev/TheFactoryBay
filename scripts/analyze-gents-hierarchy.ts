import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

interface CategoryNode {
  id: string;
  name: string;
  level: number;
  hierarchy: string;
  directProducts: number;
  descendantProducts: number;
  childrenSum: number;
  children: CategoryNode[];
}

interface ProductAssignment {
  productId: string;
  productName: string;
  categories: string[];
}

async function analyzeGentsHierarchy() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );

  try {
    const session = driver.session();

    console.log('='.repeat(80));
    console.log('GENTS HIERARCHY ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    // 1. Map out complete Gents hierarchy
    console.log('1. MAPPING COMPLETE GENTS HIERARCHY');
    console.log('-'.repeat(80));

    const hierarchyResult = await session.run(`
      MATCH (root:Category {hierarchy: 'gents', level: 0})
      OPTIONAL MATCH path = (root)-[:HAS_CHILD*0..]->(child:Category)
      WITH root, child, length(path) as depth
      ORDER BY depth, child.level, child.name
      RETURN
        child.id as id,
        child.name as name,
        child.level as level,
        child.hierarchy as hierarchy,
        depth
    `);

    console.log(`Found ${hierarchyResult.records.length} categories in Gents hierarchy:\n`);
    hierarchyResult.records.forEach(record => {
      const depth = Number(record.get('depth') || 0);
      const level = Number(record.get('level') || 0);
      const indent = '  '.repeat(depth);
      console.log(`${indent}[L${level}] ${record.get('name')} (${record.get('id')})`);
    });

    console.log('\n');

    // 2. Calculate product counts for each category
    console.log('2. PRODUCT COUNTS FOR EACH CATEGORY');
    console.log('-'.repeat(80));

    const countResults = await session.run(`
      MATCH (root:Category {hierarchy: 'gents', level: 0})
      OPTIONAL MATCH path = (root)-[:HAS_CHILD*0..]->(category:Category)
      WITH category, length(path) as depth

      // Direct products
      OPTIONAL MATCH (category)-[:HAS_PRODUCT]->(directP:Product)
      WITH category, depth, count(DISTINCT directP) as directCount

      // Descendant products (including self)
      OPTIONAL MATCH (category)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(descP:Product)
      WITH category, depth, directCount, count(DISTINCT descP) as descendantCount

      // Immediate children's descendant counts
      OPTIONAL MATCH (category)-[:HAS_CHILD]->(child:Category)
      OPTIONAL MATCH (child)-[:HAS_CHILD*0..]->(childDesc:Category)-[:HAS_PRODUCT]->(childP:Product)
      WITH category, depth, directCount, descendantCount, child, count(DISTINCT childP) as childDescCount

      ORDER BY depth, category.level, category.name
      RETURN
        category.id as id,
        category.name as name,
        category.level as level,
        depth,
        directCount,
        descendantCount,
        collect(DISTINCT {childId: child.id, childName: child.name, count: childDescCount}) as children
    `);

    const categoryMap = new Map<string, any>();

    countResults.records.forEach(record => {
      const id = record.get('id');
      const name = record.get('name');
      const level = Number(record.get('level') || 0);
      const depth = Number(record.get('depth') || 0);
      const directCount = Number(record.get('directCount') || 0);
      const descendantCount = Number(record.get('descendantCount') || 0);
      const children = record.get('children').filter((c: any) => c.childId !== null);

      const childrenSum = children.reduce((sum: number, child: any) => sum + Number(child.count || 0), 0);

      const indent = '  '.repeat(depth);
      const status = directCount > 0 && children.length > 0 ? ' ⚠️  HAS BOTH DIRECT PRODUCTS AND CHILDREN' : '';
      const mismatch = childrenSum !== descendantCount && children.length > 0 ? ` ⚠️  MISMATCH: Children sum (${childrenSum}) != Descendants (${descendantCount})` : '';

      console.log(`${indent}[L${level}] ${name}`);
      console.log(`${indent}  Direct: ${directCount} | Descendants: ${descendantCount} | Children Sum: ${childrenSum}${status}${mismatch}`);

      if (children.length > 0) {
        console.log(`${indent}  Children:`);
        children.forEach((child: any) => {
          console.log(`${indent}    - ${child.childName}: ${child.count} products`);
        });
      }
      console.log('');

      categoryMap.set(id, {
        id, name, level, directCount, descendantCount, childrenSum, children
      });
    });

    // 3. Specific investigation of Tops category
    console.log('3. DETAILED INVESTIGATION: GENTS > CLOTHING > TOPS');
    console.log('-'.repeat(80));

    const topsResult = await session.run(`
      MATCH (tops:Category {name: 'Tops', hierarchy: 'gents'})

      // Find all children
      OPTIONAL MATCH (tops)-[:HAS_CHILD]->(child:Category)

      // Find direct products
      OPTIONAL MATCH (tops)-[:HAS_PRODUCT]->(directP:Product)

      // Find all descendant products
      OPTIONAL MATCH (tops)-[:HAS_CHILD*0..]->(desc:Category)-[:HAS_PRODUCT]->(descP:Product)

      RETURN
        tops.id as topsId,
        tops.name as topsName,
        collect(DISTINCT {id: child.id, name: child.name}) as children,
        collect(DISTINCT {id: directP.id, name: directP.name}) as directProducts,
        collect(DISTINCT {id: descP.id, name: descP.name, category: desc.name}) as descendantProducts
    `);

    if (topsResult.records.length > 0) {
      const record = topsResult.records[0];
      const children = record.get('children').filter((c: any) => c.id !== null);
      const directProducts = record.get('directProducts').filter((p: any) => p.id !== null);
      const descendantProducts = record.get('descendantProducts').filter((p: any) => p.id !== null);

      console.log(`Tops Category: ${record.get('topsId')}`);
      console.log(`\nChildren (${children.length}):`);
      children.forEach((child: any) => {
        console.log(`  - ${child.name} (${child.id})`);
      });

      console.log(`\nDirect Products on Tops (${directProducts.length}):`);
      if (directProducts.length > 0) {
        directProducts.forEach((p: any) => {
          console.log(`  - ${p.name} (${p.id})`);
        });
      } else {
        console.log('  None (correct - parent categories should not have direct products)');
      }

      console.log(`\nAll Descendant Products (${descendantProducts.length}):`);

      // Group by product to see if duplicates exist
      const productGroups = new Map<string, any[]>();
      descendantProducts.forEach((p: any) => {
        if (!productGroups.has(p.id)) {
          productGroups.set(p.id, []);
        }
        productGroups.get(p.id)!.push(p);
      });

      productGroups.forEach((assignments, productId) => {
        const productName = assignments[0].name;
        const categories = [...new Set(assignments.map(a => a.category))];
        const isDuplicate = categories.length > 1;

        console.log(`  - ${productName} (${productId})`);
        console.log(`    Categories: ${categories.join(', ')}${isDuplicate ? ' ⚠️  DUPLICATE' : ''}`);
      });
    }

    console.log('\n');

    // 4. Check for products in multiple categories within same lineage
    console.log('4. PRODUCTS ASSIGNED TO MULTIPLE CATEGORIES IN SAME LINEAGE');
    console.log('-'.repeat(80));

    const duplicateResult = await session.run(`
      MATCH (root:Category {hierarchy: 'gents', level: 0})
      MATCH (root)-[:HAS_CHILD*0..]->(cat:Category)
      MATCH (cat)-[:HAS_PRODUCT]->(p:Product)
      WITH p, collect(DISTINCT {id: cat.id, name: cat.name, level: cat.level}) as categories
      WHERE size(categories) > 1
      RETURN
        p.id as productId,
        p.name as productName,
        categories
      ORDER BY p.name
    `);

    if (duplicateResult.records.length > 0) {
      console.log(`Found ${duplicateResult.records.length} products assigned to multiple categories:\n`);
      duplicateResult.records.forEach(record => {
        const productName = record.get('productName');
        const productId = record.get('productId');
        const categories = record.get('categories');

        console.log(`⚠️  ${productName} (${productId})`);
        console.log(`   Assigned to ${categories.length} categories:`);
        categories.forEach((cat: any) => {
          console.log(`     - [L${cat.level}] ${cat.name} (${cat.id})`);
        });
        console.log('');
      });
    } else {
      console.log('✓ No products found with multiple category assignments in same lineage\n');
    }

    // 5. Verify specific Tops > Shirts relationship
    console.log('5. VERIFY TOPS > SHIRTS RELATIONSHIP');
    console.log('-'.repeat(80));

    const shirtsResult = await session.run(`
      MATCH (tops:Category {name: 'Tops', hierarchy: 'gents'})
      MATCH (tops)-[:HAS_CHILD]->(shirts:Category {name: 'Shirts'})

      // Shirts' direct products
      OPTIONAL MATCH (shirts)-[:HAS_PRODUCT]->(shirtsP:Product)

      // Shirts' descendant products
      OPTIONAL MATCH (shirts)-[:HAS_CHILD*0..]->(shirtsDesc:Category)-[:HAS_PRODUCT]->(shirtsDescP:Product)

      // Shirts' children
      OPTIONAL MATCH (shirts)-[:HAS_CHILD]->(shirtsChild:Category)

      RETURN
        shirts.id as shirtsId,
        shirts.name as shirtsName,
        count(DISTINCT shirtsP) as directCount,
        count(DISTINCT shirtsDescP) as descendantCount,
        collect(DISTINCT {id: shirtsChild.id, name: shirtsChild.name}) as children,
        collect(DISTINCT {id: shirtsDescP.id, name: shirtsDescP.name}) as products
    `);

    if (shirtsResult.records.length > 0) {
      const record = shirtsResult.records[0];
      const children = record.get('children').filter((c: any) => c.id !== null);
      const products = record.get('products').filter((p: any) => p.id !== null);

      console.log(`Shirts Category: ${record.get('shirtsId')}`);
      console.log(`Direct Products: ${record.get('directCount')}`);
      console.log(`Descendant Products: ${record.get('descendantCount')}`);
      console.log(`Children: ${children.length}`);

      if (children.length > 0) {
        console.log('\nShirts Children:');
        children.forEach((child: any) => {
          console.log(`  - ${child.name} (${child.id})`);
        });
      }

      console.log(`\nProducts under Shirts (${products.length}):`);
      products.forEach((p: any) => {
        console.log(`  - ${p.name} (${p.id})`);
      });
    }

    console.log('\n');

    // 6. Summary and Recommendations
    console.log('6. SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(80));

    const summaryResult = await session.run(`
      MATCH (root:Category {hierarchy: 'gents', level: 0})
      MATCH (root)-[:HAS_CHILD*0..]->(cat:Category)

      // Categories with both direct products and children
      OPTIONAL MATCH (cat)-[:HAS_CHILD]->(child:Category)
      OPTIONAL MATCH (cat)-[:HAS_PRODUCT]->(directP:Product)
      WITH cat, count(DISTINCT child) as childCount, count(DISTINCT directP) as directCount
      WHERE childCount > 0 AND directCount > 0

      RETURN count(cat) as problematicCategories
    `);

    const problematicCount = summaryResult.records[0]?.get('problematicCategories') || 0;

    console.log(`\nProblematic categories (have both children AND direct products): ${problematicCount}`);

    if (problematicCount > 0) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('Categories should NOT have direct product assignments if they have children.');
      console.log('Products should only be assigned to leaf categories (categories without children).');
      console.log('\nRECOMMENDATION:');
      console.log('1. Remove direct HAS_PRODUCT relationships from parent categories');
      console.log('2. Move those products to appropriate leaf categories');
      console.log('3. Parent counts will automatically reflect sum of descendants');
    }

    await session.close();
  } catch (error) {
    console.error('Error analyzing hierarchy:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

// Run the analysis
analyzeGentsHierarchy()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
