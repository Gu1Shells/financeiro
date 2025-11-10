/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d3748',
          850: '#1a202c',
        },
        foreground: '#000000',
      },
    },
  },
  plugins: [],
};
