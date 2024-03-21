// @ts-check

import eslint from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'jest.config.ts'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettierRecommended,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigDirName: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    rules: {
      'max-lines': ['warn', 500],
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
  {
    // Once we remove the legacy vows tests in ./test, we can remove these JS-specific rules
    files: ['test/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'max-lines': 'off',
    },
  },
)
