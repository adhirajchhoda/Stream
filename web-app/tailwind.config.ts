import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors (matching iOS StreamColors)
        'stream-blue': '#2196F3',
        'stream-green': '#4CAF50',
        'stream-orange': '#FF9800',
        'stream-red': '#F44336',

        // Scenario Theme Colors
        'starbucks-green': '#00704A',
        'amazon-orange': '#FF9900',
        'uber-cyan': '#00BCD4',

        // Neutral Colors
        background: '#F8FAFB',
        surface: '#FFFFFF',
        'surface-variant': '#F5F7FA',
        outline: '#E0E4E7',

        // Text Colors
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
        'text-tertiary': '#999999',

        // Status Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        'system': [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        'system-rounded': [
          'SF Pro Rounded',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        'mono': [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Fira Code',
          'Dank Mono',
          'Operator Mono',
          'monospace',
        ],
      },
      fontSize: {
        // Display Fonts (matching iOS StreamFonts)
        'large-title': ['2.125rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'title-1': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '600' }],
        'title-2': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'title-3': ['1.25rem', { lineHeight: '1.5rem', fontWeight: '500' }],

        // Body Fonts
        'headline': ['1.0625rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        'body': ['1.0625rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'callout': ['1rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'subheadline': ['0.9375rem', { lineHeight: '1.25rem', fontWeight: '400' }],

        // Utility Fonts
        'footnote': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
        'caption-2': ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '400' }],

        // Custom Fonts
        'currency': ['1.5rem', { lineHeight: '1.875rem', fontWeight: '700' }],
        'currency-large': ['2rem', { lineHeight: '2.375rem', fontWeight: '700' }],
        'button': ['1rem', { lineHeight: '1.25rem', fontWeight: '600' }],
      },
      borderRadius: {
        'stream': '1rem', // 16px - standard card radius
        'stream-lg': '1.25rem', // 20px - large card radius
      },
      spacing: {
        '18': '4.5rem', // 72px
        '88': '22rem', // 352px
      },
      boxShadow: {
        'stream': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'stream-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'stream-xl': '0 16px 48px rgba(0, 0, 0, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;