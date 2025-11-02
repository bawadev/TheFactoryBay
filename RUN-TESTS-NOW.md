# Run Featured Filters Tests - Quick Start Guide

## Current Status

✅ **Dev server running** - http://localhost:3000
✅ **Code implemented** - All features complete
❌ **Neo4j inactive** - Needs to be started
⏳ **Tests pending** - Ready to run once Neo4j starts

---

## Start Testing in 3 Commands

### Step 1: Start Neo4j (Requires Password)
```bash
sudo systemctl start neo4j
```

Wait 10 seconds, then verify:
```bash
curl http://localhost:7474
# Should show HTML response
```

### Step 2: Initialize Filters (One Command)
```bash
npm run filters:init -- --yes
```

**Expected Output:**
```
✓ Created 55 filters
⭐ Featured filters: 8
   - Men (Level 0)
   - Women (Level 0)
   - Kids (Level 0)
   - Clothing (Level 1)
   - Footwear (Level 1)
   - Casual (Level 0)
   - Formal (Level 0)
   - Sports (Level 0)
✓ Assigned products to filters
✓ Verification complete
```

### Step 3: Test in Browser
```bash
# Dev server already running at http://localhost:3000/en
# Open in browser and follow test cases below
```

---

## Manual Test Cases (5 minutes)

### Test 1: Homepage Featured Filters ⏱️ 30 seconds

1. Open: http://localhost:3000/en
2. **Look for:**
   - Filter section with heading "Filter by Category"
   - Exactly 8 filter chips (not 55!)
   - Chips: Men, Women, Kids, Clothing, Footwear, Casual, Formal, Sports
   - "Advanced Filters" button with icon

✅ **PASS if:** Only 8 chips visible, Advanced Filters button exists
❌ **FAIL if:** See more than 8 chips, or no Advanced Filters button

**Screenshot:** Take photo showing 8 chips

---

### Test 2: Click Filter Chips ⏱️ 20 seconds

1. Click "Men" chip
2. **Expected:** Chip gets navy background, white text
3. Products filter to show only Men's products
4. "Clear All (1 selected)" button appears
5. Click "Clear All"
6. **Expected:** Chip returns to normal, all products show

✅ **PASS if:** Chip highlights, products filter, Clear All works
❌ **FAIL if:** Nothing happens or products don't filter

---

### Test 3: Advanced Filters Dialog Opens ⏱️ 30 seconds

1. Click "Advanced Filters" button
2. **Look for:**
   - Dialog overlay (dark background)
   - Title: "Advanced Filters"
   - Subtitle: "Narrow down products by selecting categories"
   - Breadcrumb: "All Categories"
   - List of filters with checkboxes
   - Each filter shows a number (product count)
   - Footer buttons: Cancel, Apply Filters

✅ **PASS if:** Dialog appears with all elements
❌ **FAIL if:** Dialog doesn't open or missing elements

**Screenshot:** Take photo of open dialog

---

### Test 4: Product Counts Display ⏱️ 20 seconds

1. In open dialog, look at each filter
2. **Expected:** See counts like:
   - Men (50)
   - Women (75)
   - Clothing (150)
   - etc.

3. Counts should be visible next to filter names
4. If counts are loading, wait 2-3 seconds

✅ **PASS if:** See numbers next to at least 5 filters
❌ **FAIL if:** No counts visible or all show 0

**Screenshot:** Take photo showing counts

---

### Test 5: Hierarchical Navigation ⏱️ 60 seconds

1. In dialog, find "Clothing" filter
2. Click "View sub-categories" button next to it
3. **Expected:**
   - Breadcrumb updates: "All Categories > Clothing"
   - New filters appear: Tops, Bottoms, Outerwear, Dresses & Skirts
   - Each shows product count
4. Click "Tops" → "View sub-categories"
5. **Expected:**
   - Breadcrumb: "All Categories > Clothing > Tops"
   - Shows: T-Shirts, Shirts, Blouses, Sweaters, Tank Tops
6. Click "All Categories" in breadcrumb
7. **Expected:** Return to root level (Men, Women, Kids, etc.)

✅ **PASS if:** Navigation works smoothly, breadcrumbs update
❌ **FAIL if:** Buttons don't work or breadcrumbs don't update

