import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

interface CategoryIssue {
  categoryId: string;
  categoryName: string;
  level: number;
  hierarchy: string;
  childCount: number;
  productCount: number;
  products: Array<{
    id: string;
    name: string;
    brand: string;
    category: string;
  }>;
  children: Array<{
    id: string;
    name: string;
    level: number;
  }>;
}

async function analyzeAllHierarchies() {
  const session = driver.session();

  try {
    console.log('\n=== ANALYZING ALL CATEGORY HIERARCHIES ===\n');

    // Query to find ALL categories with both children AND direct products
    const query = `
      MATCH (parent:Category)
      WHERE EXISTS {
        MATCH (parent)<-[:HAS_CHILD*]-(root:Category {level: 0})
      }
      WITH parent
      WHERE EXISTS {
        MATCH (parent)-[:HAS_CHILD]->(:Category)
      } AND EXISTS {
        MATCH (p:Product)-[:BELONGS_TO]->(parent)
      }

      // Get root hierarchy
      MATCH (parent)<-[:HAS_CHILD*0..]-(root:Category {level: 0})

      // Count children
      OPTIONAL MATCH (parent)-[:HAS_CHILD]->(child:Category)
      WITH parent, root, COUNT(DISTINCT child) as childCount

      // Count and collect products
      OPTIONAL MATCH (product:Product)-[:BELONGS_TO]->(parent)
      WITH parent, root, childCount,
           COUNT(DISTINCT product) as productCount,
           COLLECT(DISTINCT {
             id: product.id,
             name: product.name,
             brand: product.brand,
             category: product.category
           }) as products

      // Collect children details
      OPTIONAL MATCH (parent)-[:HAS_CHILD]->(child:Category)
      WITH parent, root, childCount, productCount, products,
           COLLECT(DISTINCT {
             id: child.id,
             name: child.name,
             level: child.level
           }) as children

      RETURN parent.id as categoryId,
             parent.name as categoryName,
             parent.level as level,
             root.name as hierarchy,
             childCount,
             productCount,
             products,
             children
      ORDER BY hierarchy, level, categoryName
    `;

    const result = await session.run(query);
    const issues: CategoryIssue[] = result.records.map(record => {
      const level = record.get('level');
      const childCount = record.get('childCount');
      const productCount = record.get('productCount');

      return {
        categoryId: record.get('categoryId'),
        categoryName: record.get('categoryName'),
        level: neo4j.isInt(level) ? level.toNumber() : level,
        hierarchy: record.get('hierarchy'),
        childCount: neo4j.isInt(childCount) ? childCount.toNumber() : childCount,
        productCount: neo4j.isInt(productCount) ? productCount.toNumber() : productCount,
        products: record.get('products'),
        children: record.get('children')
      };
    });

    // Summary statistics
    const totalIssues = issues.length;
    const totalProducts = issues.reduce((sum, issue) => sum + issue.productCount, 0);
    const byHierarchy = issues.reduce((acc, issue) => {
      if (!acc[issue.hierarchy]) {
        acc[issue.hierarchy] = { categories: 0, products: 0 };
      }
      acc[issue.hierarchy].categories++;
      acc[issue.hierarchy].products += issue.productCount;
      return acc;
    }, {} as Record<string, { categories: number; products: number }>);

    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total categories with issues: ${totalIssues}`);
    console.log(`Total products needing relocation: ${totalProducts}`);
    console.log('');
    console.log('By Hierarchy:');
    Object.entries(byHierarchy).forEach(([hierarchy, stats]) => {
      console.log(`  ${hierarchy}:`);
      console.log(`    - Categories with issues: ${stats.categories}`);
      console.log(`    - Products to move: ${stats.products}`);
    });
    console.log('');

    // Detailed breakdown
    console.log('\n📋 DETAILED BREAKDOWN');
    console.log('='.repeat(80));

    for (const issue of issues) {
      console.log(`\n${issue.hierarchy} > ${issue.categoryName} (Level ${issue.level})`);
      console.log(`  Category ID: ${issue.categoryId}`);
      console.log(`  Children: ${issue.childCount}`);
      console.log(`  Direct Products: ${issue.productCount}`);
      console.log('');

      console.log('  Child Categories:');
      issue.children.forEach(child => {
        console.log(`    - ${child.name} (Level ${child.level}) [${child.id}]`);
      });
      console.log('');

      console.log('  Products Currently Assigned:');
      issue.products.forEach(product => {
        console.log(`    - ${product.name} (${product.brand}) [${product.category}]`);
        console.log(`      Product ID: ${product.id}`);
      });
      console.log('');

      // Suggest moves
      console.log('  Suggested Moves:');
      issue.products.forEach(product => {
        const suggestion = suggestTargetCategory(product, issue.children);
        if (suggestion) {
          console.log(`    ✓ ${product.name} → ${suggestion.name}`);
        } else {
          console.log(`    ⚠ ${product.name} → NEEDS MANUAL REVIEW`);
        }
      });
      console.log('-'.repeat(80));
    }

    // Check for leaf categories (validation)
    console.log('\n\n✅ VALIDATION: Leaf Category Check');
    console.log('='.repeat(80));

    const leafQuery = `
      MATCH (leaf:Category)
      WHERE NOT EXISTS {
        MATCH (leaf)-[:HAS_CHILD]->(:Category)
      }
      OPTIONAL MATCH (p:Product)-[:BELONGS_TO]->(leaf)
      WITH leaf, COUNT(DISTINCT p) as productCount
      MATCH (leaf)<-[:HAS_CHILD*0..]-(root:Category {level: 0})
      RETURN root.name as hierarchy,
             leaf.name as categoryName,
             leaf.level as level,
             productCount
      ORDER BY hierarchy, level, categoryName
    `;

    const leafResult = await session.run(leafQuery);
    const leafCategories = leafResult.records.map(record => {
      const level = record.get('level');
      const productCount = record.get('productCount');

      return {
        hierarchy: record.get('hierarchy'),
        name: record.get('categoryName'),
        level: neo4j.isInt(level) ? level.toNumber() : level,
        products: neo4j.isInt(productCount) ? productCount.toNumber() : productCount
      };
    });

    console.log(`Total leaf categories (no children): ${leafCategories.length}`);
    console.log('');

    let currentHierarchy = '';
    leafCategories.forEach(leaf => {
      if (leaf.hierarchy !== currentHierarchy) {
        currentHierarchy = leaf.hierarchy;
        console.log(`\n${currentHierarchy}:`);
      }
      console.log(`  ${leaf.name} (Level ${leaf.level}): ${leaf.products} products`);
    });

    // Export issues for cleanup script
    console.log('\n\n💾 EXPORTING ISSUES FOR CLEANUP');
    console.log('='.repeat(80));
    console.log(`Issues found: ${issues.length}`);
    console.log(`Data exported to memory for cleanup script`);

    return {
      issues,
      summary: {
        totalIssues,
        totalProducts,
        byHierarchy
      },
      leafCategories
    };

  } catch (error) {
    console.error('Error analyzing hierarchies:', error);
    throw error;
  } finally {
    await session.close();
  }
}

function suggestTargetCategory(
  product: { name: string; brand: string; category: string },
  children: Array<{ id: string; name: string; level: number }>
): { id: string; name: string } | null {
  const productName = product.name.toLowerCase();
  const productCategory = product.category?.toLowerCase() || '';

  // Matching rules
  const rules: Array<{ keywords: string[]; targetNames: string[] }> = [
    // Footwear
    { keywords: ['sneaker', 'trainer', 'running shoe'], targetNames: ['Sneakers', 'Casual Shoes'] },
    { keywords: ['boot'], targetNames: ['Boots', 'Formal Shoes'] },
    { keywords: ['sandal', 'flip-flop'], targetNames: ['Sandals', 'Casual Shoes'] },
    { keywords: ['formal shoe', 'oxford', 'derby'], targetNames: ['Formal Shoes', 'Dress Shoes'] },
    { keywords: ['loafer'], targetNames: ['Loafers', 'Casual Shoes', 'Formal Shoes'] },

    // Accessories
    { keywords: ['watch', 'timepiece'], targetNames: ['Watches'] },
    { keywords: ['wallet'], targetNames: ['Wallets'] },
    { keywords: ['belt'], targetNames: ['Belts'] },
    { keywords: ['tie'], targetNames: ['Ties'] },
    { keywords: ['bag', 'backpack', 'briefcase'], targetNames: ['Bags'] },
    { keywords: ['sunglass'], targetNames: ['Sunglasses'] },
    { keywords: ['hat', 'cap'], targetNames: ['Hats', 'Caps'] },
    { keywords: ['scarf'], targetNames: ['Scarves'] },
    { keywords: ['glove'], targetNames: ['Gloves'] },
    { keywords: ['jewelry', 'jewellery', 'necklace', 'bracelet', 'ring'], targetNames: ['Jewelry'] },

    // Tops
    { keywords: ['polo'], targetNames: ['Polo Shirts'] },
    { keywords: ['t-shirt', 'tee'], targetNames: ['T-Shirts'] },
    { keywords: ['dress shirt', 'formal shirt'], targetNames: ['Dress Shirts', 'Formal Shirts'] },
    { keywords: ['casual shirt'], targetNames: ['Casual Shirts'] },
    { keywords: ['henley'], targetNames: ['Henley Shirts', 'Casual Shirts'] },
    { keywords: ['tank top', 'singlet'], targetNames: ['Tank Tops'] },
    { keywords: ['hoodie'], targetNames: ['Hoodies'] },
    { keywords: ['sweatshirt'], targetNames: ['Sweatshirts'] },
    { keywords: ['sweater', 'jumper', 'pullover'], targetNames: ['Sweaters'] },
    { keywords: ['cardigan'], targetNames: ['Cardigans'] },
    { keywords: ['blazer'], targetNames: ['Blazers'] },
    { keywords: ['jacket'], targetNames: ['Jackets'] },
    { keywords: ['coat'], targetNames: ['Coats'] },
    { keywords: ['vest', 'waistcoat'], targetNames: ['Vests'] }
  ];

  // Try to match based on rules
  for (const rule of rules) {
    const matchesKeyword = rule.keywords.some(keyword =>
      productName.includes(keyword) || productCategory.includes(keyword)
    );

    if (matchesKeyword) {
      for (const targetName of rule.targetNames) {
        const matchingChild = children.find(child =>
          child.name.toLowerCase().includes(targetName.toLowerCase()) ||
          targetName.toLowerCase().includes(child.name.toLowerCase())
        );
        if (matchingChild) {
          return matchingChild;
        }
      }
    }
  }

  // Fallback: exact category name match
  if (productCategory) {
    const exactMatch = children.find(child =>
      child.name.toLowerCase() === productCategory ||
      productCategory.includes(child.name.toLowerCase()) ||
      child.name.toLowerCase().includes(productCategory)
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  return null;
}

async function main() {
  try {
    const results = await analyzeAllHierarchies();

    console.log('\n\n✨ ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    console.log('Next steps:');
    console.log('1. Review the suggested moves above');
    console.log('2. Run cleanup-parent-category-products.ts to execute the moves');
    console.log('3. Manually handle any products marked "NEEDS MANUAL REVIEW"');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
