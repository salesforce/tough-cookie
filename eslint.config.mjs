// @ts-check

import eslint from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { config, configs } from 'typescript-eslint'
import { flatConfigs as pluginImport } from 'eslint-plugin-import'
import globals from 'globals'

export default config(
  {
    ignores: ['dist', 'jest.config.ts'],
  },
  eslint.configs.recommended,
  ...configs.strictTypeChecked,
  pluginImport.recommended,
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
    ...configs.disableTypeChecked,
    rules: {
      ...configs.disableTypeChecked.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // other configuration are omitted for brevity
    settings: {
      'import/resolver': {
        typescript: {}, // this loads <rootdir>/tsconfig.json to eslint
      },
    },
  },
)
