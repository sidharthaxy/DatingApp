/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#414BEA',
          light: '#6E76F1',
          dark: '#2D35A4',
        },
        surface: {
          DEFAULT: '#F8F9FE',
          card: '#FFFFFF',
        },
        on: {
          surface: '#1A1C1E',
          'surface-variant': '#44474E',
        }
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
