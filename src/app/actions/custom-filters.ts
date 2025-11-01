'use server'

import { getSession } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import * as filterRepo from '@/lib/repositories/custom-filter.repository'

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
    const breadcrumbsObj: Record<string, typeof filterRepo.CustomFilter[]> = {}
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
      MATCH (p:Product)-[:TAGGED_WITH]->(f:CustomFilter)
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
