/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3a5c',
          50: '#f0f5fb',
          100: '#dce9f5',
          200: '#b8d3eb',
          300: '#8bb6db',
          400: '#5a91c5',
          500: '#3672ae',
          600: '#275892',
          700: '#1a3a5c',
          800: '#152e49',
          900: '#0f2238',
        },
        success: {
          DEFAULT: '#16a34a',
          light: '#dcfce7',
          dark: '#14532d',
        },
        danger: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
          dark: '#7f1d1d',
        },
        surface: '#f8fafc',
        border: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
