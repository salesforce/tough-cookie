import type { Nullable } from '../utils.js'

declare const tag: unique symbol

/**
 * A nominal type representing a validated cookie path that starts with `/`.
 *
 * Construct via {@link CookiePath.parse} or {@link CookiePath.ROOT}.
 * Use {@link CookiePath.match} for RFC 6265 §5.1.4 path matching
 * and {@link CookiePath.defaultPath} for RFC 6265 §5.1.4 default path computation.
 *
 * @public
 */
export type CookiePath = string & { readonly [tag]: true }

/**
 * @public
 */
export const CookiePath = {
  /**
   * The root cookie path (`/`).
   */
  ROOT: '/' as CookiePath,

  /**
   * Validates that the input starts with `/` and returns a {@link CookiePath},
   * or `undefined` if the input is not a valid cookie path.
   *
   * @param input - the string to validate
   */
  parse(input: string): CookiePath | undefined {
    if (!input.startsWith('/')) return undefined
    return input as CookiePath
  },

  /**
   * Returns the parent path by stripping the last segment, or `undefined`
   * if the path is already the root (`/`).
   *
   * @param path - a validated cookie path
   */
  parentPath(path: CookiePath): CookiePath | undefined {
    if (path === '/') return undefined
    const lastSlashIndex = path.lastIndexOf('/')
    if (lastSlashIndex === 0) return CookiePath.ROOT
    return path.slice(0, lastSlashIndex) as CookiePath
  },

  /**
   * Computes the default cookie path from a request URI path per
   * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.4 | RFC 6265 §5.1.4}.
   *
   * @param path - the path portion of the request URI
   */
  defaultPath(path?: Nullable<string>): CookiePath {
    const requestPath = CookiePath.parse(path ?? '') ?? CookiePath.ROOT
    return CookiePath.parentPath(requestPath) ?? CookiePath.ROOT
  },

  /**
   * Determines if a request path matches a cookie path per
   * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.4 | RFC 6265 §5.1.4}.
   *
   * @param reqPath - the path of the request
   * @param cookiePath - the path of the cookie
   */
  match(reqPath: CookiePath, cookiePath: CookiePath): boolean {
    if (cookiePath === reqPath) {
      return true
    }

    const idx = reqPath.indexOf(cookiePath)
    if (idx === 0) {
      if (cookiePath[cookiePath.length - 1] === '/') {
        return true
      }

      if (
        reqPath.startsWith(cookiePath) &&
        reqPath[cookiePath.length] === '/'
      ) {
        return true
      }
    }

    return false
  },

  /**
   * Generates all possible path values that {@link CookiePath.match | match} the given path.
   * The array is in longest-to-shortest order.
   *
   * @param path - a validated cookie path
   */
  permute(path: CookiePath): CookiePath[] {
    if (path === '/') {
      return [CookiePath.ROOT]
    }
    const permutations: CookiePath[] = [path]
    let current: string = path
    while (current.length > 1) {
      const lindex = current.lastIndexOf('/')
      if (lindex === 0) {
        break
      }
      current = current.slice(0, lindex)
      permutations.push(current as CookiePath)
    }
    permutations.push(CookiePath.ROOT)
    return permutations
  },
}
