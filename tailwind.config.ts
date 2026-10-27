import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: 'var(--brand-blue)',
          green: 'var(--brand-green)',
          orange: 'var(--brand-orange)',
          red: 'var(--brand-red)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
