import * as CookiePath from './cookie/cookiePath.js'

/**
 * Answers "does the request-path path-match a given cookie-path?" as per {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.4 | RFC6265 Section 5.1.4}.
 * This is essentially a prefix-match where cookiePath is a prefix of reqPath.
 *
 * @remarks
 * A request-path path-matches a given cookie-path if at least one of
 * the following conditions holds:
 *
 * - The cookie-path and the request-path are identical.
 * - The cookie-path is a prefix of the request-path, and the last character of the cookie-path is %x2F ("/").
 * - The cookie-path is a prefix of the request-path, and the first character of the request-path that is not included in the cookie-path is a %x2F ("/") character.
 *
 * @param reqPath - the path of the request
 * @param cookiePath - the path of the cookie
 * @deprecated This function will be removed in a future version of tough-cookie. If you rely on this function, please open an issue to discuss why it should remain public.
 * @public
 */
export function pathMatch(reqPath: string, cookiePath: string): boolean {
  const parsedReqPath = CookiePath.parse(reqPath)
  const parsedCookiePath = CookiePath.parse(cookiePath)
  if (parsedReqPath && parsedCookiePath) {
    return CookiePath.match(parsedReqPath, parsedCookiePath)
  }

  // Inputs that are not valid cookie-paths (do not start with "/") are rejected
  // by CookiePath.parse. Such inputs are out of spec, but earlier versions of
  // this function still matched them via prefix logic. Fall back to the
  // original algorithm to preserve that behavior for direct callers.
  if (cookiePath === reqPath) {
    return true
  }

  if (reqPath.indexOf(cookiePath) === 0) {
    if (cookiePath[cookiePath.length - 1] === '/') {
      return true
    }
    if (reqPath[cookiePath.length] === '/') {
      return true
    }
  }

  return false
}
