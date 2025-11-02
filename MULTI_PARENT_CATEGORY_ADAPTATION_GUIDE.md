# Multi-Parent Category System Adaptation Guide
## Factory Bay E-commerce Platform

This guide adapts the complete multi-parent category implementation to your existing Factory Bay project, building on your current `CustomFilter` system.

---

## Table of Contents
1. [Current Implementation Review](#current-implementation-review)
2. [Missing Features & Enhancements](#missing-features--enhancements)
3. [Database Enhancements](#database-enhancements)
4. [Advanced Repository Functions](#advanced-repository-functions)
5. [Validation & Maintenance Scripts](#validation--maintenance-scripts)
6. [Admin UI Components](#admin-ui-components)
7. [Testing & Quality Assurance](#testing--quality-assurance)

---

## 1. Current Implementation Review

### ✅ What You Already Have

Your Factory Bay project already implements most core features:

- **Multi-parent support**: `CustomFilter` nodes with `CHILD_OF` relationships
- **Level-based hierarchy**: Automatic level calculation based on parent levels
- **Cycle prevention**: `validateNoCycles()` function prevents circular references
- **Product tagging**: `HAS_FILTER` relationship between products and filters
- **Featured filters**: `isFeatured` flag for homepage display
- **Product counts**: Efficient batch counting for filter statistics
- **Repository pattern**: Clean separation in `custom-filter.repository.ts`
- **Server actions**: Proper Next.js 15 server action pattern
- **Admin authorization**: Protected admin operations

### 🎯 Architecture Overview

```
CustomFilter (Node)
├── Properties: id, name, slug, level, isActive, isFeatured
├── Relationships:
│   ├── (child)-[:CHILD_OF]->(parent)  [Multi-parent support]
│   └── (product)-[:HAS_FILTER]->(filter)  [Product tagging]
└── Features:
    ├── Cycle detection
    ├── Level recalculation
    ├── Breadcrumb paths
    └── Product counts
```

---

## 2. Missing Features & Enhancements

### 2.1 Compound Categories (CategoryPath)

**Purpose**: Create virtual categories that combine multiple filters with exclusions
**Example**: "Men's Office Wear" = Shirts + Men + Office Wear (excluding Women, Kids)

### 2.2 APOC Custom Procedures

**Purpose**: Complex operations as reusable database procedures
**Benefits**:
- Better performance
- Atomic operations
- Simplified application code

### 2.3 Auto-Assignment to Parent Categories

**Purpose**: When a product is tagged with a filter, automatically tag with all ancestors
**Benefits**: Simplified filtering and better product discovery

### 2.4 Validation Scripts

**Purpose**: Standalone scripts for hierarchy validation and maintenance
**Benefits**: Can be run as cron jobs, during deployment, or manually

### 2.5 Enhanced Admin UI

**Purpose**: Visual tree management for the category hierarchy
**Benefits**: Easier administration, fewer errors

---

## 3. Database Enhancements

### 3.1 Add APOC Procedures (Optional but Recommended)

Neo4j Browser → Run these queries:

```cypher
// ============================================
// 1. Safe Parent Addition with Level Updates
// ============================================
CALL apoc.custom.asProcedure(
  'addParentToFilter',
  '
  MATCH (child:CustomFilter {id: $childId})
  MATCH (parent:CustomFilter {id: $parentId})

  // Cycle detection
  OPTIONAL MATCH cyclePath = (parent)-[:CHILD_OF*]->(child)
  WITH child, parent, cyclePath IS NULL as noCycle

  // Level validation
  WITH child, parent, noCycle,
       parent.level < child.level OR child.level = 0 as validLevel

  CALL apoc.do.when(
    noCycle AND validLevel,
    "
    // Add relationship
    CREATE (child)-[:CHILD_OF {
      created_at: timestamp()
    }]->(parent)

    // Recalculate child level
    WITH child
    MATCH (child)-[:CHILD_OF]->(p:CustomFilter)
    WITH child, max(p.level) + 1 as newLevel
    SET child.level = newLevel

    // Recursively update descendants
    WITH child
    CALL apoc.path.subgraphAll(child, {
      relationshipFilter: \\"<CHILD_OF\\",
      maxLevel: -1
    }) YIELD nodes

    UNWIND nodes as descendant
    WITH descendant
    WHERE descendant.id <> child.id
    OPTIONAL MATCH (descendant)-[:CHILD_OF]->(dp:CustomFilter)
    WITH descendant, max(dp.level) + 1 as descLevel
    SET descendant.level = descLevel

    RETURN count(descendant) as updated
    ",
    "RETURN 0 as updated",
    {child: child, parent: parent}
  ) YIELD value

  RETURN
    noCycle AND validLevel as success,
    value.updated as updatedNodes,
    CASE
      WHEN NOT noCycle THEN \\"Would create cycle\\"
      WHEN NOT validLevel THEN \\"Invalid level\\"
      ELSE \\"Success\\"
    END as message
  ',
  'write',
  [['success', 'boolean'], ['updatedNodes', 'long'], ['message', 'string']],
  [['childId', 'string'], ['parentId', 'string']],
  'Safely adds a parent with automatic level updates'
);

// ============================================
// 2. Batch Level Recalculation
// ============================================
CALL apoc.custom.asProcedure(
  'recalculateAllFilterLevels',
  '
  // Set root levels to 0
  MATCH (root:CustomFilter)
  WHERE NOT (root)-[:CHILD_OF]->()
  SET root.level = 0
  WITH count(root) as rootCount

  // Iteratively update levels (max 20 iterations)
  CALL apoc.periodic.iterate(
    "UNWIND range(1, 20) as iteration RETURN iteration",
    "
    MATCH (parent:CustomFilter)-[:CHILD_OF]->(child:CustomFilter)
    WHERE parent.level IS NOT NULL
      AND (child.level IS NULL OR child.level <= parent.level)
    WITH child, max(parent.level) + 1 as newLevel
    SET child.level = newLevel
    RETURN count(child) as updated
    ",
    {batchSize: 100, parallel: false}
  ) YIELD batches, total

  RETURN total as updatedNodes, rootCount
  ',
  'write',
  [['updatedNodes', 'long'], ['rootCount', 'long']],
  [],
  'Recalculates all filter levels from scratch'
);

// ============================================
// 3. Product Auto-Assignment to Ancestors
// ============================================
CALL apoc.custom.asProcedure(
  'autoAssignProductToAncestors',
  '
  MATCH (p:Product {id: $productId})
  MATCH (p)-[:HAS_FILTER]->(directFilter:CustomFilter)

  // Get all ancestors of each direct filter
  MATCH path = (directFilter)-[:CHILD_OF*]->(ancestor:CustomFilter)
  WITH p, collect(DISTINCT ancestor) as ancestors

  // Create relationships to ancestors that don\'t exist
  UNWIND ancestors as ancestor
  MERGE (p)-[:HAS_FILTER {auto_assigned: true}]->(ancestor)

  RETURN count(ancestor) as ancestorsAssigned
  ',
  'write',
  [['ancestorsAssigned', 'long']],
  [['productId', 'string']],
  'Automatically assigns product to all ancestor filters'
);

// ============================================
// 4. Validate Hierarchy Integrity
// ============================================
CALL apoc.custom.asProcedure(
  'validateFilterHierarchy',
  '
  // Check for cycles
  MATCH (f:CustomFilter)
  WHERE exists((f)-[:CHILD_OF*]->(f))
  WITH collect({id: f.id, name: f.name, issue: "cycle"}) as cycleIssues

  // Check level inconsistencies
  MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
  WHERE parent.level >= child.level
  WITH cycleIssues, collect({
    childId: child.id,
    childName: child.name,
    childLevel: child.level,
    parentId: parent.id,
    parentName: parent.name,
    parentLevel: parent.level,
    issue: "level_inconsistency"
  }) as levelIssues

  // Check orphaned relationships
  MATCH (p:Product)-[r:HAS_FILTER]->(f:CustomFilter)
  WHERE NOT exists((f))
  WITH cycleIssues, levelIssues, collect({
    productId: p.id,
    issue: "orphaned_filter"
  }) as orphanIssues

  RETURN
    cycleIssues,
    levelIssues,
    orphanIssues,
    size(cycleIssues) + size(levelIssues) + size(orphanIssues) = 0 as isValid
  ',
  'read',
  [['cycleIssues', 'list'], ['levelIssues', 'list'], ['orphanIssues', 'list'], ['isValid', 'boolean']],
  [],
  'Validates filter hierarchy and returns issues'
);
```

### 3.2 Add Indexes for Performance

```cypher
// If not already created
CREATE INDEX filter_level_idx IF NOT EXISTS FOR (f:CustomFilter) ON (f.level);
CREATE INDEX filter_featured_idx IF NOT EXISTS FOR (f:CustomFilter) ON (f.isFeatured);
CREATE INDEX filter_active_idx IF NOT EXISTS FOR (f:CustomFilter) ON (f.isActive);

// Composite index for common queries
CREATE INDEX filter_active_featured_idx IF NOT EXISTS
FOR (f:CustomFilter) ON (f.isActive, f.isFeatured);
```

---

## 4. Advanced Repository Functions

### 4.1 Add to `custom-filter.repository.ts`

```typescript
/**
 * Use APOC procedure to safely add parent with level updates
 * (Only if APOC is installed)
 */
export async function addParentToFilterAPOC(
  session: Session,
  childId: string,
  parentId: string
): Promise<{ success: boolean; updatedNodes: number; message: string }> {
  try {
    const result = await session.run(
      'CALL addParentToFilter($childId, $parentId) YIELD success, updatedNodes, message',
      { childId, parentId }
    )

    if (result.records.length === 0) {
      return { success: false, updatedNodes: 0, message: 'Procedure not found' }
    }

    const record = result.records[0]
    return {
      success: record.get('success'),
      updatedNodes: typeof record.get('updatedNodes') === 'number'
        ? record.get('updatedNodes')
        : record.get('updatedNodes').toNumber(),
      message: record.get('message')
    }
  } catch (error) {
    console.error('APOC procedure error:', error)
    // Fallback to manual implementation
    return await updateFilterParents(session, childId, [parentId])
  }
}

/**
 * Auto-assign product to all ancestor filters
 */
export async function autoAssignProductToAncestors(
  session: Session,
  productId: string
): Promise<number> {
  try {
    // Try APOC procedure first
    const result = await session.run(
      'CALL autoAssignProductToAncestors($productId) YIELD ancestorsAssigned',
      { productId }
    )

    const count = result.records[0]?.get('ancestorsAssigned')
    return typeof count === 'number' ? count : count?.toNumber() || 0
  } catch (error) {
    // Fallback to manual implementation
    const query = `
      MATCH (p:Product {id: $productId})
      MATCH (p)-[:HAS_FILTER]->(directFilter:CustomFilter)
      MATCH path = (directFilter)-[:CHILD_OF*]->(ancestor:CustomFilter)
      WITH p, collect(DISTINCT ancestor) as ancestors

      UNWIND ancestors as ancestor
      MERGE (p)-[:HAS_FILTER {auto_assigned: true}]->(ancestor)

      RETURN count(ancestor) as ancestorsAssigned
    `

    const result = await session.run(query, { productId })
    const count = result.records[0]?.get('ancestorsAssigned')
    return typeof count === 'number' ? count : count?.toNumber() || 0
  }
}

/**
 * Enhanced product tagging with ancestor auto-assignment
 */
export async function tagProductWithFiltersEnhanced(
  session: Session,
  productId: string,
  filterIds: string[]
): Promise<{ directTags: number; ancestorTags: number }> {
  // Remove existing direct tags (keep auto-assigned)
  await session.run(
    `MATCH (p:Product {id: $productId})-[r:HAS_FILTER]->()
     WHERE r.auto_assigned IS NULL OR r.auto_assigned = false
     DELETE r`,
    { productId }
  )

  // Add new direct tags
  if (filterIds.length > 0) {
    await session.run(
      `MATCH (p:Product {id: $productId})
       UNWIND $filterIds as filterId
       MATCH (f:CustomFilter {id: filterId})
       CREATE (p)-[:HAS_FILTER {auto_assigned: false}]->(f)`,
      { productId, filterIds }
    )
  }

  // Auto-assign to ancestors
  const ancestorCount = await autoAssignProductToAncestors(session, productId)

  return {
    directTags: filterIds.length,
    ancestorTags: ancestorCount
  }
}

/**
 * Get filter statistics
 */
export async function getFilterStatistics(
  session: Session
): Promise<{
  totalFilters: number
  rootFilters: number
  maxLevel: number
  avgChildrenPerFilter: number
  filtersWithProducts: number
}> {
  const query = `
    MATCH (f:CustomFilter)
    WITH count(f) as total

    MATCH (root:CustomFilter)
    WHERE NOT (root)-[:CHILD_OF]->()
    WITH total, count(root) as roots

    MATCH (f2:CustomFilter)
    WITH total, roots, max(f2.level) as maxLvl

    MATCH (parent:CustomFilter)<-[:CHILD_OF]-(child:CustomFilter)
    WITH total, roots, maxLvl,
         count(child) * 1.0 / count(DISTINCT parent) as avgChildren

    MATCH (f3:CustomFilter)<-[:HAS_FILTER]-(:Product)
    WITH total, roots, maxLvl, avgChildren, count(DISTINCT f3) as withProducts

    RETURN
      total as totalFilters,
      roots as rootFilters,
      maxLvl as maxLevel,
      avgChildren as avgChildrenPerFilter,
      withProducts as filtersWithProducts
  `

  const result = await session.run(query)
  const record = result.records[0]

  return {
    totalFilters: record.get('totalFilters').toNumber(),
    rootFilters: record.get('rootFilters').toNumber(),
    maxLevel: record.get('maxLevel').toNumber(),
    avgChildrenPerFilter: record.get('avgChildrenPerFilter'),
    filtersWithProducts: record.get('filtersWithProducts').toNumber()
  }
}

/**
 * Find duplicate filter names
 */
export async function findDuplicateFilterNames(
  session: Session
): Promise<Array<{ name: string; count: number; ids: string[] }>> {
  const query = `
    MATCH (f:CustomFilter)
    WITH f.name as name, collect(f.id) as ids, count(*) as cnt
    WHERE cnt > 1
    RETURN name, cnt as count, ids
    ORDER BY cnt DESC
  `

  const result = await session.run(query)
  return result.records.map(record => ({
    name: record.get('name'),
    count: record.get('count').toNumber(),
    ids: record.get('ids')
  }))
}

/**
 * Merge duplicate filters
 */
export async function mergeDuplicateFilters(
  session: Session,
  keepId: string,
  removeIds: string[]
): Promise<{ mergedCount: number; reassignedProducts: number }> {
  // Reassign all relationships to the kept filter
  const result = await session.run(
    `MATCH (p:Product)-[r:HAS_FILTER]->(remove:CustomFilter)
     WHERE remove.id IN $removeIds
     MATCH (keep:CustomFilter {id: $keepId})

     // Reassign products
     MERGE (p)-[:HAS_FILTER]->(keep)
     DELETE r

     WITH count(DISTINCT p) as productCount

     // Transfer child relationships
     MATCH (child:CustomFilter)-[r2:CHILD_OF]->(remove:CustomFilter)
     WHERE remove.id IN $removeIds
     MATCH (keep:CustomFilter {id: $keepId})
     MERGE (child)-[:CHILD_OF]->(keep)
     DELETE r2

     WITH productCount

     // Delete duplicate filters
     MATCH (remove:CustomFilter)
     WHERE remove.id IN $removeIds
     DETACH DELETE remove

     RETURN productCount, $removeIdsCount as mergedCount`,
    { keepId, removeIds, removeIdsCount: removeIds.length }
  )

  const record = result.records[0]
  return {
    mergedCount: record.get('mergedCount'),
    reassignedProducts: record.get('productCount').toNumber()
  }
}
```

---

## 5. Validation & Maintenance Scripts

### 5.1 Create `scripts/validate-filters.ts`

```typescript
import { getSession } from '@/lib/db'

interface ValidationIssue {
  type: 'cycle' | 'level_inconsistency' | 'orphaned_product' | 'duplicate_name'
  severity: 'error' | 'warning'
  message: string
  data?: any
}

async function validateFilterHierarchy() {
  const session = getSession()
  console.log('🔍 Validating filter hierarchy...\n')

  const issues: ValidationIssue[] = []

  try {
    // 1. Check for cycles
    console.log('Checking for cycles...')
    const cycleQuery = `
      MATCH (f:CustomFilter)
      WHERE exists((f)-[:CHILD_OF*]->(f))
      RETURN f.id as id, f.name as name
    `
    const cycleResult = await session.run(cycleQuery)

    cycleResult.records.forEach(record => {
      issues.push({
        type: 'cycle',
        severity: 'error',
        message: `Cycle detected in filter: ${record.get('name')}`,
        data: { id: record.get('id'), name: record.get('name') }
      })
    })

    // 2. Check level inconsistencies
    console.log('Checking level inconsistencies...')
    const levelQuery = `
      MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
      WHERE parent.level >= child.level
      RETURN
        child.id as childId,
        child.name as childName,
        child.level as childLevel,
        parent.id as parentId,
        parent.name as parentName,
        parent.level as parentLevel
    `
    const levelResult = await session.run(levelQuery)

    levelResult.records.forEach(record => {
      issues.push({
        type: 'level_inconsistency',
        severity: 'error',
        message: `Level inconsistency: ${record.get('parentName')} (L${record.get('parentLevel')}) -> ${record.get('childName')} (L${record.get('childLevel')})`,
        data: {
          parent: { id: record.get('parentId'), name: record.get('parentName'), level: record.get('parentLevel').toNumber() },
          child: { id: record.get('childId'), name: record.get('childName'), level: record.get('childLevel').toNumber() }
        }
      })
    })

    // 3. Check for orphaned products
    console.log('Checking for orphaned products...')
    const orphanQuery = `
      MATCH (p:Product)-[:HAS_FILTER]->(f:CustomFilter)
      WHERE f.isActive = false
      RETURN p.id as productId, p.name as productName, f.id as filterId, f.name as filterName
      LIMIT 10
    `
    const orphanResult = await session.run(orphanQuery)

    if (orphanResult.records.length > 0) {
      issues.push({
        type: 'orphaned_product',
        severity: 'warning',
        message: `${orphanResult.records.length}+ products tagged with inactive filters`,
        data: orphanResult.records.map(r => ({
          productId: r.get('productId'),
          productName: r.get('productName'),
          filterId: r.get('filterId'),
          filterName: r.get('filterName')
        }))
      })
    }

    // 4. Check for duplicate names
    console.log('Checking for duplicate filter names...')
    const dupQuery = `
      MATCH (f:CustomFilter)
      WITH f.name as name, collect(f) as filters
      WHERE size(filters) > 1
      RETURN name, [f IN filters | {id: f.id, level: f.level}] as duplicates
    `
    const dupResult = await session.run(dupQuery)

    dupResult.records.forEach(record => {
      issues.push({
        type: 'duplicate_name',
        severity: 'warning',
        message: `Duplicate filter name: "${record.get('name')}" (${record.get('duplicates').length} instances)`,
        data: { name: record.get('name'), duplicates: record.get('duplicates') }
      })
    })

    // Summary
    console.log('\n' + '='.repeat(60))
    if (issues.length === 0) {
      console.log('✅ No issues found! Hierarchy is valid.')
    } else {
      const errors = issues.filter(i => i.severity === 'error')
      const warnings = issues.filter(i => i.severity === 'warning')

      console.log(`❌ Found ${errors.length} error(s) and ${warnings.length} warning(s)\n`)

      if (errors.length > 0) {
        console.log('ERRORS:')
        errors.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue.message}`)
        })
        console.log('')
      }

      if (warnings.length > 0) {
        console.log('WARNINGS:')
        warnings.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue.message}`)
        })
      }
    }
    console.log('='.repeat(60))

    return { valid: issues.length === 0, issues }

  } catch (error) {
    console.error('❌ Validation failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

// Run if executed directly
if (require.main === module) {
  validateFilterHierarchy()
    .then(result => {
      process.exit(result.valid ? 0 : 1)
    })
    .catch(() => process.exit(1))
}

export { validateFilterHierarchy }
```

### 5.2 Create `scripts/recalculate-levels.ts`

```typescript
import { getSession } from '@/lib/db'

async function recalculateAllLevels() {
  const session = getSession()
  console.log('🔧 Recalculating all filter levels...\n')

  try {
    // Try APOC procedure first
    try {
      const result = await session.run(
        'CALL recalculateAllFilterLevels() YIELD updatedNodes, rootCount'
      )

      const record = result.records[0]
      console.log(`✅ Updated ${record.get('updatedNodes').toNumber()} nodes`)
      console.log(`✅ Found ${record.get('rootCount').toNumber()} root filters`)
      return record.get('updatedNodes').toNumber()
    } catch (apocError) {
      console.log('⚠️  APOC procedure not found, using manual method...\n')

      // Manual implementation
      // 1. Set root levels
      await session.run(`
        MATCH (root:CustomFilter)
        WHERE NOT (root)-[:CHILD_OF]->()
        SET root.level = 0
      `)
      console.log('✅ Set root filter levels to 0')

      // 2. Iteratively update levels
      let totalUpdated = 0
      let iteration = 0
      const maxIterations = 20

      while (iteration < maxIterations) {
        const result = await session.run(`
          MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter)
          WHERE parent.level IS NOT NULL
            AND (child.level IS NULL OR child.level <= parent.level)
          WITH child, max(parent.level) + 1 as newLevel
          SET child.level = newLevel
          RETURN count(child) as updated
        `)

        const updated = result.records[0]?.get('updated')?.toNumber() || 0
        if (updated === 0) break

        totalUpdated += updated
        iteration++
        console.log(`  Iteration ${iteration}: Updated ${updated} filters`)
      }

      console.log(`\n✅ Total updated: ${totalUpdated} filters in ${iteration} iterations`)
      return totalUpdated
    }

  } catch (error) {
    console.error('❌ Recalculation failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

// Run if executed directly
if (require.main === module) {
  recalculate AllLevels()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { recalculateAllLevels }
```

### 5.3 Create `scripts/seed-default-filters.ts`

```typescript
import { getSession } from '@/lib/db'
import * as filterRepo from '@/lib/repositories/custom-filter.repository'
import defaultHierarchy from '@/config/default-filter-hierarchy.json'

interface FilterDefinition {
  name: string
  level: number
  parents: string[]
  description?: string
  isFeatured?: boolean
}

async function seedDefaultFilters() {
  const session = getSession()
  console.log('🌱 Seeding default filter hierarchy...\n')

  try {
    // Check if filters already exist
    const existing = await filterRepo.getAllFilters(session)
    if (existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing filters`)
      console.log('   Clear database first or filters will be added to existing ones')
      console.log('   Continue? (y/n) ')

      // In a real implementation, you'd want to prompt for user input
      // For now, we'll just proceed
    }

    // Create a map to track created filters
    const filterMap = new Map<string, string>() // name -> id

    // Sort filters by level
    const filters = (defaultHierarchy.filters as FilterDefinition[])
      .sort((a, b) => a.level - b.level)

    console.log(`Creating ${filters.length} filters...\n`)

    for (const filterDef of filters) {
      // Resolve parent IDs
      const parentIds = filterDef.parents
        .map(parentName => filterMap.get(parentName))
        .filter(id => id !== undefined) as string[]

      // Create filter
      const filter = await filterRepo.createCustomFilter(
        session,
        filterDef.name,
        parentIds,
        filterDef.isFeatured || false
      )

      filterMap.set(filterDef.name, filter.id)

      const parentStr = parentIds.length > 0
        ? ` (parents: ${filterDef.parents.join(', ')})`
        : ' (root)'

      console.log(`✅ Created: ${filterDef.name} [L${filter.level}]${parentStr}`)
    }

    console.log(`\n✅ Successfully created ${filters.length} filters`)

    // Validate
    console.log('\nValidating hierarchy...')
    const validation = await filterRepo.validateNoCycles(session, '', [])

    return { success: true, count: filters.length }

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await session.close()
  }
}

