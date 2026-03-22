/**
 * DoneWithAI Design Tokens
 *
 * A cohesive design system with distinctive character.
 * Uses oklch color space for perceptual uniformity.
 */

// ============================================
// CSS Variables Registration
// Add these to :root in globals.css
// ============================================

export const cssVariables = {
  // Primary - Electric Violet (AI-tech feel)
  '--color-primary-50': 'oklch(0.97 0.015 285)',
  '--color-primary-100': 'oklch(0.94 0.03 285)',
  '--color-primary-200': 'oklch(0.89 0.055 285)',
  '--color-primary-300': 'oklch(0.81 0.095 285)',
  '--color-primary-400': 'oklch(0.68 0.15 285)',
  '--color-primary-500': 'oklch(0.58 0.20 285)', // Main primary
  '--color-primary-600': 'oklch(0.50 0.22 285)',
  '--color-primary-700': 'oklch(0.42 0.20 285)',
  '--color-primary-800': 'oklch(0.35 0.16 285)',
  '--color-primary-900': 'oklch(0.28 0.12 285)',

  // Accent - Coral Orange (distinctive accent)
  '--color-accent-50': 'oklch(0.98 0.02 45)',
  '--color-accent-100': 'oklch(0.95 0.045 45)',
  '--color-accent-200': 'oklch(0.90 0.08 45)',
  '--color-accent-300': 'oklch(0.82 0.13 45)',
  '--color-accent-400': 'oklch(0.72 0.18 45)',
  '--color-accent-500': 'oklch(0.65 0.22 45)', // Main accent
  '--color-accent-600': 'oklch(0.58 0.24 45)',
  '--color-accent-700': 'oklch(0.50 0.22 45)',
  '--color-accent-800': 'oklch(0.42 0.18 45)',
  '--color-accent-900': 'oklch(0.35 0.14 45)',

  // AI Badge - Glowing Cyan
  '--color-ai-50': 'oklch(0.98 0.03 195)',
  '--color-ai-100': 'oklch(0.94 0.06 195)',
  '--color-ai-200': 'oklch(0.88 0.10 195)',
  '--color-ai-300': 'oklch(0.80 0.15 195)',
  '--color-ai-400': 'oklch(0.70 0.20 195)',
  '--color-ai-500': 'oklch(0.60 0.24 195)', // Main AI color
  '--color-ai-600': 'oklch(0.52 0.25 195)',
  '--color-ai-700': 'oklch(0.45 0.22 195)',
  '--color-ai-800': 'oklch(0.38 0.18 195)',
  '--color-ai-900': 'oklch(0.30 0.14 195)',

  // Success - Emerald
  '--color-success-50': 'oklch(0.97 0.03 145)',
  '--color-success-100': 'oklch(0.93 0.06 145)',
  '--color-success-200': 'oklch(0.87 0.10 145)',
  '--color-success-300': 'oklch(0.78 0.15 145)',
  '--color-success-400': 'oklch(0.68 0.20 145)',
  '--color-success-500': 'oklch(0.58 0.23 145)',
  '--color-success-600': 'oklch(0.50 0.24 145)',
  '--color-success-700': 'oklch(0.42 0.21 145)',
  '--color-success-800': 'oklch(0.35 0.17 145)',
  '--color-success-900': 'oklch(0.28 0.13 145)',

  // Warning - Amber
  '--color-warning-50': 'oklch(0.98 0.02 85)',
  '--color-warning-100': 'oklch(0.95 0.05 85)',
  '--color-warning-200': 'oklch(0.90 0.10 85)',
  '--color-warning-300': 'oklch(0.82 0.16 85)',
  '--color-warning-400': 'oklch(0.72 0.22 85)',
  '--color-warning-500': 'oklch(0.64 0.26 85)',
  '--color-warning-600': 'oklch(0.56 0.27 85)',
  '--color-warning-700': 'oklch(0.48 0.24 85)',
  '--color-warning-800': 'oklch(0.40 0.20 85)',
  '--color-warning-900': 'oklch(0.32 0.15 85)',

  // Error - Rose
  '--color-error-50': 'oklch(0.97 0.03 25)',
  '--color-error-100': 'oklch(0.93 0.07 25)',
  '--color-error-200': 'oklch(0.86 0.12 25)',
  '--color-error-300': 'oklch(0.77 0.18 25)',
  '--color-error-400': 'oklch(0.67 0.24 25)',
  '--color-error-500': 'oklch(0.58 0.27 25)',
  '--color-error-600': 'oklch(0.50 0.28 25)',
  '--color-error-700': 'oklch(0.42 0.25 25)',
  '--color-error-800': 'oklch(0.35 0.20 25)',
  '--color-error-900': 'oklch(0.28 0.16 25)',

  // Neutral - Slate-ish
  '--color-slate-50': 'oklch(0.98 0.005 265)',
  '--color-slate-100': 'oklch(0.95 0.01 265)',
  '--color-slate-200': 'oklch(0.90 0.015 265)',
  '--color-slate-300': 'oklch(0.82 0.02 265)',
  '--color-slate-400': 'oklch(0.65 0.025 265)',
  '--color-slate-500': 'oklch(0.50 0.03 265)',
  '--color-slate-600': 'oklch(0.40 0.035 265)',
  '--color-slate-700': 'oklch(0.30 0.03 265)',
  '--color-slate-800': 'oklch(0.22 0.025 265)',
  '--color-slate-900': 'oklch(0.16 0.02 265)',

  // Spacing Scale (8px base)
  '--spacing-0': '0',
  '--spacing-px': '1px',
  '--spacing-0.5': '0.125rem',   // 2px
  '--spacing-1': '0.25rem',      // 4px
  '--spacing-1.5': '0.375rem',   // 6px
  '--spacing-2': '0.5rem',       // 8px
  '--spacing-2.5': '0.625rem',   // 10px
  '--spacing-3': '0.75rem',      // 12px
  '--spacing-3.5': '0.875rem',   // 14px
  '--spacing-4': '1rem',         // 16px
  '--spacing-5': '1.25rem',      // 20px
  '--spacing-6': '1.5rem',       // 24px
  '--spacing-7': '1.75rem',      // 28px
  '--spacing-8': '2rem',         // 32px
  '--spacing-9': '2.25rem',      // 36px
  '--spacing-10': '2.5rem',      // 40px
  '--spacing-11': '2.75rem',      // 44px
  '--spacing-12': '3rem',        // 48px
  '--spacing-14': '3.5rem',      // 56px
  '--spacing-16': '4rem',        // 64px
  '--spacing-20': '5rem',        // 80px
  '--spacing-24': '6rem',        // 96px

  // Border Radius
  '--radius-none': '0',
  '--radius-sm': '0.25rem',      // 4px
  '--radius-md': '0.375rem',     // 6px
  '--radius-lg': '0.5rem',       // 8px
  '--radius-xl': '0.75rem',      // 12px
  '--radius-2xl': '1rem',        // 16px
  '--radius-3xl': '1.5rem',      // 24px
  '--radius-full': '9999px',

  // Shadows
  '--shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '--shadow-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '--shadow-inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Glow effects (colored shadows)
  '--shadow-glow-primary': '0 0 20px rgb(139 92 246 / 0.3)',
  '--shadow-glow-accent': '0 0 20px rgb(251 146 60 / 0.3)',
  '--shadow-glow-ai': '0 0 20px rgb(34 211 238 / 0.4)',
  '--shadow-glow-success': '0 0 20px rgb(52 211 153 / 0.3)',
  '--shadow-glow-error': '0 0 20px rgb(248 113 113 / 0.3)',

  // Animation durations
  '--duration-instant': '100ms',
  '--duration-fast': '150ms',
  '--duration-normal': '200ms',
  '--duration-slow': '300ms',
  '--duration-slower': '500ms',

  // Animation easings
  '--ease-default': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  '--ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
  '--ease-in-out': 'cubic-bezier(0.4, 0, 0.6, 1)',
  '--ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '--ease-elastic': 'cubic-bezier(0.5, 1.5, 0.5, 1)',

  // Z-index scale
  '--z-dropdown': '1000',
  '--z-sticky': '1020',
  '--z-fixed': '1030',
  '--z-modal-backdrop': '1040',
  '--z-modal': '1050',
  '--z-popover': '1060',
  '--z-tooltip': '1070',
} as const

