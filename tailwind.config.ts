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
        void: '#070F1D',
        ink: '#0B2540',
        'ink-2': '#0F2F52',
        mist: '#E8ECF1',
        muted: '#6E7886',
        cyan: { DEFAULT: '#00B8D4', bright: '#00E5FF' },
        purple: { DEFAULT: '#A56BFF' },
        amber: { DEFAULT: '#FC6818', 50:'#FFF4EC',100:'#FFE6D4',200:'#FFC9A8',300:'#FFA878',400:'#FF8A4C',500:'#FC6818',600:'#E5550A',700:'#B8420A',800:'#8F3308',900:'#6B2A07',950:'#3D1704' },
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
