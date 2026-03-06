import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores extraídos de tu imagen
        brand: {
          cyan: '#14DFE2', // El color turquesa del botón y precio
          dark: '#1A1A1A', // El negro suave del footer
          purple: '#8B5CF6', // Para el degradado del banner
          pink: '#EC4899',   // Para el degradado del banner
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
export default config;