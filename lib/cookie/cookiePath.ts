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
export namespace CookiePath {
  /**
   * The root cookie path (`/`).
   */
  export const ROOT = '/' as CookiePath

  /**
   * Validates that the input starts with `/` and returns a {@link CookiePath},
   * or `undefined` if the input is not a valid cookie path.
   *
   * @param input - the string to validate
   */
  export function parse(input: string): CookiePath | undefined {
    if (!input.startsWith('/')) return undefined
    return input as CookiePath
  }

  /**
   * Returns the parent path by stripping the last segment, or `undefined`
   * if the path is already the root (`/`).
   *
   * @param path - a validated cookie path
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
   */
  export function match(reqPath: CookiePath, cookiePath: CookiePath): boolean {
    if (cookiePath === reqPath) {
      return true
    }

    const idx = reqPath.indexOf(cookiePath)
    if (idx === 0) {
      if (cookiePath[cookiePath.length - 1] === '/') {
        return true
      }

      if (reqPath.startsWith(cookiePath) && reqPath[cookiePath.length] === '/') {
        return true
      }
    }

    return false
  }
}
