/** The brand is private so values must be constructed through CookieValue.parse. */
declare const cookieValueBrand: unique symbol

/** A validated cookie value per RFC 6265 Section 4.1.1. @internal */
export type CookieValue = string & { readonly [cookieValueBrand]: true }

// RFC 6265 Section 4.1.1 defines cookie-octet as:
// %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
// US-ASCII characters excluding CTLs, whitespace, DQUOTE, comma, semicolon, and backslash.
const INVALID_COOKIE_OCTET = /[^\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]/

/** Constructs validated cookie values without changing their value. @internal */
export const CookieValue = {
  /** Parse and validate a cookie value per RFC 6265 Section 4.1.1. */
  parse(input: string): CookieValue | undefined {
    if (INVALID_COOKIE_OCTET.test(input)) {
      return undefined
    }
    return input as CookieValue
  },
}
