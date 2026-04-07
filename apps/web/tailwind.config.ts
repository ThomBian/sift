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
        'task-enter': 'task-enter 180ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'task-exit': 'task-exit 250ms ease-in forwards',
        'late-breathe': 'late-breathe 3s ease-in-out infinite',
        'palette-in': 'palette-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
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
        'late-breathe': {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '1' },
        },
        'palette-in': {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
