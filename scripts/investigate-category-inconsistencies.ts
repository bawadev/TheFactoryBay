import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

interface CategoryInfo {
  id: string;
  name: string;
  level: number;
  parentName: string | null;
  directProductCount: number;
  descendantProductCount: number;
  sumOfChildrenCounts: number;
  childrenCount: number;
  path: string;
}

interface Inconsistency {
  category: string;
  path: string;
  level: number;
  issue: string;
  details: {
    directProducts?: number;
    descendantProducts?: number;
    sumOfChildren?: number;
    childrenCount?: number;
  };
}

interface DuplicateProduct {
  productId: string;
  productName: string;
  categories: string[];
  hierarchy: string;
}

async function investigateCategoryInconsistencies() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  console.log('='.repeat(80));
  console.log('CATEGORY INCONSISTENCY INVESTIGATION');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Get all categories with their counts
    console.log('Step 1: Analyzing all categories...\n');

    const categoryQuery = `
      MATCH (c:Category)
      OPTIONAL MATCH (c)<-[:PARENT_OF]-(parent:Category)
      OPTIONAL MATCH (c)-[:HAS_PRODUCT]->(directProduct:Product)
      OPTIONAL MATCH (c)-[:PARENT_OF*]->(descendant:Category)-[:HAS_PRODUCT]->(descendantProduct:Product)
      OPTIONAL MATCH (c)-[:PARENT_OF]->(child:Category)
      OPTIONAL MATCH (child)-[:HAS_PRODUCT]->(childDirectProduct:Product)
      OPTIONAL MATCH (child)-[:PARENT_OF*]->(childDescendant:Category)-[:HAS_PRODUCT]->(childDescendantProduct:Product)

      WITH c, parent,
           COUNT(DISTINCT directProduct) as directCount,
           COUNT(DISTINCT descendantProduct) as descendantCount,
           COUNT(DISTINCT child) as childrenCount,
           COLLECT(DISTINCT child.name) as childNames,
           COLLECT(DISTINCT childDirectProduct) + COLLECT(DISTINCT childDescendantProduct) as allChildProducts

      OPTIONAL MATCH path = (root:Category {level: 0})-[:PARENT_OF*]->(c)
      WHERE NOT EXISTS((root)<-[:PARENT_OF]-(:Category))
      WITH c, parent, directCount, descendantCount, childrenCount, childNames, allChildProducts,
           COALESCE(root.name, c.name) as rootName,
           [node in nodes(path) | node.name] as pathNodes

      RETURN c.id as id,
             c.name as name,
             c.level as level,
             parent.name as parentName,
             directCount,
             descendantCount,
             directCount + descendantCount as totalDescendantCount,
             childrenCount,
             SIZE(allChildProducts) as sumOfChildrenCounts,
             childNames,
             rootName,
             CASE WHEN SIZE(pathNodes) > 0
                  THEN reduce(s = '', n in pathNodes | s + n + ' > ') + c.name
                  ELSE c.name
             END as fullPath
      ORDER BY rootName, c.level, c.name
    `;

    const result = await session.run(categoryQuery);
    const categories: CategoryInfo[] = result.records.map(record => {
      const level = record.get('level');
      const directCount = record.get('directCount');
      const totalDescendantCount = record.get('totalDescendantCount');
      const sumOfChildrenCounts = record.get('sumOfChildrenCounts');
      const childrenCount = record.get('childrenCount');

      return {
        id: record.get('id'),
        name: record.get('name'),
        level: neo4j.isInt(level) ? level.toNumber() : level,
        parentName: record.get('parentName'),
        directProductCount: neo4j.isInt(directCount) ? directCount.toNumber() : directCount,
        descendantProductCount: neo4j.isInt(totalDescendantCount) ? totalDescendantCount.toNumber() : totalDescendantCount,
        sumOfChildrenCounts: neo4j.isInt(sumOfChildrenCounts) ? sumOfChildrenCounts.toNumber() : sumOfChildrenCounts,
        childrenCount: neo4j.isInt(childrenCount) ? childrenCount.toNumber() : childrenCount,
        path: record.get('fullPath')
      };
    });

    console.log(`Total categories found: ${categories.length}\n`);

    // 2. Identify inconsistencies
    console.log('Step 2: Identifying inconsistencies...\n');

    const inconsistencies: Inconsistency[] = [];

    for (const cat of categories) {
      // Issue 1: Parent category has both direct products AND children
      if (cat.directProductCount > 0 && cat.childrenCount > 0) {
        inconsistencies.push({
          category: cat.name,
          path: cat.path,
          level: cat.level,
          issue: 'Category has BOTH direct products AND children (should be mutually exclusive)',
          details: {
            directProducts: cat.directProductCount,
            childrenCount: cat.childrenCount
          }
        });
      }

      // Issue 2: Sum of children's products doesn't match parent's descendant count
      if (cat.childrenCount > 0 && cat.sumOfChildrenCounts !== cat.descendantProductCount) {
        inconsistencies.push({
          category: cat.name,
          path: cat.path,
          level: cat.level,
          issue: 'Parent descendant count does not match sum of children\'s products',
          details: {
            descendantProducts: cat.descendantProductCount,
            sumOfChildren: cat.sumOfChildrenCounts,
            childrenCount: cat.childrenCount
          }
        });
      }

      // Issue 3: Category has no products (direct or descendant) but has children
      if (cat.childrenCount > 0 && cat.descendantProductCount === 0) {
        inconsistencies.push({
          category: cat.name,
          path: cat.path,
          level: cat.level,
          issue: 'Category has children but no products in descendants',
          details: {
            childrenCount: cat.childrenCount,
            descendantProducts: 0
          }
        });
      }

      // Issue 4: Leaf category (no children) has no products
      if (cat.childrenCount === 0 && cat.directProductCount === 0) {
        inconsistencies.push({
          category: cat.name,
          path: cat.path,
          level: cat.level,
          issue: 'Leaf category has no products',
          details: {
            directProducts: 0
          }
        });
      }
    }

    // 3. Find duplicate product assignments in same hierarchy
    console.log('Step 3: Checking for duplicate product assignments...\n');

    const duplicateQuery = `
      MATCH (root:Category {level: 0})
      WHERE NOT EXISTS((root)<-[:PARENT_OF]-(:Category))
      MATCH (root)-[:PARENT_OF*0..]->(cat1:Category)-[:HAS_PRODUCT]->(p:Product)
      MATCH (root)-[:PARENT_OF*0..]->(cat2:Category)-[:HAS_PRODUCT]->(p)
      WHERE cat1.id <> cat2.id
      WITH root, p, COLLECT(DISTINCT cat1.name) as categories
      WHERE SIZE(categories) > 1
      RETURN p.id as productId,
             p.name as productName,
             root.name as hierarchy,
             categories
      ORDER BY hierarchy, productName
    `;

    const duplicateResult = await session.run(duplicateQuery);
    const duplicateProducts: DuplicateProduct[] = duplicateResult.records.map(record => ({
      productId: record.get('productId'),
      productName: record.get('productName'),
      categories: record.get('categories'),
      hierarchy: record.get('hierarchy')
    }));

    // 4. Print detailed report
    console.log('='.repeat(80));
    console.log('REPORT: CATEGORY HIERARCHY ANALYSIS');
    console.log('='.repeat(80));
    console.log();

    // Print all categories with their counts
    console.log('FULL CATEGORY TREE WITH COUNTS:');
    console.log('-'.repeat(80));

    let currentRoot = '';
    for (const cat of categories) {
      const rootMatch = cat.path.match(/^([^>]+)/);
      const root = rootMatch ? rootMatch[1].trim() : cat.name;

      if (root !== currentRoot) {
        currentRoot = root;
        console.log();
        console.log(`\n${root} Hierarchy:`);
        console.log('─'.repeat(80));
      }

      const indent = '  '.repeat(cat.level);
      const childIndicator = cat.childrenCount > 0 ? ` [${cat.childrenCount} children]` : '';
      const directIndicator = cat.directProductCount > 0 ? ` [${cat.directProductCount} direct]` : '';
      const descendantIndicator = cat.descendantProductCount > 0 ? ` (${cat.descendantProductCount} total)` : '';

      console.log(`${indent}${cat.name}${childIndicator}${directIndicator}${descendantIndicator}`);
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('INCONSISTENCIES FOUND:');
    console.log('='.repeat(80));
    console.log();

    if (inconsistencies.length === 0) {
      console.log('✓ No inconsistencies found!\n');
    } else {
      // Group by issue type
      const groupedIssues = inconsistencies.reduce((acc, inc) => {
        if (!acc[inc.issue]) acc[inc.issue] = [];
        acc[inc.issue].push(inc);
        return acc;
      }, {} as Record<string, Inconsistency[]>);

      for (const [issueType, issues] of Object.entries(groupedIssues)) {
        console.log(`\n${issueType.toUpperCase()}`);
        console.log('-'.repeat(80));
        console.log(`Found ${issues.length} occurrence(s)\n`);

        for (const issue of issues) {
          console.log(`  Category: ${issue.category}`);
          console.log(`  Path: ${issue.path}`);
          console.log(`  Level: ${issue.level}`);
          console.log(`  Details:`, JSON.stringify(issue.details, null, 2));
          console.log();
        }
      }

      console.log(`\nTotal inconsistencies: ${inconsistencies.length}`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('DUPLICATE PRODUCT ASSIGNMENTS:');
    console.log('='.repeat(80));
    console.log();

    if (duplicateProducts.length === 0) {
      console.log('✓ No duplicate product assignments found!\n');
    } else {
      console.log(`Found ${duplicateProducts.length} product(s) assigned to multiple categories in same hierarchy\n`);

      let currentHierarchy = '';
      for (const dup of duplicateProducts) {
        if (dup.hierarchy !== currentHierarchy) {
          currentHierarchy = dup.hierarchy;
          console.log(`\n${currentHierarchy} Hierarchy:`);
          console.log('-'.repeat(80));
        }

        console.log(`  Product: ${dup.productName} (${dup.productId})`);
        console.log(`  Assigned to: ${dup.categories.join(', ')}`);
        console.log();
      }
    }

    // 5. Generate cleanup recommendations
    console.log();
    console.log('='.repeat(80));
    console.log('CLEANUP RECOMMENDATIONS:');
    console.log('='.repeat(80));
    console.log();

    const recommendations: string[] = [];

    // Check for categories with both direct products and children
    const mixedCategories = inconsistencies.filter(i =>
      i.issue === 'Category has BOTH direct products AND children (should be mutually exclusive)'
    );

    if (mixedCategories.length > 0) {
      recommendations.push(
        `1. MOVE DIRECT PRODUCTS FROM PARENT TO CHILDREN (${mixedCategories.length} categories)`,
        '   Problem: Parent categories should not have direct product assignments.',
        '   Action: Move products from parent categories to appropriate leaf categories.',
        '   Categories affected: ' + mixedCategories.map(c => c.category).join(', '),
        ''
      );
    }

    // Check for count mismatches
    const countMismatches = inconsistencies.filter(i =>
      i.issue === 'Parent descendant count does not match sum of children\'s products'
    );

    if (countMismatches.length > 0) {
      recommendations.push(
        `2. FIX COUNT DISCREPANCIES (${countMismatches.length} categories)`,
        '   Problem: Parent shows different count than sum of children.',
        '   Possible causes:',
        '   - Products assigned to multiple categories in same hierarchy',
        '   - Direct products on parent category',
        '   - Orphaned product relationships',
        '   Action: Investigate specific categories and remove duplicate assignments.',
        '   Categories affected: ' + countMismatches.map(c => c.category).join(', '),
        ''
      );
    }

    // Check for duplicate assignments
    if (duplicateProducts.length > 0) {
      recommendations.push(
        `3. REMOVE DUPLICATE PRODUCT ASSIGNMENTS (${duplicateProducts.length} products)`,
        '   Problem: Products assigned to multiple categories in same hierarchy.',
        '   Action: Keep product in most specific (deepest level) category only.',
        '   Products affected: ' + duplicateProducts.map(p => p.productName).join(', '),
        ''
      );
    }

    // Check for empty leaf categories
    const emptyLeaves = inconsistencies.filter(i =>
      i.issue === 'Leaf category has no products'
    );

    if (emptyLeaves.length > 0) {
      recommendations.push(
        `4. HANDLE EMPTY LEAF CATEGORIES (${emptyLeaves.length} categories)`,
        '   Problem: Leaf categories with no products.',
        '   Action: Either assign products or remove unused categories.',
        '   Categories affected: ' + emptyLeaves.map(c => c.category).join(', '),
        ''
      );
    }

    if (recommendations.length === 0) {
      console.log('✓ No cleanup needed - category hierarchy is consistent!\n');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    // 6. Generate cleanup script skeleton
    console.log();
    console.log('='.repeat(80));
    console.log('SUGGESTED CLEANUP QUERIES:');
    console.log('='.repeat(80));
    console.log();

    if (mixedCategories.length > 0) {
      console.log('// Fix categories with both direct products and children:');
      console.log('// This query finds such categories - manual review needed for each');
      console.log(`
MATCH (parent:Category)-[:HAS_PRODUCT]->(p:Product)
WHERE EXISTS((parent)-[:PARENT_OF]->(:Category))
RETURN parent.name, parent.id, COUNT(p) as directProducts
      `.trim());
      console.log();
    }

    if (duplicateProducts.length > 0) {
      console.log('// Remove duplicate product assignments (keep in deepest category):');
      console.log(`
MATCH (root:Category {level: 0})
WHERE NOT EXISTS((root)<-[:PARENT_OF]-(:Category))
MATCH (root)-[:PARENT_OF*0..]->(cat1:Category)-[:HAS_PRODUCT]->(p:Product)
MATCH (root)-[:PARENT_OF*0..]->(cat2:Category)-[:HAS_PRODUCT]->(p)
WHERE cat1.id <> cat2.id AND cat1.level < cat2.level
DELETE (cat1)-[r:HAS_PRODUCT]->(p)
RETURN cat1.name, cat2.name, p.name, 'Removed from ' + cat1.name as action
      `.trim());
      console.log();
    }

    console.log();
    console.log('='.repeat(80));
    console.log('INVESTIGATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error during investigation:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the investigation
investigateCategoryInconsistencies()
  .then(() => {
    console.log('\n✓ Investigation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Investigation failed:', error);
    process.exit(1);
  });
