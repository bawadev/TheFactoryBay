import { Session } from 'neo4j-driver'

export interface CustomFilter {
  id: string
  name: string
  slug: string
  parentId: string | null
  level: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomFilterWithChildren extends CustomFilter {
  children: CustomFilterWithChildren[]
  productCount?: number
}

/**
 * Create a new custom filter with multiple parents
 */
export async function createCustomFilter(
  session: Session,
  name: string,
  parentIds: string[],
  isFeatured: boolean = false
): Promise<CustomFilter> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const id = `filter-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  // Calculate level based on maximum parent level + 1
  // If no parents, level = 0 (root level)
  let level = 0
  if (parentIds && parentIds.length > 0) {
    const parentResult = await session.run(
      'MATCH (p:CustomFilter) WHERE p.id IN $parentIds RETURN max(p.level) as maxLevel',
      { parentIds }
    )
    if (parentResult.records.length > 0) {
      const maxParentLevel = parentResult.records[0].get('maxLevel')
      level = (typeof maxParentLevel === 'number' ? maxParentLevel : maxParentLevel.toNumber()) + 1
    }
  }

  // Create the filter node
  const createQuery = `
    CREATE (f:CustomFilter {
      id: $id,
      name: $name,
      slug: $slug,
      level: $level,
      isActive: true,
      isFeatured: $isFeatured,
      createdAt: datetime().epochMillis,
      updatedAt: datetime().epochMillis
    })
    RETURN f
  `

  const createResult = await session.run(createQuery, { id, name, slug, level, isFeatured })
  const record = createResult.records[0]
  const node = record.get('f').properties

  // Create relationships to all parents
  // Note: For new filters, cycle validation is not needed since the filter
  // has no descendants yet. Cycles can only occur when updating existing filters.
  if (parentIds && parentIds.length > 0) {
    const relationshipQuery = `
      MATCH (f:CustomFilter {id: $filterId})
      UNWIND $parentIds as parentId
      MATCH (p:CustomFilter {id: parentId})
      CREATE (f)-[:CHILD_OF]->(p)
    `
    await session.run(relationshipQuery, { filterId: id, parentIds })
  }

  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: null, // Multiple parents, so this field is not used
    level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
    isActive: node.isActive,
    isFeatured: node.isFeatured || false,
    createdAt: node.createdAt.toString(),
    updatedAt: node.updatedAt.toString(),
  }
}

/**
 * Get all root filters (top-level, no parent)
 */
export async function getRootFilters(session: Session): Promise<CustomFilter[]> {
  const query = `
    MATCH (f:CustomFilter)
    WHERE NOT (f)-[:CHILD_OF]->()
    RETURN f
    ORDER BY f.name
  `

  const result = await session.run(query)
  return result.records.map((record) => {
    const node = record.get('f').properties
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: null,
      level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
      isActive: node.isActive,
      isFeatured: node.isFeatured || false,
      createdAt: node.createdAt.toString(),
      updatedAt: node.updatedAt.toString(),
    }
  })
}

/**
 * Get child filters of a parent filter
 */
export async function getChildFilters(
  session: Session,
  parentId: string
): Promise<CustomFilter[]> {
  const query = `
    MATCH (f:CustomFilter)-[:CHILD_OF]->(p:CustomFilter {id: $parentId})
    RETURN f, p.id as parentId
    ORDER BY f.name
  `

  const result = await session.run(query, { parentId })
  return result.records.map((record) => {
    const node = record.get('f').properties
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: record.get('parentId'),
      level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
      isActive: node.isActive,
      isFeatured: node.isFeatured || false,
      createdAt: node.createdAt.toString(),
      updatedAt: node.updatedAt.toString(),
    }
  })
}

/**
 * Get a filter by ID with its children (recursive)
 */
export async function getFilterWithChildren(
  session: Session,
  filterId: string
): Promise<CustomFilterWithChildren | null> {
  const query = `
    MATCH (f:CustomFilter {id: $filterId})
    OPTIONAL MATCH (f)<-[:CHILD_OF]-(parent:CustomFilter)
    RETURN f, parent.id as parentId
  `

  const result = await session.run(query, { filterId })
  if (result.records.length === 0) return null

  const record = result.records[0]
  const node = record.get('f').properties
  const parentId = record.get('parentId')

  const filter: CustomFilterWithChildren = {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: parentId,
    level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
    isActive: node.isActive,
    isFeatured: node.isFeatured || false,
    createdAt: node.createdAt.toString(),
    updatedAt: node.updatedAt.toString(),
    children: [],
  }

  // Get children recursively
  const children = await getChildFilters(session, filterId)
  filter.children = await Promise.all(
    children.map(async (child) => {
      const childWithChildren = await getFilterWithChildren(session, child.id)
      return childWithChildren!
    })
  )

  return filter
}

/**
 * Get all filters as a tree structure
 */
export async function getAllFiltersTree(session: Session): Promise<CustomFilterWithChildren[]> {
  // Get all filters in one query
  const allFilters = await getAllFilters(session)

  // Build a map for quick lookup
  const filterMap = new Map<string, CustomFilterWithChildren>()
  allFilters.forEach(filter => {
    filterMap.set(filter.id, {
      ...filter,
      children: []
    })
  })

  // Build the tree by linking parents and children
  const rootFilters: CustomFilterWithChildren[] = []
  allFilters.forEach(filter => {
    const filterWithChildren = filterMap.get(filter.id)!

    if (filter.parentId) {
      // This is a child filter
      const parent = filterMap.get(filter.parentId)
      if (parent) {
        parent.children.push(filterWithChildren)
      }
    } else {
      // This is a root filter
      rootFilters.push(filterWithChildren)
    }
  })

  return rootFilters
}

/**
 * Get all filters as a flat list
 */
export async function getAllFilters(session: Session): Promise<CustomFilter[]> {
  const query = `
    MATCH (f:CustomFilter)
    OPTIONAL MATCH (f)-[:CHILD_OF]->(p:CustomFilter)
    RETURN f, p.id as parentId
    ORDER BY f.level, f.name
  `

  const result = await session.run(query)
  return result.records.map((record) => {
    const node = record.get('f').properties
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: record.get('parentId'),
      level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
      isActive: node.isActive,
      isFeatured: node.isFeatured || false,
      createdAt: node.createdAt.toString(),
      updatedAt: node.updatedAt.toString(),
    }
  })
}

/**
 * Update a filter
 */
export async function updateCustomFilter(
  session: Session,
  filterId: string,
  name: string,
  isActive: boolean
): Promise<CustomFilter | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const query = `
    MATCH (f:CustomFilter {id: $filterId})
    SET f.name = $name,
        f.slug = $slug,
        f.isActive = $isActive,
        f.updatedAt = datetime().epochMillis
    OPTIONAL MATCH (f)-[:CHILD_OF]->(p:CustomFilter)
    RETURN f, p.id as parentId
  `

  const result = await session.run(query, { filterId, name, slug, isActive })
  if (result.records.length === 0) return null

  const record = result.records[0]
  const node = record.get('f').properties

  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: record.get('parentId'),
    level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
    isActive: node.isActive,
    isFeatured: node.isFeatured || false,
    createdAt: node.createdAt.toString(),
    updatedAt: node.updatedAt.toString(),
  }
}

/**
 * Update parent relationships for a filter with cycle validation
 */
export async function updateFilterParents(
  session: Session,
  filterId: string,
  newParentIds: string[]
): Promise<{ success: boolean; error?: string; conflictingParent?: { id: string; name: string } }> {
  // Validate no cycles would be created
  const validation = await validateNoCycles(session, filterId, newParentIds)
  if (!validation.valid) {
    return validation
  }

  // Remove all existing parent relationships
  await session.run(
    'MATCH (f:CustomFilter {id: $filterId})-[r:CHILD_OF]->() DELETE r',
    { filterId }
  )

  // Add new parent relationships
  if (newParentIds && newParentIds.length > 0) {
    const relationshipQuery = `
      MATCH (f:CustomFilter {id: $filterId})
      UNWIND $parentIds as parentId
      MATCH (p:CustomFilter {id: parentId})
      CREATE (f)-[:CHILD_OF]->(p)
    `
    await session.run(relationshipQuery, { filterId, parentIds: newParentIds })
  }

  // Recalculate level based on new parents
  let newLevel = 0
  if (newParentIds && newParentIds.length > 0) {
    const parentResult = await session.run(
      'MATCH (p:CustomFilter) WHERE p.id IN $parentIds RETURN max(p.level) as maxLevel',
      { parentIds: newParentIds }
    )
    if (parentResult.records.length > 0) {
      const maxParentLevel = parentResult.records[0].get('maxLevel')
      newLevel = (typeof maxParentLevel === 'number' ? maxParentLevel : maxParentLevel.toNumber()) + 1
    }
  }

  // Update the filter's level and updatedAt timestamp
  await session.run(
    `MATCH (f:CustomFilter {id: $filterId})
     SET f.level = $level, f.updatedAt = datetime().epochMillis`,
    { filterId, level: newLevel }
  )

  // Recursively update levels of all descendants
  await recalculateDescendantLevels(session, filterId)

  return { success: true }
}

/**
 * Recursively recalculate levels for all descendants of a filter
 */
async function recalculateDescendantLevels(
  session: Session,
  filterId: string
): Promise<void> {
  // Get all direct children
  const childIds = await session.run(
    'MATCH (child:CustomFilter)-[:CHILD_OF]->(parent:CustomFilter {id: $filterId}) RETURN child.id as childId',
    { filterId }
  )

  for (const record of childIds.records) {
    const childId = record.get('childId')

    // Get max level of this child's parents
    const parentResult = await session.run(
      `MATCH (child:CustomFilter {id: $childId})-[:CHILD_OF]->(parent:CustomFilter)
       RETURN max(parent.level) as maxLevel`,
      { childId }
    )

    if (parentResult.records.length > 0) {
      const maxParentLevel = parentResult.records[0].get('maxLevel')
      const newLevel = (typeof maxParentLevel === 'number' ? maxParentLevel : maxParentLevel.toNumber()) + 1

      // Update child's level
      await session.run(
        'MATCH (f:CustomFilter {id: $childId}) SET f.level = $level',
        { childId, level: newLevel }
      )

      // Recursively update this child's descendants
      await recalculateDescendantLevels(session, childId)
    }
  }
}

/**
 * Delete a filter (only if it has no children and no products)
 */
export async function deleteCustomFilter(
  session: Session,
  filterId: string
): Promise<{ success: boolean; error?: string }> {
  // Check if filter has children
  const childrenCheck = await session.run(
    'MATCH (f:CustomFilter {id: $filterId})<-[:CHILD_OF]-(child) RETURN count(child) as childCount',
    { filterId }
  )

  const childCountRaw = childrenCheck.records[0].get('childCount')
  const childCount = typeof childCountRaw === 'number' ? childCountRaw : childCountRaw.toNumber()
  if (childCount > 0) {
    return { success: false, error: 'Cannot delete filter with child filters' }
  }

  // Check if filter has products
  const productsCheck = await session.run(
    'MATCH (f:CustomFilter {id: $filterId})<-[:TAGGED_WITH]-(p:Product) RETURN count(p) as productCount',
    { filterId }
  )

  const productCountRaw = productsCheck.records[0].get('productCount')
  const productCount = typeof productCountRaw === 'number' ? productCountRaw : productCountRaw.toNumber()
  if (productCount > 0) {
    return { success: false, error: 'Cannot delete filter with tagged products' }
  }

  // Delete the filter
  await session.run(
    'MATCH (f:CustomFilter {id: $filterId}) DETACH DELETE f',
    { filterId }
  )

  return { success: true }
}

/**
 * Tag a product with filters
 */
export async function tagProductWithFilters(
  session: Session,
  productId: string,
  filterIds: string[]
): Promise<void> {
  // Remove existing tags
  await session.run(
    'MATCH (p:Product {id: $productId})-[r:TAGGED_WITH]->() DELETE r',
    { productId }
  )

  // Add new tags
  if (filterIds.length > 0) {
    const query = `
      MATCH (p:Product {id: $productId})
      UNWIND $filterIds as filterId
      MATCH (f:CustomFilter {id: filterId})
      CREATE (p)-[:TAGGED_WITH]->(f)
    `
    await session.run(query, { productId, filterIds })
  }
}

/**
 * Get filters for a product
 */
export async function getProductFilters(
  session: Session,
  productId: string
): Promise<CustomFilter[]> {
  const query = `
    MATCH (p:Product {id: $productId})-[:TAGGED_WITH]->(f:CustomFilter)
    OPTIONAL MATCH (f)-[:CHILD_OF]->(parent:CustomFilter)
    RETURN f, parent.id as parentId
    ORDER BY f.level, f.name
  `

  const result = await session.run(query, { productId })
  return result.records.map((record) => {
    const node = record.get('f').properties
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: record.get('parentId'),
      level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
      isActive: node.isActive,
      isFeatured: node.isFeatured || false,
      createdAt: node.createdAt.toString(),
      updatedAt: node.updatedAt.toString(),
    }
  })
}

/**
 * Get filter breadcrumb path (from root to filter)
 */
export async function getFilterBreadcrumb(
  session: Session,
  filterId: string
): Promise<CustomFilter[]> {
  const query = `
    MATCH path = (f:CustomFilter {id: $filterId})-[:CHILD_OF*0..]->(root:CustomFilter)
    WHERE NOT (root)-[:CHILD_OF]->()
    WITH nodes(path) as pathNodes
    UNWIND range(0, size(pathNodes)-1) as idx
    WITH pathNodes[idx] as node, idx
    ORDER BY idx DESC
    RETURN node
  `

  const result = await session.run(query, { filterId })
  return result.records.map((record) => {
    const node = record.get('node').properties
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: null, // Not needed for breadcrumb display
      level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
      isActive: node.isActive,
      isFeatured: node.isFeatured || false,
      createdAt: node.createdAt.toString(),
      updatedAt: node.updatedAt.toString(),
    }
  })
}

/**
 * Get breadcrumbs for multiple filters
 */
export async function getFiltersBreadcrumbs(
  session: Session,
  filterIds: string[]
): Promise<Map<string, CustomFilter[]>> {
  const breadcrumbs = new Map<string, CustomFilter[]>()

  for (const filterId of filterIds) {
    const breadcrumb = await getFilterBreadcrumb(session, filterId)
    breadcrumbs.set(filterId, breadcrumb)
  }

  return breadcrumbs
}

/**
 * Get products by filter (including child filters)
 */
export async function getProductsByFilter(
  session: Session,
  filterId: string,
  includeChildren: boolean = true
): Promise<string[]> {
  let query = ''

  if (includeChildren) {
    query = `
      MATCH (f:CustomFilter {id: $filterId})
      MATCH path = (f)<-[:CHILD_OF*0..]-(descendant:CustomFilter)
      MATCH (p:Product)-[:TAGGED_WITH]->(descendant)
      RETURN DISTINCT p.id as productId
    `
  } else {
    query = `
      MATCH (p:Product)-[:TAGGED_WITH]->(f:CustomFilter {id: $filterId})
      RETURN p.id as productId
    `
  }

  const result = await session.run(query, { filterId })
  return result.records.map((record) => record.get('productId'))
}

/**
 * Get all direct parent filter IDs for a given filter (for auto-select logic)
 */
export async function getAllParentFilterIds(
  session: Session,
  filterId: string
): Promise<string[]> {
  const query = `
    MATCH (f:CustomFilter {id: $filterId})-[:CHILD_OF]->(parent:CustomFilter)
    RETURN DISTINCT parent.id as parentId
  `

  const result = await session.run(query, { filterId })
  return result.records.map((record) => record.get('parentId'))
}

/**
 * Get all child filter IDs recursively for a given filter (for auto-deselect logic)
 */
export async function getAllChildFilterIds(
  session: Session,
  filterId: string
): Promise<string[]> {
  const query = `
    MATCH path = (f:CustomFilter {id: $filterId})<-[:CHILD_OF*1..]-(child:CustomFilter)
    RETURN DISTINCT child.id as childId
  `

  const result = await session.run(query, { filterId })
  return result.records.map((record) => record.get('childId'))
}

/**
 * Get all ancestor filter IDs recursively for a given filter
 */
export async function getAllAncestorFilterIds(
  session: Session,
  filterId: string
): Promise<string[]> {
  const query = `
    MATCH path = (f:CustomFilter {id: $filterId})-[:CHILD_OF*1..]->(ancestor:CustomFilter)
    RETURN DISTINCT ancestor.id as ancestorId
  `

  const result = await session.run(query, { filterId })
  return result.records.map((record) => record.get('ancestorId'))
}

/**
 * Validate that adding parentIds to childId won't create cycles
 * Returns an object with validation result and detailed error information
 */
export async function validateNoCycles(
  session: Session,
  childId: string,
  parentIds: string[]
): Promise<{ valid: boolean; error?: string; conflictingParent?: { id: string; name: string } }> {
  if (!parentIds || parentIds.length === 0) {
    return { valid: true }
  }

  // Get the child filter's name for error messages
  const childResult = await session.run(
    'MATCH (f:CustomFilter {id: $childId}) RETURN f.name as name',
    { childId }
  )

  if (childResult.records.length === 0) {
    return { valid: false, error: 'Child filter not found' }
  }

  const childName = childResult.records[0].get('name')

  // Check each proposed parent
  for (const parentId of parentIds) {
    // Get the parent filter's name
    const parentResult = await session.run(
      'MATCH (f:CustomFilter {id: $parentId}) RETURN f.name as name',
      { parentId }
    )

    if (parentResult.records.length === 0) {
      return { valid: false, error: `Parent filter with id ${parentId} not found` }
    }

    const parentName = parentResult.records[0].get('name')

    // Check if proposed parent is a descendant of child (would create cycle)
    // This checks: child <- ... <- proposedParent, which would become a cycle
    // when we add: child -> proposedParent
    const cycleCheckQuery = `
      MATCH (child:CustomFilter {id: $childId})
      MATCH (proposedParent:CustomFilter {id: $parentId})
      OPTIONAL MATCH path = (proposedParent)-[:CHILD_OF*1..]->(child)
      RETURN path IS NOT NULL as wouldCreateCycle
    `

    const cycleResult = await session.run(cycleCheckQuery, { childId, parentId })
    const wouldCreateCycle = cycleResult.records[0].get('wouldCreateCycle')

    if (wouldCreateCycle) {
      return {
        valid: false,
        error: `Cannot add "${parentName}" as parent of "${childName}" because "${childName}" is already an ancestor of "${parentName}"`,
        conflictingParent: { id: parentId, name: parentName }
      }
    }

    // Also check if the parent is the child itself (direct self-reference)
    if (childId === parentId) {
      return {
        valid: false,
        error: `Cannot add "${childName}" as its own parent`,
        conflictingParent: { id: parentId, name: parentName }
      }
    }
  }

  return { valid: true }
}

/**
 * Update the featured status of a filter
 */
export async function updateFilterFeaturedStatus(
  session: Session,
  filterId: string,
  isFeatured: boolean
): Promise<CustomFilter | null> {
  const query = `
    MATCH (f:CustomFilter {id: $filterId})
    SET f.isFeatured = $isFeatured,
        f.updatedAt = datetime().epochMillis
    OPTIONAL MATCH (f)-[:CHILD_OF]->(p:CustomFilter)
    RETURN f, p.id as parentId
  `

  const result = await session.run(query, { filterId, isFeatured })
  if (result.records.length === 0) return null

  const record = result.records[0]
  const node = record.get('f').properties

  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: record.get('parentId'),
    level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
    isActive: node.isActive,
    isFeatured: node.isFeatured || false,
    createdAt: node.createdAt.toString(),
    updatedAt: node.updatedAt.toString(),
  }
}

/**
 * Get all featured filters (active only)
 */
export async function getFeaturedFilters(session: Session): Promise<CustomFilter[]> {
  const query = `
    MATCH (f:CustomFilter)
    WHERE f.isFeatured = true AND f.isActive = true
    OPTIONAL MATCH (f)-[:CHILD_OF]->(p:CustomFilter)
    RETURN f, p.id as parentId
    ORDER BY f.level, f.name
  `

  const result = await session.run(query)
  return result.records.map((record) => {
    const node = record.get('f').properties
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: record.get('parentId'),
      level: typeof node.level === 'number' ? node.level : node.level.toNumber(),
      isActive: node.isActive,
      isFeatured: node.isFeatured || false,
      createdAt: node.createdAt.toString(),
      updatedAt: node.updatedAt.toString(),
    }
  })
}

/**
 * Get product count for a single filter
 */
export async function getProductCountByFilter(
  session: Session,
  filterId: string,
  includeChildren: boolean = true
): Promise<number> {
  let query = ''

  if (includeChildren) {
    query = `
      MATCH (f:CustomFilter {id: $filterId})
      MATCH path = (f)<-[:CHILD_OF*0..]-(descendant:CustomFilter)
      MATCH (p:Product)-[:TAGGED_WITH]->(descendant)
      RETURN count(DISTINCT p) as productCount
    `
  } else {
    query = `
      MATCH (p:Product)-[:TAGGED_WITH]->(f:CustomFilter {id: $filterId})
      RETURN count(p) as productCount
    `
  }

  const result = await session.run(query, { filterId })
  const countRaw = result.records[0]?.get('productCount')
  return typeof countRaw === 'number' ? countRaw : countRaw?.toNumber() || 0
}

/**
 * Get product counts for multiple filters (batch query for efficiency)
 */
export async function getProductCountsForFilters(
  session: Session,
  filterIds: string[]
): Promise<Map<string, number>> {
  if (filterIds.length === 0) {
    return new Map()
  }

  const query = `
    UNWIND $filterIds as filterId
    MATCH (f:CustomFilter {id: filterId})
    MATCH path = (f)<-[:CHILD_OF*0..]-(descendant:CustomFilter)
    MATCH (p:Product)-[:TAGGED_WITH]->(descendant)
    WITH filterId, count(DISTINCT p) as productCount
    RETURN filterId, productCount
  `

  const result = await session.run(query, { filterIds })
  const countsMap = new Map<string, number>()

  result.records.forEach((record) => {
    const filterId = record.get('filterId')
    const countRaw = record.get('productCount')
    const count = typeof countRaw === 'number' ? countRaw : countRaw.toNumber()
    countsMap.set(filterId, count)
  })

  // Ensure all filterIds have a count (even if 0)
  filterIds.forEach(id => {
    if (!countsMap.has(id)) {
      countsMap.set(id, 0)
    }
  })

  return countsMap
}