// ============================================
// Tailwind Utility Classes
// ============================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
} as const

// ============================================
// Animation Keyframes (for Tailwind config)
// ============================================

export const keyframes = {
  ripple: {
    '0%': { transform: 'scale(0)', opacity: '0.5' },
    '100%': { transform: 'scale(4)', opacity: '0' },
  },
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'slide-up': {
    '0%': { transform: 'translateY(10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  'slide-down': {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  'scale-in': {
    '0%': { transform: 'scale(0.9)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  'spin-slow': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  'pulse-glow': {
    '0%, 100%': { boxShadow: '0 0 5px currentColor' },
    '50%': { boxShadow: '0 0 20px currentColor' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-25%)' },
  },
} as const

export const animations = {
  ripple: 'ripple 600ms ease-out',
  'fade-in': 'fade-in 200ms ease-out',
  'slide-up': 'slide-up 200ms ease-out',
  'slide-down': 'slide-down 200ms ease-out',
  'scale-in': 'scale-in 200ms ease-out',
  'spin-slow': 'spin-slow 3s linear infinite',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  bounce: 'bounce 1s infinite',
} as const

// ============================================
// Color Palette Helper Functions
// ============================================

export const colors = {
  primary: {
    50: 'oklch(var(--color-primary-50))',
    100: 'oklch(var(--color-primary-100))',
    200: 'oklch(var(--color-primary-200))',
    300: 'oklch(var(--color-primary-300))',
    400: 'oklch(var(--color-primary-400))',
    500: 'oklch(var(--color-primary-500))',
    600: 'oklch(var(--color-primary-600))',
    700: 'oklch(var(--color-primary-700))',
    800: 'oklch(var(--color-primary-800))',
    900: 'oklch(var(--color-primary-900))',
  },
  accent: {
    50: 'oklch(var(--color-accent-50))',
    100: 'oklch(var(--color-accent-100))',
    200: 'oklch(var(--color-accent-200))',
    300: 'oklch(var(--color-accent-300))',
    400: 'oklch(var(--color-accent-400))',
    500: 'oklch(var(--color-accent-500))',
    600: 'oklch(var(--color-accent-600))',
    700: 'oklch(var(--color-accent-700))',
    800: 'oklch(var(--color-accent-800))',
    900: 'oklch(var(--color-accent-900))',
  },
  ai: {
    50: 'oklch(var(--color-ai-50))',
    100: 'oklch(var(--color-ai-100))',
    200: 'oklch(var(--color-ai-200))',
    300: 'oklch(var(--color-ai-300))',
    400: 'oklch(var(--color-ai-400))',
    500: 'oklch(var(--color-ai-500))',
    600: 'oklch(var(--color-ai-600))',
    700: 'oklch(var(--color-ai-700))',
    800: 'oklch(var(--color-ai-800))',
    900: 'oklch(var(--color-ai-900))',
  },
  success: {
    50: 'oklch(var(--color-success-50))',
    100: 'oklch(var(--color-success-100))',
    200: 'oklch(var(--color-success-200))',
    300: 'oklch(var(--color-success-300))',
    400: 'oklch(var(--color-success-400))',
    500: 'oklch(var(--color-success-500))',
    600: 'oklch(var(--color-success-600))',
    700: 'oklch(var(--color-success-700))',
    800: 'oklch(var(--color-success-800))',
    900: 'oklch(var(--color-success-900))',
  },
  warning: {
    50: 'oklch(var(--color-warning-50))',
    100: 'oklch(var(--color-warning-100))',
    200: 'oklch(var(--color-warning-200))',
    300: 'oklch(var(--color-warning-300))',
    400: 'oklch(var(--color-warning-400))',
    500: 'oklch(var(--color-warning-500))',
    600: 'oklch(var(--color-warning-600))',
    700: 'oklch(var(--color-warning-700))',
    800: 'oklch(var(--color-warning-800))',
    900: 'oklch(var(--color-warning-900))',
  },
  error: {
    50: 'oklch(var(--color-error-50))',
    100: 'oklch(var(--color-error-100))',
    200: 'oklch(var(--color-error-200))',
    300: 'oklch(var(--color-error-300))',
    400: 'oklch(var(--color-error-400))',
    500: 'oklch(var(--color-error-500))',
    600: 'oklch(var(--color-error-600))',
    700: 'oklch(var(--color-error-700))',
    800: 'oklch(var(--color-error-800))',
    900: 'oklch(var(--color-error-900))',
  },
  slate: {
    50: 'oklch(var(--color-slate-50))',
    100: 'oklch(var(--color-slate-100))',
    200: 'oklch(var(--color-slate-200))',
    300: 'oklch(var(--color-slate-300))',
    400: 'oklch(var(--color-slate-400))',
    500: 'oklch(var(--color-slate-500))',
    600: 'oklch(var(--color-slate-600))',
    700: 'oklch(var(--color-slate-700))',
    800: 'oklch(var(--color-slate-800))',
    900: 'oklch(var(--color-slate-900))',
  },
} as const

export type ColorName = keyof typeof colors
export type Shade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
