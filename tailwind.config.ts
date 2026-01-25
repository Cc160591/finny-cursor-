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
        finny: {
          beige: "#F5F0E1",
          green: "#DFF5E1",
          dark: "#2D2A26",
          accent: "#3A2E2A",
        },
      },
      backgroundImage: {
        "finny-gradient": "linear-gradient(to bottom, #F5F0E1, #DFF5E1)",
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};
export default config;
