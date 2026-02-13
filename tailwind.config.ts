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
        ink: "#0f172a",
        mist: "#e2e8f0",
        accent: "#0ea5e9",
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.14)",
      },
      backgroundImage: {
        "mesh-bg": "radial-gradient(circle at 20% 10%, rgba(14, 165, 233, 0.35), transparent 35%), radial-gradient(circle at 80% 0%, rgba(34, 197, 94, 0.2), transparent 30%), linear-gradient(160deg, #0f172a 0%, #111827 40%, #020617 100%)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
