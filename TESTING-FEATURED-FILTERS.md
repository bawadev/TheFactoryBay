# Testing Checklist: Featured Filters System

## Prerequisites

### 1. Start Neo4j Database
```bash
# Start Neo4j service
sudo systemctl start neo4j

# Verify it's running
sudo systemctl status neo4j

# Or check the connection
curl http://localhost:7474
```

### 2. Initialize Filter System
```bash
# Create filters with featured flags
npm run filters:init --yes

# Expected output:
# ✓ Created 55 filters
# ⭐ Featured filters: 8 (Men, Women, Kids, Clothing, Footwear, Casual, Formal, Sports)
# ✓ Assigned products to filters
# ✓ Verification complete
```

### 3. Start Dev Server
```bash
npm run dev
# Wait for: ✓ Ready in 2-3s
```

---

## Test Suite

### Test 1: Homepage Shows Only Featured Filters ⏳

**URL:** http://localhost:3000/en

**Expected Behavior:**
- ✅ Homepage loads without errors
- ✅ Filter section shows header: "Filter by Category"
- ✅ Shows exactly 8 filter chips (not 55!)
- ✅ Filter chips are: Men, Women, Kids, Clothing, Footwear, Casual, Formal, Sports
- ✅ Each chip is clickable
- ✅ Selected chips have navy background and white text
- ✅ Unselected chips have white background and gray border

**Playwright Test:**
```typescript
// Navigate to homepage
await page.goto('http://localhost:3000/en')

// Take screenshot
await page.screenshot({ path: 'homepage-featured-filters.png' })

// Count filter chips
const chips = page.locator('.filter-chip') // or appropriate selector
await expect(chips).toHaveCount(8)

// Verify chip names
await expect(page.getByText('Men')).toBeVisible()
await expect(page.getByText('Women')).toBeVisible()
await expect(page.getByText('Kids')).toBeVisible()
// ... etc
```

---

### Test 2: Advanced Filters Button Exists ⏳

**Expected Behavior:**
- ✅ "Advanced Filters" button is visible in filter section header
- ✅ Button has filter icon
- ✅ Button has navy border and hover effect

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')

// Find Advanced Filters button
const advancedButton = page.getByRole('button', { name: /Advanced Filters/i })
await expect(advancedButton).toBeVisible()

// Take screenshot
await page.screenshot({ path: 'advanced-filters-button.png' })
```

---

### Test 3: Advanced Filter Dialog Opens ⏳

**Expected Behavior:**
- ✅ Click "Advanced Filters" button
- ✅ Dialog appears with overlay (dark background)
- ✅ Dialog title: "Advanced Filters"
- ✅ Subtitle: "Narrow down products by selecting categories"
- ✅ Breadcrumb shows: "All Categories"
- ✅ Shows all Level 0 filters (Men, Women, Kids, Unisex, Casual, etc.)
- ✅ Each filter has checkbox
- ✅ Dialog has "Cancel" and "Apply Filters" buttons

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')

// Click Advanced Filters
await page.getByRole('button', { name: /Advanced Filters/i }).click()

// Wait for dialog
await page.waitForSelector('[role="dialog"]', { state: 'visible' })

// Take screenshot
await page.screenshot({ path: 'advanced-filter-dialog-open.png' })

// Verify title
await expect(page.getByRole('heading', { name: 'Advanced Filters' })).toBeVisible()

// Verify breadcrumb
await expect(page.getByText('All Categories')).toBeVisible()
```

---

### Test 4: Product Counts Display in Dialog ⏳

**Expected Behavior:**
- ✅ Each filter shows count badge: "Men (50)" or "Men 50"
- ✅ Counts are accurate (match database)
- ✅ Counts include products from child filters
- ✅ Count badge styling: gray background for unselected, navy for selected

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')
await page.getByRole('button', { name: /Advanced Filters/i }).click()

// Wait for dialog
await page.waitForSelector('[role="dialog"]', { state: 'visible' })

// Wait for counts to load (they may be async)
await page.waitForTimeout(1000)

// Take screenshot showing counts
await page.screenshot({ path: 'filter-counts-displayed.png' })

