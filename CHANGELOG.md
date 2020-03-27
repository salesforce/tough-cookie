# Changelog

All notable changes to this project will be documented in this file.

## 4.0.0

### Breaking Changes (Major Version)

- Modernized JS Syntax
  - Use ESLint and Prettier to apply consistent, modern formatting (add dependency on `universalify`, `eslint` and `prettier`)
- Upgraded version dependencies for `psl` and `async`
- Re-order parameters for `findCookies()` - callback fn has to be last in order to comply with `universalify`
- Use Classes instead of function prototypes to define classes
    - Might break people using `.call()` to do inheritance using function prototypes

### Minor Changes
- SameSite cookie support
- Cookie prefix support 
- Support for promises
- '.local' support 
- Numerous bug fixes!



