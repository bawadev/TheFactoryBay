import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUserPreferencesAction, getUserMeasurementsAction } from '@/app/actions/user-profile'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile')
  }

  const [preferencesResult, measurementsResult] = await Promise.all([
    getUserPreferencesAction(),
    getUserMeasurementsAction(),
  ])

  return (
    <ProfileClient
      user={user}
      initialPreferences={preferencesResult.data?.preferences || null}
      initialMeasurements={measurementsResult.data?.measurements || null}
    />
  )
}
