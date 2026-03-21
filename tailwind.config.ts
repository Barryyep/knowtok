import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-primary": "#000000",
        "surface-elevated": "#1C1C1E",
        "surface-secondary": "#2C2C2E",
        "surface-tertiary": "#3A3A3C",
        "label-primary": "#FFFFFF",
        "label-secondary": "#AEAEB2",
        "label-tertiary": "#636366",
        separator: "#38383A",
        accent: "#0A84FF",
        success: "#30D158",
        danger: "#FF453A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        button: "12px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
