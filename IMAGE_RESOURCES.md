# Image Resources for Factory Bay

## Placeholder Image Sources

### Primary Source: Unsplash
Base URL: https://unsplash.com

**Fashion Clothing Search:**
- https://unsplash.com/s/photos/fashion-clothing
- Free to use, high-quality images
- 60k+ photos available

**Specific Categories:**
- Men's Fashion: https://unsplash.com/s/photos/mens-fashion
- Women's Fashion: https://unsplash.com/s/photos/womens-fashion
- Jackets: https://unsplash.com/s/photos/jacket
- Shirts: https://unsplash.com/s/photos/shirt
- Pants: https://unsplash.com/s/photos/pants
- Dresses: https://unsplash.com/s/photos/dress
- Shoes: https://unsplash.com/s/photos/shoes
- Accessories: https://unsplash.com/s/photos/fashion-accessories

### Sample Images for Initial Development

**Product Images (Clothing on Hangers/Racks):**
1. `/photos/a-rack-of-clothes-and-hats-in-a-room-_a_FlMKo4Lk`
2. `/photos/hanged-top-on-brown-and-white-clothes-horse-TS--uNw-JqE`
3. `/photos/a-pair-of-black-boots-and-a-pink-jacket-hanging-on-a-clothes-rack-zEIcgD9ByFQ`
4. `/photos/assorted-clothes-in-wooden-hangers-dlxLGIy-2VU`

**Lifestyle/Model Photos:**
1. `/photos/woman-in-yellow-tracksuit-standing-on-basketball-court-side-nimElTcTNyY`
2. `/photos/woman-holding-dried-flower-K0DxxljcRv0`
3. `/photos/man-in-black-suit-jacket-PKMvkg7vnUo`
4. `/photos/posing-woman-in-white-sleeveless-top-tiWcNvpQF4E`

**Shopping/E-commerce:**
1. `/photos/photo-of-woman-holding-white-and-black-paper-bags-_3Q3tsJ01nc`
2. `/photos/two-happy-girlfriends-feeling-satisfied-with-purchases-standing-together-with-shopping-bags-in-front-of-the-shopping-mall-outdoors-AuV0cNNpCs4`

**Accessories:**
1. `/photos/womens-sunglasses-and-black-bag-with-watch-and-iphone-6-D4jRahaUaIc`

### Alternative Sources
- **Pexels**: https://www.pexels.com/search/fashion/
- **Pixabay**: https://pixabay.com/images/search/fashion/
- **Lorem Picsum**: https://picsum.photos/ (for placeholder images during development)

## Implementation Strategy

### Development Phase
1. Use Lorem Picsum for initial wireframes: `https://picsum.photos/600/800?random=1`
2. Download specific Unsplash images for demo products
3. Store locally in `/public/images/products/`

### Production Migration Path
1. Integrate Unsplash API for dynamic image loading
2. Move to Cloudinary or AWS S3 for:
   - Better performance (CDN)
   - Image optimization/transformation
   - Upload functionality for admin panel

## Image Naming Convention
```
/public/images/
  /products/
    /mens/
      product-{id}-{variant}-{index}.jpg
    /womens/
      product-{id}-{variant}-{index}.jpg
    /accessories/
      product-{id}-{variant}-{index}.jpg
  /categories/
    category-{name}-hero.jpg
  /banners/
    hero-{name}.jpg
  /placeholders/
    placeholder-product.jpg
    placeholder-avatar.jpg
```

## Image Optimization Settings
- Format: WebP with JPG fallback
- Quality: 85% for products, 90% for heroes
- Lazy loading: All images except above-fold
- Next.js Image component: Always use for automatic optimization

## Sample Product Data (For Initial Seeding)
When creating initial products, we'll use these Unsplash images and assign them to demo products like:
- Classic Navy Blazer (men)
- Yellow Athletic Track Suit (women)
- White Summer Tank Top (women)
- Black Formal Suit (men)
- Minimalist Accessories Collection
