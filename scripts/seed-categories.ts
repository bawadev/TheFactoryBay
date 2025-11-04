import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { getSession } from '../src/lib/db'
import {
  createCustomFilter,
  getRootFilters,
  getChildFilters,
} from '../src/lib/repositories/custom-filter.repository'

async function seedCategories() {
  const session = getSession()

  try {
    console.log('Starting category seeding...')

    // Get existing root filters
    const rootFilters = await getRootFilters(session)
    const menFilter = rootFilters.find(f => f.name === 'Men')
    const womenFilter = rootFilters.find(f => f.name === 'Women')

    if (!menFilter || !womenFilter) {
      console.error('Men and Women root filters not found!')
      return
    }

    console.log('Found Men and Women root filters')

    // Get existing children under Men
    const menChildren = await getChildFilters(session, menFilter.id)
    let shirtsFilter = menChildren.find(f => f.name === 'Shirts')

    // Men categories structure
    const menCategories = {
      'Shirts': ['Casual', 'Formal/Office', 'Evening/Party'],
      'Pants': ['Casual', 'Formal/Office'],
      'Jackets': ['Casual', 'Formal'],
      'Shoes': ['Casual', 'Formal', 'Sports']
    }

    // Women categories structure
    const womenCategories = {
      'Blouses': ['Casual', 'Formal/Office', 'Evening/Party'],
      'Skirts': ['Casual', 'Formal/Office', 'Evening/Party'],
      'Dresses': ['Casual', 'Formal/Office', 'Evening/Party'],
      'Shoes': ['Casual', 'Formal', 'Sports']
    }

    // Create Men subcategories
    console.log('\n=== Creating Men subcategories ===')
    for (const [category, subcategories] of Object.entries(menCategories)) {
      // Check if category already exists
      let categoryFilter = menChildren.find(f => f.name === category)

      if (!categoryFilter) {
        console.log(`Creating ${category} under Men...`)
        categoryFilter = await createCustomFilter(session, category, [menFilter.id])
      } else {
        console.log(`${category} already exists under Men`)
      }

      // Create subcategories
      const existingSubcategories = await getChildFilters(session, categoryFilter.id)
      for (const subcategory of subcategories) {
        const exists = existingSubcategories.find(f => f.name === subcategory)
        if (!exists) {
          console.log(`  Creating ${subcategory} under ${category}...`)
          await createCustomFilter(session, subcategory, [categoryFilter.id])
        } else {
          console.log(`  ${subcategory} already exists under ${category}`)
        }
      }
    }

    // Create Women subcategories
    console.log('\n=== Creating Women subcategories ===')
    const womenChildren = await getChildFilters(session, womenFilter.id)
    for (const [category, subcategories] of Object.entries(womenCategories)) {
      // Check if category already exists
      let categoryFilter = womenChildren.find(f => f.name === category)

      if (!categoryFilter) {
        console.log(`Creating ${category} under Women...`)
        categoryFilter = await createCustomFilter(session, category, [womenFilter.id])
      } else {
        console.log(`${category} already exists under Women`)
      }

      // Create subcategories
      const existingSubcategories = await getChildFilters(session, categoryFilter.id)
      for (const subcategory of subcategories) {
        const exists = existingSubcategories.find(f => f.name === subcategory)
        if (!exists) {
          console.log(`  Creating ${subcategory} under ${category}...`)
          await createCustomFilter(session, subcategory, [categoryFilter.id])
        } else {
          console.log(`  ${subcategory} already exists under ${category}`)
        }
      }
    }

    console.log('\n✅ Category seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding categories:', error)
    throw error
  } finally {
    await session.close()
  }
}

seedCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
