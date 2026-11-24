import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#10b981", // Emerald / WhatsApp Green modern
          foreground: "#ffffff",
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        whatsapp: {
          green: "#25D366",
          dark: "#075E54",
          light: "#DCF8C6",
          chatBg: "#E5DDD5",
          chatBgDark: "#0b141a",
          bubbleOut: "#D9FDD3",
          bubbleIn: "#FFFFFF",
        }
      },
    },
  },
  plugins: [],
};
export default config;
