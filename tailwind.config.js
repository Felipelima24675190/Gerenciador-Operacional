/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px — minimum legible
      },
      colors: {
        brand: {
          50:  '#e8f1fb',
          100: '#c5daf3',
          200: '#9fbfea',
          300: '#6b9ede',
          400: '#3d7fd2',
          500: '#1a6abf',
          600: '#0e4f8f',
          700: '#0b3f72',
          800: '#082f55',
          900: '#051e38',
          950: '#031225',
        },
        // Semantic surface tokens
        surface: {
          DEFAULT: '#f8fafc',     // main bg
          card: '#ffffff',
          raised: '#f1f5f9',      // slate-100
          overlay: '#0f172a',     // slate-900
        },
        // Semantic status tokens
        status: {
          success: '#059669',     // emerald-600
          warning: '#d97706',     // amber-600
          danger: '#dc2626',      // red-600
          info: '#2563eb',        // blue-600
        },
        // Neon / dark dashboard theme (per reference images 3 & 4)
        neon: {
          bg: '#1e1136',          // main dashboard background (deep satin purple)
          surface: '#2c194e',     // card/module background (slightly lighter)
          border: '#3a2466',      // card borders/inner glow
          muted: '#6b4db8',       // subtle accents
          fuchsia: '#ff2bd6',     // dominant data color (neon pink)
          fuchsiaSoft: '#ff7ae3', // lighter fuchsia for hover/fill
          lavender: '#b6a6ff',    // secondary color
          lavenderSoft: '#d4caff',// lighter lavender
          text: '#f5f2ff',        // main text
          textMuted: '#b8aad6',   // muted text
        },
      },
      borderRadius: {
        'card': '0.75rem',        // 12px — unified card radius
        'button': '0.5rem',       // 8px
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card-active': '0 0 0 2px rgba(61,127,210,0.3)',
        'sidebar': '4px 0 16px rgba(0,0,0,0.12)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'button': '0 1px 3px rgba(14,79,143,0.15)',
        'inner-top': 'inset 0 8px 6px -6px rgba(0,0,0,0.06)',
        'inner-bottom': 'inset 0 -8px 6px -6px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', maxHeight: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', maxHeight: '500px', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
