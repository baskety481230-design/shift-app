/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Hiragino Sans",
          "Noto Sans JP",
          "Yu Gothic",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          400: "#94a3b8",
          600: "#475569",
          900: "#0f172a",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)",
      },
    },
  },
  plugins: [],
};
