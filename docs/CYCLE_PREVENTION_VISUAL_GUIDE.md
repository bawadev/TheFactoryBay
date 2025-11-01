# Cycle Prevention Visual Guide

## Understanding Cycles in Filter Hierarchies

### Valid Hierarchies

#### 1. Simple Tree
```
        A (Level 0)
        |
        B (Level 1)
        |
        C (Level 2)
```
✅ Valid: Simple parent-child chain

#### 2. Multi-Parent (DAG)
```
    A (L0)      B (L0)
      \          /
       \        /
        C (L1)
```
✅ Valid: Child can have multiple parents (Directed Acyclic Graph)

#### 3. Complex Valid Hierarchy
```
        A (L0)
       / \
      /   \
    B(L1)  C(L1)
      \   /
       \ /
       D(L2)
```
✅ Valid: Multiple paths but no cycles

### Invalid Hierarchies (Cycles)

#### 1. Self-Loop
```
    A ⟲
```
❌ Invalid: Filter cannot be its own parent

#### 2. Two-Node Cycle
```
    A → B
    ↑   ↓
    └───┘
```
❌ Invalid: A is parent of B, B is parent of A

#### 3. Three-Node Cycle
```
    A → B → C
    ↑       ↓
    └───────┘
```
❌ Invalid: A → B → C → A creates a cycle

#### 4. Complex Cycle
```
    A → B → C
    ↑   ↓
    └───D
```
❌ Invalid: A → B → D → A creates a cycle

## How Validation Works

### Step-by-Step Process

#### Example: Attempting to Add Invalid Parent

**Current State:**
```
A (L0)
└── B (L1)
    └── C (L2)
```

**Attempted Change:**
```typescript
updateFilterParentsAction('A', ['C'])
```

**Validation Process:**

1. **Query Execution**
```cypher
MATCH (child:CustomFilter {id: 'A'})
MATCH (proposedParent:CustomFilter {id: 'C'})
OPTIONAL MATCH path = (proposedParent)-[:CHILD_OF*1..]->(child)
RETURN path IS NOT NULL as wouldCreateCycle
```

2. **Path Detection**
```
C -[:CHILD_OF]-> B -[:CHILD_OF]-> A
```
Path exists! Adding A → C would create:
```
A → C → B → A  (CYCLE!)
```

3. **Result**
```typescript
{
  valid: false,
  error: "Cannot add 'C' as parent of 'A' because 'A' is already an ancestor of 'C'",
  conflictingParent: { id: 'C', name: 'Filter C' }
}
```

### Valid Parent Addition

**Current State:**
```
A (L0)
└── B (L1)
    └── C (L2)

D (L0)  [separate root]
```

**Valid Change:**
```typescript
updateFilterParentsAction('C', ['B', 'D'])
```

**Result:**
```
A (L0)
└── B (L1)
    └── C (L2)
         ↑
D (L0) ──┘
```
✅ No cycle created - C now has two parents

## Algorithm Visualization

### Cycle Detection Algorithm

```
┌─────────────────────────────────────────┐
│  Input: childId, parentIds[]            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  For each parentId   │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Check if parentId   │
        │  is descendant of    │
        │  childId             │
        └──────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ┌────────┐         ┌─────────┐
    │  YES   │         │   NO    │
    │(Cycle!)│         │(Valid)  │
    └────┬───┘         └────┬────┘
         │                  │
         ▼                  ▼
    ┌────────┐         ┌─────────┐
    │ Return │         │Continue │
    │ Error  │         │ Checking│
    └────────┘         └────┬────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ All Valid?    │
                    │ Return Success│
                    └───────────────┘
```

## Level Calculation

### How Levels are Calculated

Level = max(parent levels) + 1

#### Example 1: Single Parent Chain
```
A (L0)           Level 0 = root (no parents)
└── B (L1)       Level 1 = 0 + 1
    └── C (L2)   Level 2 = 1 + 1
```

#### Example 2: Multiple Parents
```
A (L0)      B (L0)
  \         /
   \       /
    C (L1)         Level 1 = max(0, 0) + 1 = 1
```

#### Example 3: Different Parent Levels
```
A (L0)
└── B (L1)
    │
    C (L2) ──┐
             │
    D (L0) ──┘

Level of C = max(1, 0) + 1 = 2
```

### Level Recalculation on Update

**Before:**
```
A (L0)
└── B (L1)
    └── C (L2)
```

**Update:** Move C to be child of A
```typescript
updateFilterParentsAction('C', ['A'])
```

