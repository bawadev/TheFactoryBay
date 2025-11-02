import { ReactNode } from 'react'

export type BadgeVariant = 'new' | 'sale' | 'out-of-stock' | 'low-stock' | 'discount'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  new: 'bg-gold-500 text-white',
  sale: 'bg-coral-500 text-white',
  'out-of-stock': 'bg-gray-300 text-gray-700',
  'low-stock': 'bg-amber-500 text-white',
  discount: 'bg-coral-600 text-white',
}

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        px-3 py-1 rounded-full
        text-xs font-semibold uppercase tracking-wider
        transition-all duration-200
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
