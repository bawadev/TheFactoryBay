import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { getLocale } from 'next-intl/server'
import { getAllFiltersTreeAction } from '@/app/actions/custom-filters'
import CustomFiltersClient from './CustomFiltersClient'

export default async function CustomFiltersPage() {
  const adminAccess = await isAdmin()
  const locale = await getLocale()

  if (!adminAccess) {
    redirect(`/${locale}/login?redirect=/${locale}/admin/filters`)
  }

  const result = await getAllFiltersTreeAction()
  const filters = result.data || []

  return <CustomFiltersClient initialFilters={filters} />
}
