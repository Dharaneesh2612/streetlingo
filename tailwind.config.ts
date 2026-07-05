import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          sky: '#7dd3fc',
          indigo: '#818cf8',
          lavender: '#c4b5fd',
          mint: '#86efac',
          peach: '#fed7aa',
          aqua: '#7dd3f6',
          slate: '#64748b',
        },
      },
      boxShadow: {
        soft: '0 24px 80px rgba(15, 23, 42, 0.09)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
