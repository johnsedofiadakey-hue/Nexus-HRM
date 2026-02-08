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
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9', // Brand Blue
          600: '#0284c7',
          800: '#075985',
          900: '#0c4a6e',
        },
        slate: {
          850: '#1e293b', 
        }
      },
    },
  },
  plugins: [],
}