# Filter System Quick Start Guide

Complete category/filter hierarchy setup in 3 minutes!

---

## What You Get

A production-ready filter system with:
- 55 pre-configured filters across 4 levels
- Intelligent product assignment
- Multi-parent relationship support
- Full documentation and customization options

---

## Installation (First Time)

### Prerequisites
```bash
# Ensure Neo4j is running and initialized
npm run db:init

# Optional: Seed sample products to test with
npm run db:seed
```

### Setup Everything
```bash
# Run this ONE command to set up the entire system
npm run filters:init
```

That's it! The script will:
1. Create all 55 filters
2. Assign your products to appropriate filters
3. Verify everything works

---

## What Was Created

### 1. Configuration
`/config/default-filter-hierarchy.json`
- Complete filter hierarchy definition
- Premium brand list
- Product matching patterns

### 2. Scripts
- `npm run filters:setup` - Create filters
- `npm run filters:assign` - Assign products
- `npm run filters:init` - Do both (recommended)

### 3. Documentation
- `README-FILTER-SETUP.md` - Complete guide
- `FILTER-SYSTEM-SUMMARY.md` - Implementation details
- `FILTER-SYSTEM-FILES.txt` - File structure

---

## Common Tasks

### Reset Everything
```bash
npm run filters:init --clear-all --yes
```

### Reassign Products (keep filters)
```bash
npm run filters:assign -- --clear
```

### Recreate Filters (keep assignments)
```bash
npm run filters:setup -- --clear
```

---

## Filter Hierarchy

```
Level 0: Root Categories (20 filters)
  ├─ Gender: Men, Women, Kids, Unisex
  ├─ Style: Casual, Formal, Sports
  ├─ Occasion: Party Wear, Office Wear, Beach Wear, Wedding & Events
  ├─ Season: Summer, Winter, Spring, Fall
  └─ Special: Premium Items, New Arrivals, Best Sellers, Sale Items

Level 1: Main Categories (4 filters)
  └─ Clothing, Footwear, Accessories, Activewear

Level 2: Sub-Categories (14 filters)
  ├─ Tops, Bottoms, Outerwear, Dresses & Skirts
  ├─ Sneakers, Formal Shoes, Boots, Sandals
  └─ Bags & Wallets, Jewelry & Watches, Belts, etc.

Level 3: Specific Items (17 filters)
  ├─ T-Shirts, Shirts, Blouses, Sweaters, Tank Tops
  ├─ Jeans, Pants, Shorts, Leggings
  ├─ Jackets, Coats, Blazers, Vests
  └─ Dresses, Skirts

Total: 55 filters
```

---

## How Products Are Assigned

Products are automatically assigned to filters based on:

1. **Gender** - `product.gender` → Men/Women/Kids/Unisex
2. **Category** - `product.category` → Clothing/Footwear/Accessories
3. **Brand** - Premium brands → Premium Items filter
4. **Name/Description** - Pattern matching (30+ patterns)

Example: "Ralph Lauren Oxford Shirt" for Men
→ Assigned to: Men, Shirts, Tops, Clothing, Premium Items, Formal

---

## Customization

### Add Your Brands
Edit `config/default-filter-hierarchy.json`:
```json
"premiumBrands": [
  "Ralph Lauren",
  "Your Brand Here"
]
```

### Add Product Patterns
```json
"productNamePatterns": {
  "your-keyword": ["Filter1", "Filter2"]
}
```

### Add New Filters
```json
"filters": [
  {
    "name": "Your New Filter",
    "level": 2,
    "parents": ["Parent Filter Name"],
    "description": "Description here"
  }
]
```

Then run:
```bash
npm run filters:init --clear-all --yes
```

---

## Troubleshooting

### "Filters already exist"
```bash
npm run filters:init --clear-all --yes
```

### "No products found"
```bash
npm run db:seed
npm run filters:assign
```

### Products not assigned correctly
1. Check product names match patterns
2. Add custom patterns in config
3. Reassign: `npm run filters:assign -- --clear`

### Connection errors
1. Check Neo4j is running
2. Verify `.env.local` credentials
3. Run `npm run db:init`

---

## Next Steps

1. **Review Documentation**
   - Read `README-FILTER-SETUP.md` for complete guide

2. **Verify Setup**
   - Check admin panel for filters
   - View product assignments

3. **Customize**
   - Add your brands and patterns
   - Adjust hierarchy as needed

4. **Integrate**
   - Update frontend to use new filters
   - Test user experience

---

## Key Features

- **Multi-Parent Support** - Filters can have multiple parents
- **Intelligent Assignment** - Automatic product tagging
- **Cycle Prevention** - No circular relationships allowed
- **Idempotent** - Safe to run multiple times
- **Production Ready** - Comprehensive error handling

---

## Help

```bash
# Show all available options
npm run filters:init -- --help

# View files created
ls -lh config/default-filter-hierarchy.json
ls -lh scripts/{setup-default-filters,assign-products-to-filters,initialize-filter-system}.ts
```

---

## Files Reference

| File | Purpose | Size |
|------|---------|------|
| `config/default-filter-hierarchy.json` | Filter configuration | 9.7 KB |
| `scripts/setup-default-filters.ts` | Create filters | 8.5 KB |
| `scripts/assign-products-to-filters.ts` | Assign products | 11 KB |
| `scripts/initialize-filter-system.ts` | Combined setup | 7.8 KB |
| `README-FILTER-SETUP.md` | Complete documentation | 15 KB |

---

**Status:** Ready to Use

**Version:** 1.0.0

**Last Updated:** 2025-11-01

---

Need more help? See `README-FILTER-SETUP.md` for the complete guide.
