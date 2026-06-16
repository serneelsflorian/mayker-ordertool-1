import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#269A91',
          600: '#1f857d',
        },
        coral: {
          DEFAULT: '#D44858',
          600: '#b93b48',
        },
        bluegrey: '#9ABFCB',
        taupe: '#A39286',
        'bg-soft': '#F6F4F1',
      },
    },
  },
  plugins: [],
} satisfies Config
