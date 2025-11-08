/**
 * Database Seeding Script
 *
 * Creates default test users and sample data for development and testing.
 * Run with: npm run db:seed
 */

import dotenv from 'dotenv'
import { getSession, closeDriver } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'
import { createUser, findUserByEmail } from '../src/lib/repositories/user.repository'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface SeedUser {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'CUSTOMER'
  phone?: string
}

const DEFAULT_USERS: SeedUser[] = [
  {
    email: 'testadmin@factorybay.com',
    password: 'Admin123!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'ADMIN',
  },
  {
    email: 'test@example.com',
    password: 'Customer123!',
    firstName: 'Test',
    lastName: 'Customer',
    role: 'CUSTOMER',
  },
]

async function seedUsers() {
  console.log('\n👥 Seeding users...')

  let created = 0
  let skipped = 0

  for (const userData of DEFAULT_USERS) {
    try {
      // Check if user already exists
      const existingUser = await findUserByEmail(userData.email)

      if (existingUser) {
        console.log(`   ⏭️  Skipped: ${userData.email} (already exists)`)
        skipped++
        continue
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password)

      // Create user
      const user = await createUser({
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        phone: userData.phone,
      })

      console.log(`   ✅ Created: ${user.email} (${user.role})`)
      created++
    } catch (error) {
      console.error(`   ❌ Failed to create ${userData.email}:`, error)
    }
  }

  console.log(`\n   📊 Summary: ${created} created, ${skipped} skipped`)
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')
  console.log('=' .repeat(60))

  try {
    await seedUsers()

    console.log('\n' + '='.repeat(60))
    console.log('✅ Database seeding completed successfully!')
    console.log('\n📋 Test Accounts:')
    console.log('   Admin:    testadmin@factorybay.com / Admin123!')
    console.log('   Customer: test@example.com / Customer123!')
    console.log('\n🔗 URLs:')
    console.log('   App:   http://localhost:3000/en/login')
    console.log('   Admin: http://localhost:3000/en/admin/dashboard')

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error)
    process.exit(1)
  } finally {
    await closeDriver()
  }
}

// Run the seeding
seedDatabase()
