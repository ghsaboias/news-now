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
        // Core grays for dark theme
        gray: {
          50: '#F8FAFC',  // Primary text on dark (contrast ratio: 15.8:1)
          100: '#F1F5F9', // Secondary text on dark (contrast ratio: 13.5:1)
          200: '#E2E8F0', // Tertiary text on dark (contrast ratio: 11.3:1)
          300: '#CBD5E1', // Muted text on dark (contrast ratio: 9.5:1)
          400: '#94A3B8', // Subtle text on dark (contrast ratio: 5.8:1)
          500: '#64748B', // Disabled text on dark (contrast ratio: 3.5:1)
          600: '#475569', // Borders and dividers
          700: '#334155', // Surface hover
          800: '#1E293B', // Surface
          900: '#0F172A', // Background
        },
        // Primary blue for actions
        blue: {
          50: '#eff6ff',   // Hover light
          100: '#dbeafe',  // Active light
          200: '#bfdbfe',  // Disabled
          300: '#93c5fd',  // Icons light
          400: '#60A5FA', // Interactive hover (contrast ratio: 4.5:1)
          500: '#3B82F6', // Interactive focus (contrast ratio: 5.3:1)
          600: '#2563EB', // Interactive default (contrast ratio: 7:1)
          700: '#1D4ED8', // Interactive pressed (contrast ratio: 8.5:1)
          800: '#1e40af',  // Primary active
          900: '#1e3a8a',  // Primary dark
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#F87171', // Error hover (contrast ratio: 4.5:1)
          500: '#EF4444', // Error default (contrast ratio: 5.3:1)
          600: '#DC2626', // Error pressed (contrast ratio: 7:1)
          700: '#b91c1c',
        },
      },
      // Typography scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px - Badges, metadata
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px - Body small
        'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px - Body
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px - Subheadings (h4)
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px - Section titles (h3)
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px - Major sections (h2)
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px - Page titles (h1)
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px - Hero titles (h1)
        '5xl': ['3rem', { lineHeight: '1.15' }],      // 48px - Large hero titles (h1)
      },
      lineHeight: {
        none: '1',           // For single-line text
        tight: '1.15',       // For large headings
        snug: '1.25',        // For subheadings
        normal: '1.5',       // For body text
        relaxed: '1.625',    // For longer body text
        loose: '1.75',        // For improved readability
      },
      // Spacing system
      spacing: {
        '0': '0',
        '1': '0.25rem',  // 4px  - Minimal spacing
        '2': '0.5rem',   // 8px  - Tight spacing
        '3': '0.75rem',  // 12px - Default spacing
        '4': '1rem',     // 16px - Component spacing
        '6': '1.5rem',   // 24px - Section spacing
        '8': '2rem',     // 32px - Large spacing
        '12': '3rem',    // 48px - Page spacing
      },
      // Shadows
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      // Transitions
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Animations
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        }
      },
      animation: {
        'fade-in': 'fade-in 5s ease-out',
        'fade-out': 'fade-out 5s ease-in forwards'
      },
      // Typography plugin config
      typography: {
        DEFAULT: {
          css: {
            color: '#f1f5f9', // gray-100
            p: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
              textAlign: 'justify'
            }
          }
        }
      },
      // Heading styles
      heading: {
        h1: {
          fontSize: ['text-3xl', 'sm:text-4xl'],
          lineHeight: 'leading-tight',
          fontWeight: 'font-medium',
          marginBottom: 'mb-4'
        },
        h2: {
          fontSize: ['text-2xl', 'sm:text-3xl'],
          lineHeight: 'leading-tight',
          fontWeight: 'font-medium',
          marginBottom: 'mb-3'
        },
        h3: {
          fontSize: ['text-xl', 'sm:text-2xl'],
          lineHeight: 'leading-snug',
          fontWeight: 'font-medium',
          marginBottom: 'mb-2'
        },
        h4: {
          fontSize: ['text-lg', 'sm:text-xl'],
          lineHeight: 'leading-snug',
          fontWeight: 'font-medium',
          marginBottom: 'mb-2'
        }
      }
    },
  },
};

export default config;
