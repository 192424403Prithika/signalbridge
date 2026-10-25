/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f5',
          100: '#fbe8eb',
          200: '#f7d5d9',
          300: '#f0b4bd',
          400: '#e58797',
          500: '#d75f75',
          600: '#c2425b',
          700: '#a33148',
          800: '#872b3e',
          900: '#732738',
          950: '#40111c',
        },
        sage: {
          50: '#f4f7f5',
          100: '#e5ede8',
          200: '#ceddd2',
          300: '#aac4b3',
          400: '#80a58d',
          500: '#618a70',
          600: '#4c6f58',
          700: '#3d5847',
          800: '#34473b',
          900: '#2b3b32',
        },
        plum: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}
