/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'mobile': '0px',
      'tablet': '640px',
      'desktop': '1024px',
      'wide': '1280px',
    },
    extend: {
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],
        'sm': ['0.9375rem', { lineHeight: '1.5rem' }],
        'base': ['1.0625rem', { lineHeight: '1.625rem' }],
        'lg': ['1.1875rem', { lineHeight: '1.75rem' }],
        'xl': ['1.3125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5625rem', { lineHeight: '2rem' }],
        '3xl': ['1.9375rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        /* ═══ Background — 作坊的墙壁 ═══ */
        background: 'hsl(var(--background))',
        'background-elevated': 'hsl(var(--background-elevated))',
        'background-surface': 'hsl(var(--background-surface))',

        /* ═══ Foreground — 旧物件的回响 ═══ */
        foreground: 'hsl(var(--foreground))',
        'foreground-secondary': 'hsl(var(--foreground-secondary))',
        'foreground-tertiary': 'hsl(var(--foreground-tertiary))',

        /* ═══ Primary — 人偶的颜色 ═══ */
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          active: 'hsl(var(--primary-active))',
          muted: 'hsl(var(--primary-muted))',
          light: 'hsl(var(--primary) / 0.8)',
        },

        /* ═══ Cards ═══ */
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          hover: 'hsl(var(--card-hover))',
        },

        /* ═══ Popover ═══ */
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        /* ═══ Secondary ═══ */
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },

        /* ═══ Muted ═══ */
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        /* ═══ Accent — 主色柔和版 ═══ */
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        /* ═══ Destructive ═══ */
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          light: 'hsl(var(--destructive) / 0.8)',
        },

        /* ═══ Semantic — 被稀释的信号 ═══ */
        success: {
          DEFAULT: 'hsl(var(--success))',
          muted: 'hsl(var(--success-muted))',
          light: 'hsl(var(--success) / 0.8)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          muted: 'hsl(var(--warning-muted))',
          light: 'hsl(var(--warning) / 0.8)',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          muted: 'hsl(var(--info-muted))',
          light: 'hsl(var(--info) / 0.8)',
        },
        favorite: {
          DEFAULT: 'hsl(var(--favorite))',
          muted: 'hsl(var(--favorite-muted))',
        },

        /* ═══ Borders & Input ═══ */
        border: {
          DEFAULT: 'hsl(var(--border))',
          hover: 'hsl(var(--border-hover))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        /* ═══ Chart ═══ */
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },

        /* ═══ Frequency Heatmap — 时间的痕迹 ═══ */
        freq: {
          hot: 'hsl(var(--freq-hot))',
          warm: 'hsl(var(--freq-warm))',
          normal: 'hsl(var(--freq-normal))',
          cool: 'hsl(var(--freq-cool))',
          cold: 'hsl(var(--freq-cold))',
        },
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-elevated)',
      },
      backdropBlur: {
        xs: '2px',
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
