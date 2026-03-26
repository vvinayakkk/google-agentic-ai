/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#1C1C1C",
        surface: "#1E1E1E",
        elevated: "#2A2A2A",
        neutralAccent: "#E5E7EB",
      },
      fontFamily: {
        display: ["DM Serif Display", "serif"],
        mono: ["Geist Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

