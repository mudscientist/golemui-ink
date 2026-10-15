import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', '**/vite.config.*.timestamp*', '**/vitest.config.*.timestamp*'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}'],
    ...reactPlugin.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}'],
    ...reactPlugin.configs.flat['jsx-runtime'],
  },
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // TypeScript already checks the props.
      'react/prop-types': 'off',
      'import/no-namespace': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Last, so it turns off the rules that conflict with Prettier.
  prettierConfig,
);
