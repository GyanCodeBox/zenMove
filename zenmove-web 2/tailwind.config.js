/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        navy: {
          50:  '#eef2f7',
          100: '#d5e0ec',
          200: '#a8bfd8',
          300: '#7a9ec4',
          400: '#4d7db0',
          500: '#2e5c96',
          600: '#1A3C5E',   // brand primary
          700: '#142f4a',
          800: '#0e2236',
          900: '#081522',
        },
        amber: {
          400: '#fbbf24',
          500: '#F4A261',   // brand accent
          600: '#e8914a',
        },
        teal: {
          500: '#2E86AB',   // brand teal
          600: '#2472933',
        },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