// Verify at least one count is visible
const countBadges = page.locator('text=/\\(\\d+\\)|\\d+$/') // Matches (50) or 50
await expect(countBadges.first()).toBeVisible()
```

---

### Test 5: Hierarchical Navigation in Dialog ⏳

**Expected Behavior:**
- ✅ Click "View sub-categories" button on "Clothing"
- ✅ Breadcrumb updates: "All Categories > Clothing"
- ✅ Shows child filters: Tops, Bottoms, Outerwear, Dresses & Skirts
- ✅ Each child shows product count
- ✅ Click "All Categories" in breadcrumb → returns to root
- ✅ Navigate to Level 3: Clothing > Tops > T-Shirts
- ✅ Breadcrumb shows full path

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')
await page.getByRole('button', { name: /Advanced Filters/i }).click()

// Navigate to Clothing
await page.getByRole('button', { name: /View sub-categories/ }).first().click()

// Take screenshot of Clothing sub-categories
await page.screenshot({ path: 'clothing-subcategories.png' })

// Verify breadcrumb updated
await expect(page.getByText(/All Categories.*Clothing/)).toBeVisible()

// Navigate back
await page.getByRole('button', { name: 'All Categories' }).click()

// Verify back at root
await expect(page.getByText('Men')).toBeVisible()
```

---

### Test 6: Multi-Select in Dialog ⏳

**Expected Behavior:**
- ✅ Check "Men" checkbox → checkbox is checked
- ✅ Footer shows: "1 filter selected"
- ✅ Check "Women" checkbox → footer shows: "2 filters selected"
- ✅ Uncheck "Men" → footer shows: "1 filter selected"
- ✅ Selected filters have navy background
- ✅ Count badge on selected filter is navy with white text

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')
await page.getByRole('button', { name: /Advanced Filters/i }).click()

// Select Men
const menCheckbox = page.locator('input[type="checkbox"]').first()
await menCheckbox.check()

// Verify selected count
await expect(page.getByText('1 filter selected')).toBeVisible()

// Take screenshot
await page.screenshot({ path: 'one-filter-selected.png' })

// Select Women
const womenCheckbox = page.locator('input[type="checkbox"]').nth(1)
await womenCheckbox.check()

// Verify count updated
await expect(page.getByText('2 filters selected')).toBeVisible()

// Take screenshot
await page.screenshot({ path: 'two-filters-selected.png' })
```

---

### Test 7: Apply Filters Functionality ⏳

**Expected Behavior:**
- ✅ Select "Men" and "Casual" in dialog
- ✅ Click "Apply Filters"
- ✅ Dialog closes
- ✅ Homepage filter chips show "Men" and "Casual" as selected (navy)
- ✅ Product sections filtered to show only matching products
- ✅ "Clear All (2 selected)" button appears

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')
await page.getByRole('button', { name: /Advanced Filters/i }).click()

// Select filters
await page.getByLabel('Men').check()
await page.getByLabel('Casual').check()

// Apply
await page.getByRole('button', { name: 'Apply Filters' }).click()

// Verify dialog closed
await expect(page.locator('[role="dialog"]')).not.toBeVisible()

// Take screenshot of filtered homepage
await page.screenshot({ path: 'homepage-filters-applied.png' })

// Verify chips are selected
await expect(page.getByText('Men').locator('..')).toHaveClass(/selected|active|bg-navy/)
await expect(page.getByText('Clear All (2 selected)')).toBeVisible()
```

---

### Test 8: Clear All Filters ⏳

**Expected Behavior:**
- ✅ After applying filters, click "Clear All"
- ✅ All filter chips become unselected
- ✅ Product sections show all products again
- ✅ "Clear All" button disappears

**Playwright Test:**
```typescript
// Assuming filters are already applied from Test 7
await page.getByRole('button', { name: /Clear All/ }).click()

// Wait for update
await page.waitForTimeout(500)

// Take screenshot
await page.screenshot({ path: 'filters-cleared.png' })

// Verify no filters selected
await expect(page.getByText(/Clear All/)).not.toBeVisible()
```

---

### Test 9: Admin Panel - Featured Toggle ⏳

