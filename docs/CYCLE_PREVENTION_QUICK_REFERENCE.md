# Cycle Prevention Quick Reference

## TL;DR

The filter hierarchy now has comprehensive cycle prevention. Use `validateNoCyclesAction()` before updating parent relationships, or use `updateFilterParentsAction()` which validates automatically.

## Quick Examples

### ✅ DO: Validate before updating

```typescript
import { validateNoCyclesAction, updateFilterParentsAction } from '@/app/actions/custom-filters'

// Option 1: Validate explicitly
const validation = await validateNoCyclesAction(filterId, newParentIds)
if (validation.data.valid) {
  await updateFilterParentsAction(filterId, newParentIds)
}

// Option 2: Use updateFilterParents (validates automatically)
const result = await updateFilterParentsAction(filterId, newParentIds)
if (!result.success) {
  console.error(result.error) // Cycle detected error message
}
```

### ❌ DON'T: Create cycles

```typescript
// Given: A → B
await updateFilterParentsAction('A', ['B']) // ❌ Error: Would create cycle

// Given: A → B → C
await updateFilterParentsAction('A', ['C']) // ❌ Error: Would create cycle

// Self-reference
await updateFilterParentsAction('A', ['A']) // ❌ Error: Self-reference
```

## API Reference

### `validateNoCyclesAction(filterId, parentIds)`

**Purpose**: Check if adding parents would create a cycle

**Parameters**:
- `filterId`: string - ID of the filter to check
- `parentIds`: string[] - Array of proposed parent IDs

**Returns**:
```typescript
{
  success: boolean
  data: {
    valid: boolean
    error?: string
    conflictingParent?: { id: string, name: string }
  }
}
```

**Example**:
```typescript
const result = await validateNoCyclesAction('filter-123', ['parent-456'])

if (!result.data.valid) {
  toast.error(result.data.error)
  // Error: "Cannot add 'Parent Name' as parent of 'Child Name'
  //         because 'Child Name' is already an ancestor of 'Parent Name'"
}
```

### `updateFilterParentsAction(filterId, newParentIds)`

**Purpose**: Update parent relationships with automatic validation

**Parameters**:
- `filterId`: string - ID of the filter to update
- `newParentIds`: string[] - Array of new parent IDs (replaces all existing)

**Returns**:
```typescript
{
  success: boolean
  error?: string
  conflictingParent?: { id: string, name: string }
}
```

**Example**:
```typescript
const result = await updateFilterParentsAction('filter-123', ['parent-456', 'parent-789'])

if (result.success) {
  toast.success('Parents updated')
  // Levels automatically recalculated for filter and all descendants
} else {
  toast.error(result.error)
}
```

### `getAllAncestorFilterIdsAction(filterId)`

**Purpose**: Get all ancestor IDs (useful for debugging or UI)

**Parameters**:
- `filterId`: string - ID of the filter

**Returns**:
```typescript
{
  success: boolean
  data: string[] // Array of ancestor IDs from direct parents to root
}
```

**Example**:
```typescript
// Given: Root → Parent → Child
const result = await getAllAncestorFilterIdsAction('child-id')
// result.data = ['parent-id', 'root-id']
```

## Common Patterns

### Pattern 1: Form Validation

```typescript
const FilterParentSelector = ({ filterId }) => {
  const [selectedParents, setSelectedParents] = useState([])
  const [error, setError] = useState(null)

  const handleParentChange = async (newSelection) => {
    setSelectedParents(newSelection)

    // Validate immediately
    const validation = await validateNoCyclesAction(filterId, newSelection)
    setError(validation.data.valid ? null : validation.data.error)
  }

  const handleSave = async () => {
    if (error) return // Don't save if validation error

    const result = await updateFilterParentsAction(filterId, selectedParents)
    if (result.success) {
      toast.success('Saved!')
    }
  }

  return (
    <div>
      <ParentSelector value={selectedParents} onChange={handleParentChange} />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button onClick={handleSave} disabled={!!error}>Save</Button>
    </div>
  )
}
```

### Pattern 2: Optimistic Update with Rollback

