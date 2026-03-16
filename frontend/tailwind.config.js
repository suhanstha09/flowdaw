/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Core backgrounds ── */
        base:     '#1a1a1a',
        panel:    '#252525',
        'panel-alt': '#1e1e1e',
        raised:   '#2e2e2e',
        hover:    '#3a3a3a',

        /* ── Borders ── */
        border:        '#0d0d0d',
        'border-mid':  '#333333',
        'border-hi':   '#444444',

        /* ── Accent ── */
        accent:    '#ff6a00',
        accent2:   '#e8a000',
        'accent-dim': '#7a3000',

        /* ── Text ── */
        text: {
          DEFAULT: '#e0e0e0',
          dim:     '#888888',
          faint:   '#555555',
        },

        /* ── DAW-specific status colors ── */
        daw: {
          green:  '#00e676',
          blue:   '#00c8ff',
          red:    '#ff5252',
          yellow: '#ffea00',
          purple: '#ce93d8',
        },

        /* ── Channel rack rows ── */
        rack: {
          a: '#222222',
          b: '#1e1e1e',
        },
      },

      fontFamily: {
        /* FL Studio uses Segoe UI (Windows) or a compact sans-serif */
        sans:    ["'Segoe UI'", 'Arial', 'sans-serif'],
        display: ["'Segoe UI'", 'Arial', 'sans-serif'],
        mono:    ["'Courier New'", 'Consolas', 'monospace'],
        ui:      ["'Segoe UI'", 'Arial', 'sans-serif'],
      },

      fontSize: {
        'xxs': '9px',
        'xs':  '10px',
        'sm':  '11px',
        'base':'12px',
      },

      borderRadius: {
        DEFAULT: '1px',
        sm:      '1px',
        md:      '2px',
        lg:      '2px',
        xl:      '2px',
        '2xl':   '2px',
        full:    '9999px',
      },

      boxShadow: {
        'fl-float': '2px 2px 6px rgba(0,0,0,0.6)',
        'fl-glow-orange': '0 0 8px rgba(255,106,0,0.55)',
        'fl-glow-green':  '0 0 6px rgba(0,230,118,0.7)',
        'fl-inset': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
