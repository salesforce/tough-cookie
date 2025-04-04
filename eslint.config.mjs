// @ts-check

import eslint from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { config, configs } from 'typescript-eslint'
import { flatConfigs as pluginImport } from 'eslint-plugin-import'
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
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    files: ['lib/__tests__/**'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // We only run tests in node, so we can use node's builtins
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    ...configs.disableTypeChecked,
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
