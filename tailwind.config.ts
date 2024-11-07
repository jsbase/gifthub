import type { Config } from 'tailwindcss';

const animations = {
  keyframes: {
    'accordion-down': {
      from: { height: '0' },
      to: { height: 'var(--radix-accordion-content-height)' },
    },
    'accordion-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: '0' },
    },
    'slide-in-from-top': {
      '0%': { transform: 'translateY(-100%)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'slide-out-bottom': {
      '0%': {
        transform: 'translateY(0)',
        opacity: '1'
      },
      '100%': {
        transform: 'translateY(8px)',
        opacity: '0'
      },
    },
    'slide-in-from-top-small': {
      '0%': {
        transform: 'translateY(-8px)',
        opacity: '0'
      },
      '100%': {
        transform: 'translateY(0)',
        opacity: '1'
      },
    },
    'slide-out-top': {
      '0%': {
        transform: 'translateY(0)',
        opacity: '1'
      },
      '100%': {
        transform: 'translateY(-100%)',
        opacity: '0'
      },
    },
    'slide-out-top-small': {
      '0%': {
        transform: 'translateY(0)',
        opacity: '1'
      },
      '100%': {
        transform: 'translateY(-8px)',
        opacity: '0'
      },
    },
    'slide-in-bottom': {
      '0%': {
        transform: 'translateY(8px)',
        opacity: '0'
      },
      '100%': {
        transform: 'translateY(0)',
        opacity: '1'
      },
    },
    'fade-in': {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
  },
  animation: {
    'accordion-down': 'accordion-down 0.2s ease-out',
    'accordion-up': 'accordion-up 0.2s ease-out',
    'slide-in-top': 'slide-in-from-top 0.3s ease-out',
    'slide-out-bottom': 'slide-out-bottom 0.5s ease-out forwards',
    'slide-in-top-small': 'slide-in-from-top-small 0.5s ease-out forwards',
    'slide-out-top': 'slide-out-top 0.3s ease-out forwards',
    'slide-out-top-small': 'slide-out-top-small 0.3s ease-out forwards',
    'slide-in-bottom': 'slide-in-bottom 0.3s ease-out forwards',
    'fade-in': 'fade-in 0.5s ease-in-out',
  },
};

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      ...animations,
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // Core colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        // Input and borders
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Gray scale
        gray: {
          50: 'hsl(var(--gray-50))',
          100: 'hsl(var(--gray-100))',
          200: 'hsl(var(--gray-200))',
          300: 'hsl(var(--gray-300))',
          400: 'hsl(var(--gray-400))',
          500: 'hsl(var(--gray-500))',
          600: 'hsl(var(--gray-600))',
          700: 'hsl(var(--gray-700))',
          800: 'hsl(var(--gray-800))',
          900: 'hsl(var(--gray-900))',
        },

        // Chart colors
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // Card colors
        card: {
          background: 'hsl(var(--card-background))',
        },
      },

      // Screen sizes
      screens: {
        'xs': { 'max': '639px' },
      },

      // Container styles
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
      },

      // Add height variables
      height: {
        header: 'var(--header-height)',
      },

      // Add custom spacing for consistent gaps
      spacing: {
        'dialog-mobile': '0.5rem',  // xs:space-y-2
        'dialog-desktop': '1rem',   // space-y-4
      },

      // Add custom max-width for dialogs
      maxWidth: {
        'dialog': '42rem',  // max-w-2xl
      },

      // Add custom padding for dialogs
      padding: {
        'dialog-mobile': '1rem',    // xs:p-4
        'dialog-desktop': '1.5rem', // default dialog padding
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
