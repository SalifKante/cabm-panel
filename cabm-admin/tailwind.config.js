export default {
content: [ './index.html','./src/**/*.{js,jsx,ts,tsx}',],
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#166534', // green-800 vibe for agro
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d'
      },
      accent: '#f59e0b', // amber for highlights
    },
    fontFamily: {
      sans: ['Manrope', 'Inter', 'system-ui', 'ui-sans-serif', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'Apple Color Emoji', 'Segoe UI Emoji'],
    },
  },
  },
  plugins: [],
}