/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{html,js}",
    "!./frontend/**/node_modules/**/*"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}