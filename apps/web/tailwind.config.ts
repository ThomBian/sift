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
        'task-exit': 'task-exit 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'palette-in': 'palette-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'palette-out': 'palette-out 100ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'modal-in': 'modal-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'modal-out': 'modal-out 120ms ease-in forwards',
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
        'palette-in': {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'palette-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'modal-out': {
          from: { opacity: '1', transform: 'scale(1) translateY(0)' },
          to: { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
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