**Screenshot:** Take photo at Clothing > Tops level

---

### Test 6: Multi-Select Checkboxes ⏱️ 40 seconds

1. In dialog at root level
2. Check "Men" checkbox
3. **Expected:** Footer shows "1 filter selected"
4. Check "Casual" checkbox
5. **Expected:** Footer shows "2 filters selected"
6. Both checkboxes are checked
7. Uncheck "Men"
8. **Expected:** Footer shows "1 filter selected"

✅ **PASS if:** Counter updates correctly
❌ **FAIL if:** Counter doesn't update or checkboxes don't work

---

### Test 7: Apply Filters ⏱️ 40 seconds

1. Select "Women" and "Formal" in dialog
2. Footer shows "2 filters selected"
3. Click "Apply Filters" button
4. **Expected:**
   - Dialog closes
   - Homepage shows "Women" and "Formal" chips highlighted
   - Products filtered to show only women's formal items
   - "Clear All (2 selected)" button visible

✅ **PASS if:** Filters apply to homepage correctly
❌ **FAIL if:** Dialog doesn't close or filters don't apply

**Screenshot:** Take photo of homepage with filters applied

---

### Test 8: Clear All Filters ⏱️ 15 seconds

1. With filters applied, click "Clear All (2 selected)"
2. **Expected:**
   - All chips become unhighlighted
   - All products visible again
   - Clear All button disappears

✅ **PASS if:** Filters cleared, all products show
❌ **FAIL if:** Filters remain or products still filtered

---

### Test 9: Admin Panel - View ⏱️ 30 seconds

1. Navigate to: http://localhost:3000/en/admin/filters
2. **Look for:**
   - Tree view of all filters
   - Filters with gold star ⭐ icon
   - "Featured" or "Hidden" button for each filter
   - "Show Featured Only" button at top

3. **Count:**
   - Should see 55 total filters
   - 8 should have "Featured" button (gold background)
   - 47 should have "Hidden" button (gray background)

✅ **PASS if:** See all 55 filters, 8 are featured
❌ **FAIL if:** Wrong count or no star icons

**Screenshot:** Take photo of admin page (scroll to show stars)

---

### Test 10: Admin Panel - Toggle Featured ⏱️ 60 seconds

1. On admin page, find a filter marked "Hidden"
2. Example: "Sneakers" or "Accessories"
3. Click "Hidden" button
4. **Expected:**
   - Button changes to "Featured" (gold background)
   - Star ⭐ icon appears next to filter name
5. Click "Featured" button
6. **Expected:**
   - Button changes back to "Hidden"
   - Star disappears

7. **BONUS:** After toggling, go back to homepage
8. If you made "Sneakers" featured, should see it on homepage!

✅ **PASS if:** Toggle works, star appears/disappears
❌ **FAIL if:** Button doesn't change or no visual update

**Screenshot:** Take photo before and after toggle

---

### Test 11: Show Featured Only Filter ⏱️ 30 seconds

1. On admin page, click "Show Featured Only" button
2. **Expected:**
   - Tree filters to show only 8 featured filters
   - (Plus any parent filters needed for hierarchy)
3. Click "Show Featured Only" again
4. **Expected:** All 55 filters visible again

✅ **PASS if:** Filter view toggles between 8 and 55
❌ **FAIL if:** Nothing changes

---

## Automated Testing (Optional)

If you want to run automated Playwright tests:

```bash
# Install Playwright if not already installed
npx playwright install

# Run tests
npx playwright test tests/featured-filters.spec.ts --headed

# Or run with UI for debugging
npx playwright test tests/featured-filters.spec.ts --ui
```

**Note:** You'll need to create the test file from TESTING-FEATURED-FILTERS.md

---

## Quick Results Checklist

After running all tests, check off what works:

- [ ] Homepage shows exactly 8 featured filter chips
- [ ] "Advanced Filters" button opens dialog
- [ ] Product counts display in dialog
- [ ] Hierarchical navigation works (3 levels tested)
- [ ] Multi-select checkboxes work
- [ ] Apply filters updates homepage
- [ ] Clear All resets filters
- [ ] Admin page shows 55 filters, 8 featured
- [ ] Featured toggle works in admin
- [ ] Show Featured Only filter works