```typescript
const updateParentsWithOptimism = async (filterId, newParents) => {
  const originalParents = currentParents // Save current state

  // Update UI optimistically
  setCurrentParents(newParents)

  try {
    const result = await updateFilterParentsAction(filterId, newParents)

    if (!result.success) {
      // Rollback on error
      setCurrentParents(originalParents)
      toast.error(result.error)
    }
  } catch (error) {
    // Rollback on exception
    setCurrentParents(originalParents)
    toast.error('Update failed')
  }
}
```

### Pattern 3: Batch Validation

```typescript
// When updating multiple filters
const updateMultipleFilters = async (updates) => {
  // Validate all first
  const validations = await Promise.all(
    updates.map(({ filterId, parentIds }) =>
      validateNoCyclesAction(filterId, parentIds)
    )
  )

  // Check if any invalid
  const invalid = validations.find(v => !v.data.valid)
  if (invalid) {
    toast.error('Some updates would create cycles')
    return
  }

  // All valid, proceed with updates
  await Promise.all(
    updates.map(({ filterId, parentIds }) =>
      updateFilterParentsAction(filterId, parentIds)
    )
  )

  toast.success('All filters updated')
}
```

## Error Messages

| Scenario | Error Message |
|----------|---------------|
| Self-reference | `Cannot add "{name}" as its own parent` |
| Direct cycle (A→B→A) | `Cannot add "{parentName}" as parent of "{childName}" because "{childName}" is already an ancestor of "{parentName}"` |
| Indirect cycle (A→B→C→A) | Same as above |
| Parent not found | `Parent filter with id {id} not found` |
| Child not found | `Child filter not found` |

## What Gets Updated Automatically

When you call `updateFilterParentsAction()`:

1. ✅ Old parent relationships are removed
2. ✅ New parent relationships are created
3. ✅ Filter level is recalculated
4. ✅ All descendant levels are recalculated recursively
5. ✅ Updated timestamp is set

You don't need to manually:
- Calculate levels
- Update descendants
- Check for cycles (done automatically)

## Testing

### Run Test Suite

```bash
npx tsx scripts/test-cycle-prevention.ts
```

### Manual Testing in Neo4j Browser

```cypher
// Create test hierarchy
CREATE (a:CustomFilter {id: 'a', name: 'A', level: 0})
CREATE (b:CustomFilter {id: 'b', name: 'B', level: 1})
CREATE (c:CustomFilter {id: 'c', name: 'C', level: 2})
CREATE (a)<-[:CHILD_OF]-(b)
CREATE (b)<-[:CHILD_OF]-(c)

// Test cycle detection (should return true = would create cycle)
MATCH (child:CustomFilter {id: 'a'})
MATCH (proposedParent:CustomFilter {id: 'c'})
OPTIONAL MATCH path = (proposedParent)-[:CHILD_OF*1..]->(child)
RETURN path IS NOT NULL as wouldCreateCycle

// Cleanup
MATCH (n:CustomFilter) WHERE n.id IN ['a', 'b', 'c']
DETACH DELETE n
```

## Performance

- **Cycle detection**: O(N) where N = nodes in path
- **Level recalculation**: O(D) where D = number of descendants
- **Typical hierarchy**: < 10ms for depth < 10 levels

## Troubleshooting

### Problem: Validation passes but update fails

**Cause**: Race condition - hierarchy changed between validation and update

**Solution**: Use `updateFilterParentsAction()` directly (validates atomically)

### Problem: Level calculation seems wrong

**Cause**: Multiple parents with different levels

**Solution**: Level = max(parent levels) + 1 (working as designed)

### Problem: Performance slow for deep hierarchy

**Cause**: Recursive descendant level recalculation

**Solution**: Consider limiting hierarchy depth or batching updates

## Related Documentation

- **Full documentation**: `/docs/CYCLE_PREVENTION.md`
- **Implementation summary**: `/CYCLE_PREVENTION_IMPLEMENTATION.md`
- **Repository code**: `/src/lib/repositories/custom-filter.repository.ts`
- **Server actions**: `/src/app/actions/custom-filters.ts`
