import { getCurrentUser } from '@/lib/auth'
import { getPersonalizedRecommendationsAction, getRecentlyViewedProductsAction } from '@/app/actions/user-profile'
import { getNewArrivals } from '@/lib/repositories/recommendation.repository'
import { getAllPromotionalCategoriesAction, getProductsByCategoryAction } from '@/app/actions/promotional-categories'
import HomePageClientProgressive from './HomePageClientProgressive'

export default async function HomePage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser()

  // Fetch data in parallel
  const [recommendationsResult, recentlyViewedResult, newArrivals, promoCategoriesResult] = await Promise.all([
    user ? getPersonalizedRecommendationsAction() : Promise.resolve({ success: true, data: { products: [] } }),
    user ? getRecentlyViewedProductsAction() : Promise.resolve({ success: true, data: { products: [] } }),
    getNewArrivals(8),
    getAllPromotionalCategoriesAction(true), // Only active categories
  ])

  const recommendations = recommendationsResult.data?.products || []
  const recentlyViewed = recentlyViewedResult.data?.products || []
  const promoCategories = promoCategoriesResult.data || []

  // Fetch products for each promotional category
  const promotionalCategoriesWithProducts = await Promise.all(
    promoCategories.map(async (category) => {
      const productsResult = await getProductsByCategoryAction(category.id, 8)
      return {
        category,
        products: productsResult.data || [],
      }
    })
  )

  return (
    <HomePageClientProgressive
      isAuthenticated={!!user}
      recommendations={recommendations}
      recentlyViewed={recentlyViewed}
      newArrivals={newArrivals}
      promotionalCategories={promotionalCategoriesWithProducts}
    />
  )
}
