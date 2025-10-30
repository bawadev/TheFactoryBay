# Factory Bay - Style Guide & Design System

## Design Philosophy
Factory Bay embodies modern minimalism with a focus on product photography and clean typography. The design is mobile-first, with smooth animations and micro-interactions that delight users without overwhelming them.

## Color Palette

### Primary Colors
```
Navy Blue (Primary)
- navy-950: #0a1628  // Darkest, for text
- navy-900: #0f2540
- navy-800: #1a3a5c
- navy-700: #234e78
- navy-600: #2d6394  // Main brand color
- navy-500: #4285b8
- navy-400: #6ba3d0
- navy-300: #95c1e3
- navy-200: #c4dff0
- navy-100: #e8f3fb
- navy-50:  #f5f9fd   // Lightest, for backgrounds
```

### Accent Colors
```
Gold (Accent - for "stock price" highlights)
- gold-600: #d4af37  // Main gold
- gold-500: #e5c158
- gold-400: #f0d77a
- gold-300: #f7e6a9
- gold-100: #fdf7e3

Coral (CTA - Call to Action)
- coral-600: #ff6b6b
- coral-500: #ff8787
- coral-400: #ffa5a5
- coral-300: #ffc4c4
- coral-100: #ffe9e9
```

### Neutral Colors
```
Grays
- gray-950: #0a0a0b  // Pure black replacement
- gray-900: #18181b
- gray-800: #27272a
- gray-700: #3f3f46
- gray-600: #52525b
- gray-500: #71717a
- gray-400: #a1a1aa
- gray-300: #d4d4d8
- gray-200: #e4e4e7
- gray-100: #f4f4f5
- gray-50:  #fafafa

White
- white: #ffffff
```

### Semantic Colors
```
Success: #10b981  // emerald-500
Warning: #f59e0b  // amber-500
Error:   #ef4444  // red-500
Info:    #3b82f6  // blue-500
```

## Typography

### Font Families
```
Primary (Headings & UI): 'Inter', system-ui, sans-serif
Secondary (Body): 'Inter', system-ui, sans-serif
Monospace (Code/Numbers): 'JetBrains Mono', monospace
```

### Font Scales
```
// Display (Hero sections)
display-xl:   font-size: 4.5rem (72px),  line-height: 1.1,  letter-spacing: -0.02em, font-weight: 700
display-lg:   font-size: 3.75rem (60px), line-height: 1.1,  letter-spacing: -0.02em, font-weight: 700
display-md:   font-size: 3rem (48px),    line-height: 1.2,  letter-spacing: -0.01em, font-weight: 700

// Headings
h1:           font-size: 2.25rem (36px), line-height: 1.2,  letter-spacing: -0.01em, font-weight: 700
h2:           font-size: 1.875rem (30px), line-height: 1.3, letter-spacing: -0.01em, font-weight: 600
h3:           font-size: 1.5rem (24px),  line-height: 1.4,  letter-spacing: 0,       font-weight: 600
h4:           font-size: 1.25rem (20px), line-height: 1.4,  letter-spacing: 0,       font-weight: 600
h5:           font-size: 1.125rem (18px), line-height: 1.5, letter-spacing: 0,       font-weight: 600
h6:           font-size: 1rem (16px),    line-height: 1.5,  letter-spacing: 0,       font-weight: 600

// Body
body-xl:      font-size: 1.25rem (20px), line-height: 1.7,  letter-spacing: 0,       font-weight: 400
body-lg:      font-size: 1.125rem (18px), line-height: 1.7, letter-spacing: 0,       font-weight: 400
body-md:      font-size: 1rem (16px),    line-height: 1.6,  letter-spacing: 0,       font-weight: 400
body-sm:      font-size: 0.875rem (14px), line-height: 1.6, letter-spacing: 0,       font-weight: 400
body-xs:      font-size: 0.75rem (12px), line-height: 1.5,  letter-spacing: 0,       font-weight: 400
```

## Spacing System

### Base Unit: 4px
```
0:    0px
1:    4px
2:    8px
3:    12px
4:    16px
5:    20px
6:    24px
8:    32px
10:   40px
12:   48px
16:   64px
20:   80px
24:   96px
32:   128px
40:   160px
```

### Container Widths
```
sm:   640px
md:   768px
lg:   1024px
xl:   1280px
2xl:  1400px (custom max-width for main content)
```

## Border Radius
```
sm:   4px   // Small elements, badges
md:   8px   // Buttons, inputs
lg:   12px  // Cards
xl:   16px  // Large cards, modals
2xl:  24px  // Hero images
full: 9999px // Circular elements
```

