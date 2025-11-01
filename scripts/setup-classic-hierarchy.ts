import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'

interface FilterNode {
  name: string
  children?: FilterNode[]
}

const classicHierarchy: FilterNode[] = [
  {
    name: 'Office Wear',
    children: [
      {
        name: 'Men',
        children: [
          { name: 'Dress Shirts' },
          { name: 'Dress Trousers' },
          { name: 'Blazers' },
          { name: 'Ties' }
        ]
      },
      {
        name: 'Women',
        children: [
          { name: 'Blouses' },
          { name: 'Skirts' },
          { name: 'Dress Trousers' },
          { name: 'Blazers' }
        ]
      }
    ]
  },
  {
    name: 'Casual Wear',
    children: [
      {
        name: 'Men',
        children: [
          { name: 'T-Shirts' },
          { name: 'Jeans' },
          { name: 'Casual Shirts' },
          { name: 'Shorts' }
        ]
      },
      {
        name: 'Women',
        children: [
          { name: 'T-Shirts' },
          { name: 'Jeans' },
          { name: 'Casual Tops' },
          { name: 'Shorts' }
        ]
      }
    ]
  },
  {
    name: 'Sportswear',
    children: [
      {
        name: 'Men',
        children: [
          { name: 'Track Pants' },
          { name: 'Sports Shirts' },
          { name: 'Gym Shorts' }
        ]
      },
      {
        name: 'Women',
        children: [
          { name: 'Track Pants' },
          { name: 'Sports Tops' },
          { name: 'Gym Shorts' },
          { name: 'Sports Bras' }
        ]
      }
    ]
  },
  {
    name: 'Footwear',
    children: [
      { name: 'Formal Shoes' },
      { name: 'Casual Shoes' },
      { name: 'Sports Shoes' },
      { name: 'Sandals' }
    ]
  }
]

async function clearCustomFilters() {
  const session = getSession()
  try {
    console.log('Clearing existing custom filters...')
    await session.run('MATCH (f:CustomFilter) DETACH DELETE f')
    console.log('✓ Cleared all custom filters')
  } finally {
    await session.close()
  }
}

async function createFilterNode(name: string, parentId: string | null, level: number): Promise<string> {
  const session = getSession()
  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const id = `filter-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const query = `
      CREATE (f:CustomFilter {
        id: $id,
        name: $name,
        slug: $slug,
        level: $level,
        isActive: true,
        createdAt: datetime().epochMillis,
        updatedAt: datetime().epochMillis
      })
      ${parentId ? 'WITH f MATCH (p:CustomFilter {id: $parentId}) CREATE (f)-[:CHILD_OF]->(p)' : ''}
      RETURN f.id as id
    `

    const result = await session.run(query, { id, name, slug, level, parentId })
    return result.records[0].get('id')
  } finally {
    await session.close()
  }
}

async function createHierarchyRecursive(nodes: FilterNode[], parentId: string | null, level: number) {
  for (const node of nodes) {
    console.log(`${'  '.repeat(level)}Creating: ${node.name} (Level ${level})`)
    const filterId = await createFilterNode(node.name, parentId, level)

    if (node.children && node.children.length > 0) {
      await createHierarchyRecursive(node.children, filterId, level + 1)
    }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Setting up Classic Day-to-Day Category Hierarchy')
  console.log('='.repeat(60))
  console.log()

  await clearCustomFilters()
  console.log()
  console.log('Creating new hierarchy...')
  console.log()

  await createHierarchyRecursive(classicHierarchy, null, 0)

  console.log()
  console.log('='.repeat(60))
  console.log('✓ Classic hierarchy created successfully!')
  console.log('='.repeat(60))
  console.log()
  console.log('Hierarchy structure:')
  console.log('- Office Wear')
  console.log('  - Men (Dress Shirts, Dress Trousers, Blazers, Ties)')
  console.log('  - Women (Blouses, Skirts, Dress Trousers, Blazers)')
  console.log('- Casual Wear')
  console.log('  - Men (T-Shirts, Jeans, Casual Shirts, Shorts)')
  console.log('  - Women (T-Shirts, Jeans, Casual Tops, Shorts)')
  console.log('- Sportswear')
  console.log('  - Men (Track Pants, Sports Shirts, Gym Shorts)')
  console.log('  - Women (Track Pants, Sports Tops, Gym Shorts, Sports Bras)')
  console.log('- Footwear (Formal Shoes, Casual Shoes, Sports Shoes, Sandals)')
  console.log()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
