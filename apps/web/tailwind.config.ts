import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: '#FAFAFA',
        'surface-2': '#F0F0F0',
        border: '#E2E2E2',
        'border-2': '#CCCCCC',
        text: '#111111',
        muted: '#888888',
        dim: '#BBBBBB',
        accent: '#FF4F00',
        red: '#E60000',
        green: '#16A34A',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      height: {
        'task-row': '36px',
      },
      animation: {
        'task-enter': 'task-enter 180ms ease-out both',
        'task-exit': 'task-exit 300ms ease-in forwards',
      },
      keyframes: {
        'task-enter': {
          from: { opacity: '0', transform: 'translateX(-6px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'task-exit': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
