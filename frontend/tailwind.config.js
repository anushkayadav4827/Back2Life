/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#1F6F4A',
        slateNeutral: '#3A4750',
        amberCaution: '#D97706',
        dangerRed: '#DC2626',
        bgLight: '#FAFAF8',
        bgDark: '#111827',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
