/** The brand is private so names must be constructed through CookieName.parse. */
declare const cookieNameBrand: unique symbol

/** A non-empty HTTP token used as a cookie name. @internal */
export type CookieName = string & { readonly [cookieNameBrand]: true }

// RFC 6265 Section 4.1.1 uses the token grammar from RFC 2616 Section 2.2.
// RFC 6265bis references RFC 9110 Section 5.6.2 instead. Both allow the same
// characters: RFC 2616 by excluding CTLs and separators, RFC 9110 as an
// explicit `tchar` list.
const INVALID_TOKEN_CHARACTER =
  /[^\x21\x23-\x27\x2A\x2B\x2D\x2E\x30-\x39\x41-\x5A\x5E-\x7A\x7C\x7E]/

/** Constructs validated cookie names without changing their value. @internal */
export const CookieName = {
  parse(input: string): CookieName | undefined {
    if (input.length === 0 || INVALID_TOKEN_CHARACTER.test(input)) {
      return undefined
    }
    return input as CookieName
  },
}
