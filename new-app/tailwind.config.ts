import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			gray: {
  				'50': '#F8FAFC',
  				'100': '#F1F5F9',
  				'200': '#E2E8F0',
  				'300': '#CBD5E1',
  				'400': '#94A3B8',
  				'500': '#64748B',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1E293B',
  				'900': '#0F172A'
  			},
  			blue: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60A5FA',
  				'500': '#3B82F6',
  				'600': '#2563EB',
  				'700': '#1D4ED8',
  				'800': '#1e40af',
  				'900': '#1e3a8a'
  			},
  			success: {
  				'50': '#f0fdf4',
  				'100': '#dcfce7',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d'
  			},
  			warning: {
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'500': '#f59e0b',
  				'600': '#d97706',
  				'700': '#b45309'
  			},
  			error: {
  				'50': '#fef2f2',
  				'100': '#fee2e2',
  				'400': '#F87171',
  				'500': '#EF4444',
  				'600': '#DC2626',
  				'700': '#b91c1c'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontSize: {
  			xs: [
  				'0.75rem',
  				{
  					lineHeight: '1rem'
  				}
  			],
  			sm: [
  				'0.875rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			],
  			base: [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			lg: [
  				'1.125rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			xl: [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'2xl': [
  				'1.5rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '2.5rem'
  				}
  			],
  			'5xl': [
  				'3rem',
  				{
  					lineHeight: '1.15'
  				}
  			]
  		},
  		lineHeight: {
  			none: '1',
  			tight: '1.15',
  			snug: '1.25',
  			normal: '1.5',
  			relaxed: '1.625',
  			loose: '1.75'
  		},
  		spacing: {
  			'0': '0',
  			'1': '0.25rem',
  			'2': '0.5rem',
  			'3': '0.75rem',
  			'4': '1rem',
  			'6': '1.5rem',
  			'8': '2rem',
  			'12': '3rem'
  		},
  		boxShadow: {
  			sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  			DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  			md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  			lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  		},
  		transitionDuration: {
  			fast: '150ms',
  			DEFAULT: '200ms',
  			slow: '300ms'
  		},
  		transitionTimingFunction: {
  			DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 5s ease-out',
  			'fade-out': 'fade-out 5s ease-in forwards'
  		},
  		typography: {
  			DEFAULT: {
  				css: {
  					color: '#f1f5f9',
  					p: {
  						marginTop: '1.5em',
  						marginBottom: '1.5em',
  						textAlign: 'justify'
  					}
  				}
  			}
  		},
  		heading: {
  			h1: {
  				fontSize: [
  					'text-3xl',
  					'sm:text-4xl'
  				],
  				lineHeight: 'leading-tight',
  				fontWeight: 'font-medium',
  				marginBottom: 'mb-4'
  			},
  			h2: {
  				fontSize: [
  					'text-2xl',
  					'sm:text-3xl'
  				],
  				lineHeight: 'leading-tight',
  				fontWeight: 'font-medium',
  				marginBottom: 'mb-3'
  			},
  			h3: {
  				fontSize: [
  					'text-xl',
  					'sm:text-2xl'
  				],
  				lineHeight: 'leading-snug',
  				fontWeight: 'font-medium',
  				marginBottom: 'mb-2'
  			},
  			h4: {
  				fontSize: [
  					'text-lg',
  					'sm:text-xl'
  				],
  				lineHeight: 'leading-snug',
  				fontWeight: 'font-medium',
  				marginBottom: 'mb-2'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require('@tailwindcss/typography'), require("tailwindcss-animate")],
};

export default config;
