/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A6CF7',
          light: '#7C93FF',
          dark: '#3B5BDB',
        },
        black: '#121723',
        dark: '#1D2430',
        body: '#788293',
        'body-dark': '#959CB1',
        'gray-dark': '#1E232E',
        gray2: '#f8f8f8',
        stroke: '#E3E8EF',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,23,35,0.04), 0 8px 24px rgba(18,23,35,0.06)',
        'card-hover': '0 2px 4px rgba(18,23,35,0.05), 0 16px 40px rgba(18,23,35,0.12)',
        btn: '0 1px 2px rgba(74,108,247,0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
