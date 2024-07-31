export { MemoryCookieStore, MemoryCookieStoreIndex } from '../memstore.js'
export { pathMatch } from '../pathMatch.js'
export { permuteDomain } from '../permuteDomain.js'
export { getPublicSuffix, GetPublicSuffixOptions } from '../getPublicSuffix.js'
export { Store } from '../store.js'
export { ParameterError } from '../validators.js'
export { version } from '../version.js'
export { Callback, ErrorCallback, Nullable } from '../utils.js'
export { canonicalDomain } from './canonicalDomain.js'
export {
  PrefixSecurityEnum,
  SerializedCookie,
  SerializedCookieJar,
} from './constants.js'
export { Cookie, CreateCookieOptions, ParseCookieOptions } from './cookie.js'
export { cookieCompare } from './cookieCompare.js'
export {
  CookieJar,
  CreateCookieJarOptions,
  GetCookiesOptions,
  SetCookieOptions,
} from './cookieJar.js'
export { defaultPath } from './defaultPath.js'
export { domainMatch } from './domainMatch.js'
export { formatDate } from './formatDate.js'
export { parseDate } from './parseDate.js'
export { permutePath } from './permutePath.js'

import { Cookie, ParseCookieOptions } from './cookie.js'

/**
 * {@inheritDoc Cookie.parse}
 * @public
 */
export function parse(
  str: string,
  options?: ParseCookieOptions,
): Cookie | undefined {
  return Cookie.parse(str, options)
}

/**
 * {@inheritDoc Cookie.fromJSON}
 * @public
 */
export function fromJSON(str: unknown): Cookie | undefined {
  return Cookie.fromJSON(str)
}
