# Leaf Category Validation System

## Overview

This document describes the validation system that enforces the rule: **Products can ONLY be assigned to leaf categories (categories without children)**.

## What Are Leaf Categories?

A **leaf category** is a category that has **no child categories**. In a category hierarchy tree, leaf categories are the endpoints of branches.

### Example:
```
Ladies (L0) - PARENT CATEGORY
├── Clothing (L1) - PARENT CATEGORY
│   ├── Tops (L2) - PARENT CATEGORY
│   │   ├── Shirts (L3) - LEAF CATEGORY ✓
│   │   ├── Blouses (L3) - LEAF CATEGORY ✓
│   │   └── T-Shirts (L3) - LEAF CATEGORY ✓
│   └── Bottoms (L2) - PARENT CATEGORY
│       ├── Jeans (L3) - LEAF CATEGORY ✓
│       └── Pants (L3) - LEAF CATEGORY ✓
└── Footwear (L1) - PARENT CATEGORY
    ├── Heels (L2) - LEAF CATEGORY ✓
    └── Flats (L2) - LEAF CATEGORY ✓
```

In this example:
- **Can accept products**: Shirts, Blouses, T-Shirts, Jeans, Pants, Heels, Flats
- **Cannot accept products**: Ladies, Clothing, Tops, Bottoms, Footwear

## Why This Rule?

### Benefits:
1. **Data Integrity**: Prevents confusion about which level of the hierarchy contains actual products
2. **Query Efficiency**: Product queries can target specific leaf categories without recursion
3. **Clear Organization**: Products are organized at the most specific level possible
4. **Consistent UX**: Users browse hierarchies knowing products are always at the bottom level

### Without This Rule (Problems):
- A product could be assigned to both "Clothing" and "Shirts", causing confusion
- Queries would need to check every level of the hierarchy
- Unclear whether to show products at parent level or child level
- Difficult to maintain and reason about product organization

## Implementation

### 1. Repository Layer (`src/lib/repositories/category.repository.ts`)

#### New Functions:

**`validateLeafCategoryForProduct()`**
```typescript
export async function validateLeafCategoryForProduct(
  session: Session,
  categoryId: string
): Promise<{ valid: boolean; error?: string; categoryName?: string }>
```
- Checks if a category has any children
- Returns validation result with descriptive error messages
- Used before product assignment

**`assignProductToCategories()`** - Updated
```typescript
export async function assignProductToCategories(
  session: Session,
  productId: string,
  categoryIds: string[]
): Promise<void>
```
- Now validates ALL category IDs before assignment
- Throws descriptive error if any category is not a leaf
- Prevents invalid assignments at the database layer

**`getLeafCategories()`**
```typescript
export async function getLeafCategories(session: Session): Promise<Category[]>
```
- Returns all leaf categories across all hierarchies
- Useful for admin UI dropdowns/selectors

**`getLeafCategoriesByHierarchy()`**
```typescript
export async function getLeafCategoriesByHierarchy(
  session: Session,
  hierarchy: 'ladies' | 'gents' | 'kids'
): Promise<Category[]>
```
- Returns leaf categories for a specific hierarchy
- Useful for filtered admin UI

### 2. Server Actions (`src/app/actions/categories.ts`)

#### New Actions:

**`getLeafCategoriesAction()`**
- Server action wrapper for `getLeafCategories()`
- Can be called from client components

**`getLeafCategoriesByHierarchyAction()`**
- Server action wrapper for `getLeafCategoriesByHierarchy()`
- Filtered by hierarchy

**`validateLeafCategoryAction()`**
- Server action wrapper for `validateLeafCategoryForProduct()`
- Can be used for client-side validation before submission

**`assignProductToCategoriesAction()`** - Updated
- Catches and returns validation errors from repository
- Error messages are user-friendly and actionable

### 3. Scripts

#### Updated: `scripts/assign-products-to-new-categories.ts`
- Now validates each category before assignment
- Skips products that would be assigned to parent categories
- Reports validation errors in the summary

#### New: `scripts/migrate-product-to-leaf.ts`
```bash
npm run tsx scripts/migrate-product-to-leaf.ts <productId> <fromCategoryId> <toCategoryId>
```
- Helper script for migrating existing invalid assignments
- Validates target category is a leaf before migration
- Shows detailed validation and migration steps

**Example Usage:**
```bash
npm run tsx scripts/migrate-product-to-leaf.ts prod-123 cat-parent cat-leaf
```

#### New: `scripts/test-leaf-validation.ts`
```bash
npx tsx scripts/test-leaf-validation.ts
```
- Comprehensive test suite for validation system
- Tests all validation functions
- Identifies existing invalid assignments
- Verifies enforcement works correctly

**Output:**
- Lists all leaf categories
- Lists all parent categories
- Tests validation on both leaf and parent categories
- Attempts invalid assignment (should fail)
- Attempts valid assignment (should succeed)
- Reports any existing invalid assignments in database

## Usage Examples

### From Admin UI (Client Component)

