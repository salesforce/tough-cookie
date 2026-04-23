// @ts-check

import eslint from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { config, configs } from 'typescript-eslint'
import { flatConfigs as pluginImport } from 'eslint-plugin-import-x'
import globals from 'globals'
import vitest from '@vitest/eslint-plugin'

export default config(
  {
    ignores: ['dist'],
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
      'import-x/no-nodejs-modules': 'error',
      'no-control-regex': 'off',
    },
  },
  {
    files: ['lib/__tests__/**'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // We only run tests in node, so we can use node's builtins
      'import-x/no-nodejs-modules': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    ...configs.disableTypeChecked,
  },
)
