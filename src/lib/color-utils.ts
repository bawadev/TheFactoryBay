const COLOR_MAP: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  navy: '#1e40af',
  khaki: '#c3b091',
  brown: '#8b4513',
  cream: '#fffdd0',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  pink: '#ec4899',
  purple: '#9333ea',
  orange: '#ea580c',
  gray: '#6b7280',
  grey: '#6b7280',
  beige: '#f5f5dc',
  maroon: '#800000',
  olive: '#808000',
  teal: '#0d9488',
  coral: '#ff7f50',
}

/**
 * Get hex color code for a color name.
 * Returns a neutral gray fallback for unknown colors.
 */
export function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName.toLowerCase()] ?? '#e5e7eb'
}
