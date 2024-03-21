// RFC6265 S5.1.4 Paths and Path-Match

import type { Nullable } from '../utils'

/*
 * "The user agent MUST use an algorithm equivalent to the following algorithm
 * to compute the default-path of a cookie:"
 *
 * Assumption: the path (and not query part or absolute uri) is passed in.
 */
export function defaultPath(path?: Nullable<string>): string {
  // "2. If the uri-path is empty or if the first character of the uri-path is not
  // a %x2F ("/") character, output %x2F ("/") and skip the remaining steps.
  if (!path || path.slice(0, 1) !== '/') {
    return '/'
  }

  // "3. If the uri-path contains no more than one %x2F ("/") character, output
  // %x2F ("/") and skip the remaining step."
  if (path === '/') {
    return path
  }

  const rightSlash = path.lastIndexOf('/')
  if (rightSlash === 0) {
    return '/'
  }

  // "4. Output the characters of the uri-path from the first character up to,
  // but not including, the right-most %x2F ("/")."
  return path.slice(0, rightSlash)
}
