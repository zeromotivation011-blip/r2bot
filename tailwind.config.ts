import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#050810',
        ink: '#0B2540',
        'ink-2': '#0F2F52',
        mist: '#E8ECF1',
        muted: '#6E7886',
        cyan: { DEFAULT: '#00B8D4', bright: '#00E5FF' },
        purple: { DEFAULT: '#A56BFF' },
        amber: { DEFAULT: '#FFB020' },
        green: { DEFAULT: '#22C55E' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
