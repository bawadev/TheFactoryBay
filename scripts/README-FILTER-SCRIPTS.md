# Filter Hierarchy Management Scripts

This directory contains three TypeScript scripts for managing the filter hierarchy in Factory Bay's Neo4j database.

## Scripts Overview

### 1. validate-filters.ts

**Purpose**: Validates the filter hierarchy integrity

**Run with**: `npm run filters:validate`

**What it checks**:
- ✅ Cycles in CHILD_OF relationships
- ✅ Level inconsistencies (parent level >= child level)
- ✅ Orphaned filters (filters with level > 0 but no parents)
- ✅ Duplicate filter names
- ⚠️  Orphaned products (products tagged with inactive filters)

**Output**: Formatted validation report with errors and warnings

**Exit codes**:
- `0` - All validation checks passed
- `1` - Issues found (errors or warnings)

**Example**:
```bash
npm run filters:validate
```

---

### 2. recalculate-levels.ts

**Purpose**: Recalculates all filter levels based on parent relationships

**Run with**: `npm run filters:recalculate`

**How it works**:
1. Sets root filters (no parents) to level 0
2. Iteratively updates child levels: level = max(parent levels) + 1
3. Continues until no more updates needed (max 20 iterations)
4. Tries APOC procedure first for efficiency
5. Falls back to manual iteration if APOC not available

**When to use**:
- After bulk relationship changes
- When validation reports level inconsistencies
- After importing filters from external sources

**Output**:
- Number of filters updated per iteration
- Level distribution chart
- Validation of final results

**Example**:
```bash
npm run filters:recalculate
```

---

### 3. seed-default-filters.ts

**Purpose**: Seeds the default filter hierarchy from backup configuration

**Run with**: `npm run filters:seed` or `npm run filters:seed --clear`

**Source**: `config/default-filter-hierarchy.json.backup`

**Features**:
- ✅ Checks if filters already exist (warns and skips to prevent duplicates)
- ✅ Sorts filters by level before creating (roots first)
- ✅ Resolves parent relationships using filter names
- ✅ Creates filters with proper parent relationships
- ✅ Validates hierarchy after seeding

**Flags**:
- `--clear`: Delete all existing filters before seeding (use with caution!)

**Safety**:
- Won't seed if filters already exist (unless `--clear` is used)
- 3-second delay before clearing when using `--clear`
- Validates hierarchy after seeding

**Examples**:
```bash
# Seed filters (will skip if filters already exist)
npm run filters:seed

# Clear existing filters and seed fresh
npm run filters:seed --clear
```

---

## Common Workflows

### Fresh Database Setup
```bash
# 1. Seed the default filter hierarchy
npm run filters:seed

# 2. Validate the hierarchy
npm run filters:validate
```

### After Manual Changes
```bash
# 1. Recalculate levels to ensure consistency
npm run filters:recalculate

# 2. Validate the hierarchy
npm run filters:validate
```

### Reset Filter Hierarchy
```bash
# 1. Clear and reseed from backup
npm run filters:seed --clear

# 2. Validate
npm run filters:validate
```

### Troubleshooting Issues
```bash
# 1. Run validation to identify problems
npm run filters:validate

# 2. Fix level issues
npm run filters:recalculate

# 3. Re-validate
npm run filters:validate
```

---

## Technical Details

### Database Access
All scripts use the centralized database connection from `src/lib/db.ts`:
```typescript
import { getSession, closeDriver } from '../src/lib/db'
```

### Repository Integration
Scripts use the filter repository for all database operations:
```typescript
import { createCustomFilter, getAllFilters } from '../src/lib/repositories/custom-filter.repository'
```

### Error Handling
- All scripts properly close Neo4j sessions in `finally` blocks
- Appropriate exit codes for CI/CD integration
- Colored console output for better UX (✅ ❌ ⚠️)

### Environment
- Loads environment variables from `.env.local`
- Compatible with `npm run` execution
- Can be executed directly: `npx tsx scripts/validate-filters.ts`

---

## Configuration File Format

The `config/default-filter-hierarchy.json.backup` file has this structure:

```json
{
  "version": "1.0.0",
  "description": "Default filter hierarchy",
  "filters": [
    {
      "name": "Men",
      "level": 0,
      "parents": [],
      "isFeatured": true,
      "description": "Men's products"
    },
    {
      "name": "Clothing",
      "level": 1,
      "parents": ["Men", "Women"],
      "isFeatured": true,
      "description": "All clothing items"
    }
  ]
}
```

### Filter Properties
- `name` (required): Unique filter name
- `level` (required): Hierarchy level (0 = root)
- `parents` (required): Array of parent filter names (empty for roots)
- `isFeatured` (optional): Whether to feature on homepage (default: false)
- `description` (optional): Human-readable description
- `category` (optional): Filter category tag

---

## Notes

- **APOC Plugin**: The recalculate script attempts to use APOC for better performance but works fine without it
- **Multi-parent Support**: All scripts support filters with multiple parents
- **Idempotency**: Seed script is idempotent (won't create duplicates)
- **Validation First**: Always run validation before and after major changes

---

## Integration with Package.json

These scripts are available as npm commands:

```json
{
  "scripts": {
    "filters:validate": "tsx scripts/validate-filters.ts",
    "filters:recalculate": "tsx scripts/recalculate-levels.ts",
    "filters:seed": "tsx scripts/seed-default-filters.ts"
  }
}
```