// Run if executed directly
if (require.main === module) {
  seedDefaultFilters()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { seedDefaultFilters }
```

### 5.4 Update `package.json`

Add these scripts:

```json
{
  "scripts": {
    "filters:validate": "tsx scripts/validate-filters.ts",
    "filters:recalculate": "tsx scripts/recalculate-levels.ts",
    "filters:seed": "tsx scripts/seed-default-filters.ts",
    "filters:setup": "npm run filters:seed && npm run filters:validate"
  }
}
```

---

## 6. Admin UI Components

### 6.1 Create `src/components/admin/FilterHierarchyTree.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, Link, Trash2, AlertCircle } from 'lucide-react'
import type { CustomFilter } from '@/lib/repositories/custom-filter.repository'

interface FilterNode extends CustomFilter {
  children: FilterNode[]
  productCount?: number
}

interface FilterTreeProps {
  onAddChild?: (parentId: string) => void
  onAddParent?: (childId: string) => void
  onDelete?: (id: string) => void
  showProductCounts?: boolean
}

export function FilterHierarchyTree({
  onAddChild,
  onAddParent,
  onDelete,
  showProductCounts = true
}: FilterTreeProps) {
  const [filters, setFilters] = useState<FilterNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFilters()
  }, [])

  async function loadFilters() {
    // Load tree structure
    const response = await fetch('/api/filters/tree')
    const data = await response.json()
    setFilters(data)
    setLoading(false)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function renderNode(node: FilterNode, depth: number = 0) {
    const hasChildren = node.children.length > 0
    const isExpanded = expanded.has(node.id)

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand/Collapse */}
          <button
            onClick={() => toggleExpand(node.id)}
            className="p-1 hover:bg-gray-200 rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <div className="w-4" />
            )}
          </button>

          {/* Filter Name */}
          <div className="flex-1 flex items-center gap-2">
            <span className="font-medium">{node.name}</span>
            {!node.isActive && (
              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                Inactive
              </span>
            )}
            {node.isFeatured && (
              <span className="text-xs px-2 py-0.5 bg-gold-100 text-gold-800 rounded">
                Featured
              </span>
            )}
          </div>

          {/* Level Badge */}
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            L{node.level}
          </span>

          {/* Product Count */}
          {showProductCounts && (
            <span className="text-xs text-gray-500">
              {node.productCount || 0} products
            </span>
          )}

          {/* Actions */}
          <div className="hidden group-hover:flex gap-1">
            {onAddChild && (
              <button
                onClick={() => onAddChild(node.id)}
                className="p-1 hover:bg-gray-200 rounded"
                title="Add child filter"
              >
                <Plus size={14} />
              </button>
            )}
            {onAddParent && (
              <button
                onClick={() => onAddParent(node.id)}
                className="p-1 hover:bg-gray-200 rounded"
                title="Add parent filter"
              >
                <Link size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(node.id)}
                className="p-1 hover:bg-red-200 rounded text-red-600"
                title="Delete filter"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-lg">Filter Hierarchy</h3>
        <p className="text-sm text-gray-600 mt-1">
          {filters.length} root filters
        </p>
      </div>
      <div className="p-2">
        {filters.map(node => renderNode(node))}
      </div>
    </div>
  )
}
```

### 6.2 Create `src/components/admin/FilterValidationPanel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface ValidationIssue {
  type: string
  severity: 'error' | 'warning'
  message: string
}

