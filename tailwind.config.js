/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFCC00',
        secondary: '#003366',
        background: '#F5F5F0',
        surface: '#FFFFFF',
        textMain: '#003366',
        textMuted: '#4A4A4A',
      },
      fontFamily: {
        display: ['Pacifico', 'Caveat', 'cursive'],
        sans: ['Montserrat', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 51, 102, 0.08)',
        'soft-lg': '0 10px 30px -3px rgba(0, 51, 102, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}
