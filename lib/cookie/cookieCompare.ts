import { safeToString } from '../utils'
import * as validators from '../validators'
import type { Cookie } from './cookie'
/* Section 5.4 part 2:
 * "*  Cookies with longer paths are listed before cookies with
 *     shorter paths.
 *
 *  *  Among cookies that have equal-length path fields, cookies with
 *     earlier creation-times are listed before cookies with later
 *     creation-times."
 */

/**
 * The maximum timestamp a cookie, in milliseconds. The value is (2^31 - 1) seconds since the Unix
 * epoch, corresponding to 2038-01-19.
 */
const MAX_TIME = 2147483647000

/** Compares two cookies for sorting. */
export function cookieCompare(a: Cookie, b: Cookie) {
  validators.validate(validators.isObject(a), safeToString(a))
  validators.validate(validators.isObject(b), safeToString(b))
  let cmp: number

  // descending for length: b CMP a
  const aPathLen = a.path ? a.path.length : 0
  const bPathLen = b.path ? b.path.length : 0
  cmp = bPathLen - aPathLen
  if (cmp !== 0) {
    return cmp
  }

  // ascending for time: a CMP b
  const aTime =
    a.creation && a.creation instanceof Date ? a.creation.getTime() : MAX_TIME
  const bTime =
    b.creation && b.creation instanceof Date ? b.creation.getTime() : MAX_TIME
  cmp = aTime - bTime
  if (cmp !== 0) {
    return cmp
  }

  // break ties for the same millisecond (precision of JavaScript's clock)
  cmp = (a.creationIndex ?? 0) - (b.creationIndex ?? 0)

  return cmp
}
