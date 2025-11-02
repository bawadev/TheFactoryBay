# APOC Setup and Custom Procedures Documentation

This document provides comprehensive instructions for setting up APOC (Awesome Procedures On Cypher) in Neo4j and installing custom filter management procedures.

## Table of Contents

1. [APOC Installation](#apoc-installation)
2. [Custom Procedures](#custom-procedures)
3. [Performance Indexes](#performance-indexes)
4. [Verification Steps](#verification-steps)
5. [Troubleshooting](#troubleshooting)

---

## APOC Installation

### For Docker-based Neo4j

If you're running Neo4j in Docker, you need to use a Neo4j Docker image that includes APOC.

#### Option 1: Using Official Neo4j Image with APOC Plugin

```bash
docker run \
  --name neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/factorybay123 \
  -e NEO4J_PLUGINS='["apoc"]' \
  -v neo4j_data:/data \
  -v neo4j_logs:/logs \
  neo4j:5.26-enterprise
```

**Note**: The enterprise image includes APOC by default when `NEO4J_PLUGINS=["apoc"]` is set.

#### Option 2: Manual Installation in Docker

If using community edition or an existing container:

```bash
# Connect to your Neo4j container
docker exec -it neo4j bash

# Download APOC Core JAR
cd /var/lib/neo4j/plugins
wget https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/5.26.0/apoc-5.26.0-core.jar

# Restart Neo4j
docker restart neo4j
```

### For Neo4j Desktop

1. **Open Neo4j Desktop** application
2. **Select your database** in the left sidebar
3. **Click the "Plugins" tab** at the top
4. **Search for "APOC"** in the plugin marketplace
5. **Click "Install"** on the APOC plugin
6. **Restart your database** (click the restart button)

### Verify APOC Installation

After installation, verify APOC is available by running this in Neo4j Browser:

```cypher
RETURN apoc.version() AS apoc_version;
```

Expected output:
```
apoc_version: "5.26.0"
```

---

## Custom Procedures

This section defines all custom APOC procedures used in the Filter Hierarchy system.

### 1. addParentToFilter

**Description**: Safely adds a parent filter to an existing filter node, preventing circular relationships.

**Procedure Definition**:
```cypher
CALL apoc.custom.asProcedure('addParentToFilter',
  'MATCH (childFilter:Filter {id: $childId})
   MATCH (parentFilter:Filter {id: $parentId})
   WITH childFilter, parentFilter
   WHERE NOT EXISTS((childFilter)-[:HAS_PARENT*]-(parentFilter))
   MERGE (childFilter)-[:HAS_PARENT]->(parentFilter)
   RETURN childFilter.id AS childId, parentFilter.id AS parentId, true AS added',
  'WRITE',
  [['childId', 'STRING'], ['parentId', 'STRING']],
  [['childId', 'STRING'], ['parentId', 'STRING'], ['added', 'BOOLEAN']]);
```

**Parameters**:
- `childId` (STRING): The ID of the filter that will have a parent
- `parentId` (STRING): The ID of the filter to become the parent

**Return Values**:
- `childId` (STRING): The child filter's ID
- `parentId` (STRING): The parent filter's ID
- `added` (BOOLEAN): true if relationship was created, false if prevented (circular dependency detected)

**Usage Example**:
```cypher
CALL apoc.custom.addParentToFilter('mens-casual-wear', 'mens-clothing')
YIELD childId, parentId, added
RETURN childId, parentId, added;
```

**Copy-Paste Ready Installation**:
```cypher
CALL apoc.custom.asProcedure('addParentToFilter',
  'MATCH (childFilter:Filter {id: $childId})
   MATCH (parentFilter:Filter {id: $parentId})
   WITH childFilter, parentFilter
   WHERE NOT EXISTS((childFilter)-[:HAS_PARENT*]-(parentFilter))
   MERGE (childFilter)-[:HAS_PARENT]->(parentFilter)
   RETURN childFilter.id AS childId, parentFilter.id AS parentId, true AS added',
  'WRITE',
  [['childId', 'STRING'], ['parentId', 'STRING']],
  [['childId', 'STRING'], ['parentId', 'STRING'], ['added', 'BOOLEAN']]);
```

---

### 2. recalculateAllFilterLevels

**Description**: Recalculates the hierarchy level for all filters based on their distance from root filters. Updates the `level` property on all Filter nodes.

**Procedure Definition**:
```cypher
CALL apoc.custom.asProcedure('recalculateAllFilterLevels',
  'MATCH (root:Filter)
   WHERE NOT EXISTS((root)-[:HAS_PARENT]->())
   WITH root
   CALL apoc.path.expandConfig(root, {
     relationshipFilter: "HAS_PARENT",
     minLevel: 0,
     maxLevel: 10
   }) YIELD path
   WITH nodes(path) AS filterPath, length(path) AS depth
   WITH filterPath[depth] AS filter, depth AS calculatedLevel
   SET filter.level = calculatedLevel
   RETURN count(filter) AS updatedCount, max(calculatedLevel) AS maxDepth',
  'WRITE',
  [],
  [['updatedCount', 'INTEGER'], ['maxDepth', 'INTEGER']]);
```

**Parameters**: None

**Return Values**:
- `updatedCount` (INTEGER): Number of filters updated
- `maxDepth` (INTEGER): Maximum depth found in the hierarchy

**Usage Example**:
```cypher
CALL apoc.custom.recalculateAllFilterLevels()
YIELD updatedCount, maxDepth
RETURN updatedCount, maxDepth;
```

**Copy-Paste Ready Installation**:
```cypher
CALL apoc.custom.asProcedure('recalculateAllFilterLevels',
  'MATCH (root:Filter)
   WHERE NOT EXISTS((root)-[:HAS_PARENT]->())
   WITH root
   CALL apoc.path.expandConfig(root, {
     relationshipFilter: "HAS_PARENT",
     minLevel: 0,
     maxLevel: 10
   }) YIELD path
   WITH nodes(path) AS filterPath, length(path) AS depth
   WITH filterPath[depth] AS filter, depth AS calculatedLevel
   SET filter.level = calculatedLevel
   RETURN count(filter) AS updatedCount, max(calculatedLevel) AS maxDepth',
  'WRITE',
  [],
  [['updatedCount', 'INTEGER'], ['maxDepth', 'INTEGER']]);
```

---

### 3. autoAssignProductToAncestors

**Description**: Automatically assigns a product to all ancestor filters when it's assigned to a specific filter. Handles transitive relationships in the filter hierarchy.

**Procedure Definition**:
```cypher
CALL apoc.custom.asProcedure('autoAssignProductToAncestors',
  'MATCH (product:Product {id: $productId})
   MATCH (filter:Filter {id: $filterId})
   MERGE (product)-[:BELONGS_TO]->(filter)
   WITH product, filter
   MATCH (ancestor:Filter)-[:HAS_PARENT*1..]->(filter)
   MERGE (product)-[:BELONGS_TO]->(ancestor)
   RETURN product.id AS productId, filter.id AS filterId,
          collect(ancestor.id) AS ancestorIds, count(ancestor) AS ancestorCount',
  'WRITE',
  [['productId', 'STRING'], ['filterId', 'STRING']],
  [['productId', 'STRING'], ['filterId', 'STRING'], ['ancestorIds', 'LIST'], ['ancestorCount', 'INTEGER']]);
```

**Parameters**:
- `productId` (STRING): The ID of the product to assign
- `filterId` (STRING): The ID of the filter to assign the product to

**Return Values**:
- `productId` (STRING): The product's ID
- `filterId` (STRING): The filter's ID
- `ancestorIds` (LIST): Array of all ancestor filter IDs the product was assigned to
- `ancestorCount` (INTEGER): Count of ancestors the product was assigned to

**Usage Example**:
```cypher
CALL apoc.custom.autoAssignProductToAncestors('PROD-12345', 'mens-casual-wear')
YIELD productId, filterId, ancestorIds, ancestorCount
RETURN productId, filterId, ancestorIds, ancestorCount;
```

**Copy-Paste Ready Installation**:
```cypher
CALL apoc.custom.asProcedure('autoAssignProductToAncestors',
  'MATCH (product:Product {id: $productId})
   MATCH (filter:Filter {id: $filterId})
   MERGE (product)-[:BELONGS_TO]->(filter)
   WITH product, filter
   MATCH (ancestor:Filter)-[:HAS_PARENT*1..]->(filter)
   MERGE (product)-[:BELONGS_TO]->(ancestor)
   RETURN product.id AS productId, filter.id AS filterId,
          collect(ancestor.id) AS ancestorIds, count(ancestor) AS ancestorCount',
  'WRITE',
  [['productId', 'STRING'], ['filterId', 'STRING']],
  [['productId', 'STRING'], ['filterId', 'STRING'], ['ancestorIds', 'LIST'], ['ancestorCount', 'INTEGER']]);
```

---

### 4. validateFilterHierarchy

**Description**: Validates the entire filter hierarchy for consistency. Checks for cycles, orphaned filters, and inconsistent levels. Returns a report of any issues found.

**Procedure Definition**:
```cypher
CALL apoc.custom.asProcedure('validateFilterHierarchy',
  'WITH [] AS issues
   MATCH (filter:Filter)-[:HAS_PARENT*1..]->(ancestor:Filter)
   WHERE filter = ancestor
   WITH issues + ["Cycle detected: " + filter.id] AS issues
   MATCH (orphaned:Filter)
   WHERE NOT EXISTS((orphaned)-[:HAS_PARENT]->())
     AND NOT EXISTS((orphaned)<-[:HAS_PARENT]-())
   WITH issues + ["Orphaned filter: " + orphaned.id] AS issues
   MATCH (parent:Filter)-[:HAS_PARENT]->(child:Filter)
   WHERE parent.level >= child.level
   WITH issues + ["Inconsistent levels: " + parent.id + " (level " + parent.level + ") > " + child.id + " (level " + child.level + ")"] AS issues
   RETURN issues, size(issues) AS issueCount',
  'READ',
  [],
  [['issues', 'LIST'], ['issueCount', 'INTEGER']]);
```

**Parameters**: None

**Return Values**:
- `issues` (LIST): Array of issue descriptions found in the hierarchy
- `issueCount` (INTEGER): Total number of issues found

**Usage Example**:
```cypher
CALL apoc.custom.validateFilterHierarchy()
YIELD issues, issueCount
RETURN issues, issueCount;
```

**Copy-Paste Ready Installation**:
```cypher
CALL apoc.custom.asProcedure('validateFilterHierarchy',
  'WITH [] AS issues
   MATCH (filter:Filter)-[:HAS_PARENT*1..]->(ancestor:Filter)
   WHERE filter = ancestor
   WITH issues + ["Cycle detected: " + filter.id] AS issues
   MATCH (orphaned:Filter)
   WHERE NOT EXISTS((orphaned)-[:HAS_PARENT]->())
     AND NOT EXISTS((orphaned)<-[:HAS_PARENT]-())
   WITH issues + ["Orphaned filter: " + orphaned.id] AS issues
   MATCH (parent:Filter)-[:HAS_PARENT]->(child:Filter)
   WHERE parent.level >= child.level
   WITH issues + ["Inconsistent levels: " + parent.id + " (level " + parent.level + ") > " + child.id + " (level " + child.level + ")"] AS issues
   RETURN issues, size(issues) AS issueCount',
  'READ',
  [],
  [['issues', 'LIST'], ['issueCount', 'INTEGER']]);
```

---

## Performance Indexes

To optimize queries on the Filter hierarchy, create these indexes in Neo4j:

### Create Indexes

Run these in Neo4j Browser to create performance indexes:

```cypher
-- Index on Filter ID for fast lookups
CREATE INDEX idx_filter_id IF NOT EXISTS FOR (f:Filter) ON (f.id);

-- Index on Filter level for hierarchy queries
CREATE INDEX idx_filter_level IF NOT EXISTS FOR (f:Filter) ON (f.level);

-- Composite index for level and featured combination
CREATE INDEX idx_filter_level_featured IF NOT EXISTS FOR (f:Filter) ON (f.level, f.featured);

-- Index on Product ID for product assignments
CREATE INDEX idx_product_id IF NOT EXISTS FOR (p:Product) ON (p.id);

-- Composite index for Product ID and filter relationships
CREATE INDEX idx_product_filter IF NOT EXISTS FOR (p:Product) ON (p.id);
```

### Verify Indexes

Check that indexes were created successfully:

```cypher
CALL db.indexes();
```

Expected output should show all the indexes created above.

---

## Verification Steps

Follow these steps to verify APOC is properly installed and custom procedures are working:

### Step 1: Verify APOC Installation

```cypher
RETURN apoc.version() AS version;
```

**Expected Result**: Should return version number like "5.26.0"

### Step 2: Install Custom Procedures

Copy and paste each procedure definition from the [Custom Procedures](#custom-procedures) section into Neo4j Browser and execute them one by one.

### Step 3: List All Custom Procedures

```cypher
CALL apoc.custom.list();
```

**Expected Result**: Should show all 4 custom procedures:
- addParentToFilter
- recalculateAllFilterLevels
- autoAssignProductToAncestors
- validateFilterHierarchy

### Step 4: Test addParentToFilter

First, create test filters:

```cypher
CREATE (root:Filter {id: 'test-root', name: 'Test Root', level: 0})
CREATE (child:Filter {id: 'test-child', name: 'Test Child', level: 1})
RETURN root, child;
```

Then test the procedure:

```cypher
CALL apoc.custom.addParentToFilter('test-child', 'test-root')
YIELD childId, parentId, added
RETURN childId, parentId, added;
```

**Expected Result**:
```
childId: "test-child"
parentId: "test-root"
added: true
```

### Step 5: Test recalculateAllFilterLevels

```cypher
CALL apoc.custom.recalculateAllFilterLevels()
YIELD updatedCount, maxDepth
RETURN updatedCount, maxDepth;
```

**Expected Result**: Should return count of filters updated and maximum depth

### Step 6: Test autoAssignProductToAncestors

First, create a test product:

```cypher
CREATE (p:Product {id: 'test-product', name: 'Test Product'})
RETURN p;
```

Then test the procedure (if test filters exist):

```cypher
CALL apoc.custom.autoAssignProductToAncestors('test-product', 'test-child')
YIELD productId, filterId, ancestorIds, ancestorCount
RETURN productId, filterId, ancestorIds, ancestorCount;
```

**Expected Result**: Should show product assignment and list of ancestors

### Step 7: Test validateFilterHierarchy

```cypher
CALL apoc.custom.validateFilterHierarchy()
YIELD issues, issueCount
RETURN issues, issueCount;
```

**Expected Result**: With valid test data, should return empty issues list

### Step 8: Clean Up Test Data

```cypher
MATCH (n) WHERE n.id IN ['test-root', 'test-child', 'test-product'] DETACH DELETE n;
```

---

## Troubleshooting

### Issue: "No procedures with the given name found"

**Solution**: Ensure APOC is properly installed:
1. Check APOC is installed: `RETURN apoc.version();`
2. Restart Neo4j if APOC was just installed
3. Re-register the custom procedures from the [Custom Procedures](#custom-procedures) section

### Issue: "No database selected"

**Solution**: Connect to your Neo4j instance in the browser:
1. Open http://localhost:7474 in your browser
2. Verify you can connect with credentials (default: neo4j / factorybay123)
3. Run queries in the Neo4j Browser console

### Issue: Docker container exits immediately after starting with APOC plugin

**Solution**:
1. Check Docker logs: `docker logs neo4j`
2. Ensure sufficient disk space and memory
3. Try using a specific Neo4j version: `neo4j:5.26.0-enterprise` instead of latest
4. Check if ports 7474 and 7687 are already in use

### Issue: Circular relationship detected when adding parent

**Solution**: This is by design - the procedure prevents cycles. Verify:
1. The parent filter is not a descendant of the child filter
2. The hierarchy structure is correct
3. Check the current hierarchy: `MATCH (f:Filter) RETURN f.id, f.level ORDER BY f.level`

### Issue: Custom procedure not returning expected data

**Solution**:
1. Verify the procedure was registered correctly
2. Check parameter types match the definition
3. Run the procedure with detailed output:
   ```cypher
   CALL apoc.custom.list() YIELD name WHERE name = 'yourProcedureName' RETURN *;
   ```
4. Test with simpler data before using on production database

### Issue: Filter levels not being calculated correctly

**Solution**:
1. Verify all filters have proper HAS_PARENT relationships
2. Run recalculate procedure: `CALL apoc.custom.recalculateAllFilterLevels();`
3. Check for orphaned filters: `MATCH (f:Filter) WHERE NOT EXISTS((f)-[:HAS_PARENT]->()) RETURN f;`
4. Verify parent-child relationship directions (parent -> child, not child -> parent)

---

## Additional Resources

- [APOC Official Documentation](https://neo4j.com/docs/apoc/current/)
- [Neo4j Custom Procedures](https://neo4j.com/docs/cypher-manual/current/syntax/procedures/)
- [Neo4j Path Expansion](https://neo4j.com/docs/apoc/current/overview/apoc.path/)
- Neo4j Browser: http://localhost:7474 (default credentials: neo4j/factorybay123)

---

## Quick Reference Commands

```bash
# Run filter validation from command line
npm run filters:validate

# Recalculate all filter levels
npm run filters:recalculate

# Seed default filter hierarchy
npm run filters:seed

# Complete setup (seed + validate)
npm run filters:setup
```

---

**Last Updated**: November 2, 2025
**APOC Version**: 5.26.0
**Neo4j Version**: 5.26+
