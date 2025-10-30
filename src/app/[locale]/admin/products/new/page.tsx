import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import ProductFormClient from './ProductFormClient'

export default async function NewProductPage() {
  const adminAccess = await isAdmin()

  if (!adminAccess) {
    redirect('/login?redirect=/admin/products/new')
  }

  return <ProductFormClient />
}
