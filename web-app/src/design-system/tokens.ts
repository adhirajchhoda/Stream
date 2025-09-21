// Single source of truth for all design tokens
export const designTokens = {
  colors: {
    // Brand Colors - Primary palette
    streamBlue: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3', // Primary brand blue
      600: '#1E88E5',
      700: '#1976D2',
      800: '#1565C0',
      900: '#0D47A1'
    },
    streamPurple: {
      50: '#F3E5F5',
      100: '#E1BEE7',
      200: '#CE93D8',
      300: '#BA68C8',
      400: '#AB47BC',
      500: '#9C27B0', // Primary brand purple
      600: '#8E24AA',
      700: '#7B1FA2',
      800: '#6A1B9A',
      900: '#4A148C'
    },
    streamGreen: {
      50: '#E8F5E8',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#66BB6A',
      500: '#4CAF50', // Success green
      600: '#43A047',
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20'
    },

    // Semantic color mapping
    primary: {
      50: '#E3F2FD',
      500: '#2196F3',
      600: '#1E88E5',
      700: '#1976D2'
    },
    success: {
      50: '#E8F5E8',
      500: '#4CAF50',
      600: '#43A047',
      700: '#388E3C'
    },
    warning: {
      50: '#FFF3E0',
      500: '#FF9800',
      600: '#F57C00',
      700: '#E65100'
    },
    error: {
      50: '#FFEBEE',
      500: '#F44336',
      600: '#E53935',
      700: '#D32F2F'
    },

    // Neutral colors
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    },

    // Special colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent'
  },

  // Typography scale based on iOS Human Interface Guidelines
  typography: {
    fontSizes: {
      caption: ['11px', { lineHeight: '13px' }],
      caption2: ['12px', { lineHeight: '16px' }],
      footnote: ['13px', { lineHeight: '18px' }],
      subheadline: ['15px', { lineHeight: '20px' }],
      callout: ['16px', { lineHeight: '21px' }],
      body: ['17px', { lineHeight: '22px' }],
      headline: ['17px', { lineHeight: '22px', fontWeight: '600' }],
      title3: ['20px', { lineHeight: '25px', fontWeight: '400' }],
      title2: ['22px', { lineHeight: '28px', fontWeight: '700' }],
      title1: ['28px', { lineHeight: '34px', fontWeight: '700' }],
      largeTitle: ['34px', { lineHeight: '41px', fontWeight: '700' }],
      button: ['16px', { lineHeight: '20px', fontWeight: '500' }],
      currency: ['24px', { lineHeight: '28px', fontWeight: '700' }]
    },

    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em'
    }
  },

  // Spacing scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '80px',
    '5xl': '96px',
    '6xl': '128px'
  },

  // Border radius scale
  borderRadius: {
    none: '0px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px'
  },

  // Shadow system
  shadows: {
    // Standard shadows
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',

    // Glow effects
    glow: {
      blue: '0 0 20px rgba(33, 150, 243, 0.3), 0 0 40px rgba(33, 150, 243, 0.1)',
      green: '0 0 20px rgba(76, 175, 80, 0.3), 0 0 40px rgba(76, 175, 80, 0.1)',
      purple: '0 0 20px rgba(156, 39, 176, 0.3), 0 0 40px rgba(156, 39, 176, 0.1)'
    },

    // Glass morphism
    glass: '0 8px 32px rgba(31, 38, 135, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 10,
    modal: 1000,
    overlay: 1100,
    tooltip: 1200
  },

  // Animation durations
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  },

  // Breakpoints (for reference, Tailwind uses these by default)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
} as const

// Type definitions for design tokens
export type DesignTokens = typeof designTokens
export type ColorToken = keyof typeof designTokens.colors
export type SpacingToken = keyof typeof designTokens.spacing
export type FontSizeToken = keyof typeof designTokens.typography.fontSizes
export type ShadowToken = keyof typeof designTokens.shadows

// Helper functions
export const getColor = (token: string): string => {
  const keys = token.split('.')
  let value: any = designTokens.colors

  for (const key of keys) {
    value = value[key]
    if (!value) return token // Return original if not found
  }

  return value
}

export const getSpacing = (token: SpacingToken): string => {
  return designTokens.spacing[token]
}

export const getShadow = (token: string): string => {
  const keys = token.split('.')
  let value: any = designTokens.shadows

  for (const key of keys) {
    value = value[key]
    if (!value) return token // Return original if not found
  }

  return value
}