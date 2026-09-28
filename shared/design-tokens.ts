/**
 * Multi-Vendor Marketplace - Master Design Tokens
 * Reusable across Customer Storefront, Seller Portal, and Super Admin Dashboards.
 */

export const typography = {
  fontFamily: {
    heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
    body: ['"Inter"', 'system-ui', 'sans-serif'],
    mono: ['"JetBrains Mono"', 'monospace'],
  },
  fontSize: {
    'display-2xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '800' }],
    'display-xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
    'heading-lg': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }],
    'heading-md': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
    'heading-sm': ['1.25rem', { lineHeight: '1.35', letterSpacing: '0', fontWeight: '600' }],
    'body-lg': ['1.125rem', { lineHeight: '1.5', fontWeight: '500' }],
    'body-md': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
    'body-sm': ['0.875rem', { lineHeight: '1.45', fontWeight: '400' }],
    caption: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '600' }],
    'mono-sm': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
  },
} as const;

export const colors = {
  brand: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5', // Primary brand color
    700: '#4338CA', // Primary hover
    800: '#3730A3', // Primary active
    900: '#312E81',
    950: '#1E1B4B',
  },
  accent: {
    gold: '#D97706',
    goldLight: '#FEF3C7',
    emerald: '#059669',
    emeraldLight: '#ECFDF5',
    rose: '#E11D48',
    roseLight: '#FFE4E6',
    blue: '#2563EB',
    blueLight: '#EFF6FF',
  },
  neutral: {
    appBg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceDark: '#0B0F19',
    borderSubtle: '#E2E8F0',
    borderDefault: '#CBD5E1',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
  },
} as const;

export const shadows = {
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
  cardHover: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  drawer: '0 20px 40px -15px rgba(0, 0, 0, 0.16)',
  glow: '0 0 20px -2px rgba(79, 70, 229, 0.35)',
} as const;

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const animations = {
  transitionFast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  transitionMedium: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  transitionSlow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
