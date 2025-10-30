# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Factory Bay is a modern e-commerce platform for branded clothing at stock prices. Built with Next.js 15 (App Router), TypeScript, Neo4j graph database, and Tailwind CSS. The platform uses Neo4j's graph capabilities for intelligent product recommendations based on user behavior, preferences, and measurements.

## Development Commands

### Running the Application
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management
```bash
npm run db:init      # Initialize Neo4j schema (constraints/indexes)
npm run db:seed      # Seed database with sample data
npm run db:clear     # Clear all database data (WARNING: destructive)
```

The database scripts are in `scripts/` and use `tsx` for TypeScript execution.

### Testing
- Neo4j Browser: http://localhost:7474 (username: neo4j, password: factorybay123)
- To test database connection: Run `npm run db:init`

## High-Level Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript 5.7
- **Styling**: Tailwind CSS 3.4 with custom design system (see STYLE_GUIDE.md)
- **Database**: Neo4j 5.26 (graph database for relationships and recommendations)
- **Authentication**: JWT tokens stored in httpOnly cookies, bcrypt password hashing
- **Server Actions**: All backend logic uses Next.js Server Actions in `src/app/actions/`
- **Internationalization**: next-intl with locale routing (`/en`, `/si`)

### Project Structure
```
src/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (backend logic)
│   │   ├── auth.ts              # Authentication
│   │   ├── cart.ts              # Shopping cart operations
│   │   ├── order.ts             # Order placement
│   │   ├── products.ts          # Product fetching
│   │   ├── admin-*.ts           # Admin operations
│   │   └── user-profile.ts      # User preferences/measurements
│   ├── [locale]/                # Internationalized routes
│   │   ├── page.tsx             # Homepage
│   │   ├── shop/                # Product catalog
│   │   ├── product/[id]/        # Product details
│   │   ├── cart/                # Shopping cart
│   │   ├── checkout/            # Order checkout
│   │   ├── orders/              # Order history
│   │   ├── profile/             # User profile/measurements
│   │   ├── admin/               # Admin panel
│   │   ├── login/ & signup/     # Authentication pages
│   │   └── HomePageClient.tsx   # Client component for homepage
│   └── layout.tsx               # Root layout
├── lib/                          # Core utilities
│   ├── db.ts                    # Neo4j driver & connection
│   ├── auth.ts                  # Auth utilities (JWT, bcrypt)
│   ├── types.ts                 # TypeScript type definitions
│   ├── guest-cart.ts            # Guest cart handling
│   └── repositories/            # Database operations (Repository pattern)
│       ├── user.repository.ts
│       ├── product.repository.ts
│       ├── cart.repository.ts
│       ├── order.repository.ts
│       ├── recommendation.repository.ts
│       └── user-profile.repository.ts
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   ├── layout/                  # Layout components (Navigation)
│   ├── cart/                    # Cart-specific components
│   └── products/                # Product components
└── i18n/                        # Internationalization config
```

### Database Architecture (Neo4j)

**Key Design Principle**: Neo4j is used specifically for modeling relationships between users, products, orders, and generating recommendations through graph traversals.

#### Node Types
- **User**: Customer/admin accounts with authentication
- **Product**: Main product entity (brand, category, prices)
- **ProductVariant**: Size/color variants with stock quantities and images
- **Order**: Customer orders with status tracking
- **OrderItem**: Individual items in an order
- **CartItem**: Shopping cart entries
- **UserPreference**: Brand/color/category preferences
- **UserMeasurements**: Body measurements for size recommendations

#### Key Relationships
- `(User)-[:PLACED_ORDER]->(Order)`
- `(User)-[:HAS_IN_CART]->(CartItem)`
- `(User)-[:VIEWED]->(Product)` - For tracking browsing history
- `(User)-[:PURCHASED]->(Product)` - For collaborative filtering
- `(ProductVariant)-[:VARIANT_OF]->(Product)`
- `(Order)-[:CONTAINS]->(OrderItem)-[:OF_VARIANT]->(ProductVariant)`

#### Repository Pattern
All database operations are encapsulated in repository classes in `src/lib/repositories/`. Each repository handles a specific domain (users, products, cart, orders, etc.) and exports functions that take a Neo4j session and return typed results.

Example pattern:
```typescript
export async function functionName(session: Session, params: Type): Promise<ReturnType> {
  const result = await session.run('CYPHER QUERY', params)
  return result.records.map(record => record.toObject())
}
```

### Authentication Flow

