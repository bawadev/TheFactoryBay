import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

interface MoveOperation {
  productId: string;
  productName: string;
  brand: string;
  fromCategoryId: string;
  fromCategoryName: string;
  toCategoryId: string;
  toCategoryName: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ManualReviewProduct {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  fromCategoryId: string;
  fromCategoryName: string;
  availableTargets: Array<{ id: string; name: string }>;
}

async function generateRollbackQuery(moves: MoveOperation[]): Promise<string> {
  let rollback = `// ROLLBACK QUERY - Run this to undo the cleanup\n`;
  rollback += `// Generated at: ${new Date().toISOString()}\n\n`;

  for (const move of moves) {
    rollback += `
MATCH (p:Product {id: '${move.productId}'})
MATCH (oldCat:Category {id: '${move.fromCategoryId}'})
MATCH (p)-[r:BELONGS_TO]->(:Category)
DELETE r
CREATE (p)-[:BELONGS_TO]->(oldCat);
`;
  }

  rollback += `\n// End of rollback query\n`;
  return rollback;
}

async function analyzeMoves() {
  const session = driver.session();

  try {
    console.log('\n=== ANALYZING PRODUCTS FOR CLEANUP ===\n');

    // Find all parent categories with direct products
    const query = `
      MATCH (parent:Category)
      WHERE EXISTS {
        MATCH (parent)-[:HAS_CHILD]->(:Category)
      } AND EXISTS {
        MATCH (p:Product)-[:BELONGS_TO]->(parent)
      }

      // Get hierarchy
      MATCH (parent)<-[:HAS_CHILD*0..]-(root:Category {level: 0})

      // Get products
      MATCH (product:Product)-[:BELONGS_TO]->(parent)

      // Get children
      MATCH (parent)-[:HAS_CHILD]->(child:Category)

      RETURN parent.id as parentId,
             parent.name as parentName,
             root.name as hierarchy,
             COLLECT(DISTINCT {
               id: product.id,
               name: product.name,
               brand: product.brand,
               category: product.category
             }) as products,
             COLLECT(DISTINCT {
               id: child.id,
               name: child.name,
               level: child.level
             }) as children
      ORDER BY hierarchy, parentName
    `;

    const result = await session.run(query);
    const plannedMoves: MoveOperation[] = [];
    const manualReview: ManualReviewProduct[] = [];

    console.log('📋 MOVE PLANNING\n');

    for (const record of result.records) {
      const parentId = record.get('parentId');
      const parentName = record.get('parentName');
      const hierarchy = record.get('hierarchy');
      const products = record.get('products');
      const children = record.get('children');

      console.log(`${hierarchy} > ${parentName}`);
      console.log(`  Products to relocate: ${products.length}`);
      console.log(`  Available child categories: ${children.length}\n`);

      for (const product of products) {
        const target = findBestTarget(product, children);

        if (target) {
          plannedMoves.push({
            productId: product.id,
            productName: product.name,
            brand: product.brand,
            fromCategoryId: parentId,
            fromCategoryName: parentName,
            toCategoryId: target.id,
            toCategoryName: target.name,
            confidence: target.confidence
          });

          const icon = target.confidence === 'high' ? '✓' : target.confidence === 'medium' ? '~' : '?';
          console.log(`  ${icon} ${product.name} → ${target.name} [${target.confidence}]`);
        } else {
          manualReview.push({
            productId: product.id,
            productName: product.name,
            brand: product.brand,
            category: product.category || '',
            fromCategoryId: parentId,
            fromCategoryName: parentName,
            availableTargets: children
          });
          console.log(`  ⚠ ${product.name} → MANUAL REVIEW REQUIRED`);
        }
      }
      console.log('');
    }

    return { plannedMoves, manualReview };

  } finally {
    await session.close();
  }
}

function findBestTarget(
  product: { name: string; brand: string; category: string },
  children: Array<{ id: string; name: string; level: number }>
): { id: string; name: string; confidence: 'high' | 'medium' | 'low' } | null {
  const productName = product.name.toLowerCase();
  const productCategory = product.category?.toLowerCase() || '';

  // High confidence rules (exact matches)
  const highConfidenceRules: Array<{ keywords: string[]; targetNames: string[] }> = [
    { keywords: ['polo shirt', 'polo'], targetNames: ['Polo Shirts'] },
    { keywords: ['t-shirt', 'tee shirt'], targetNames: ['T-Shirts'] },
    { keywords: ['watch'], targetNames: ['Watches'] },
    { keywords: ['wallet'], targetNames: ['Wallets'] },
    { keywords: ['belt'], targetNames: ['Belts'] },
    { keywords: ['tie'], targetNames: ['Ties'] },
    { keywords: ['dress shirt'], targetNames: ['Dress Shirts'] },
    { keywords: ['casual shirt'], targetNames: ['Casual Shirts'] },
    { keywords: ['sneaker'], targetNames: ['Sneakers'] },
    { keywords: ['boot'], targetNames: ['Boots'] },
    { keywords: ['sandal'], targetNames: ['Sandals'] },
    { keywords: ['loafer'], targetNames: ['Loafers'] },
  ];

  // Medium confidence rules (broader matches)
  const mediumConfidenceRules: Array<{ keywords: string[]; targetNames: string[] }> = [
    { keywords: ['running', 'trainer', 'athletic'], targetNames: ['Sneakers', 'Athletic Shoes', 'Casual Shoes'] },
    { keywords: ['formal shoe', 'oxford', 'derby'], targetNames: ['Formal Shoes', 'Dress Shoes'] },
    { keywords: ['bag', 'backpack'], targetNames: ['Bags', 'Accessories'] },
    { keywords: ['sunglass'], targetNames: ['Sunglasses', 'Accessories'] },
    { keywords: ['hat', 'cap'], targetNames: ['Hats', 'Caps', 'Accessories'] },
    { keywords: ['scarf'], targetNames: ['Scarves', 'Accessories'] },
    { keywords: ['hoodie'], targetNames: ['Hoodies', 'Sweatshirts'] },
    { keywords: ['sweater', 'pullover'], targetNames: ['Sweaters', 'Knitwear'] },
    { keywords: ['blazer'], targetNames: ['Blazers', 'Jackets'] },
    { keywords: ['jacket'], targetNames: ['Jackets', 'Outerwear'] },
  ];

  // Try high confidence first
  for (const rule of highConfidenceRules) {
    const matchesKeyword = rule.keywords.some(keyword =>
      productName.includes(keyword) || productCategory.includes(keyword)
    );

    if (matchesKeyword) {
      for (const targetName of rule.targetNames) {
        const match = children.find(child =>
          child.name.toLowerCase() === targetName.toLowerCase() ||
          child.name.toLowerCase().includes(targetName.toLowerCase())
        );
        if (match) {
          return { ...match, confidence: 'high' };
        }
      }
    }
  }

  // Try medium confidence
  for (const rule of mediumConfidenceRules) {
    const matchesKeyword = rule.keywords.some(keyword =>
      productName.includes(keyword) || productCategory.includes(keyword)
    );

    if (matchesKeyword) {
      for (const targetName of rule.targetNames) {
        const match = children.find(child =>
          child.name.toLowerCase().includes(targetName.toLowerCase()) ||
          targetName.toLowerCase().includes(child.name.toLowerCase())
        );
        if (match) {
          return { ...match, confidence: 'medium' };
        }
      }
    }
  }

  // Low confidence: try category field exact match
  if (productCategory) {
    const exactMatch = children.find(child =>
      child.name.toLowerCase() === productCategory ||
      productCategory.includes(child.name.toLowerCase())
    );
    if (exactMatch) {
      return { ...exactMatch, confidence: 'low' };
    }
  }

  return null;
}

async function executeMoves(moves: MoveOperation[], dryRun: boolean = false) {
  const session = driver.session();

  try {
    console.log('\n=== EXECUTING MOVES ===\n');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (changes will be applied)'}\n`);

    const results = {
      success: [] as MoveOperation[],
      failed: [] as { move: MoveOperation; error: string }[]
    };

    for (const move of moves) {
      try {
        if (!dryRun) {
          const moveQuery = `
            MATCH (p:Product {id: $productId})
            MATCH (newCat:Category {id: $toCategoryId})
            MATCH (p)-[oldRel:BELONGS_TO]->(:Category)
            DELETE oldRel
            CREATE (p)-[:BELONGS_TO]->(newCat)
            RETURN p.name as productName, newCat.name as newCategoryName
          `;

          await session.run(moveQuery, {
            productId: move.productId,
            toCategoryId: move.toCategoryId
          });
        }

        results.success.push(move);
        console.log(`✓ Moved: ${move.productName}`);
        console.log(`  From: ${move.fromCategoryName}`);
        console.log(`  To: ${move.toCategoryName}`);
        console.log(`  Confidence: ${move.confidence}\n`);

      } catch (error) {
        results.failed.push({
          move,
          error: error instanceof Error ? error.message : String(error)
        });
        console.log(`✗ Failed: ${move.productName}`);
        console.log(`  Error: ${error}\n`);
      }
    }

    return results;

  } finally {
    await session.close();
  }
}

async function verifyCleanup() {
  const session = driver.session();

  try {
    console.log('\n=== VERIFICATION ===\n');

    // Check for remaining parent categories with products
    const checkQuery = `
      MATCH (parent:Category)
      WHERE EXISTS {
        MATCH (parent)-[:HAS_CHILD]->(:Category)
      } AND EXISTS {
        MATCH (p:Product)-[:BELONGS_TO]->(parent)
      }
      MATCH (parent)<-[:HAS_CHILD*0..]-(root:Category {level: 0})
      MATCH (p:Product)-[:BELONGS_TO]->(parent)
      RETURN root.name as hierarchy,
             parent.name as categoryName,
             COUNT(p) as productCount
      ORDER BY hierarchy, categoryName
    `;

    const result = await session.run(checkQuery);

    if (result.records.length === 0) {
      console.log('✓ SUCCESS: No parent categories with direct products found!');
      console.log('  All products are now assigned to leaf categories.\n');
      return true;
    } else {
      console.log('⚠ WARNING: Still found parent categories with products:\n');
      result.records.forEach(record => {
        console.log(`  ${record.get('hierarchy')} > ${record.get('categoryName')}: ${record.get('productCount').toNumber()} products`);
      });
      console.log('');
      return false;
    }

  } finally {
    await session.close();
  }
}

async function generateReport(
  plannedMoves: MoveOperation[],
  manualReview: ManualReviewProduct[],
  executionResults: { success: MoveOperation[]; failed: Array<{ move: MoveOperation; error: string }> }
) {
  console.log('\n\n' + '='.repeat(80));
  console.log('CLEANUP REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total products identified: ${plannedMoves.length + manualReview.length}`);
  console.log(`  Automated moves planned: ${plannedMoves.length}`);
  console.log(`  Manual review required: ${manualReview.length}`);
  console.log('');
  console.log(`Execution results:`);
  console.log(`  Successfully moved: ${executionResults.success.length}`);
  console.log(`  Failed moves: ${executionResults.failed.length}`);
  console.log('');

  // Confidence breakdown
  const byConfidence = {
    high: plannedMoves.filter(m => m.confidence === 'high').length,
    medium: plannedMoves.filter(m => m.confidence === 'medium').length,
    low: plannedMoves.filter(m => m.confidence === 'low').length
  };
  console.log(`Confidence breakdown:`);
  console.log(`  High confidence: ${byConfidence.high}`);
  console.log(`  Medium confidence: ${byConfidence.medium}`);
  console.log(`  Low confidence: ${byConfidence.low}`);
  console.log('');

  // Manual review section
  if (manualReview.length > 0) {
    console.log('\n⚠ MANUAL REVIEW REQUIRED');
    console.log('-'.repeat(80));
    console.log(`${manualReview.length} products could not be automatically matched:\n`);

    manualReview.forEach(item => {
      console.log(`Product: ${item.productName} (${item.brand})`);
      console.log(`  ID: ${item.productId}`);
      console.log(`  Category field: ${item.category || 'none'}`);
      console.log(`  Currently in: ${item.fromCategoryName} [${item.fromCategoryId}]`);
      console.log(`  Available targets:`);
      item.availableTargets.forEach(target => {
        console.log(`    - ${target.name} [${target.id}]`);
      });
      console.log('');
    });

    console.log('To manually move a product, use:');
    console.log(`
MATCH (p:Product {id: 'PRODUCT_ID'})
MATCH (newCat:Category {id: 'TARGET_CATEGORY_ID'})
MATCH (p)-[oldRel:BELONGS_TO]->(:Category)
DELETE oldRel
CREATE (p)-[:BELONGS_TO]->(newCat);
    `);
  }

  // Failed moves
  if (executionResults.failed.length > 0) {
    console.log('\n✗ FAILED MOVES');
    console.log('-'.repeat(80));
    executionResults.failed.forEach(({ move, error }) => {
      console.log(`Product: ${move.productName}`);
      console.log(`  Error: ${error}`);
      console.log('');
    });
  }

  // Successful moves by category
  const movesByCategory = executionResults.success.reduce((acc, move) => {
    if (!acc[move.fromCategoryName]) {
      acc[move.fromCategoryName] = [];
    }
    acc[move.fromCategoryName].push(move);
    return acc;
  }, {} as Record<string, MoveOperation[]>);

  console.log('\n✓ SUCCESSFUL MOVES BY SOURCE CATEGORY');
  console.log('-'.repeat(80));
  Object.entries(movesByCategory).forEach(([fromCat, moves]) => {
    console.log(`\n${fromCat} (${moves.length} products moved):`);
    moves.forEach(move => {
      console.log(`  → ${move.productName} to ${move.toCategoryName}`);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipConfirmation = args.includes('--yes') || args.includes('-y');

  try {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  CATEGORY CLEANUP: Move Products from Parents to Leaf Categories ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Step 1: Analyze
    const { plannedMoves, manualReview } = await analyzeMoves();

    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    console.log(`Products to move automatically: ${plannedMoves.length}`);
    console.log(`Products requiring manual review: ${manualReview.length}`);
    console.log('');

    if (plannedMoves.length === 0) {
      console.log('No automated moves to perform.');
      if (manualReview.length > 0) {
        console.log('\nManual review items:');
        manualReview.forEach(item => {
          console.log(`  - ${item.productName} in ${item.fromCategoryName}`);
        });
      }
      process.exit(0);
    }

    // Step 2: Generate rollback
    const rollbackQuery = await generateRollbackQuery(plannedMoves);
    const rollbackFile = path.join(process.cwd(), 'scripts', `rollback-${Date.now()}.cypher`);
    await require('fs').promises.writeFile(rollbackFile, rollbackQuery);
    console.log(`Rollback query saved to: ${rollbackFile}\n`);

    // Step 3: Confirm
    if (!skipConfirmation && !dryRun) {
      console.log('⚠️  WARNING: This will modify the database!');
      console.log('Review the moves above carefully.');
      console.log('');
      console.log('Options:');
      console.log('  - Press Ctrl+C to cancel');
      console.log('  - Run with --dry-run to test without changes');
      console.log('  - Run with --yes to skip this confirmation');
      console.log('');

      // Simple pause
      await new Promise(resolve => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        readline.question('Press ENTER to continue or Ctrl+C to cancel...', () => {
          readline.close();
          resolve(null);
        });
      });
    }

    // Step 4: Execute
    const executionResults = await executeMoves(plannedMoves, dryRun);

    // Step 5: Verify
    if (!dryRun) {
      await verifyCleanup();
    }

    // Step 6: Report
    await generateReport(plannedMoves, manualReview, executionResults);

    console.log('\n✨ CLEANUP COMPLETE\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