**URL:** http://localhost:3000/en/admin/filters

**Expected Behavior:**
- ✅ Navigate to admin filters page
- ✅ See all 55 filters in tree
- ✅ Featured filters have ⭐ gold star icon
- ✅ Each filter has "Featured" or "Hidden" button
- ✅ Click "Hidden" on a non-featured filter → changes to "Featured"
- ✅ Button shows yellow/gold background
- ✅ Star icon appears next to filter name
- ✅ Click "Featured" → changes back to "Hidden"
- ✅ Star disappears

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en/admin/filters')

// Take screenshot of admin filters
await page.screenshot({ path: 'admin-filters-page.png', fullPage: true })

// Find a non-featured filter
const hiddenButton = page.getByRole('button', { name: 'Hidden' }).first()
await hiddenButton.click()

// Wait for update
await page.waitForTimeout(500)

// Take screenshot showing change
await page.screenshot({ path: 'filter-featured-toggle.png' })

// Verify button text changed
await expect(page.getByRole('button', { name: 'Featured' })).toBeVisible()
```

---

### Test 10: Admin Panel - Show Featured Only Filter ⏳

**Expected Behavior:**
- ✅ Admin filters page has "Show Featured Only" toggle/button
- ✅ Click "Show Featured Only"
- ✅ Tree filters to show only 8 featured filters (and their parents)
- ✅ Click again → shows all filters

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en/admin/filters')

// Click Show Featured Only
await page.getByRole('button', { name: /Show Featured Only/i }).click()

// Wait for filter
await page.waitForTimeout(500)

// Take screenshot
await page.screenshot({ path: 'admin-featured-only.png', fullPage: true })

// Count visible filters (should be around 8 + their parents)
const visibleFilters = page.locator('.filter-item:visible') // adjust selector
// Verify reduced count
```

---

### Test 11: End-to-End: Homepage to Filtered Products ⏳

**Expected Behavior:**
- ✅ Start on homepage
- ✅ Click "Men" chip → products filtered
- ✅ Click "Advanced Filters"
- ✅ Navigate to Clothing > Tops
- ✅ Select "T-Shirts"
- ✅ Apply filters
- ✅ Homepage shows products matching: Men AND T-Shirts
- ✅ Count matches expectation

**Playwright Test:**
```typescript
await page.goto('http://localhost:3000/en')

// Select Men chip
await page.getByText('Men').click()

// Open advanced filters
await page.getByRole('button', { name: /Advanced Filters/i }).click()

// Navigate hierarchy
await page.getByText('Clothing').locator('..').getByRole('button', { name: /View sub/ }).click()
await page.getByText('Tops').locator('..').getByRole('button', { name: /View sub/ }).click()

// Select T-Shirts
await page.getByLabel('T-Shirts').check()

// Apply
await page.getByRole('button', { name: 'Apply Filters' }).click()

// Take final screenshot
await page.screenshot({ path: 'e2e-filtered-products.png', fullPage: true })

// Verify both filters active
await expect(page.getByText('Men').locator('..')).toHaveClass(/selected/)
await expect(page.getByText('T-Shirts').locator('..')).toHaveClass(/selected/)
```

---

## Performance Tests

### Test 12: Load Time with Product Counts ⏳

**Expected Behavior:**
- ✅ Dialog opens in < 500ms
- ✅ Product counts load in < 1 second
- ✅ No flickering or layout shift

### Test 13: Large Hierarchy Navigation ⏳

**Expected Behavior:**
- ✅ Navigate through 5 levels smoothly
- ✅ Breadcrumb updates without delay
- ✅ Back navigation is instant

---

## Edge Cases

### Test 14: No Products Match Filter ⏳

**Expected Behavior:**
- ✅ Select a filter with 0 products
- ✅ Count shows "0"
- ✅ Homepage shows "No products found" message

### Test 15: All Filters Selected ⏳

**Expected Behavior:**
- ✅ Select all filters in dialog
- ✅ Footer shows: "55 filters selected"
- ✅ Apply → homepage shows all products (OR logic)

---

## Automated Test Script

Create a Playwright test file:

```bash
# Create test file
touch tests/featured-filters.spec.ts
```