1. **Login/Signup**: Server Actions in `src/app/actions/auth.ts`
2. **Password hashing**: bcrypt with salt rounds = 12
3. **Token generation**: JWT with 7-day expiry
4. **Storage**: httpOnly cookies (secure in production)
5. **Session retrieval**: `getCurrentUser()` from `src/lib/auth.ts`
6. **Protection**: Middleware checks authentication but primarily uses next-intl for locale routing

**Important**: Auth is handled via server-side functions. Use `getCurrentUser()` to get current user in Server Actions or Server Components.

### Server Actions Pattern

All backend logic uses Next.js Server Actions (functions marked with `'use server'`). These are called directly from Client Components and handle:
- Database queries via repositories
- Authentication checks
- Form submissions
- Data mutations

Pattern:
```typescript
'use server'
export async function actionName(formData: FormData) {
  const session = getSession()
  try {
    // Auth check if needed
    const user = await getCurrentUser()

    // Call repository functions
    const result = await repository.function(session, params)

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  } finally {
    await session.close()
  }
}
```

### Design System

The project has a comprehensive design system documented in `STYLE_GUIDE.md`. Key points:

#### Color Palette
- **Primary**: Navy Blue (#2d6394) - Brand color
- **Accent**: Gold (#e5c158) - Stock price highlights
- **CTA**: Coral (#ff6b6b) - Call-to-action buttons
- **Neutrals**: Gray scale for text and backgrounds

#### Component Library
All UI components in `src/components/ui/` follow the design system:
- Buttons: Primary (coral), Secondary (navy outline), Ghost
- Inputs: Consistent styling with validation states
- Cards: Product cards with hover effects

#### Tailwind Configuration
Custom colors and design tokens are defined in `tailwind.config.ts`. Always use these tokens rather than arbitrary values.

### Internationalization

Uses `next-intl` with locale prefix routing:
- Supported locales: English (`en`), Sinhala (`si`)
- Routes are prefixed: `/en/shop`, `/si/shop`
- Middleware in `src/middleware.ts` handles locale routing
- Translation files would be in `messages/` directory

### Recommendation Engine

Located in `src/lib/repositories/recommendation.repository.ts`. Uses graph traversals to implement:

1. **Collaborative Filtering**: Find products purchased by users with similar purchase history
2. **Content-Based Filtering**: Match products to user preferences (brands, categories, colors)
3. **Size Recommendations**: Use measurements to suggest appropriate sizes

The recommendation logic leverages Neo4j's graph traversal capabilities to efficiently query relationships.

## Key Development Patterns

### When Adding New Features

1. **Database Operations**: Add new functions to appropriate repository in `src/lib/repositories/`
2. **Server Actions**: Create or update actions in `src/app/actions/`
3. **UI Components**: Follow design system in `STYLE_GUIDE.md`
4. **Routes**: Add pages under `src/app/[locale]/` for internationalized routes
5. **Types**: Update `src/lib/types.ts` for new TypeScript interfaces

### Working with Neo4j

- Always use parameterized queries to prevent Cypher injection
- Close sessions in finally blocks
- Use the repository pattern - don't write raw Cypher in Server Actions
- Test queries in Neo4j Browser (http://localhost:7474) before implementing

### File Uploads

Product images are currently stored locally in `public/images/products/`. Path stored in Neo4j as string arrays on ProductVariant nodes. Migration path to cloud storage (Cloudinary/S3) is planned.

### Environment Variables

Required variables in `.env.local` (see `.env.example`):
- `NEO4J_URI`: Neo4j connection string
- `NEO4J_USER`: Database username
- `NEO4J_PASSWORD`: Database password
- `JWT_SECRET`: Secret for JWT signing
- `NODE_ENV`: development/production
- `NEXT_PUBLIC_APP_URL`: Application URL

## Important Notes

- **Path Aliases**: Use `@/*` to import from `src/` (configured in `tsconfig.json`)
- **Mobile-First**: All components should be built mobile-first (see breakpoints in STYLE_GUIDE.md)
- **TypeScript**: Strict mode enabled - all code must be properly typed
- **No Payment Integration**: Orders are placed without payment (manual fulfillment workflow)
- **Graph Database**: Neo4j is used specifically for relationships and recommendations, not as a general document store

## Documentation Files

- **README.md**: Project overview and quick start
- **SPECIFICATION.md**: Complete technical specification and feature requirements
- **STYLE_GUIDE.md**: Design system, components, colors, typography, animations
- **SETUP.md**: Detailed setup instructions for Neo4j and environment
- **PROGRESS.md**: Development progress tracking
- **IMAGE_RESOURCES.md**: Image sourcing and management guidelines
