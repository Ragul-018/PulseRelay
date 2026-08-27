/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PulseRelay brand palette
        pulse: {
          50:  '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
          950: '#1e3a8a',
        },
        emergency: {
          red:    '#ef4444',
          amber:  '#f59e0b',
          green:  '#22c55e',
          cyan:   '#06b6d4',
        },
        surface: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1a2035',
          600: '#1f2937',
          500: '#2a3246',
          400: '#374151',
          300: '#4b5563',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-dot':  'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe':    'breathe 4s ease-in-out infinite',
        'slide-up':   'slide-up 0.5s ease-out',
        'fade-in':    'fade-in 0.4s ease-out',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%':   { transform: 'scale(0.9)', opacity: '1' },
          '50%':  { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.1)' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%':      { transform: 'scale(1.05)', opacity: '1' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow': {
          '0%':   { boxShadow: '0 0 20px rgba(92, 124, 250, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(92, 124, 250, 0.6)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
