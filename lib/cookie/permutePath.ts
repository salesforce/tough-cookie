import * as CookiePath from './cookiePath.js'

/**
 * Generates the permutation of all possible values that {@link pathMatch} the `path` parameter.
 * The array is in longest-to-shortest order.  Useful when building custom {@link Store} implementations.
 *
 * @example
 * ```
 * permutePath('/foo/bar/')
 * // ['/foo/bar/', '/foo/bar', '/foo', '/']
 * ```
 *
 * @param path - the path to generate permutations for
 * @deprecated This function will be removed in a future version of tough-cookie. If you rely on this function, please open an issue to discuss why it should remain public.
 * @public
 */
export function permutePath(path: string): string[] {
  const parsed = CookiePath.parse(path)
  if (parsed) {
    return CookiePath.permute(parsed)
  }

  // Inputs that are not valid cookie-paths (do not start with "/") are rejected
  // by CookiePath.parse. Such inputs are out of spec, but earlier versions of
  // this function still produced permutations for them. Fall back to the
  // original algorithm to preserve that behavior for direct callers.
  const permutations = [path]
  let current = path
  while (current.length > 1) {
    const lindex = current.lastIndexOf('/')
    if (lindex === 0) {
      break
    }
    current = current.slice(0, lindex)
    permutations.push(current)
  }
  permutations.push('/')
  return permutations
}
