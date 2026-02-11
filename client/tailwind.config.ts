/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          50: 'var(--color-primary-light)',
          100: 'var(--color-primary-light)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary)',
          700: 'var(--color-primary-dark)',
          800: 'var(--color-secondary)',
          900: 'var(--color-secondary-dark)',
        },
        'nexus-blue': 'var(--color-primary)',
        slate: {
          850: '#1e293b', 
        }
      },
    },
  },
  plugins: [],
}