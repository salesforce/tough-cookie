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
}
