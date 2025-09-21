/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Complete color system with proper scaling
      colors: {
        // Brand Colors with full scale
        'stream-blue': {
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
        'stream-purple': {
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
        'stream-green': {
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
        }
      },

      // iOS-inspired typography scale
      fontSize: {
        'caption': ['11px', { lineHeight: '13px' }],
        'caption2': ['12px', { lineHeight: '16px' }],
        'footnote': ['13px', { lineHeight: '18px' }],
        'subheadline': ['15px', { lineHeight: '20px' }],
        'callout': ['16px', { lineHeight: '21px' }],
        'body': ['17px', { lineHeight: '22px' }],
        'headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'title3': ['20px', { lineHeight: '25px', fontWeight: '400' }],
        'title2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'title1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'large-title': ['34px', { lineHeight: '41px', fontWeight: '700' }],
        'button': ['16px', { lineHeight: '20px', fontWeight: '500' }],
        'currency': ['24px', { lineHeight: '28px', fontWeight: '700' }]
      },

      // Enhanced shadows with glow effects
      boxShadow: {
        'glow-blue': '0 0 20px rgba(33, 150, 243, 0.3), 0 0 40px rgba(33, 150, 243, 0.1)',
        'glow-green': '0 0 20px rgba(76, 175, 80, 0.3), 0 0 40px rgba(76, 175, 80, 0.1)',
        'glow-purple': '0 0 20px rgba(156, 39, 176, 0.3), 0 0 40px rgba(156, 39, 176, 0.1)',
        'glass': '0 8px 32px rgba(31, 38, 135, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'stream': '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'stream-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'stream-xl': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)'
      },

      // Backdrop blur utilities
      backdropBlur: {
        'glass': '12px',
        'glass-lg': '20px',
        'glass-xl': '24px'
      },

      // Background gradients
      backgroundImage: {
        'gradient-mesh': 'radial-gradient(circle at 20% 50%, rgba(33, 150, 243, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(156, 39, 176, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(76, 175, 80, 0.10) 0%, transparent 50%)',
        'gradient-mesh-subtle': 'radial-gradient(circle at 20% 50%, rgba(33, 150, 243, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(156, 39, 176, 0.08) 0%, transparent 50%)',
        'gradient-mesh-blue': 'radial-gradient(circle at 25% 25%, rgba(33, 150, 243, 0.12) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(30, 136, 229, 0.10) 0%, transparent 50%)',
        'gradient-premium': 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(255, 255, 255, 1) 50%, rgba(76, 175, 80, 0.05) 100%)',
        'text-gradient': 'linear-gradient(135deg, #2196F3 0%, #9C27B0 50%, #4CAF50 100%)'
      },

      // Custom animations
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out'
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' }
        },
        'pulse-glow': {
          '0%, 100%': { 'box-shadow': '0 0 20px rgba(33, 150, 243, 0.3)' },
          '50%': { 'box-shadow': '0 0 30px rgba(33, 150, 243, 0.6)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },

      // Spacing scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },

      // Enhanced border radius
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    // Custom plugin for glass morphism and utility classes
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Glass morphism utilities
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px) saturate(200%)',
          'border': '1px solid rgba(255, 255, 255, 0.2)'
        },
        '.glass-subtle': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'backdrop-filter': 'blur(8px) saturate(150%)',
          'border': '1px solid rgba(255, 255, 255, 0.1)'
        },
        '.glass-strong': {
          'background': 'rgba(255, 255, 255, 0.15)',
          'backdrop-filter': 'blur(16px) saturate(250%)',
          'border': '1px solid rgba(255, 255, 255, 0.3)'
        },
        '.backdrop-blur-glass': {
          'backdrop-filter': 'blur(12px) saturate(200%)',
          'background': 'rgba(255, 255, 255, 0.1)',
          'border': '1px solid rgba(255, 255, 255, 0.2)'
        },
        '.backdrop-blur-glass-lg': {
          'backdrop-filter': 'blur(20px) saturate(200%)',
          'background': 'rgba(255, 255, 255, 0.05)',
          'border': '1px solid rgba(255, 255, 255, 0.1)'
        },

        // Text gradient utility
        '.text-gradient': {
          'background': 'linear-gradient(135deg, #2196F3 0%, #9C27B0 50%, #4CAF50 100%)',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          'color': 'transparent'
        },

        // Hover utilities
        '.hover-lift': {
          'transition': 'transform 0.2s ease, box-shadow 0.2s ease'
        },
        '.hover-lift:hover': {
          'transform': 'translateY(-2px)',
          'box-shadow': '0 10px 25px rgba(0, 0, 0, 0.15)'
        },

        // Safe area utilities for mobile
        '.safe-area-pb': {
          'padding-bottom': 'env(safe-area-inset-bottom)'
        },
        '.safe-area-pt': {
          'padding-top': 'env(safe-area-inset-top)'
        }
      }

      addUtilities(newUtilities)
    }
  ],
}

module.exports = config