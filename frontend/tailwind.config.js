/** @type {import('tailwindcss').Config} */

// 1UP SOL Design System - Tailwind Configuration
// Mario-themed trading platform with bold colors and gaming aesthetics

module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Mario Theme - Reference theme.css tokens only
        mario: "var(--mario-red)",
        luigi: "var(--luigi-green)",
        star: "var(--star-yellow)",
        coin: "var(--coin-gold)",
        sky: "var(--sky-blue)",
        brick: "var(--brick-brown)",
        pipe: "var(--pipe-green)",
        super: "var(--color-super)",
        outline: "var(--outline-black)",

        // Trading Specific Colors
        profit: "var(--luigi-green)",
        loss: "var(--mario-red)",

        // UI Semantic Colors from theme.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          portfolio: "var(--card-portfolio)",
          stats: "var(--card-stats)",
          info: "var(--card-info)",
          success: "var(--card-success)",
          warning: "var(--card-warning)",
          trading: "var(--card-trading)",
          token: "var(--card-token)",
          neutral: "var(--card-neutral)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        dropdown: {
          DEFAULT: "hsl(var(--dropdown))",
          foreground: "hsl(var(--dropdown-foreground))",
          border: "hsl(var(--dropdown-border))",
        },
        modal: {
          DEFAULT: "hsl(var(--modal))",
          foreground: "hsl(var(--modal-foreground))",
          border: "hsl(var(--modal-border))",
        },
      },

      // Font Families - Reference theme.css tokens
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        numeric: "var(--font-numeric)",
        // Legacy aliases
        mario: "var(--font-display)",
        sans: "var(--font-body)",
        mono: "var(--font-numeric)",
      },

      // Typography Scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },

      // Font Weights
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },

      // Border Radius Scale - Reference theme.css tokens
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "9999px",
      },

      // Box Shadows for UI Depth - Reference theme.css tokens
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-card)",
        md: "var(--shadow-card)",
        lg: "var(--shadow-card-hover)",
        card: "var(--shadow-card)",
        'card-hover': "var(--shadow-card-hover)",
        dropdown: "var(--shadow-dropdown)",
        modal: "var(--shadow-modal)",
      },

      // Spacing Scale - Component Layout
      spacing: {
        'xs': '0.25rem',      // 4px
        'sm': '0.5rem',       // 8px
        'md': '1rem',         // 16px
        'lg': '1.5rem',       // 24px
        'xl': '2rem',         // 32px
        'xxl': '3rem',        // 48px
        'navbar-height': '4rem',
        'bottom-nav-height': '4rem',
        'chart-height': '24rem',
        'chart-height-sm': '16rem',
        'chart-height-lg': '32rem',
      },

      // Container Max Widths
      maxWidth: {
        'page-sm': '768px',
        'page-md': '1024px',
        'page-lg': '1280px',
        'page-xl': '1536px',
        'content': '1920px',
        'dialog-sm': '425px',
        'dialog-md': '600px',
        'dialog-lg': '768px',
      },

      // Z-index Scale - Reference theme.css tokens
      zIndex: {
        '0': '0',
        'base': 'var(--z-base)',
        'background-texture': 'var(--z-background-texture)',
        'foreground-texture': 'var(--z-foreground-texture)',
        'content': 'var(--z-content)',
        'header': 'var(--z-header)',
        'nav': 'var(--z-nav)',
        'dropdown': 'var(--z-dropdown)',
        'sidebar': 'var(--z-sidebar)',
        'sticky': 'var(--z-sticky)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'wallet-modal-backdrop': 'var(--z-wallet-modal-backdrop)',
        'wallet-modal': 'var(--z-wallet-modal)',
        'popover': 'var(--z-popover)',
        'badge-tooltip': 'var(--z-badge-tooltip)',
        'tooltip': 'var(--z-tooltip)',
        'toast': 'var(--z-toast)',
        'loading': 'var(--z-loading)',
        'onboarding': 'var(--z-onboarding)',
        'rewards-timer': 'var(--z-rewards-timer)',
        'search-dropdown': 'var(--z-search-dropdown)',
        'profile-dropdown': 'var(--z-profile-dropdown)',
        'bottom-nav': 'var(--z-bottom-nav)',
        'emoji-picker': 'var(--z-emoji-picker)',
        'debug': 'var(--z-debug)',
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-subtle": {
          '0%, 100%': { opacity: "1" },
          '50%': { opacity: "0.8" },
        },
        "number-change": {
          '0%': { opacity: "0", transform: 'translateY(100%)' },
          '100%': { opacity: "1", transform: 'translateY(0)' },
        },
        "fade-in": {
          '0%': { opacity: "0" },
          '100%': { opacity: "1" },
        },
        "shimmer": {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        "micro-bounce": {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-2px) scale(1.01)' },
        },
        "paper-press": {
          '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '100%': { transform: 'scale(0.97)', filter: 'brightness(0.96)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "number-change": "number-change 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "micro-bounce": "micro-bounce 0.15s ease-out",
        "paper-press": "paper-press 0.1s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
