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
        // Minimalist palette
        white: '#FFFFFF',
        charcoal: '#1A1A1A',
        blue: '#0052FF',

        // Aliases for clarity
        background: {
          DEFAULT: '#FFFFFF',
        },
        text: {
          DEFAULT: '#1A1A1A',
          secondary: '#4D4D4D',
          muted: '#808080',
        },
        border: {
          DEFAULT: '#E6E6E6',
        },
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
        '128': '32rem', // 512px
        '144': '36rem', // 576px
      },
      boxShadow: {
        'stream': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'stream-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'stream-xl': '0 16px 48px rgba(0, 0, 0, 0.18)',
        'glass': '0 8px 32px rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 16px 64px rgba(31, 38, 135, 0.25)',
        'glow-blue': '0 0 20px rgba(33, 150, 243, 0.3)',
        'glow-green': '0 0 20px rgba(76, 175, 80, 0.3)',
        'glow-purple': '0 0 20px rgba(156, 39, 176, 0.3)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
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
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'gradient-y': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'center top',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center bottom',
          },
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            'box-shadow': '0 0 20px rgba(33, 150, 243, 0.3)',
          },
          '50%': {
            opacity: '.8',
            'box-shadow': '0 0 40px rgba(33, 150, 243, 0.5)',
          },
        },
        'bounce-gentle': {
          '0%, 100%': {
            transform: 'translateY(0)',
            'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(-5%)',
            'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      backdropBlur: {
        'glass': '16px',
        'glass-lg': '24px',
        'glass-xl': '40px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-mesh-subtle': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        'gradient-premium': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
    },
  },
  plugins: [],
};

export default config;