/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1e3a8a',
          red: '#dc2626',
          orange: '#f97316',
          pink: '#be185d'
        }
      }
    },
  },
  plugins: [],
}