```typescript
import { getLeafCategoriesAction, assignProductToCategoriesAction } from '@/app/actions/categories'

// Get only leaf categories for dropdown
const result = await getLeafCategoriesAction()
if (result.success) {
  const leafCategories = result.data
  // Use in dropdown/selector
}

// Assign product to categories
const assignResult = await assignProductToCategoriesAction(productId, [categoryId1, categoryId2])
if (!assignResult.success) {
  // Show error message to user
  toast.error(assignResult.error)
  // Error will be: "Cannot assign products to parent category..."
}
```

### From Script

```typescript
import { assignProductToCategories, validateLeafCategoryForProduct } from '@/lib/repositories/category.repository'

// Validate before assignment
const validation = await validateLeafCategoryForProduct(session, categoryId)
if (!validation.valid) {
  console.error(validation.error)
  // "Cannot assign products to parent category 'Clothing'..."
}

// Assign (will throw if invalid)
try {
  await assignProductToCategories(session, productId, categoryIds)
  console.log('✓ Assigned successfully')
} catch (error) {
  console.error('✗ Assignment failed:', error.message)
}
```

## Error Messages

The validation system provides clear, actionable error messages:

### Validation Error Format:
```
Cannot assign products to parent category "Clothing". This category has 4 child categories. Please assign to a leaf category (one without children).
```

### Components:
1. **Action**: "Cannot assign products to parent category"
2. **Category Name**: Shows which category failed validation
3. **Child Count**: Explains why it's not a leaf (has X children)
4. **Solution**: "Please assign to a leaf category"

## Migrating Existing Invalid Assignments

If you have existing products assigned to parent categories:

### Step 1: Identify Invalid Assignments
```bash
npx tsx scripts/test-leaf-validation.ts
```

This will show all parent categories with products assigned.

### Step 2: Migrate Each Product
```bash
npx tsx scripts/migrate-product-to-leaf.ts <productId> <fromCategoryId> <toCategoryId>
```

**Example:**
```bash
# Move "Classic White Sneakers" from "Footwear" to "Sneakers"
npx tsx scripts/migrate-product-to-leaf.ts prod-123 cat-footwear cat-sneakers
```

### Step 3: Verify
Run the test script again to confirm all invalid assignments are resolved.

## Database Constraints

### Neo4j Limitations:
Neo4j does not support constraints that prevent relationships based on node properties or relationship patterns. The validation must be enforced at the **application layer**.

### Current Enforcement Points:
1. **Repository Layer**: `assignProductToCategories()` validates before creating relationships
2. **Server Actions**: Catch and return validation errors
3. **Scripts**: Include validation before bulk operations
4. **Admin UI**: Should use `getLeafCategories()` to show only valid options

## Best Practices

### For Developers:

1. **Always use repository functions** - Don't write raw Cypher for product assignment
2. **Show only leaf categories in UI** - Use `getLeafCategories()` or `getLeafCategoriesByHierarchy()`
3. **Handle validation errors gracefully** - Show user-friendly error messages
4. **Test with validation script** - Run `test-leaf-validation.ts` after bulk changes

### For Database Migrations:

1. **Check existing assignments** - Run test script before migration
2. **Validate in scripts** - Include validation in any bulk assignment scripts
3. **Use migration helper** - Use `migrate-product-to-leaf.ts` for moving products
4. **Verify after migration** - Run test script to confirm success

## Testing

### Run Test Suite:
```bash
npx tsx scripts/test-leaf-validation.ts
```

### Expected Output:
```
✅ All validation tests completed!

Test Summary:
Total Categories: 51
Leaf Categories (can accept products): 35
Parent Categories (cannot accept products): 16

🔍 Checking for existing invalid assignments...
✅ No invalid assignments found!
```

### If Invalid Assignments Found:
The test will show:
- Category name and hierarchy
- Number of children
- Number of products assigned
- Sample product names
- Migration command to use

## API Reference

### Repository Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `validateLeafCategoryForProduct` | session, categoryId | `{valid, error?, categoryName?}` | Validates if category can accept products |
| `assignProductToCategories` | session, productId, categoryIds | `void` (throws on error) | Assigns product to categories (with validation) |
| `getLeafCategories` | session | `Category[]` | Gets all leaf categories |
| `getLeafCategoriesByHierarchy` | session, hierarchy | `Category[]` | Gets leaf categories for one hierarchy |

### Server Actions

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `validateLeafCategoryAction` | categoryId | `{success, data: validation}` | Validates category from client |
| `assignProductToCategoriesAction` | productId, categoryIds | `{success, error?}` | Assigns product (admin only) |
| `getLeafCategoriesAction` | none | `{success, data: Category[]}` | Gets all leaf categories |
| `getLeafCategoriesByHierarchyAction` | hierarchy | `{success, data: Category[]}` | Gets filtered leaf categories |

## Summary

The leaf category validation system ensures data integrity by:
1. ✅ Preventing products from being assigned to parent categories
2. ✅ Providing clear error messages when validation fails
3. ✅ Offering helper functions to get only valid categories
4. ✅ Including migration tools for existing invalid data
5. ✅ Testing thoroughly with automated validation script

This system maintains a clean, hierarchical category structure while ensuring products are always assigned to the most specific category level.
