# Factory Bay - User Login Guide

This guide explains how to access Factory Bay as a regular customer user, including test credentials and how to create new accounts.

## Table of Contents
- [Quick Start](#quick-start)
- [Test User Accounts](#test-user-accounts)
- [Creating a New Account](#creating-a-new-account)
- [Login Process](#login-process)
- [User Features](#user-features)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. **Ensure the application is running:**
   ```bash
   npm run dev
   ```
   Access at: http://localhost:3000

2. **Navigate to login page:**
   - Direct URL: http://localhost:3000/en/login
   - Or click "Login" in the navigation bar

3. **Use test credentials** (see below) or **create a new account**

---

## Test User Accounts

### Admin Test Account

For testing admin functionality:

| Email | Password | Role | Access |
|-------|----------|------|--------|
| `testadmin@factorybay.com` | `Admin123!` | ADMIN | Full admin panel access |

**Admin Panel URL:** http://localhost:3000/en/admin

**Admin Features:**
- Product Management
- Order Management
- Inventory Control
- Category Management (Ladies/Gents/Kids hierarchies)
- Promotional Categories
- User Management

### Existing Customer Accounts in Database

The following customer accounts currently exist in your database:

| Email | Name | Role | Notes |
|-------|------|------|-------|
| `testuser@example.com` | Test User | CUSTOMER | Created via signup |
| `newtest2@example.com` | NewTest User2 | CUSTOMER | Created via signup |
| `inbox.bawantha@gmail.com` | Pasindu Munasinghe | CUSTOMER | Created via signup |

**Note:** Since these accounts were created through the signup flow, their passwords are hashed and unknown. You'll need to either:
1. **Create a new customer account** (recommended - see below)
2. **Reset the password** for an existing account (feature may need implementation)

### Documented Test Account (SETUP.md)

According to the project documentation, there should be a test customer account:
- **Email:** `customer@factorybay.com`
- **Password:** `Customer123!`

**Status:** This account doesn't currently exist in your database. You can either:
- Create it manually through the signup page using these credentials
- Wait for it to be seeded (seed script may need updating)

---

## Creating a New Account

### Step-by-Step Signup Process

1. **Navigate to Signup Page:**
   - URL: http://localhost:3000/en/signup
   - Or click "Sign Up" from the login page

2. **Fill in Registration Form:**
   ```
   First Name: [Your First Name]
   Last Name: [Your Last Name]
   Email: [your-email@example.com]
   Password: [Strong password]
   Phone: [Optional phone number]
   ```

3. **Password Requirements:**
   - Minimum 8 characters
   - Must include uppercase and lowercase letters
   - Must include at least one number
   - Special characters recommended (e.g., !, @, #, $)
   - Example: `Customer123!`

4. **Submit and Auto-Login:**
   - Upon successful registration, you'll be automatically logged in
   - Redirected to the homepage as an authenticated customer

### Example Test Customer Account

For testing purposes, you can create:
```
First Name: Test
Last Name: Customer
Email: test.customer@example.com
Password: TestPass123!
Phone: 555-0123 (optional)
```

---

## Login Process

### Regular Login Flow

1. **Go to Login Page:**
   ```
   http://localhost:3000/en/login
   ```

2. **Enter Credentials:**
   - Email address
   - Password

3. **Submit:**
   - Click "Login" button
   - Upon success, redirected to homepage or previous page

4. **Authentication:**
   - JWT token stored in httpOnly cookie
   - Session persists for 7 days
   - Auto-logout after token expiration

### Login via Navigation

1. Click "Login" button in top navigation
2. If accessing protected pages (cart, checkout, profile), you'll be redirected to login with return URL
3. After login, automatically redirected back to intended page

---

## User Features

Once logged in as a customer, you have access to:

### 🛍️ Shopping Features
- **Browse Products:** `/en/shop`
  - Filter by category, gender, brand
  - Search products
  - View product details

- **Product Details:** `/en/product/[id]`
  - View product images and variants
  - Select size and color
  - Add to cart
  - View size recommendations (if measurements saved)

- **Shopping Cart:** `/en/cart`
  - View cart items
  - Update quantities
  - Remove items
  - Proceed to checkout

### 📦 Order Management
- **Checkout:** `/en/checkout`
  - Enter shipping address
  - Choose delivery method (Ship or Collect)
  - Upload payment proof
  - Place order

- **Order History:** `/en/orders`
  - View all past orders
  - Track order status (Pending, Confirmed, Fulfilled, Cancelled)
  - View order details

### 👤 Profile Management
- **User Profile:** `/en/profile`
  - Update personal information
  - Set shopping preferences:
    - Preferred brands
    - Preferred colors
    - Preferred categories
    - Price range
  - Save body measurements for size recommendations:
    - Height, weight
    - Chest, waist, hips
    - Shoulders, inseam
    - Preferred size
  - Choose measurement units (Metric/Imperial)

### 🎯 Personalized Recommendations
- Based on browsing history
- Collaborative filtering (users with similar purchases)
- Content-based (matching your preferences)
- Size recommendations based on measurements

---

## Troubleshooting

### Can't Login - Invalid Credentials
- **Check email spelling** - emails are case-insensitive but must match exactly
- **Verify password** - passwords are case-sensitive
- **Check Caps Lock** is off
- **Create new account** if you've forgotten credentials

### Session Expired
- JWT tokens expire after 7 days
- Simply login again with your credentials
- Session cookie will be refreshed

### Redirected to Login Unexpectedly
- Token may have expired
- Cookie may have been cleared
- Login again to restore session

### Can't Access Admin Panel
- Customer accounts have `CUSTOMER` role
- Admin panel requires `ADMIN` role
- Contact admin to upgrade your account role if needed
- Command to upgrade: `npx tsx scripts/set-admin-role.ts your-email@example.com`

### Account Creation Fails
- **Email already exists** - use different email or login with existing account
- **Weak password** - ensure password meets requirements
- **Validation errors** - check all required fields are filled

### Database Connection Issues
```bash
# Verify Neo4j is running
docker ps

# Test database connection
npm run db:init

# Check environment variables
cat .env.local
```

---

## Difference: Customer vs Admin

| Feature | Customer | Admin |
|---------|----------|-------|
| Browse Products | ✅ | ✅ |
| Add to Cart | ✅ | ✅ |
| Place Orders | ✅ | ✅ |
| View Own Orders | ✅ | ✅ |
| Manage Profile | ✅ | ✅ |
| Admin Panel Access | ❌ | ✅ |
| Manage All Products | ❌ | ✅ |
| View All Orders | ❌ | ✅ |
| Inventory Management | ❌ | ✅ |

---

## Quick Reference

### Customer URLs
```
Homepage:        http://localhost:3000/en
Login:           http://localhost:3000/en/login
Signup:          http://localhost:3000/en/signup
Shop:            http://localhost:3000/en/shop
Cart:            http://localhost:3000/en/cart
Checkout:        http://localhost:3000/en/checkout
Orders:          http://localhost:3000/en/orders
Profile:         http://localhost:3000/en/profile
```

### Admin URLs
```
Admin Panel:     http://localhost:3000/en/admin
Products:        http://localhost:3000/en/admin/products
Orders:          http://localhost:3000/en/admin/orders
Categories:      http://localhost:3000/en/admin/categories
Promo Sections:  http://localhost:3000/en/admin/sections
```

### Recommended Test Workflow

1. **Create Test Account:**
   ```
   Email: test.customer@example.com
   Password: TestPass123!
   ```

2. **Browse and Shop:**
   - Go to `/en/shop`
   - Add items to cart
   - Checkout with test address

3. **Set Preferences:**
   - Go to `/en/profile`
   - Set brand preferences (e.g., Nike, Ralph Lauren)
   - Set color preferences (e.g., Blue, Black)
   - Add measurements for size recommendations

4. **View Recommendations:**
   - Browse products with similar preferences
   - See personalized recommendations on homepage

---

## Support

For issues or questions:
- Check SETUP.md for environment setup
- Check SPECIFICATION.md for feature details
- Check STYLE_GUIDE.md for UI components
- Review server actions in `src/app/actions/auth.ts`

## Related Documentation
- [SETUP.md](./SETUP.md) - Initial setup and installation
- [README.md](./README.md) - Project overview
- [SPECIFICATION.md](./SPECIFICATION.md) - Complete technical specification
