# Quick Reference: Leaf Category Validation

## The Rule
**Products can ONLY be assigned to leaf categories (categories without children).**

## Quick Commands

### Test Current State
```bash
npx tsx scripts/test-leaf-validation.ts
```

### Migrate a Product
```bash
npx tsx scripts/migrate-product-to-leaf.ts <productId> <fromCategoryId> <toCategoryId>
```

## Code Snippets

### Get Only Leaf Categories (Admin UI)
```typescript
import { getLeafCategoriesAction } from '@/app/actions/categories'

const result = await getLeafCategoriesAction()
if (result.success) {
  const leafCategories = result.data
  // Use in dropdown/selector
}
```

### Assign Product (with automatic validation)
```typescript
import { assignProductToCategoriesAction } from '@/app/actions/categories'

const result = await assignProductToCategoriesAction(productId, [categoryId])
if (!result.success) {
  toast.error(result.error)
  // Error: "Cannot assign products to parent category..."
}
```

### Validate Before Assignment (optional pre-check)
```typescript
import { validateLeafCategoryAction } from '@/app/actions/categories'

const validation = await validateLeafCategoryAction(categoryId)
if (validation.success && validation.data.valid) {
  // Proceed with assignment
} else {
  // Show error: validation.data.error
}
```

## What's a Leaf Category?

### Example Hierarchy:
```
Ladies (PARENT)
├── Clothing (PARENT)
│   ├── Tops (PARENT)
│   │   ├── Shirts (LEAF) ✅ CAN ACCEPT PRODUCTS
│   │   └── Blouses (LEAF) ✅ CAN ACCEPT PRODUCTS
│   └── Bottoms (PARENT)
│       └── Jeans (LEAF) ✅ CAN ACCEPT PRODUCTS
└── Footwear (PARENT)
    └── Heels (LEAF) ✅ CAN ACCEPT PRODUCTS
```

**Valid:** Shirts, Blouses, Jeans, Heels
**Invalid:** Ladies, Clothing, Tops, Bottoms, Footwear

## Error Message
```
Cannot assign products to parent category "Clothing".
This category has 4 child categories.
Please assign to a leaf category (one without children).
```

## Files Modified
1. `/src/lib/repositories/category.repository.ts` - Core validation logic
2. `/src/app/actions/categories.ts` - Server actions
3. `/scripts/assign-products-to-new-categories.ts` - Updated script

## Files Created
1. `/scripts/migrate-product-to-leaf.ts` - Migration helper
2. `/scripts/test-leaf-validation.ts` - Test suite
3. `/LEAF_CATEGORY_VALIDATION.md` - Full documentation
4. `/VALIDATION_IMPLEMENTATION_SUMMARY.md` - Implementation summary

## API Reference

| Function | Purpose |
|----------|---------|
| `validateLeafCategoryForProduct(session, categoryId)` | Check if category can accept products |
| `assignProductToCategories(session, productId, categoryIds)` | Assign with validation (throws on error) |
| `getLeafCategories(session)` | Get all leaf categories |
| `getLeafCategoriesByHierarchy(session, hierarchy)` | Get leaf categories for one hierarchy |

## Common Tasks

### Task: Update Admin Product Form
```typescript
// Show only leaf categories in dropdown
const leafResult = await getLeafCategoriesAction()
const categories = leafResult.success ? leafResult.data : []
```

### Task: Check if Category is Valid
```typescript
const validation = await validateLeafCategoryAction(categoryId)
const isValid = validation.success && validation.data.valid
```

### Task: Migrate Existing Invalid Assignment
```bash
# Step 1: Identify invalid assignments
npx tsx scripts/test-leaf-validation.ts

# Step 2: Migrate each product
npx tsx scripts/migrate-product-to-leaf.ts prod-123 parent-cat-id leaf-cat-id

# Step 3: Verify
npx tsx scripts/test-leaf-validation.ts
```

## Best Practices

1. ✅ Always use `getLeafCategories()` for product assignment UI
2. ✅ Use repository functions, never raw Cypher
3. ✅ Handle validation errors gracefully with user messages
4. ✅ Run test script after bulk operations
5. ❌ Don't bypass validation with direct Cypher queries

## Need Help?

See full documentation in:
- `/LEAF_CATEGORY_VALIDATION.md` - Complete guide
- `/VALIDATION_IMPLEMENTATION_SUMMARY.md` - Implementation details
