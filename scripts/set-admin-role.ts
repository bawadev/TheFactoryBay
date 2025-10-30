/**
 * Set a user's role to ADMIN
 * Run this with: tsx scripts/set-admin-role.ts <email>
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'

async function setAdminRole(email: string) {
  const session = getSession()

  try {
    const result = await session.run(
      `MATCH (u:User {email: $email})
       SET u.role = $role
       RETURN u.email, u.role`,
      { email, role: 'ADMIN' }
    )

    if (result.records.length > 0) {
      const record = result.records[0]
      console.log('✅ User role updated:')
      console.log('   Email:', record.get('u.email'))
      console.log('   Role:', record.get('u.role'))
    } else {
      console.log('❌ User not found with email:', email)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await session.close()
    await closeDriver()
  }
}

const email = process.argv[2] || 'admin@factorybay.com'
console.log(`🔧 Setting ${email} as ADMIN...\n`)
setAdminRole(email)
