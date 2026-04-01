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
          DEFAULT: '#4f8ef7',
          50: '#eef4ff',
          100: '#d9e8ff',
          200: '#bcd5ff',
          300: '#8eb9ff',
          400: '#6fa0f9',
          500: '#4f8ef7',
          600: '#2d6de8',
          700: '#1f57d5',
          800: '#1a46ab',
          900: '#1a3d87',
        },
        accent: '#7cffcb',
        success: {
          DEFAULT: '#7cffcb',
          light: 'rgba(124,255,203,0.12)',
          dark: '#4ae6b0',
        },
        danger: {
          DEFAULT: '#ff4d6d',
          light: 'rgba(255,77,109,0.12)',
          dark: '#ff1a47',
        },
        surface: '#0f1629',
        'surface-2': '#141d35',
        bg: '#0a0f1e',
        border: '#1e2b4e',
        muted: '#6b7599',
        text: '#e8eaf0',
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Boska', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(79,142,247,0.12)',
        glow: '0 0 40px rgba(79,142,247,0.2)',
        'glow-accent': '0 0 40px rgba(124,255,203,0.2)',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '32px 32px',
      },
    },
  },
  plugins: [],
}
