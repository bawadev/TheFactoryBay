import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Navy Blue (Primary)
        navy: {
          50: '#f5f9fd',
          100: '#e8f3fb',
          200: '#c4dff0',
          300: '#95c1e3',
          400: '#6ba3d0',
          500: '#4285b8',
          600: '#2d6394',
          700: '#234e78',
          800: '#1a3a5c',
          900: '#0f2540',
          950: '#0a1628',
        },
        // Gold (Accent)
        gold: {
          100: '#fdf7e3',
          300: '#f7e6a9',
          400: '#f0d77a',
          500: '#e5c158',
          600: '#d4af37',
        },
        // Coral (CTA)
        coral: {
          100: '#ffe9e9',
          300: '#ffc4c4',
          400: '#ffa5a5',
          500: '#ff8787',
          600: '#ff6b6b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      maxWidth: {
        '2xl': '1400px',
      },
      animation: {
        'slide-in-right': 'slideInRight 300ms ease-out',
        'scale-up': 'scaleUp 300ms ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-scale': 'pulseScale 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        scaleUp: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseScale: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
        pulseSoft: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgb(243 244 246)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
