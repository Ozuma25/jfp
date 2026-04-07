import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        display: ["var(--font-display)", "cursive"],
      },
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          dark: "#115e59",
          light: "#14b8a6",
        },
        /** Peacock Blue and Gold color palette */
        store: {
          navy: "#004B6E",        /* Peacock Blue Main */
          navyLight: "#005F88",   /* Peacock Blue Secondary */
          yellow: "#F0C75E",      /* Gold bright */
          button: "#D4AF37",      /* Luxury Gold */
          buttonHover: "#C59B27", /* Darker Gold for hover */
          link: "#005F88",        /* Peacock Blue links */
          accent: "#c41e3a",      /* Red accent for errors/alerts */
          accentHover: "#a01830",
        },
      },
      boxShadow: {
        card: "0 2px 12px rgba(42, 26, 74, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
