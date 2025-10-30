# Factory Bay - Technical Specification

## Project Overview
Factory Bay is a modern e-commerce platform for branded clothing sold at stock prices. The platform features a customer-facing storefront and an admin panel for inventory management, with a focus on personalization through customer tracking and recommendations.

## Core Value Proposition
- **Stock Price Model**: Branded clothing at stock/wholesale prices
- **Personalization**: Smart recommendations based on preferences and measurements
- **Simplified Operations**: Manual order fulfillment with future automation path

## Technical Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: React Context + Server Actions

### Backend
- **Database**: Neo4j (graph database for relationships)
- **API**: Next.js Server Actions
- **Authentication**: JWT-based (local storage)
- **File Storage**: Local filesystem (migration path to cloud)

### Testing
- **E2E Testing**: Playwright MCP

## System Architecture

### Database Schema (Neo4j)

#### Nodes
1. **User**
   - id (UUID)
   - email (unique, indexed)
   - passwordHash
   - role (CUSTOMER | ADMIN)
   - firstName
   - lastName
   - phone
   - createdAt
   - updatedAt

2. **UserMeasurements**
   - id (UUID)
   - chest
   - waist
   - hips
   - shoulders
   - inseam
   - height
   - weight
   - preferredSize (S | M | L | XL | XXL)
   - unit (METRIC | IMPERIAL)

3. **Product**
   - id (UUID)
   - name
   - description
   - brand
   - category (SHIRT | PANTS | JACKET | DRESS | SHOES | ACCESSORIES)
   - gender (MEN | WOMEN | UNISEX)
   - stockPrice
   - retailPrice
   - sku (unique)
   - createdAt
   - updatedAt

4. **ProductVariant**
   - id (UUID)
   - size
   - color
   - stockQuantity
   - images (array of local paths)

5. **Order**
   - id (UUID)
   - orderNumber (unique)
   - status (PENDING | CONFIRMED | FULFILLED | CANCELLED)
   - totalAmount
   - createdAt
   - updatedAt
   - shippingAddress (JSON)

6. **OrderItem**
   - id (UUID)
   - quantity
   - priceAtPurchase

7. **CartItem**
   - id (UUID)
   - quantity
   - addedAt

8. **UserPreference**
   - id (UUID)
   - preferredBrands (array)
   - preferredColors (array)
   - preferredCategories (array)
   - priceRange (JSON: {min, max})

#### Relationships
- (User)-[:HAS_MEASUREMENTS]->(UserMeasurements)
- (User)-[:HAS_PREFERENCES]->(UserPreference)
- (User)-[:PLACED_ORDER]->(Order)
- (User)-[:HAS_IN_CART]->(CartItem)
- (CartItem)-[:CONTAINS]->(ProductVariant)
- (Order)-[:CONTAINS]->(OrderItem)
- (OrderItem)-[:OF_VARIANT]->(ProductVariant)
- (ProductVariant)-[:VARIANT_OF]->(Product)
- (User)-[:VIEWED]->(Product) [with timestamp for tracking]
- (User)-[:PURCHASED]->(Product) [for recommendation engine]

## Feature Specifications

### 1. Authentication System
**Routes:**
- `/login` - Login page
- `/signup` - Registration page
- `/logout` - Logout action

**Functionality:**
- Email/password authentication
- Password hashing (bcrypt)
- JWT token stored in httpOnly cookies
- Session validation middleware
- Role-based access control (Customer/Admin)

**Validation:**
- Email format validation
- Password strength (min 8 chars, 1 uppercase, 1 number)
- Duplicate email check

### 2. Product Catalog
**Customer Routes:**
- `/` - Homepage with featured products
- `/shop` - All products with filters
- `/shop/[category]` - Category pages
- `/product/[id]` - Product detail page

**Features:**
- Grid layout (1 col mobile, 2 col tablet, 4 col desktop)
- Filters: category, brand, size, color, price range
- Sort: price (low/high), newest, popular
- Search functionality
- Product cards with hover effects
- Quick view modal
- Image gallery with zoom
- Size selector
- Add to cart from listing or detail

### 3. Shopping Cart
**Route:** `/cart`

**Features:**
- Persistent cart (stored in database)
- Quantity adjustment
- Remove items
- Real-time price calculation
- Stock availability check
- Continue shopping / Proceed to checkout

