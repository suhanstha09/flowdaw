/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#1a1a1e',
        panel: '#222227',
        raised: '#2a2a30',
        hover: '#32323a',
        active: '#3a3a44',
        border: '#3a3a44',
        'border-bright': '#555566',
        accent: '#ff6b00',
        'accent2': '#ff9a00',
        'accent-dim': '#7a3300',
        daw: {
          green: '#00e676',
          blue: '#40c4ff',
          purple: '#ce93d8',
          red: '#ff5252',
          yellow: '#ffea00',
        },
        text: {
          DEFAULT: '#e0e0e8',
          dim: '#888899',
          faint: '#44445a',
        }
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
        ui: ['Barlow Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
