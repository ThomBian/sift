module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier', // Integrates ESLint with Prettier
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: ['./tsconfig.base.json', './apps/web/tsconfig.json', './packages/shared/tsconfig.json'], // Point to tsconfig files
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    '@typescript-eslint',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist/', 'build/', 'node_modules/'],
  rules: {
    // Add custom rules or overrides here if needed
    'react/react-in-jsx-scope': 'off', // Not needed with React 18+ import
    '@typescript-eslint/no-explicit-any': 'warn', // Example: Turn 'any' usage into a warning
  },
};