### 4. Order Management
**Customer Routes:**
- `/checkout` - Order placement
- `/orders` - Order history
- `/orders/[id]` - Order details

**Checkout Flow:**
1. Review cart items
2. Enter/confirm shipping address
3. Review order summary
4. Place order (no payment integration yet)
5. Order confirmation page

**Admin Functionality:**
- View all orders
- Filter by status
- Mark order as fulfilled
- Cancel orders
- View customer details

### 5. Admin Panel
**Routes:**
- `/admin/dashboard` - Overview stats
- `/admin/products` - Product management
- `/admin/products/new` - Add product
- `/admin/products/[id]/edit` - Edit product
- `/admin/orders` - Order management
- `/admin/customers` - Customer tracking

**Dashboard Metrics:**
- Total revenue
- Pending orders
- Low stock alerts
- Top selling products
- Recent orders

**Product Management:**
- Add/Edit/Delete products
- Manage variants (size, color, stock)
- Upload product images (local storage)
- Bulk operations
- Inventory tracking

**Customer Tracking:**
- View all customers
- Customer purchase history
- Preferences overview
- Measurement records
- Recommendation insights

### 6. User Profile
**Routes:**
- `/profile` - Profile overview
- `/profile/measurements` - Body measurements
- `/profile/preferences` - Shopping preferences
- `/profile/orders` - Order history

**Features:**
- Edit personal information
- Update measurements
- Set preferences (brands, colors, categories, price range)
- View order history
- Change password

### 7. Recommendation Engine
**Algorithm:**
1. **Collaborative Filtering:**
   - Users who bought similar items
   - Based on purchase history relationships

2. **Content-Based Filtering:**
   - Match product attributes to user preferences
   - Size compatibility based on measurements
   - Brand and category preferences

3. **Hybrid Scoring:**
   - Combine collaborative and content-based scores
   - Weight recent interactions higher
   - Factor in stock availability

**Display Locations:**
- Homepage: "Recommended for You"
- Product page: "You May Also Like"
- Cart page: "Complete Your Look"

## Design System

### Mobile-First Breakpoints
```
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Small laptops
xl: 1280px  // Desktops
2xl: 1536px // Large screens
```

### Color Palette (to be defined in style guide)
- Primary color
- Secondary color
- Accent colors
- Neutral grays
- Success/Error/Warning states

### Typography
- Headings hierarchy (H1-H6)
- Body text sizes
- Font families (modern sans-serif)

### Components
- Buttons (primary, secondary, ghost, icon)
- Cards
- Forms & Inputs
- Navigation
- Modals/Dialogs
- Toasts/Notifications
- Badges
- Loading states
- Empty states

### Micro-interactions
- Button hover/press effects
- Card hover lift
- Image lazy load fade-in
- Skeleton loaders
- Toast slide-in
- Modal fade/scale
- Cart badge pulse
- Smooth page transitions

## Development Phases

### Phase 1: Foundation
1. Project setup
2. Design system implementation
3. Authentication system
4. Basic routing

### Phase 2: Core Shopping Experience
1. Product catalog
2. Product detail pages
3. Shopping cart
4. Order placement

### Phase 3: Admin Panel
1. Dashboard
2. Product management
3. Order management
4. Customer tracking

### Phase 4: Personalization
1. User measurements
2. Preferences management
3. Recommendation engine
4. View tracking

### Phase 5: Polish
1. Animations and micro-interactions
2. Performance optimization
3. Accessibility improvements
4. Comprehensive testing

## Future Migration Paths

### Database
- Profile data → Supabase
- Keep Neo4j for relationships and recommendations

### File Storage
- Product images → Cloudinary/S3
- User uploads → Cloud storage

### Payments
- Stripe/PayPal integration
- Payment flow implementation

### Shipping
- Shipping provider API integration
- Tracking number generation
- Automated fulfillment

## Testing Strategy

### Unit Tests
- Utility functions
- Validation logic
- Recommendation algorithm

### Integration Tests
- Server actions
- Database operations
- Authentication flow

### E2E Tests (Playwright)
- Complete user journey
- Cart and checkout flow
- Admin operations
- Authentication flows

## Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90

## Accessibility Goals
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators

## Security Considerations
- Password hashing (bcrypt, cost factor 12)
- JWT token expiration
- CSRF protection
- Input validation and sanitization
- SQL/Cypher injection prevention
- Rate limiting on auth endpoints
- Secure session management
