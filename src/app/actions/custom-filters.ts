'use server'

import { getSession } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import * as filterRepo from '@/lib/repositories/custom-filter.repository'
import type { CustomFilter } from '@/lib/repositories/custom-filter.repository'

/**
 * Create a new custom filter with multiple parents
 */
export async function createCustomFilterAction(
  name: string,
  parentIds: string[] = []
) {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    const filter = await filterRepo.createCustomFilter(session, name, parentIds)
    return { success: true, data: filter }
  } catch (error) {
    console.error('Error creating custom filter:', error)
    return { success: false, error: 'Failed to create filter' }
  } finally {
    await session.close()
  }
}

/**
 * Get all root filters (top-level)
 */
export async function getRootFiltersAction() {
  const session = getSession()

  try {
    const filters = await filterRepo.getRootFilters(session)
    return { success: true, data: filters }
  } catch (error) {
    console.error('Error fetching root filters:', error)
    return { success: false, error: 'Failed to fetch filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get child filters of a parent
 */
export async function getChildFiltersAction(parentId: string) {
  const session = getSession()

  try {
    const filters = await filterRepo.getChildFilters(session, parentId)
    return { success: true, data: filters }
  } catch (error) {
    console.error('Error fetching child filters:', error)
    return { success: false, error: 'Failed to fetch child filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get all filters as a tree
 */
export async function getAllFiltersTreeAction() {
  const session = getSession()

  try {
    const tree = await filterRepo.getAllFiltersTree(session)
    return { success: true, data: tree }
  } catch (error) {
    console.error('Error fetching filters tree:', error)
    return { success: false, error: 'Failed to fetch filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get all filters as flat list
 */
export async function getAllFiltersAction() {
  const session = getSession()

  try {
    const filters = await filterRepo.getAllFilters(session)
    return { success: true, data: filters }
  } catch (error) {
    console.error('Error fetching filters:', error)
    return { success: false, error: 'Failed to fetch filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get all filters with all their parent IDs (for multi-parent support)
 */
export async function getAllFiltersWithParentsAction() {
  const session = getSession()

  try {
    const filters = await filterRepo.getAllFiltersWithParents(session)
    return { success: true, data: filters }
  } catch (error) {
    console.error('Error fetching filters with parents:', error)
    return { success: false, error: 'Failed to fetch filters' }
  } finally {
    await session.close()
  }
}

/**
 * Update a filter
 */
export async function updateCustomFilterAction(
  filterId: string,
  name: string,
  isActive: boolean
) {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    const filter = await filterRepo.updateCustomFilter(session, filterId, name, isActive)
    if (!filter) {
      return { success: false, error: 'Filter not found' }
    }

    return { success: true, data: filter }
  } catch (error) {
    console.error('Error updating filter:', error)
    return { success: false, error: 'Failed to update filter' }
  } finally {
    await session.close()
  }
}

/**
 * Delete a filter
 */
export async function deleteCustomFilterAction(filterId: string) {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await filterRepo.deleteCustomFilter(session, filterId)
    return result
  } catch (error) {
    console.error('Error deleting filter:', error)
    return { success: false, error: 'Failed to delete filter' }
  } finally {
    await session.close()
  }
}

/**
 * Tag a product with filters
 */
export async function tagProductWithFiltersAction(
  productId: string,
  filterIds: string[]
) {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    await filterRepo.tagProductWithFilters(session, productId, filterIds)
    return { success: true }
  } catch (error) {
    console.error('Error tagging product:', error)
    return { success: false, error: 'Failed to tag product' }
  } finally {
    await session.close()
  }
}

/**
 * Get filters for a product
 */
export async function getProductFiltersAction(productId: string) {
  const session = getSession()

  try {
    const filters = await filterRepo.getProductFilters(session, productId)
    return { success: true, data: filters }
  } catch (error) {
    console.error('Error fetching product filters:', error)
    return { success: false, error: 'Failed to fetch product filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get products by filter
 */
export async function getProductsByFilterAction(
  filterId: string,
  includeChildren: boolean = true
) {
  const session = getSession()

  try {
    const productIds = await filterRepo.getProductsByFilter(session, filterId, includeChildren)
    return { success: true, data: productIds }
  } catch (error) {
    console.error('Error fetching products by filter:', error)
    return { success: false, error: 'Failed to fetch products' }
  } finally {
    await session.close()
  }
}

/**
 * Get breadcrumbs for multiple filters
 */
export async function getFiltersBreadcrumbsAction(filterIds: string[]) {
  const session = getSession()

  try {
    const breadcrumbs = await filterRepo.getFiltersBreadcrumbs(session, filterIds)
    // Convert Map to object for serialization
    const breadcrumbsObj: Record<string, CustomFilter[]> = {}
    breadcrumbs.forEach((value, key) => {
      breadcrumbsObj[key] = value
    })
    return { success: true, data: breadcrumbsObj }
  } catch (error) {
    console.error('Error fetching filter breadcrumbs:', error)
    return { success: false, error: 'Failed to fetch breadcrumbs' }
  } finally {
    await session.close()
  }
}

/**
 * Get all parent filter IDs for a given filter
 */
export async function getAllParentFilterIdsAction(filterId: string) {
  const session = getSession()

  try {
    const parentIds = await filterRepo.getAllParentFilterIds(session, filterId)
    return { success: true, data: parentIds }
  } catch (error) {
    console.error('Error fetching parent filter IDs:', error)
    return { success: false, error: 'Failed to fetch parent filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get all child filter IDs recursively for a given filter
 */
export async function getAllChildFilterIdsAction(filterId: string) {
  const session = getSession()

  try {
    const childIds = await filterRepo.getAllChildFilterIds(session, filterId)
    return { success: true, data: childIds }
  } catch (error) {
    console.error('Error fetching child filter IDs:', error)
    return { success: false, error: 'Failed to fetch child filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get products by multiple filter IDs
 */
export async function getProductsByFiltersAction(filterIds: string[]) {
  const session = getSession()

  try {
    if (filterIds.length === 0) {
      return { success: true, data: [] }
    }

    // Get products that match ANY of the selected filters
    const query = `
      MATCH (p:Product)-[:HAS_FILTER]->(f:CustomFilter)
      WHERE f.id IN $filterIds
      RETURN DISTINCT p.id as productId
    `

    const result = await session.run(query, { filterIds })
    const productIds = result.records.map((record) => record.get('productId'))

    return { success: true, data: productIds }
  } catch (error) {
    console.error('Error fetching products by filters:', error)
    return { success: false, error: 'Failed to fetch products' }
  } finally {
    await session.close()
  }
}

/**
 * Get full product details by multiple filter IDs (includes descendants)
 */
export async function getFullProductsByFiltersAction(filterIds: string[]) {
  const session = getSession()

  try {
    if (filterIds.length === 0) {
      return { success: true, data: [] }
    }

    // Get products with their variants that match ANY of the selected filters
    // OR their descendant filters (to support parent filter selection)
    const query = `
      MATCH (f:CustomFilter)
      WHERE f.id IN $filterIds
      WITH f
      // Get all descendants of selected filters (0 or more levels deep)
      OPTIONAL MATCH (descendant:CustomFilter)-[:CHILD_OF*0..]->(f)
      WITH collect(DISTINCT descendant.id) + collect(DISTINCT f.id) as allFilterIds
      UNWIND allFilterIds as filterId
      // Get products that match any of these filters
      MATCH (p:Product)-[:HAS_FILTER]->(filter:CustomFilter {id: filterId})
      WITH DISTINCT p
      OPTIONAL MATCH (v:ProductVariant)-[:VARIANT_OF]->(p)
      WITH p, collect(v {.*}) as variants
      RETURN p {.*, variants: variants}
      ORDER BY p.createdAt DESC
      LIMIT 50
    `

    const result = await session.run(query, { filterIds })
    const products = result.records.map((record) => record.get('p'))

    return { success: true, data: products }
  } catch (error) {
    console.error('Error fetching full products by filters:', error)
    return { success: false, error: 'Failed to fetch products' }
  } finally {
    await session.close()
  }
}

/**
 * Get all ancestor filter IDs for a given filter
 */
export async function getAllAncestorFilterIdsAction(filterId: string) {
  const session = getSession()

  try {
    const ancestorIds = await filterRepo.getAllAncestorFilterIds(session, filterId)
    return { success: true, data: ancestorIds }
  } catch (error) {
    console.error('Error fetching ancestor filter IDs:', error)
    return { success: false, error: 'Failed to fetch ancestor filters' }
  } finally {
    await session.close()
  }
}

/**
 * Validate that adding parentIds to a filter won't create cycles
 */
export async function validateNoCyclesAction(
  filterId: string,
  parentIds: string[]
) {
  const session = getSession()

  try {
    const validation = await filterRepo.validateNoCycles(session, filterId, parentIds)
    return { success: true, data: validation }
  } catch (error) {
    console.error('Error validating cycles:', error)
    return { success: false, error: 'Failed to validate cycles' }
  } finally {
    await session.close()
  }
}

/**
 * Update parent relationships for a filter with cycle validation
 */
export async function updateFilterParentsAction(
  filterId: string,
  newParentIds: string[]
) {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await filterRepo.updateFilterParents(session, filterId, newParentIds)
    return result
  } catch (error) {
    console.error('Error updating filter parents:', error)
    return { success: false, error: 'Failed to update filter parents' }
  } finally {
    await session.close()
  }
}

/**
 * Update filter featured status
 */
export async function updateFilterFeaturedStatusAction(
  filterId: string,
  isFeatured: boolean
) {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    const filter = await filterRepo.updateFilterFeaturedStatus(session, filterId, isFeatured)
    if (!filter) {
      return { success: false, error: 'Filter not found' }
    }

    return { success: true, data: filter }
  } catch (error) {
    console.error('Error updating filter featured status:', error)
    return { success: false, error: 'Failed to update featured status' }
  } finally {
    await session.close()
  }
}

/**
 * Get featured filters (active only)
 */
export async function getFeaturedFiltersAction() {
  const session = getSession()

  try {
    const filters = await filterRepo.getFeaturedFilters(session)
    return { success: true, data: filters }
  } catch (error) {
    console.error('Error fetching featured filters:', error)
    return { success: false, error: 'Failed to fetch featured filters' }
  } finally {
    await session.close()
  }
}

/**
 * Get product counts for multiple filters
 */
export async function getProductCountsForFiltersAction(filterIds: string[]) {
  const session = getSession()

  try {
    const countsMap = await filterRepo.getProductCountsForFilters(session, filterIds)
    // Convert Map to object for serialization
    const countsObj: Record<string, number> = {}
    countsMap.forEach((count, id) => {
      countsObj[id] = count
    })
    return { success: true, data: countsObj }
  } catch (error) {
    console.error('Error fetching product counts:', error)
    return { success: false, error: 'Failed to fetch product counts' }
  } finally {
    await session.close()
  }
}

/**
 * Get product count for a single filter
 */
export async function getProductCountByFilterAction(
  filterId: string,
  includeChildren: boolean = true
) {
  const session = getSession()

  try {
    const count = await filterRepo.getProductCountByFilter(session, filterId, includeChildren)
    return { success: true, data: count }
  } catch (error) {
    console.error('Error fetching product count:', error)
    return { success: false, error: 'Failed to fetch product count' }
  } finally {
    await session.close()
  }
}

/**
 * Validate filter hierarchy for cycles and level consistency
 */
export async function validateFilterHierarchyAction() {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    const issues: Array<{
      filterId: string
      filterName: string
      severity: 'error' | 'warning'
      message: string
    }> = []

    // Get all filters with their parent relationships
    const allFilters = await filterRepo.getAllFiltersWithParents(session)
    const totalFilters = allFilters.length

    // Check for cycles
    for (const filter of allFilters) {
      if (filter.parentIds && filter.parentIds.length > 0) {
        for (const parentId of filter.parentIds) {
          // Check if this parent is a descendant of the current filter
          const cycleCheckQuery = `
            MATCH (child:CustomFilter {id: $childId})
            MATCH (parent:CustomFilter {id: $parentId})
            OPTIONAL MATCH path = (parent)-[:CHILD_OF*1..]->(child)
            RETURN path IS NOT NULL as hasCycle
          `
          const result = await session.run(cycleCheckQuery, {
            childId: filter.id,
            parentId,
          })

          if (result.records[0]?.get('hasCycle')) {
            issues.push({
              filterId: filter.id,
              filterName: filter.name,
              severity: 'error',
              message: `Circular reference detected with parent filter`,
            })
          }
        }
      }
    }

    // Check for level consistency
    for (const filter of allFilters) {
      if (filter.parentIds && filter.parentIds.length > 0) {
        // Get max parent level
        const parentLevelsQuery = `
          MATCH (f:CustomFilter {id: $filterId})-[:CHILD_OF]->(p:CustomFilter)
          RETURN max(p.level) as maxParentLevel
        `
        const result = await session.run(parentLevelsQuery, { filterId: filter.id })
        const maxParentLevelRaw = result.records[0]?.get('maxParentLevel')
        const maxParentLevel = typeof maxParentLevelRaw === 'number'
          ? maxParentLevelRaw
          : maxParentLevelRaw?.toNumber()

        const expectedLevel = (maxParentLevel ?? -1) + 1

        if (filter.level !== expectedLevel) {
          issues.push({
            filterId: filter.id,
            filterName: filter.name,
            severity: 'warning',
            message: `Level mismatch: has level ${filter.level} but should be ${expectedLevel}`,
          })
        }
      } else {
        // Root filter should have level 0
        if (filter.level !== 0) {
          issues.push({
            filterId: filter.id,
            filterName: filter.name,
            severity: 'warning',
            message: `Root filter should have level 0 but has level ${filter.level}`,
          })
        }
      }
    }

    return {
      success: true,
      data: {
        valid: issues.length === 0,
        issues,
        totalFilters,
        checkedCount: totalFilters,
      },
    }
  } catch (error) {
    console.error('Error validating filter hierarchy:', error)
    return { success: false, error: 'Failed to validate hierarchy' }
  } finally {
    await session.close()
  }
}

/**
 * Recalculate all filter levels based on parent relationships
 */
export async function recalculateFilterLevelsAction() {
  const session = getSession()

  try {
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    // Start with root filters (no parents) and set their level to 0
    await session.run(`
      MATCH (f:CustomFilter)
      WHERE NOT (f)-[:CHILD_OF]->()
      SET f.level = 0
    `)

    // Iteratively update levels for filters based on their parents
    // Continue until no more updates are made
    let updated = true
    let iterations = 0
    const maxIterations = 100 // Prevent infinite loops

    while (updated && iterations < maxIterations) {
      const result = await session.run(`
        MATCH (f:CustomFilter)-[:CHILD_OF]->(p:CustomFilter)
        WITH f, max(p.level) as maxParentLevel
        WHERE f.level <> maxParentLevel + 1
        SET f.level = maxParentLevel + 1
        RETURN count(f) as updatedCount
      `)

      const updatedCountRaw = result.records[0]?.get('updatedCount')
      const updatedCount = typeof updatedCountRaw === 'number'
        ? updatedCountRaw
        : updatedCountRaw?.toNumber()

      updated = updatedCount > 0
      iterations++
    }

    return {
      success: true,
      data: {
        message: `Recalculated levels in ${iterations} iteration${iterations !== 1 ? 's' : ''}`
      }
    }
  } catch (error) {
    console.error('Error recalculating filter levels:', error)
    return { success: false, error: 'Failed to recalculate levels' }
  } finally {
    await session.close()
  }
}
