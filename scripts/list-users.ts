import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { getSession, closeDriver } from '../src/lib/db'

async function listUsers() {
  const session = getSession()
  try {
    const result = await session.run(
      'MATCH (u:User) RETURN u.email, u.role, u.firstName, u.lastName ORDER BY u.email'
    )
    console.log('\n📋 Users in database:\n')
    result.records.forEach(record => {
      console.log(`  Email: ${record.get('u.email')}`)
      console.log(`  Name: ${record.get('u.firstName')} ${record.get('u.lastName')}`)
      console.log(`  Role: ${record.get('u.role')}`)
      console.log('  ---')
    })
  } finally {
    await session.close()
    await closeDriver()
  }
}

listUsers()
