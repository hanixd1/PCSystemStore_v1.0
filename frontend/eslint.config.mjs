import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react/jsx-key': 'error',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
    },
  },
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
