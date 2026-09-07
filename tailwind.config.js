/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand scale now mirrors the emerald tokens in globals.css instead
        // of the old indigo (#6366f1) leftover from the previous SaaS palette.
        // 500/600 are the two shades actually used for active states, links,
        // and icons across Navbar/Footer — kept in lockstep with
        // --color-primary / --color-primary-hover so there is one brand
        // color, not two.
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#2DD4BF',
          500: '#14B8A6',  // --color-primary-hover
          600: '#0F766E',  // --color-primary
          700: '#115E59',
          800: '#134E4A',
          900: '#0F3F3B',
          950: '#062E2B',
        },
        // Object-style palette kept for any existing accent.cyan/violet/etc
        // usages elsewhere in the codebase — DEFAULT/soft added so
        // `accent` and `accent-soft` resolve to the same gold tokens as
        // --color-accent / --color-accent-soft, without removing the
        // named sub-keys other components may still reference.
        accent: {
          DEFAULT: '#D4AF37',
          soft: '#F0D78C',
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#09090b',
          muted: '#f4f4f5',
          'muted-dark': '#18181b',
          border: '#e4e4e7',
          'border-dark': '#27272a',
        },
        // Var-backed tokens — these read live from globals.css custom
        // properties, so bg-card / bg-card-hover / border-glow flip
        // automatically with the .dark class, the same way bg-surface
        // and text-primary already do via @layer utilities.
        card: {
          DEFAULT: 'var(--color-card)',
          hover: 'var(--color-card-hover)',
        },
        'border-glow': 'var(--color-border-glow)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #0c4a6e 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        'glow-brand': 'radial-gradient(ellipse at center, rgba(15,118,110,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(99,102,241,0.15)',
        'glow-md': '0 0 40px rgba(99,102,241,0.2)',
        'glow-lg': '0 0 80px rgba(99,102,241,0.25)',
        card: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
        elevated: '0 8px 32px rgba(0,0,0,0.08)',
        glass: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'gradient-x': 'gradientX 6s ease infinite',
        'spin-slow': 'spin 8s linear infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        gradientX: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};