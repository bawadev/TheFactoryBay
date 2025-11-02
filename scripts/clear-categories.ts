import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'

async function main() {
  const session = getSession()
  try {
    console.log('Clearing all Category nodes...')
    await session.run('MATCH (c:Category) DETACH DELETE c')
    console.log('✓ All categories cleared')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await session.close()
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1))
