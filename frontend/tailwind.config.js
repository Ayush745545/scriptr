/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000', // Pure Black
        surface: '#1C1C1E',    // Elevated surfaces
        card: '#2C2C2E',       // Cards, inputs
        accent: {
          DEFAULT: '#FF9500', // Apple Orange
          hover: '#FFAC33',
          glow: 'rgba(255, 149, 0, 0.3)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#98989D',
          tertiary: '#636366',
        },
        border: 'rgba(255, 255, 255, 0.1)',
        success: '#30D158',
        warning: '#FF9F0A',
        danger: '#FF453A',
        info: '#0A84FF',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['SF Pro Display', 'Inter', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        hindi: ['Tiro Devanagari Hindi', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(255, 149, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