```typescript
// tests/featured-filters.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Featured Filters System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/en')
  })

  test('shows only featured filters on homepage', async ({ page }) => {
    const chips = page.locator('.filter-chip') // adjust selector
    await expect(chips).toHaveCount(8)
  })

  test('opens advanced filter dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Advanced Filters/i }).click()
    await expect(page.getByRole('heading', { name: 'Advanced Filters' })).toBeVisible()
  })

  test('displays product counts', async ({ page }) => {
    await page.getByRole('button', { name: /Advanced Filters/i }).click()
    await page.waitForTimeout(1000) // wait for counts
    const countBadges = page.locator('text=/\\d+/')
    await expect(countBadges.first()).toBeVisible()
  })

  test('applies selected filters', async ({ page }) => {
    await page.getByRole('button', { name: /Advanced Filters/i }).click()
    await page.getByLabel('Men').check()
    await page.getByRole('button', { name: 'Apply Filters' }).click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})

// Run with: npx playwright test tests/featured-filters.spec.ts
```

---

## Manual Testing Checklist

**Before Testing:**
- [ ] Neo4j is running
- [ ] Filters initialized with featured flags
- [ ] Dev server running
- [ ] At least 10 products in database

**Homepage Tests:**
- [ ] Only 8 featured filter chips visible
- [ ] Advanced Filters button visible
- [ ] Clicking chips filters products
- [ ] Clear All works

**Advanced Dialog Tests:**
- [ ] Dialog opens/closes
- [ ] Product counts display
- [ ] Hierarchical navigation works
- [ ] Multi-select works
- [ ] Apply filters works
- [ ] Clear All in dialog works
- [ ] Breadcrumb navigation works

**Admin Panel Tests:**
- [ ] Featured toggle works
- [ ] Show Featured Only filter works
- [ ] Star icon shows for featured filters
- [ ] Changes reflect immediately on homepage

**Performance:**
- [ ] Dialog opens quickly (< 500ms)
- [ ] Counts load quickly (< 1s)
- [ ] No lag when selecting filters

---

## Expected Issues (Known Limitations)

1. **Database Connection Required** - All tests require Neo4j running
2. **First Load May Be Slow** - Neo4j cache warm-up
3. **Playwright Selectors** - May need adjustment based on actual rendered HTML

---

## Test Status

| Test | Status | Notes |
|------|--------|-------|
| 1. Featured filters on homepage | ⏳ Pending | Requires Neo4j |
| 2. Advanced Filters button | ⏳ Pending | Requires Neo4j |
| 3. Dialog opens | ⏳ Pending | Requires Neo4j |
| 4. Product counts | ⏳ Pending | Requires Neo4j |
| 5. Hierarchical navigation | ⏳ Pending | Requires Neo4j |
| 6. Multi-select | ⏳ Pending | Requires Neo4j |
| 7. Apply filters | ⏳ Pending | Requires Neo4j |
| 8. Clear filters | ⏳ Pending | Requires Neo4j |
| 9. Admin featured toggle | ⏳ Pending | Requires Neo4j |
| 10. Show featured only | ⏳ Pending | Requires Neo4j |
| 11. End-to-end | ⏳ Pending | Requires Neo4j |

---

## Running the Tests

```bash
# 1. Start Neo4j
sudo systemctl start neo4j

# 2. Initialize filters
npm run filters:init --yes

# 3. Start dev server
npm run dev

# 4. In another terminal, run Playwright tests
npx playwright test tests/featured-filters.spec.ts --headed

# Or run specific test
npx playwright test tests/featured-filters.spec.ts -g "shows only featured filters"

# With UI mode for debugging
npx playwright test tests/featured-filters.spec.ts --ui
```

---

## Success Criteria

✅ **All tests pass** - All 11 tests complete successfully
✅ **Performance acceptable** - Dialog < 500ms, counts < 1s
✅ **No console errors** - No JavaScript errors in browser
✅ **Visual polish** - UI looks professional, no layout issues
✅ **Database efficiency** - No N+1 queries, efficient counting

---

**Status:** Tests ready to run once Neo4j is available

**Last Updated:** 2025-11-01
