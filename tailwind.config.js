/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,tsx,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chaos-bg': '#0a0a0c',
        'chaos-green': '#00ff88',
        'chaos-yellow': '#ffcc00',
        'chaos-gray': '#3a3a3c',
        'chaos-red': '#ff3366',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        glow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        }
      }
    },
  },
  plugins: [],
}
