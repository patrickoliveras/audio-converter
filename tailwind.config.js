/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,js}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)'
        },
        accent: 'var(--accent)'
      }
    }
  },
  plugins: []
};
