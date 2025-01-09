// @ts-check

import eslint from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
// eslint-disable-next-line import/no-unresolved
import tseslint from 'typescript-eslint'
import { flatConfigs as pluginImport } from 'eslint-plugin-import'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist', 'jest.config.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  pluginImport.recommended,
  // @ts-expect-error not sure why the plugin isn't type correctly, but it works...
  pluginImport.typescript,
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
      '@typescript-eslint/explicit-function-return-type': 'error',
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    files: ['lib/__tests__/**', 'test/**'],
    rules: {
      // We only run tests in node, so we can use node's builtins
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    // Once we remove the legacy vows tests in ./test, we can remove these JS-specific rules
    files: ['test/**/*.js', 'eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