**Expected:** All 10 tests should PASS ✅

---

## Performance Benchmarks

While testing, note these timings:

- **Dialog open time:** < 500ms (should feel instant)
- **Product counts load:** < 1 second (may see brief loading)
- **Apply filters:** < 200ms (should feel instant)
- **Navigation between levels:** < 300ms (should feel smooth)

---

## Common Issues & Solutions

### Issue 1: No products show after filtering
**Cause:** No products match the selected filters
**Solution:** Run `npm run db:seed` to add sample products

### Issue 2: Counts show 0 for all filters
**Cause:** Products not assigned to filters
**Solution:** Run `npm run filters:assign` to assign products

### Issue 3: Dialog doesn't open
**Cause:** JavaScript error or React issue
**Solution:** Check browser console for errors (F12)

### Issue 4: Can't toggle featured status
**Cause:** Not logged in as admin
**Solution:** Login at /en/login with admin credentials

### Issue 5: Only see error page
**Cause:** Database connection failed
**Solution:** Restart Neo4j, wait 15 seconds, refresh page

---

## Success Criteria

✅ **Minimum Viable:** Tests 1-8 pass (homepage & dialog work)
✅ **Full Success:** All 11 tests pass
✅ **Production Ready:** All tests pass + performance benchmarks met

---

## Next Steps After Testing

### If All Tests Pass ✅
```bash
# Update commit message (remove "not-tested")
git commit --amend -m "Add featured filters system with advanced dialog and product counts

Tested and verified:
- Homepage shows 8 featured filters
- Advanced dialog with 55 filters
- Product counts display correctly
- Hierarchical navigation works
- Admin toggle functions properly
- All 11 manual tests passed

Ready for production deployment."

# Push to remote
git push origin master
```

### If Tests Fail ❌
1. Note which tests failed
2. Check error messages in browser console (F12)
3. Check server logs in terminal
4. Report issues with screenshots
5. Fix bugs and re-test

---

## Test Results Template

Copy this and fill in after testing:

```
## Featured Filters Test Results
Date: 2025-11-01
Tester: [Your Name]
Environment: Local Dev (http://localhost:3000)

### Test Results:
1. Homepage Featured Filters: [ ] PASS [ ] FAIL
2. Click Filter Chips: [ ] PASS [ ] FAIL
3. Advanced Dialog Opens: [ ] PASS [ ] FAIL
4. Product Counts Display: [ ] PASS [ ] FAIL
5. Hierarchical Navigation: [ ] PASS [ ] FAIL
6. Multi-Select Checkboxes: [ ] PASS [ ] FAIL
7. Apply Filters: [ ] PASS [ ] FAIL
8. Clear All Filters: [ ] PASS [ ] FAIL
9. Admin Panel View: [ ] PASS [ ] FAIL
10. Admin Toggle Featured: [ ] PASS [ ] FAIL
11. Show Featured Only: [ ] PASS [ ] FAIL

### Performance:
- Dialog open time: ___ ms
- Count load time: ___ ms
- Apply filters time: ___ ms

### Issues Found:
- [List any issues]

### Screenshots:
- [List screenshot filenames]

### Overall Status:
[ ] All tests passed - Ready for production
[ ] Some tests failed - Needs fixes
[ ] Major issues - Requires debugging

### Notes:
[Any additional observations]
```

---

## Time Estimate

**Total testing time:** 10-15 minutes
- Setup: 2 minutes (start Neo4j, initialize)
- Manual tests: 6-8 minutes (11 tests)
- Screenshots: 2-3 minutes
- Documentation: 2 minutes

**Best time to test:** Now! (while everything is fresh)

---

## Need Help?

If stuck:
1. Check browser console (F12) for JavaScript errors
2. Check terminal for server errors
3. Check Neo4j browser (http://localhost:7474)
4. Review TESTING-FEATURED-FILTERS.md for detailed steps
5. Check commit message for implementation details

---

**Ready?** Start with Step 1: `sudo systemctl start neo4j`

**Status:** ⏳ Awaiting your test run!
