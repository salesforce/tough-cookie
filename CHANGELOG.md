# Changelog

All notable changes to this project will be documented in this file.

## 4.X.X

### Minor Changes
- Added parameter checking to setCookie so as to error out when no URL was passed in

## X.Y.Z

### Minor Changes
- Added loose mode to the serialized options. Now a serialized cookie jar with loose mode enabled will honor that flag when deserialized.
- Added allowSpecialUseDomain and prefixSecurity to the serialized options. Now any options accepted passed in to the cookie jar will be honored when serialized and deserialized.
- Added handling of IPv6 host names so that they would work with tough cookie.

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



