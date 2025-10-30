import { getCurrentUser } from '@/lib/auth'
import { getPersonalizedRecommendationsAction, getRecentlyViewedProductsAction } from '@/app/actions/user-profile'
import { getNewArrivals } from '@/lib/repositories/recommendation.repository'
import HomePageClient from './HomePageClient'

export default async function HomePage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser()

  // Fetch data in parallel
  const [recommendationsResult, recentlyViewedResult, newArrivals] = await Promise.all([
    user ? getPersonalizedRecommendationsAction() : Promise.resolve({ success: true, data: { products: [] } }),
    user ? getRecentlyViewedProductsAction() : Promise.resolve({ success: true, data: { products: [] } }),
    getNewArrivals(8),
  ])

  const recommendations = recommendationsResult.data?.products || []
  const recentlyViewed = recentlyViewedResult.data?.products || []

  return (
    <HomePageClient
      isAuthenticated={!!user}
      recommendations={recommendations}
      recentlyViewed={recentlyViewed}
      newArrivals={newArrivals}
    />
  )
}
