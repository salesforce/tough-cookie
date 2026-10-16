import type { Nullable } from '../utils.js'

declare const tag: unique symbol

/**
 * A nominal type representing a validated cookie path that starts with `/`.
 *
 * Construct via {@link parse} or {@link ROOT}.
 * Use {@link match} for RFC 6265 §5.1.4 path matching
 * and {@link defaultPath} for RFC 6265 §5.1.4 default path computation.
 *
 * @internal
 */
export type CookiePath = string & { readonly [tag]: true }

/**
 * The root cookie path (`/`).
 *
 * @internal
 */
export const ROOT = '/' as CookiePath

/**
 * Validates that the input starts with `/` and returns a {@link CookiePath},
 * or `undefined` if the input is not a valid cookie path.
 *
 * @param input - the string to validate
 * @internal
 */
export function parse(input: string): CookiePath | undefined {
  return input.startsWith('/') ? (input as CookiePath) : undefined
}

/**
 * Returns the parent path by stripping the last segment, or `undefined`
 * if the path is already the root (`/`).
 *
 * @param path - a validated cookie path
 * @internal
 */
export function parentPath(path: CookiePath): CookiePath | undefined {
  if (path === '/') return undefined
  const lastSlashIndex = path.lastIndexOf('/')
  if (lastSlashIndex === 0) return ROOT
  return path.slice(0, lastSlashIndex) as CookiePath
}

/**
 * Computes the default cookie path from a request URI path per
 * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.4 | RFC 6265 §5.1.4}.
 *
 * @param path - the path portion of the request URI
 * @internal
 */
export function defaultPath(path?: Nullable<string>): CookiePath {
  const requestPath = parse(path ?? '') ?? ROOT
  return parentPath(requestPath) ?? ROOT
}

/**
 * Determines if a request path matches a cookie path per
 * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.4 | RFC 6265 §5.1.4}.
 *
 * @param reqPath - the path of the request
 * @param cookiePath - the path of the cookie
 * @internal
 */
export function match(reqPath: CookiePath, cookiePath: CookiePath): boolean {
  // "The cookie-path and the request-path are identical."
  if (reqPath === cookiePath) return true
  // The remaining conditions require the cookie-path to be a prefix.
  if (!reqPath.startsWith(cookiePath)) return false
  // "...and the last character of the cookie-path is %x2F ("/")", or "...and
  // the first character of the request-path not included in the cookie-path is
  // a %x2F ("/") character."
  return (
    cookiePath[cookiePath.length - 1] === '/' ||
    reqPath[cookiePath.length] === '/'
  )
}

/**
 * Generates all possible path values that {@link match} the given path.
 * The array is in longest-to-shortest order.
 *
 * @param path - a validated cookie path
 * @internal
 */
export function permute(path: CookiePath): CookiePath[] {
  if (path === '/') {
    return [ROOT]
  }
  const permutations = [path]
  let current = path
  while (current.length > 1) {
    const lindex = current.lastIndexOf('/')
    if (lindex === 0) {
      break
    }
    current = current.slice(0, lindex) as CookiePath
    permutations.push(current)
  }
  permutations.push(ROOT)
  return permutations
}
