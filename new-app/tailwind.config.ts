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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out'
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#D1D5DB', // text-gray-300
            p: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
              textAlign: 'justify'
            }
          }
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