## Shadows
```
sm:   0 1px 2px 0 rgb(0 0 0 / 0.05)
md:   0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
lg:   0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
xl:   0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
2xl:  0 25px 50px -12px rgb(0 0 0 / 0.25)
inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)
```

## Component Specifications

### Buttons

#### Primary Button
```
Background: coral-600
Text: white
Padding: 12px 24px (y: 3, x: 6)
Border Radius: md (8px)
Font: body-md, font-weight: 600
Hover: coral-500, scale(1.02)
Active: coral-700, scale(0.98)
Focus: ring-2 ring-coral-300
Disabled: opacity-50, cursor-not-allowed
Transition: all 200ms ease
```

#### Secondary Button
```
Background: transparent
Border: 2px solid navy-600
Text: navy-600
Padding: 10px 24px (account for border)
Border Radius: md (8px)
Font: body-md, font-weight: 600
Hover: background navy-50, scale(1.02)
Active: background navy-100, scale(0.98)
Focus: ring-2 ring-navy-300
Transition: all 200ms ease
```

#### Ghost Button
```
Background: transparent
Text: gray-700
Padding: 12px 16px
Border Radius: md (8px)
Font: body-md, font-weight: 500
Hover: background gray-100
Active: background gray-200
Focus: ring-2 ring-gray-300
Transition: all 200ms ease
```

#### Icon Button
```
Background: transparent
Size: 40x40px
Border Radius: full
Icon Size: 20px
Hover: background gray-100, scale(1.1)
Active: background gray-200, scale(0.95)
Focus: ring-2 ring-gray-300
Transition: all 200ms ease
```

### Form Inputs

#### Text Input
```
Background: white
Border: 1px solid gray-300
Padding: 12px 16px
Border Radius: md (8px)
Font: body-md
Placeholder: gray-400
Focus: border-navy-600, ring-2 ring-navy-200
Error: border-error, ring-2 ring-red-200
Disabled: background gray-50, cursor-not-allowed
Transition: all 200ms ease
```

#### Select/Dropdown
```
Same as text input
Icon: chevron-down, gray-400
Icon size: 20px
Icon position: right 12px
```

#### Checkbox/Radio
```
Size: 20x20px
Border: 2px solid gray-300
Border Radius: sm (checkbox), full (radio)
Checked Background: navy-600
Checked Icon: white checkmark
Focus: ring-2 ring-navy-200
Transition: all 200ms ease
```

### Cards

#### Product Card
```
Background: white
Border: 1px solid gray-200
Border Radius: lg (12px)
Padding: 0 (image full-width at top)
Shadow: sm
Hover: shadow-lg, translateY(-4px)
Transition: all 300ms ease

Layout:
- Image Container: aspect-ratio 3/4, overflow hidden, border-radius-top lg
- Content Padding: 16px (p-4)
- Brand: text-xs, uppercase, tracking-wide, gray-600
- Title: text-md, font-weight 600, gray-900, margin-top 4px
- Price Container: flex, justify-between, margin-top 8px
  - Stock Price: text-lg, font-weight 700, navy-600
  - Retail Price: text-sm, line-through, gray-400
- Discount Badge: absolute top-right, gold-600 background, text-xs white
```

#### Info Card (Dashboard, Admin)
```
Background: white
Border: 1px solid gray-200
Border Radius: lg (12px)
Padding: 24px (p-6)
Shadow: sm
Hover: shadow-md
Transition: all 300ms ease
```

### Navigation

#### Main Navigation
```
Background: white
Border Bottom: 1px solid gray-200
Height: 64px (mobile), 80px (desktop)
Padding: 16px 24px
Shadow: sm
Sticky: top-0, z-50

Logo: height 32px (mobile), 40px (desktop)
Menu Items: body-md, font-weight 500, gray-700
Menu Hover: color navy-600, underline offset-4
Active: color navy-600, font-weight 600
```

#### Mobile Menu
```
Background: white
Position: fixed, inset-0
Animation: slide-in-right 300ms ease
Overlay: backdrop-blur-sm, gray-900/20
```

### Modals/Dialogs
```
Overlay: fixed inset-0, gray-900/50, backdrop-blur-sm
Container: max-width md (640px), margin auto
Background: white
Border Radius: xl (16px)
Padding: 32px (p-8)
Shadow: 2xl
Animation: fade-in 200ms, scale-in 300ms ease-out
```

