/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#effefb',
          100: '#c8fff3',
          500: '#10bfa9',
          700: '#087b73',
          800: '#0b5f5b',
          900: '#083f3f',
        },
        neon: '#b7ff3c',
        mint: '#eefbf6',
      },
      boxShadow: {
        soft: '0 18px 60px rgba(8, 95, 91, 0.12)',
        glow: '0 18px 50px rgba(183, 255, 60, 0.22)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(8,95,91,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(8,95,91,.08) 1px, transparent 1px)',
        'grid-dark': 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
