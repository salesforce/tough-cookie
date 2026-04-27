import { CookiePath } from './cookiePath.js'

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
 * @deprecated Use {@link CookiePath.permute} instead with a validated {@link CookiePath} value.
 * @public
 */
export function permutePath(path: string): string[] {
  const parsed = CookiePath.parse(path)
  if (!parsed) return ['/']
  return CookiePath.permute(parsed)
}
