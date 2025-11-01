# Filter System Setup Guide

Complete guide for setting up and managing the filter hierarchy system in Factory Bay.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Filter Hierarchy Structure](#filter-hierarchy-structure)
4. [Configuration File](#configuration-file)
5. [Scripts](#scripts)
6. [Intelligent Product Assignment](#intelligent-product-assignment)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Usage](#advanced-usage)

---

## Overview

The filter system provides a flexible, multi-level categorization system for e-commerce products. Unlike traditional rigid category trees, this system supports:

- **Multi-parent relationships**: A filter can have multiple parents (e.g., "Office Wear" under both "Men" and "Women")
- **Multiple dimensions**: Gender, category, style, season, occasion, and special categories
- **Intelligent assignment**: Products are automatically assigned to filters based on their attributes
- **Graph-based storage**: Uses Neo4j for efficient querying and relationship management

### Key Features

- 4+ levels of hierarchy (Level 0 = Root categories)
- 50+ default filters covering all major product types
- Cross-cutting categories (Style, Season, Occasion)
- Premium brand detection
- Pattern-based product matching
- Idempotent scripts (safe to run multiple times)

---

## Quick Start

### Prerequisites

1. Neo4j database running and initialized:
   ```bash
   npm run db:init
   ```

2. Sample products seeded (optional but recommended):
   ```bash
   npm run db:seed
   ```

### Initialize Everything

Run this single command to set up the entire filter system:

```bash
npm run filters:init
```

This will:
1. Create all filters from the configuration
2. Assign all products to appropriate filters
3. Verify the setup

**First time setup? That's it! You're done.**

---

## Filter Hierarchy Structure

### Level 0: Root Categories

#### Gender Categories
- **Men** - Men's products
- **Women** - Women's products
- **Kids** - Kids' products
- **Unisex** - Unisex products

#### Style Categories
- **Casual** - Everyday casual wear
- **Formal** - Business and formal wear
- **Sports** - Athletic and sports wear

#### Occasion Categories
- **Party Wear** - Party and evening wear
- **Office Wear** - Professional office attire
- **Beach Wear** - Beach and vacation wear
- **Wedding & Events** - Special events and weddings

#### Season Categories
- **Summer** - Summer season collection
- **Winter** - Winter season collection
- **Spring** - Spring season collection
- **Fall** - Fall/Autumn season collection

#### Special Categories
- **Premium Items** - Premium and luxury brands
- **New Arrivals** - Newly added products
- **Best Sellers** - Top selling products
- **Sale Items** - Products on sale

### Level 1: Main Categories

Under gender categories (Men/Women/Kids):
- **Clothing** - All clothing items
- **Footwear** - All footwear items
- **Accessories** - All accessories
- **Activewear** - Sports and fitness clothing

### Level 2: Sub-Categories

Under Clothing:
- **Tops** - Upper body clothing
- **Bottoms** - Lower body clothing
- **Outerwear** - Jackets, coats, outer layers
- **Dresses & Skirts** - Dresses and skirts

Under Footwear:
- **Sneakers** - Casual and athletic sneakers
- **Formal Shoes** - Dress shoes
- **Boots** - All types of boots
- **Sandals** - Sandals and open-toe footwear

Under Accessories:
- **Bags & Wallets** - Bags, purses, wallets
- **Jewelry & Watches** - Jewelry and timepieces
- **Belts** - Belts and waist accessories
- **Hats & Caps** - Headwear
- **Sunglasses** - Sunglasses and eyewear

### Level 3: Specific Items

Under Tops:
- **T-Shirts** - T-shirts and tees
- **Shirts** - Casual and formal shirts
- **Blouses** - Women's blouses
- **Sweaters & Hoodies** - Sweaters, hoodies, sweatshirts
- **Tank Tops** - Tank tops and sleeveless shirts

Under Bottoms:
- **Jeans** - All types of jeans
- **Pants** - Casual and formal pants
- **Shorts** - Shorts and bermudas
- **Leggings** - Leggings and tights

Under Outerwear:
- **Jackets** - All types of jackets
- **Coats** - Winter coats and overcoats
- **Blazers** - Blazers and suit jackets
- **Vests** - Vests and gilets

Under Dresses & Skirts:
- **Dresses** - All types of dresses
- **Skirts** - All types of skirts

---

## Configuration File

Location: `config/default-filter-hierarchy.json`

### Structure

```json
{
  "version": "1.0.0",
  "description": "Default filter hierarchy for Factory Bay",
  "filters": [
    {
      "name": "Men",
      "level": 0,
      "parents": [],
      "description": "Men's products"
    },
    {
      "name": "Clothing",
      "level": 1,
      "parents": ["Men", "Women", "Kids"],
      "description": "All clothing items"
    }
  ],
  "premiumBrands": ["Ralph Lauren", "Tommy Hilfiger", ...],
  "categoryMappings": { ... },
  "genderMappings": { ... },
  "productNamePatterns": { ... }
}
```

### Key Sections

#### filters
Array of filter definitions:
- `name`: Display name of the filter
- `level`: Hierarchy level (0 = root)
- `parents`: Array of parent filter names
- `description`: Optional description
- `category`: Optional category type (style, occasion, season, special)

#### premiumBrands
Array of brand names that should be tagged as "Premium Items"

#### categoryMappings
Maps old product category field to new filter names

#### genderMappings
Maps product gender field to gender filter names

#### productNamePatterns
Pattern matching for intelligent product assignment. Each pattern maps to an array of filter names.

---

## Scripts

### 1. Complete Initialization

```bash
npm run filters:init
```

**What it does:**
- Creates all filters from configuration
- Assigns all products to filters
- Verifies the setup

**Options:**
```bash
# Skip confirmation prompts
npm run filters:init --yes

# Clear existing filters and recreate
npm run filters:init --clear-filters

# Clear existing assignments and reassign
npm run filters:init --clear-assignments

# Clear everything and start fresh
npm run filters:init --clear-all --yes

# Show help
npm run filters:init --help
```

### 2. Setup Filters Only

```bash
npm run filters:setup
```

**What it does:**
- Creates filters from configuration
- Verifies the hierarchy
- Does NOT assign products

**Options:**
```bash
# Clear existing filters first
npm run filters:setup -- --clear
```

### 3. Assign Products Only

```bash
npm run filters:assign
```

**What it does:**
- Assigns products to filters based on intelligent matching
- Shows statistics
- Verifies assignments

**Options:**
```bash
# Clear existing assignments first
npm run filters:assign -- --clear
```

---

## Intelligent Product Assignment

The system uses multiple strategies to assign products to filters:

### 1. Gender Mapping
Maps `product.gender` to gender filters:
- `MEN` → Men
- `WOMEN` → Women
- `UNISEX` → Unisex

### 2. Category Mapping
Maps legacy `product.category` field:
- `SHIRT` → Shirts, Tops, Clothing
- `PANTS` → Pants, Bottoms, Clothing
- `JACKET` → Jackets, Outerwear, Clothing
- `DRESS` → Dresses, Dresses & Skirts, Clothing
- `SHOES` → Footwear
- `ACCESSORIES` → Accessories

### 3. Premium Brand Detection
Products from premium brands are tagged with "Premium Items":
- Ralph Lauren
- Tommy Hilfiger
- Calvin Klein
- Hugo Boss
- And more...

### 4. Pattern Matching
Product name and description are analyzed for keywords:

| Pattern | Assigned Filters |
|---------|-----------------|
| "t-shirt", "tee" | T-Shirts, Tops, Casual |
| "jeans" | Jeans, Bottoms, Casual |
| "jacket" | Jackets, Outerwear |
| "formal" | Formal |
| "office" | Office Wear, Formal |
| "leather", "silk" | Premium Items |
| And 30+ more patterns... |

### Example Assignment

For a product:
```
Name: "Ralph Lauren Classic Oxford Shirt"
Brand: "Ralph Lauren"
Gender: "MEN"
Category: "SHIRT"
```

Will be assigned to:
- Men (gender mapping)
- Shirts, Tops, Clothing (category mapping)
- Premium Items (brand detection)
- Formal (pattern: "oxford")

**Total: 6 filters**

---

## Customization

### Adding New Filters

1. Edit `config/default-filter-hierarchy.json`
2. Add your filter definition:
   ```json
   {
     "name": "Athletic Shoes",
     "level": 3,
     "parents": ["Sneakers"],
     "description": "Athletic and running shoes"
   }
   ```
3. Add pattern matching (optional):
   ```json
   "productNamePatterns": {
     "athletic": ["Athletic Shoes", "Sports"],
     "running": ["Athletic Shoes", "Sports"]
   }
   ```
4. Run setup:
   ```bash
   npm run filters:setup -- --clear
   npm run filters:assign -- --clear
   ```

### Adding Premium Brands

1. Edit `config/default-filter-hierarchy.json`
2. Add to `premiumBrands` array:
   ```json
   "premiumBrands": [
     "Ralph Lauren",
     "Your Brand Here"
   ]
   ```
3. Reassign products:
   ```bash
   npm run filters:assign -- --clear
   ```

### Custom Pattern Matching

Add custom patterns for your product naming:

```json
"productNamePatterns": {
  "your-keyword": ["Filter1", "Filter2"],
  "custom-pattern": ["AnotherFilter"]
}
```

---

## Troubleshooting

### Problem: "Filters already exist"

**Solution:**
```bash
npm run filters:setup -- --clear
```

### Problem: "No products found"

**Cause:** Database has no products

**Solution:**
```bash
npm run db:seed
npm run filters:assign
```

### Problem: "Products not assigned to filters"

**Cause:** Product names/descriptions don't match patterns

**Solutions:**
1. Check product names match patterns in config
2. Add custom patterns for your products
3. Manually assign via admin panel

### Problem: "Parent not found" error

**Cause:** Filter references parent that doesn't exist or comes after it

**Solution:** Ensure parent filters are defined before children (lower level numbers)

### Problem: Neo4j connection failed

**Solution:**
1. Check Neo4j is running
2. Verify credentials in `.env.local`
3. Run `npm run db:init`

### Problem: Cycle detected

**Cause:** Filter hierarchy has circular relationships

**Solution:** The system prevents this, but if you manually created cycles:
```bash
npm run filters:setup -- --clear
```

---

## Advanced Usage

### Querying Filters in Code

```typescript
import { getSession } from '@/lib/db'
import { getAllFilters, getProductFilters } from '@/lib/repositories/custom-filter.repository'

// Get all filters
const session = getSession()
const filters = await getAllFilters(session)
await session.close()

// Get filters for a product
const session2 = getSession()
const productFilters = await getProductFilters(session2, productId)
await session2.close()
```

### Manual Product Assignment

```typescript
import { getSession } from '@/lib/db'
import { tagProductWithFilters } from '@/lib/repositories/custom-filter.repository'

const session = getSession()
await tagProductWithFilters(session, productId, [filterId1, filterId2])
await session.close()
```

### Getting Products by Filter

```typescript
import { getSession } from '@/lib/db'
import { getProductsByFilter } from '@/lib/repositories/custom-filter.repository'

const session = getSession()
// includeChildren = true means also get products from child filters
const productIds = await getProductsByFilter(session, filterId, true)
await session.close()
```

### Creating Filters Programmatically

```typescript
import { getSession } from '@/lib/db'
import { createCustomFilter } from '@/lib/repositories/custom-filter.repository'

const session = getSession()
const filter = await createCustomFilter(session, 'New Filter', [parentId1, parentId2])
await session.close()
```

---

## Database Schema

### Nodes

**CustomFilter:**
```
{
  id: string (UUID)
  name: string
  slug: string
  level: number
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Relationships

**CHILD_OF:**
```
(ChildFilter)-[:CHILD_OF]->(ParentFilter)
```

**TAGGED_WITH:**
```
(Product)-[:TAGGED_WITH]->(CustomFilter)
```

---

## Best Practices

1. **Always use the initialization script for new setups**
   ```bash
   npm run filters:init --yes
   ```

2. **Use --clear flags cautiously in production**
   - They delete data
   - Always backup first

3. **Test pattern changes before applying**
   - Add a few patterns
   - Run assign with a limit
   - Verify results
   - Then run full assignment

4. **Keep the configuration file in version control**
   - Track changes to filter hierarchy
   - Easy rollback if needed

5. **Document custom patterns**
   - Add comments in JSON (use a JSON parser that supports comments)
   - Or maintain a separate FILTERS.md

6. **Verify after changes**
   ```bash
   npm run filters:init
   # Check the verification output
   ```

7. **Use multi-parent relationships wisely**
   - Makes sense for cross-cutting categories (Office Wear, Sports)
   - Don't overuse - can make hierarchy confusing

---

## Migration from Old System

If you have an existing category system:

1. **Map old categories to new filters**
   - Update `categoryMappings` in config

2. **Run initialization**
   ```bash
   npm run filters:init --clear-all --yes
   ```

3. **Verify products**
   - Check admin panel
   - Verify product counts per filter

4. **Adjust patterns**
   - Add custom patterns for your products
   - Reassign if needed

5. **Update frontend**
   - Use new filter queries
   - Remove old category references

---

## Support

For issues or questions:

1. Check this guide first
2. Review the scripts' help messages:
   ```bash
   npm run filters:init -- --help
   ```
3. Check Neo4j Browser for database state: http://localhost:7474
4. Review the configuration file for typos
5. Check script logs for specific error messages

---

## Appendix: Complete Filter List

### Level 0 (Root)
Gender: Men, Women, Kids, Unisex
Style: Casual, Formal, Sports
Occasion: Party Wear, Office Wear, Beach Wear, Wedding & Events
Season: Summer, Winter, Spring, Fall
Special: Premium Items, New Arrivals, Best Sellers, Sale Items

### Level 1 (Main Categories)
Clothing, Footwear, Accessories, Activewear

### Level 2 (Sub-Categories)
Tops, Bottoms, Outerwear, Dresses & Skirts
Sneakers, Formal Shoes, Boots, Sandals
Bags & Wallets, Jewelry & Watches, Belts, Hats & Caps, Sunglasses

### Level 3 (Specific Items)
T-Shirts, Shirts, Blouses, Sweaters & Hoodies, Tank Tops
Jeans, Pants, Shorts, Leggings
Jackets, Coats, Blazers, Vests
Dresses, Skirts

---

**Version:** 1.0.0
**Last Updated:** 2025-11-01
**Maintained by:** Factory Bay Development Team
