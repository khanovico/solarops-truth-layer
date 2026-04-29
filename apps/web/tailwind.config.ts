import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Aptos", " ui-sans-serif", "sans-serif"],
      },
      colors: {
        surface: "#f8fafc",
        ink: "#0f172a",
        verified: "#15803d",
        warning: "#b45309",
        urgent: "#b91c1c",
      },
    },
  },
  plugins: [],
} satisfies Config;