### Badges
```
Padding: 4px 12px
Border Radius: full
Font: text-xs, font-weight 600, uppercase, letter-spacing 0.05em

Status Variants:
- New: gold-500 background, white text
- Sale: coral-500 background, white text
- Out of Stock: gray-300 background, gray-700 text
- Low Stock: amber-500 background, white text
```

### Loading States

#### Skeleton Loader
```
Background: gray-200
Animation: pulse 2s ease-in-out infinite
Border Radius: md (match element)
```

#### Spinner
```
Border: 3px solid gray-200
Border-Top: 3px solid navy-600
Border Radius: full
Size: 24px (sm), 40px (md), 64px (lg)
Animation: spin 800ms linear infinite
```

## Animations & Transitions

### Micro-interactions

#### Button Press
```
transform: scale(0.98)
duration: 100ms
timing: ease-out
```

#### Card Hover
```
transform: translateY(-4px)
shadow: lg → xl
duration: 300ms
timing: ease-out
```

#### Image Lazy Load
```
opacity: 0 → 1
duration: 400ms
timing: ease-in
```

#### Toast Notification
```
enter: slideInRight + fadeIn 300ms ease-out
exit: slideOutRight + fadeOut 200ms ease-in
```

#### Modal
```
overlay:
  enter: fadeIn 200ms ease-out
  exit: fadeOut 150ms ease-in

content:
  enter: fadeIn + scaleUp(0.95 → 1) 300ms ease-out
  exit: fadeOut + scaleDown(1 → 0.95) 200ms ease-in
```

#### Page Transitions
```
exit: fadeOut 150ms ease-in
enter: fadeIn 200ms ease-out
delay: 50ms (sequential)
```

#### Cart Badge Pulse (on update)
```
scale: 1 → 1.3 → 1
duration: 400ms
timing: cubic-bezier(0.34, 1.56, 0.64, 1) // bounce
```

#### Add to Cart Success
```
1. Button: checkmark icon fade-in 200ms
2. Cart icon: pulse animation 400ms
3. Toast: slide-in from right 300ms
```

### Custom Animations
```css
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes scaleUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}
```

## Layout Patterns

### Grid System
```
Mobile (< 640px):     1 column, gap-4
Tablet (640-1024px):  2 columns, gap-6
Desktop (> 1024px):   4 columns, gap-8

Product Grid:
- Mobile: 1 column (full width)
- Tablet: 2 columns
- Desktop: 3-4 columns
```

### Spacing
```
Section Padding:
- Mobile: py-12 px-4
- Tablet: py-16 px-6
- Desktop: py-24 px-8

Component Spacing:
- Stack gap: 16px (4) - 24px (6)
- Form fields: 16px (4)
- Card padding: 16px (4) - 24px (6)
```

## Accessibility

### Focus States
```
Outline: 2px solid navy-600
Offset: 2px
Border Radius: match element
Always visible, never outline-none
```

### Color Contrast
```
All text on backgrounds must meet WCAG AA:
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum
```

### Interactive Elements
```
Minimum tap target: 44x44px
Spacing between targets: 8px minimum
```

## Responsive Breakpoints

### Mobile First Approach
```scss
// Base: Mobile (< 640px)
.element {
  font-size: 14px;
}

// Small tablets and up
@media (min-width: 640px) {
  .element {
    font-size: 16px;
  }
}

// Tablets and up
@media (min-width: 768px) {
  .element {
    font-size: 18px;
  }
}

// Laptops and up
@media (min-width: 1024px) {
  .element {
    font-size: 20px;
  }
}

// Desktops and up
@media (min-width: 1280px) {
  .element {
    font-size: 22px;
  }
}
```

## Icons
```
Library: Lucide React (or Heroicons)
Sizes:
- xs: 16px
- sm: 20px
- md: 24px
- lg: 32px
- xl: 40px

Stroke Width: 2px (default)
Color: inherit from parent
```

## Image Guidelines

### Product Images
```
Aspect Ratio: 3:4 (portrait)
Format: WebP with JPG fallback
Quality: 85%
Sizes:
  - Thumbnail: 300x400px
  - Card: 600x800px
  - Detail: 1200x1600px
Alt text: Required (descriptive)
Lazy loading: Yes (except above-fold)
```

### Hero/Banner Images
```
Aspect Ratio: 16:9 (landscape)
Format: WebP with JPG fallback
Quality: 90%
Size: 1920x1080px
Responsive: srcset with multiple sizes
```

## Design Tokens (Tailwind Config)

These design specifications will be implemented in `tailwind.config.ts` with custom colors, spacing, and animation utilities to ensure consistency across the application.
