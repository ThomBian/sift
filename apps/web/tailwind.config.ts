import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#0e0e0e',
        'surface-2': '#141414',
        border: '#1f1f1f',
        'border-2': '#262626',
        text: '#e2e2e2',
        muted: '#666666',
        dim: '#444444',
        accent: '#5E6AD2',
        red: '#ff4d4d',
        green: '#4ade80',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      height: {
        'task-row': '36px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(94, 106, 210, 0.12), 0 12px 40px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
