import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { getAdminProductAction } from '@/app/actions/admin-products'
import ProductEditClient from './ProductEditClient'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    redirect('/login?redirect=/admin/products')
  }

  const { id } = await params
  const result = await getAdminProductAction(id)

  if (!result.success || !result.data) {
    redirect('/admin/products')
  }

  return <ProductEditClient product={result.data.product} />
}
