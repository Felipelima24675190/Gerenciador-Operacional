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
      },
      borderRadius: {
        'card': '1rem',
        'button': '0.75rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        'button': '0 1px 3px rgba(14,79,143,0.2)',
      },
    },
  },
  plugins: [],
}