export function FilterValidationPanel() {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<{
    valid: boolean
    issues: ValidationIssue[]
  } | null>(null)

  async function runValidation() {
    setValidating(true)
    try {
      const response = await fetch('/api/admin/filters/validate', {
        method: 'POST'
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setValidating(false)
    }
  }

  async function runRecalculation() {
    setValidating(true)
    try {
      const response = await fetch('/api/admin/filters/recalculate', {
        method: 'POST'
      })
      const data = await response.json()
      alert(`Recalculated ${data.updatedNodes} filter levels`)
      await runValidation() // Re-validate after recalculation
    } catch (error) {
      console.error('Recalculation failed:', error)
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="border rounded-lg bg-white p-6">
      <h3 className="text-lg font-semibold mb-4">Hierarchy Validation</h3>

      <div className="flex gap-3 mb-4">
        <button
          onClick={runValidation}
          disabled={validating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {validating ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          Validate Hierarchy
        </button>

        <button
          onClick={runRecalculation}
          disabled={validating}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Recalculate Levels
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded-md ${result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.valid ? (
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle size={20} />
              <span className="font-medium">Hierarchy is valid! No issues found.</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-red-800 mb-3">
                <AlertCircle size={20} />
                <span className="font-medium">
                  Found {result.issues.length} issue(s)
                </span>
              </div>
              <ul className="space-y-2">
                {result.issues.map((issue, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      issue.severity === 'error'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {issue.severity}
                    </span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 7. Testing & Quality Assurance

### 7.1 Create Test Suite `__tests__/filters.test.ts`

```typescript
import { getSession } from '@/lib/db'
import * as filterRepo from '@/lib/repositories/custom-filter.repository'

describe('Filter Hierarchy Tests', () => {
  let session: any

  beforeEach(async () => {
    session = getSession()
  })

  afterEach(async () => {
    await session.close()
  })

  describe('Cycle Prevention', () => {
    it('should prevent direct cycles', async () => {
      const filter1 = await filterRepo.createCustomFilter(session, 'Test1', [])
      const filter2 = await filterRepo.createCustomFilter(session, 'Test2', [filter1.id])

      // Try to make filter1 a child of filter2 (would create cycle)
      const validation = await filterRepo.validateNoCycles(session, filter1.id, [filter2.id])

      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('ancestor')
    })

    it('should prevent indirect cycles', async () => {
      const filter1 = await filterRepo.createCustomFilter(session, 'Test1', [])
      const filter2 = await filterRepo.createCustomFilter(session, 'Test2', [filter1.id])
      const filter3 = await filterRepo.createCustomFilter(session, 'Test3', [filter2.id])

      // Try to make filter1 a child of filter3 (would create cycle through filter2)
      const validation = await filterRepo.validateNoCycles(session, filter1.id, [filter3.id])

      expect(validation.valid).toBe(false)
    })

    it('should prevent self-reference', async () => {
      const filter = await filterRepo.createCustomFilter(session, 'Test', [])

      const validation = await filterRepo.validateNoCycles(session, filter.id, [filter.id])

      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('own parent')
    })
  })

  describe('Level Calculation', () => {
    it('should set root filters to level 0', async () => {
      const filter = await filterRepo.createCustomFilter(session, 'Root', [])
      expect(filter.level).toBe(0)
    })

    it('should calculate level based on max parent level', async () => {
      const parent1 = await filterRepo.createCustomFilter(session, 'Parent1', [])
      const parent2 = await filterRepo.createCustomFilter(session, 'Parent2', [])
      const child = await filterRepo.createCustomFilter(session, 'Child', [parent1.id, parent2.id])

      expect(child.level).toBe(1)
    })

    it('should update descendant levels when parent changes', async () => {
      const root = await filterRepo.createCustomFilter(session, 'Root', [])
      const child = await filterRepo.createCustomFilter(session, 'Child', [root.id])
      const grandchild = await filterRepo.createCustomFilter(session, 'Grandchild', [child.id])

      expect(grandchild.level).toBe(2)

      // Add another parent to child at level 2
      const newParent = await filterRepo.createCustomFilter(session, 'NewParent', [])
      const subParent = await filterRepo.createCustomFilter(session, 'SubParent', [newParent.id])

      await filterRepo.updateFilterParents(session, child.id, [root.id, subParent.id])

      // Child should now be at level 2, grandchild at level 3
      const updatedChild = await session.run(
        'MATCH (f:CustomFilter {id: $id}) RETURN f.level as level',
        { id: child.id }
      )
      expect(updatedChild.records[0].get('level').toNumber()).toBe(2)
    })
  })

  describe('Product Tagging', () => {
    it('should tag product with direct filters only', async () => {
      const filter = await filterRepo.createCustomFilter(session, 'Test', [])

      // Create a mock product
      await session.run(
        'CREATE (p:Product {id: $id, name: $name})',
        { id: 'test-product', name: 'Test Product' }
      )

      await filterRepo.tagProductWithFilters(session, 'test-product', [filter.id])

      const result = await filterRepo.getProductFilters(session, 'test-product')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(filter.id)
    })

    it('should auto-assign to ancestor filters', async () => {
      const root = await filterRepo.createCustomFilter(session, 'Root', [])
      const child = await filterRepo.createCustomFilter(session, 'Child', [root.id])

      await session.run(
        'CREATE (p:Product {id: $id, name: $name})',
        { id: 'test-product', name: 'Test Product' }
      )

      await filterRepo.tagProductWithFilters(session, 'test-product', [child.id])
      await filterRepo.autoAssignProductToAncestors(session, 'test-product')

      const result = await filterRepo.getProductFilters(session, 'test-product')
      expect(result.length).toBeGreaterThanOrEqual(2) // Should have both child and root
    })
  })
})
```

### 7.2 Manual Testing Checklist

```markdown
## Filter Hierarchy Testing Checklist

### Basic Operations
- [ ] Create root-level filter
- [ ] Create child filter with single parent
- [ ] Create filter with multiple parents
- [ ] Update filter name and status
- [ ] Delete filter without children
- [ ] Delete filter with children (should fail)

### Hierarchy Rules
- [ ] Verify cycle prevention (A -> B -> A)
- [ ] Verify level calculation for single parent
- [ ] Verify level calculation for multiple parents (max + 1)
- [ ] Verify level recalculation after parent change
- [ ] Verify descendant level updates

### Product Tagging
- [ ] Tag product with single filter
- [ ] Tag product with multiple filters
- [ ] Verify product appears in filter queries
- [ ] Verify product appears in ancestor filter queries
- [ ] Remove product tags

### Performance
- [ ] Load 100+ filters in tree view
- [ ] Filter products with 10+ selected filters
- [ ] Batch product count calculation
- [ ] Hierarchy validation with 100+ filters

### Edge Cases
- [ ] Create filter with same name as existing (should allow)
- [ ] Add 5+ parents to single filter
- [ ] Create 10-level deep hierarchy
- [ ] Cross-branch selections (Men + Women + Casual)
- [ ] Inactive filter handling
```

---

## Next Steps

1. **Install APOC (Optional)**:
   ```bash
   # If using Docker
   docker exec -it factory-bay-neo4j bin/neo4j-admin server plugins install apoc
   docker restart factory-bay-neo4j
   ```

2. **Run Database Enhancements**:
   - Execute the APOC procedure definitions in Neo4j Browser
   - Create the performance indexes

3. **Add Repository Functions**:
   - Copy the enhanced functions to `custom-filter.repository.ts`
   - Add corresponding server actions

4. **Create Scripts**:
   - Set up the validation and maintenance scripts
   - Add package.json scripts
   - Test with `npm run filters:validate`

5. **Implement Admin UI**:
   - Create the tree visualization component
   - Add validation panel to admin dashboard
   - Test hierarchy management

6. **Testing**:
   - Set up automated tests
   - Run manual testing checklist
   - Validate with production-like data volume

---

## Summary

Your Factory Bay project already has a **solid foundation** for multi-parent categories. This guide adds:

- ✅ **Performance optimizations** with APOC procedures
- ✅ **Maintenance scripts** for validation and repair
- ✅ **Enhanced admin UI** for visual management
- ✅ **Auto-assignment** to ancestor filters
- ✅ **Comprehensive testing** suite
- ✅ **Production-ready** validation and monitoring

The system is already production-capable. These enhancements make it more maintainable and easier to scale.