**After:**
```
A (L0)
├── B (L1)    [Level unchanged]
└── C (L1)    [Level recalculated: 0+1 = 1]
```

**With descendants:**
```
Before:
A (L0) → B (L1) → C (L2) → D (L3)

Update: Move C to A
updateFilterParentsAction('C', ['A'])

After:
A (L0) ─┬─ B (L1)
        └─ C (L1) → D (L2)  [D recalculated: 1+1 = 2]
```

## Real-World Scenario

### E-commerce Filter Example

**Initial Setup:**
```
Electronics (L0)
└── Computers (L1)
    └── Laptops (L2)
        └── Gaming Laptops (L3)
```

### Scenario 1: Adding Cross-Category Tag ✅

**Want to add "Premium" as parent of "Gaming Laptops"**

```typescript
updateFilterParentsAction('gaming-laptops', [
  'laptops',      // existing parent
  'premium'       // new parent
])
```

**Result:**
```
Electronics (L0)          Premium (L0)
└── Computers (L1)            │
    └── Laptops (L2)          │
        └── Gaming Laptops ───┘
           (L3)

✅ Success: No cycle (Premium is not descendant of Gaming Laptops)
```

### Scenario 2: Attempting Invalid Relationship ❌

**Mistakenly trying to make "Electronics" child of "Gaming Laptops"**

```typescript
updateFilterParentsAction('electronics', ['gaming-laptops'])
```

**Analysis:**
```
Current path: Electronics → ... → Gaming Laptops
Proposed:     Electronics ← Gaming Laptops

Would create: Electronics → Computers → Laptops → Gaming Laptops → Electronics
              └─────────────── CYCLE! ─────────────────────────────┘

❌ Error: "Cannot add 'Gaming Laptops' as parent of 'Electronics'
           because 'Electronics' is already an ancestor of 'Gaming Laptops'"
```

## Edge Cases Handled

### Edge Case 1: Self-Reference
```
Input: updateFilterParentsAction('A', ['A'])

Check: if (childId === parentId) → ERROR

Error: "Cannot add 'A' as its own parent"
```

### Edge Case 2: Empty Parents
```
Input: updateFilterParentsAction('C', [])

Result: C becomes a root filter (L0)

Before: A → B → C
After:  A → B
        C (separate root)
```

### Edge Case 3: Multiple Cycles in Same Request
```
Input: updateFilterParentsAction('A', ['B', 'C'])

Where: A → B → C (existing)

Check:
- B is descendant of A? YES → ERROR on B
- (stops checking after first error)

Error: "Cannot add 'B' as parent of 'A' because..."
```

### Edge Case 4: Deep Hierarchy
```
A → B → C → D → E → F → G → H → I → J

Attempting: updateFilterParentsAction('A', ['J'])

Path check: J → I → H → ... → B → A
Path exists → ERROR

✅ Works correctly regardless of depth
```

## Visual Debug Guide

### How to Visualize Your Hierarchy in Neo4j Browser

```cypher
// View entire filter hierarchy
MATCH path = (child:CustomFilter)-[:CHILD_OF*]->(parent:CustomFilter)
WHERE NOT (parent)-[:CHILD_OF]->()
RETURN path

// Check specific filter's ancestors
MATCH path = (f:CustomFilter {id: 'your-filter-id'})-[:CHILD_OF*]->(ancestor)
RETURN path

// Find potential cycles (should return empty)
MATCH path = (f:CustomFilter)-[:CHILD_OF*]->(f)
RETURN path

// View all filters with their levels
MATCH (f:CustomFilter)
RETURN f.name as name, f.level as level
ORDER BY f.level, f.name
```

## Summary: Rules for Valid Hierarchies

1. ✅ **Filters can have multiple parents** (DAG structure)
2. ✅ **Filters can have no parents** (root filters)
3. ✅ **Filters can have children with multiple parents**
4. ❌ **Filters cannot be their own parent**
5. ❌ **Filters cannot have descendant as parent** (cycle)
6. ❌ **Filters cannot create circular dependency chains**
7. ✅ **Levels auto-calculate** = max(parent levels) + 1
8. ✅ **Descendant levels auto-update** on parent change

## Quick Mental Model

Think of the filter hierarchy as a **waterfall**:
- Water flows downward (from parents to children)
- Water can split into multiple streams (multiple children)
- Streams can merge (multiple parents)
- Water **never flows upward** (no cycles)

If adding a parent would make water flow upward → **CYCLE DETECTED** → **BLOCKED**
