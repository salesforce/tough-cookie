import { getPublicSuffix } from '../getPublicSuffix.js'
import * as validators from '../validators.js'
import { ParameterError } from '../validators.js'
import { Store } from '../store.js'
import { MemoryCookieStore } from '../memstore.js'
import { pathMatch } from '../pathMatch.js'
import { Cookie } from './cookie.js'
import {
  Callback,
  createPromiseCallback,
  ErrorCallback,
  inOperator,
  Nullable,
  safeToString,
} from '../utils.js'
import { canonicalDomain } from './canonicalDomain.js'
import {
  IP_V6_REGEX_OBJECT,
  PrefixSecurityEnum,
  SerializedCookieJar,
} from './constants.js'
import { defaultPath } from './defaultPath.js'
import { domainMatch } from './domainMatch.js'
import { cookieCompare } from './cookieCompare.js'
import { version } from '../version.js'
import { isPotentiallyTrustworthy } from './secureContext.js'

const defaultSetCookieOptions: SetCookieOptions = {
  loose: false,
  sameSiteContext: undefined,
  ignoreError: false,
  http: true,
}

/**
 * Configuration options used when calling `CookieJar.setCookie(...)`
 * @public
 */
export interface SetCookieOptions {
  /**
   * Controls if a cookie string should be parsed using `loose` mode or not.
   * See {@link Cookie.parse} and {@link ParseCookieOptions} for more details.
   *
   * Defaults to `false` if not provided.
   */
  loose?: boolean | undefined
  /**
   * Set this to 'none', 'lax', or 'strict' to enforce SameSite cookies upon storage.
   *
   * - `'strict'` - If the request is on the same "site for cookies" (see the RFC draft
   *     for more information), pass this option to add a layer of defense against CSRF.
   *
   * - `'lax'` - If the request is from another site, but is directly because of navigation
   *     by the user, such as, `<link type=prefetch>` or `<a href="...">`, then use `lax`.
   *
   * - `'none'` - This indicates a cross-origin request.
   *
   * - `undefined` - SameSite is not enforced! This can be a valid use-case for when
   *     CSRF isn't in the threat model of the system being built.
   *
   * Defaults to `undefined` if not provided.
   *
   * @remarks
   * - It is highly recommended that you read {@link https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-02##section-8.8 | RFC6265bis - Section 8.8}
   *    which discusses security considerations and defence on SameSite cookies in depth.
   */
  sameSiteContext?: 'strict' | 'lax' | 'none' | undefined
  /**
   * Silently ignore things like parse errors and invalid domains. Store errors aren't ignored by this option.
   *
   * Defaults to `false` if not provided.
   */
  ignoreError?: boolean | undefined
  /**
   * Indicates if this is an HTTP or non-HTTP API. Affects HttpOnly cookies.
   *
   * Defaults to `true` if not provided.
   */
  http?: boolean | undefined
  /**
   * Forces the cookie creation and access time of cookies to this value when stored.
   *
   * Defaults to `Date.now()` if not provided.
   */
  now?: Date | undefined
}

const defaultGetCookieOptions: GetCookiesOptions = {
  http: true,
  expire: true,
  allPaths: false,
  sameSiteContext: undefined,
  sort: undefined,
}

/**
 * Configuration options used when calling `CookieJar.getCookies(...)`.
 * @public
 */
export interface GetCookiesOptions {
  /**
   * Indicates if this is an HTTP or non-HTTP API. Affects HttpOnly cookies.
   *
   * Defaults to `true` if not provided.
   */
  http?: boolean | undefined
  /**
   * Perform `expiry-time` checking of cookies and asynchronously remove expired
   * cookies from the store.
   *
   * @remarks
   * - Using `false` returns expired cookies and does not remove them from the
   *     store, which is potentially useful for replaying `Set-Cookie` headers.
   *
   * Defaults to `true` if not provided.
   */
  expire?: boolean | undefined
  /**
   * If `true`, do not scope cookies by path. If `false`, then RFC-compliant path scoping will be used.
   *
   * @remarks
   * - May not be supported by the underlying store (the default {@link MemoryCookieStore} supports it).
   *
   * Defaults to `false` if not provided.
   */
  allPaths?: boolean | undefined
  /**
   * Set this to 'none', 'lax', or 'strict' to enforce SameSite cookies upon retrieval.
   *
   * - `'strict'` - If the request is on the same "site for cookies" (see the RFC draft
   *     for more information), pass this option to add a layer of defense against CSRF.
   *
   * - `'lax'` - If the request is from another site, but is directly because of navigation
   *     by the user, such as, `<link type=prefetch>` or `<a href="...">`, then use `lax`.
   *
   * - `'none'` - This indicates a cross-origin request.
   *
   * - `undefined` - SameSite is not enforced! This can be a valid use-case for when
   *     CSRF isn't in the threat model of the system being built.
   *
   * Defaults to `undefined` if not provided.
   *
   * @remarks
   * - It is highly recommended that you read {@link https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-02##section-8.8 | RFC6265bis - Section 8.8}
   *    which discusses security considerations and defence on SameSite cookies in depth.
   */
  sameSiteContext?: 'none' | 'lax' | 'strict' | undefined
  /**
   * Flag to indicate if the returned cookies should be sorted or not.
   *
   * Defaults to `undefined` if not provided.
   */
  sort?: boolean | undefined
}

/**
 * Configuration settings to be used with a {@link CookieJar}.
 * @public
 */
export interface CreateCookieJarOptions {
  /**
   * Reject cookies that match those defined in the {@link https://publicsuffix.org/ | Public Suffix List} (e.g.; domains like "com" and "co.uk").
   *
   * Defaults to `true` if not specified.
   */
  rejectPublicSuffixes?: boolean | undefined
  /**
   * Accept malformed cookies like `bar` and `=bar`, which have an implied empty name but are not RFC-compliant.
   *
   * Defaults to `false` if not specified.
   */
  looseMode?: boolean | undefined
  /**
   * Controls how cookie prefixes are handled. See {@link PrefixSecurityEnum}.
   *
   * Defaults to `silent` if not specified.
   */
  prefixSecurity?: 'strict' | 'silent' | 'unsafe-disabled' | undefined
  /**
   * Accepts {@link https://datatracker.ietf.org/doc/html/rfc6761 | special-use domains } such as `local`.
   * This is not in the standard, but is used sometimes on the web and is accepted by most browsers. It is
   * also useful for testing purposes.
   *
   * Defaults to `true` if not specified.
   */
  allowSpecialUseDomain?: boolean | undefined
  /**
   * Flag to indicate if localhost and loopback addresses with an unsecure scheme should store and retrieve `Secure` cookies.
   *
   * If `true`, localhost, loopback addresses or similarly local addresses are treated as secure contexts
   * and thus will store and retrieve `Secure` cookies even with an unsecure scheme.
   *
   * If `false`, only secure schemes (`https` and `wss`) will store and retrieve `Secure` cookies.
   *
   * @remarks
   * When set to `true`, the {@link https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin | potentially trustworthy}
   *  algorithm is followed to determine if a URL is considered a secure context.
   */
  allowSecureOnLocal?: boolean | undefined
}

const SAME_SITE_CONTEXT_VAL_ERR =
  'Invalid sameSiteContext option for getCookies(); expected one of "strict", "lax", or "none"'

type UrlContext = {
  hostname: string
  pathname: string
  protocol: string
}

function getCookieContext(url: unknown): UrlContext {
  if (
    url &&
    typeof url === 'object' &&
    'hostname' in url &&
    typeof url.hostname === 'string' &&
    'pathname' in url &&
    typeof url.pathname === 'string' &&
    'protocol' in url &&
    typeof url.protocol === 'string'
  ) {
    return {
      hostname: url.hostname,
      pathname: url.pathname,
      protocol: url.protocol,
    }
  } else if (typeof url === 'string') {
    try {
      return new URL(decodeURI(url))
    } catch {
      return new URL(url)
    }
  } else {
    throw new ParameterError('`url` argument is not a string or URL.')
  }
}

type SameSiteLevel = keyof (typeof Cookie)['sameSiteLevel']
function checkSameSiteContext(value: string): SameSiteLevel | undefined {
  const context = String(value).toLowerCase()
  if (context === 'none' || context === 'lax' || context === 'strict') {
    return context
  } else {
    return undefined
  }
}

/**
 *  If the cookie-name begins with a case-sensitive match for the
 *  string "__Secure-", abort these steps and ignore the cookie
 *  entirely unless the cookie's secure-only-flag is true.
 * @param cookie
 * @returns boolean
 */
function isSecurePrefixConditionMet(cookie: Cookie): boolean {
  const startsWithSecurePrefix =
    typeof cookie.key === 'string' && cookie.key.startsWith('__Secure-')
  return !startsWithSecurePrefix || cookie.secure
}

/**
 *  If the cookie-name begins with a case-sensitive match for the
 *  string "__Host-", abort these steps and ignore the cookie
 *  entirely unless the cookie meets all the following criteria:
 *    1.  The cookie's secure-only-flag is true.
 *    2.  The cookie's host-only-flag is true.
 *    3.  The cookie-attribute-list contains an attribute with an
 *        attribute-name of "Path", and the cookie's path is "/".
 * @param cookie
 * @returns boolean
 */
function isHostPrefixConditionMet(cookie: Cookie): boolean {
  const startsWithHostPrefix =
    typeof cookie.key === 'string' && cookie.key.startsWith('__Host-')
  return (
    !startsWithHostPrefix ||
    Boolean(
      cookie.secure &&
        cookie.hostOnly &&
        cookie.path != null &&
        cookie.path === '/',
    )
  )
}

type PrefixSecurityValue =
  (typeof PrefixSecurityEnum)[keyof typeof PrefixSecurityEnum]
function getNormalizedPrefixSecurity(
  prefixSecurity: string,
): PrefixSecurityValue {
  const normalizedPrefixSecurity = prefixSecurity.toLowerCase()
  /* The three supported options */
  switch (normalizedPrefixSecurity) {
    case PrefixSecurityEnum.STRICT:
    case PrefixSecurityEnum.SILENT:
    case PrefixSecurityEnum.DISABLED:
      return normalizedPrefixSecurity
    default:
      return PrefixSecurityEnum.SILENT
  }
}

/**
 * A CookieJar is for storage and retrieval of {@link Cookie} objects as defined in
 * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.3 | RFC6265 - Section 5.3}.
 *
 * It also supports a pluggable persistence layer via {@link Store}.
 * @public
 */
export class CookieJar {
  private readonly rejectPublicSuffixes: boolean
  private readonly enableLooseMode: boolean
  private readonly allowSpecialUseDomain: boolean
  private readonly allowSecureOnLocal: boolean

  /**
   * The configured {@link Store} for the {@link CookieJar}.
   */
  readonly store: Store

  /**
   * The configured {@link PrefixSecurityEnum} value for the {@link CookieJar}.
   */
  readonly prefixSecurity: string

  /**
   * Creates a new `CookieJar` instance.
   *
   * @remarks
   * - If a custom store is not passed to the constructor, an in-memory store ({@link MemoryCookieStore} will be created and used.
   * - If a boolean value is passed as the `options` parameter, this is equivalent to passing `{ rejectPublicSuffixes: <value> }`
   *
   * @param store - a custom {@link Store} implementation (defaults to {@link MemoryCookieStore})
   * @param options - configures how cookies are processed by the cookie jar
   */
  constructor(
    store?: Nullable<Store>,
    options?: CreateCookieJarOptions | boolean,
  ) {
    if (typeof options === 'boolean') {
      options = { rejectPublicSuffixes: options }
    }
    this.rejectPublicSuffixes = options?.rejectPublicSuffixes ?? true
    this.enableLooseMode = options?.looseMode ?? false
    this.allowSpecialUseDomain = options?.allowSpecialUseDomain ?? true
    this.allowSecureOnLocal = options?.allowSecureOnLocal ?? true
    this.prefixSecurity = getNormalizedPrefixSecurity(
      options?.prefixSecurity ?? 'silent',
    )
    this.store = store ?? new MemoryCookieStore()
  }

  private callSync<T>(
    fn: (this: CookieJar, callback: Callback<T>) => void,
  ): T | undefined {
    if (!this.store.synchronous) {
      throw new Error(
        'CookieJar store is not synchronous; use async API instead.',
      )
    }
    let syncErr: Error | null = null
    let syncResult: T | undefined = undefined

    try {
      fn.call(this, (error: Error | null, result?: T) => {
        syncErr = error
        syncResult = result
      })
    } catch (err) {
      syncErr = err as Error
    }

    if (syncErr) throw syncErr

    return syncResult
  }

  /**
   * Attempt to set the {@link Cookie} in the {@link CookieJar}.
   *
   * @remarks
   * - If successfully persisted, the {@link Cookie} will have updated
   *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
   *     properties.
   *
   * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
   *     attribute on the cookie string. The {@link Cookie.domain} property is set to the
   *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
   *     exact hostname match (not a {@link domainMatch} as per usual)
   *
   * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
   * @param url - The domain to store the cookie with.
   * @param callback - A function to call after a cookie has been successfully stored.
   * @public
   */
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    callback: Callback<Cookie | undefined>,
  ): void
  /**
   * Attempt to set the {@link Cookie} in the {@link CookieJar}.
   *
   * @remarks
   * - If successfully persisted, the {@link Cookie} will have updated
   *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
   *     properties.
   *
   * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
   *     attribute on the cookie string. The {@link Cookie.domain} property is set to the
   *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
   *     exact hostname match (not a {@link domainMatch} as per usual)
   *
   * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when storing the cookie.
   * @param callback - A function to call after a cookie has been successfully stored.
   * @public
   */
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options: SetCookieOptions,
    callback: Callback<Cookie | undefined>,
  ): void
  /**
   * Attempt to set the {@link Cookie} in the {@link CookieJar}.
   *
   * @remarks
   * - If successfully persisted, the {@link Cookie} will have updated
   *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
   *     properties.
   *
   * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
   *     attribute on the cookie string. The {@link Cookie.domain} property is set to the
   *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
   *     exact hostname match (not a {@link domainMatch} as per usual)
   *
   * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when storing the cookie.
   * @public
   */
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options?: SetCookieOptions,
  ): Promise<Cookie | undefined>
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options: SetCookieOptions | Callback<Cookie | undefined>,
    callback?: Callback<Cookie | undefined>,
  ): unknown
  /**
   * @internal No doc because this is the overload implementation
   */
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options?: SetCookieOptions | Callback<Cookie | undefined>,
    callback?: Callback<Cookie | undefined>,
  ): unknown {
    if (typeof options === 'function') {
      callback = options
      options = undefined
    }
    const promiseCallback = createPromiseCallback(callback)
    const cb = promiseCallback.callback
    let context: UrlContext

    try {
      if (typeof url === 'string') {
        validators.validate(
          validators.isNonEmptyString(url),
          callback,
          safeToString(options),
        )
      }

      context = getCookieContext(url)

      if (typeof url === 'function') {
        return promiseCallback.reject(new Error('No URL was specified'))
      }

      if (typeof options === 'function') {
        options = defaultSetCookieOptions
      }

      validators.validate(typeof cb === 'function', cb)

      if (
        !validators.isNonEmptyString(cookie) &&
        !validators.isObject(cookie) &&
        cookie instanceof String &&
        cookie.length == 0
      ) {
        return promiseCallback.resolve(undefined)
      }
    } catch (err) {
      return promiseCallback.reject(err as Error)
    }

    const host = canonicalDomain(context.hostname) ?? null
    const loose = options?.loose || this.enableLooseMode

    let sameSiteContext = null
    if (options?.sameSiteContext) {
      sameSiteContext = checkSameSiteContext(options.sameSiteContext)
      if (!sameSiteContext) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR))
      }
    }

    // S5.3 step 1
    if (typeof cookie === 'string' || cookie instanceof String) {
      const parsedCookie = Cookie.parse(cookie.toString(), { loose: loose })
      if (!parsedCookie) {
        const err = new Error('Cookie failed to parse')
        return options?.ignoreError
          ? promiseCallback.resolve(undefined)
          : promiseCallback.reject(err)
      }
      cookie = parsedCookie
    } else if (!(cookie instanceof Cookie)) {
      // If you're seeing this error, and are passing in a Cookie object,
      // it *might* be a Cookie object from another loaded version of tough-cookie.
      const err = new Error(
        'First argument to setCookie must be a Cookie object or string',
      )

      return options?.ignoreError
        ? promiseCallback.resolve(undefined)
        : promiseCallback.reject(err)
    }

    // S5.3 step 2
    const now = options?.now || new Date() // will assign later to save effort in the face of errors

    // S5.3 step 3: NOOP; persistent-flag and expiry-time is handled by getCookie()

    // S5.3 step 4: NOOP; domain is null by default

    // S5.3 step 5: public suffixes
    if (this.rejectPublicSuffixes && cookie.domain) {
      try {
        const cdomain = cookie.cdomain()
        const suffix =
          typeof cdomain === 'string'
            ? getPublicSuffix(cdomain, {
                allowSpecialUseDomain: this.allowSpecialUseDomain,
                ignoreError: options?.ignoreError,
              })
            : null
        if (suffix == null && !IP_V6_REGEX_OBJECT.test(cookie.domain)) {
          // e.g. "com"
          const err = new Error('Cookie has domain set to a public suffix')

          return options?.ignoreError
            ? promiseCallback.resolve(undefined)
            : promiseCallback.reject(err)
        }
        // Using `any` here rather than `unknown` to avoid a type assertion, at the cost of needing
        // to disable eslint directives. It's easier to have this one spot of technically incorrect
        // types, rather than having to deal with _all_ callback errors being `unknown`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        return options?.ignoreError
          ? promiseCallback.resolve(undefined)
          : // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            promiseCallback.reject(err)
      }
    }

    // S5.3 step 6:
    if (cookie.domain) {
      if (
        !domainMatch(host ?? undefined, cookie.cdomain() ?? undefined, false)
      ) {
        const err = new Error(
          `Cookie not in this host's domain. Cookie:${
            cookie.cdomain() ?? 'null'
          } Request:${host ?? 'null'}`,
        )
        return options?.ignoreError
          ? promiseCallback.resolve(undefined)
          : promiseCallback.reject(err)
      }

      if (cookie.hostOnly == null) {
        // don't reset if already set
        cookie.hostOnly = false
      }
    } else {
      cookie.hostOnly = true
      cookie.domain = host
    }

    //S5.2.4 If the attribute-value is empty or if the first character of the
    //attribute-value is not %x2F ("/"):
    //Let cookie-path be the default-path.
    if (!cookie.path || cookie.path[0] !== '/') {
      cookie.path = defaultPath(context.pathname)
      cookie.pathIsDefault = true
    }

    // S5.3 step 8: secure attribute:
    // "If the request-uri does not denote a "secure" connection
    // (as defined by the user agent), and the cookie's secure-only-flag
    // is true, then abort these steps and ignore the cookie entirely."
    const potentiallyTrustworthy = isPotentiallyTrustworthy(
      url,
      this.allowSecureOnLocal,
    )
    if (!potentiallyTrustworthy && cookie.secure) {
      const err = new Error(
        'Cookie is Secure but this is not a secure connection',
      )
      return options?.ignoreError
        ? promiseCallback.resolve(undefined)
        : promiseCallback.reject(err)
    }

    // S5.3 step 9: NOOP; httpOnly attribute

    // S5.3 step 10
    if (options?.http === false && cookie.httpOnly) {
      const err = new Error("Cookie is HttpOnly and this isn't an HTTP API")
      return options.ignoreError
        ? promiseCallback.resolve(undefined)
        : promiseCallback.reject(err)
    }

    // 6252bis-02 S5.4 Step 13 & 14:
    if (
      cookie.sameSite !== 'none' &&
      cookie.sameSite !== undefined &&
      sameSiteContext
    ) {
      // "If the cookie's "same-site-flag" is not "None", and the cookie
      //  is being set from a context whose "site for cookies" is not an
      //  exact match for request-uri's host's registered domain, then
      //  abort these steps and ignore the newly created cookie entirely."
      if (sameSiteContext === 'none') {
        const err = new Error(
          'Cookie is SameSite but this is a cross-origin request',
        )
        return options?.ignoreError
          ? promiseCallback.resolve(undefined)
          : promiseCallback.reject(err)
      }
    }

    /* 6265bis-02 S5.4 Steps 15 & 16 */
    const ignoreErrorForPrefixSecurity =
      this.prefixSecurity === PrefixSecurityEnum.SILENT
    const prefixSecurityDisabled =
      this.prefixSecurity === PrefixSecurityEnum.DISABLED
    /* If prefix checking is not disabled ...*/
    if (!prefixSecurityDisabled) {
      let errorFound = false
      let errorMsg
      /* Check secure prefix condition */
      if (!isSecurePrefixConditionMet(cookie)) {
        errorFound = true
        errorMsg = 'Cookie has __Secure prefix but Secure attribute is not set'
      } else if (!isHostPrefixConditionMet(cookie)) {
        /* Check host prefix condition */
        errorFound = true
        errorMsg =
          "Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'"
      }
      if (errorFound) {
        return options?.ignoreError || ignoreErrorForPrefixSecurity
          ? promiseCallback.resolve(undefined)
          : promiseCallback.reject(new Error(errorMsg))
      }
    }

    const store = this.store

    // TODO: It feels weird to be manipulating the store as a side effect of a method.
    // We should either do it in the constructor or not at all.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!store.updateCookie) {
      store.updateCookie = async function (
        _oldCookie: Cookie,
        newCookie: Cookie,
        cb?: ErrorCallback,
      ): Promise<void> {
        return this.putCookie(newCookie).then(
          () => cb?.(null),
          (error: unknown) => cb?.(error as Error),
        )
      }
    }

    const withCookie: Callback<Cookie | undefined> = function withCookie(
      err,
      oldCookie,
    ): void {
      if (err) {
        cb(err)
        return
      }

      const next: ErrorCallback = function (err) {
        if (err) {
          cb(err)
        } else if (typeof cookie === 'string') {
          cb(null, undefined)
        } else {
          cb(null, cookie)
        }
      }

      if (oldCookie) {
        // S5.3 step 11 - "If the cookie store contains a cookie with the same name,
        // domain, and path as the newly created cookie:"
        if (
          options &&
          'http' in options &&
          options.http === false &&
          oldCookie.httpOnly
        ) {
          // step 11.2
          err = new Error("old Cookie is HttpOnly and this isn't an HTTP API")
          if (options.ignoreError) cb(null, undefined)
          else cb(err)
          return
        }
        if (cookie instanceof Cookie) {
          cookie.creation = oldCookie.creation
          // step 11.3
          cookie.creationIndex = oldCookie.creationIndex
          // preserve tie-breaker
          cookie.lastAccessed = now
          // Step 11.4 (delete cookie) is implied by just setting the new one:
          store.updateCookie(oldCookie, cookie, next) // step 12
        }
      } else {
        if (cookie instanceof Cookie) {
          cookie.creation = cookie.lastAccessed = now
          store.putCookie(cookie, next) // step 12
        }
      }
    }

    // TODO: Refactor to avoid using a callback
    store.findCookie(cookie.domain, cookie.path, cookie.key, withCookie)
    return promiseCallback.promise
  }

  /**
   * Synchronously attempt to set the {@link Cookie} in the {@link CookieJar}.
   *
   * <strong>Note:</strong> Only works if the configured {@link Store} is also synchronous.
   *
   * @remarks
   * - If successfully persisted, the {@link Cookie} will have updated
   *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
   *     properties.
   *
   * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
   *     attribute on the cookie string. The {@link Cookie.domain} property is set to the
   *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
   *     exact hostname match (not a {@link domainMatch} as per usual)
   *
   * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when storing the cookie.
   * @public
   */
  setCookieSync(
    cookie: string | Cookie,
    url: string,
    options?: SetCookieOptions,
  ): Cookie | undefined {
    const setCookieFn = options
      ? this.setCookie.bind(this, cookie, url, options)
      : this.setCookie.bind(this, cookie, url)
    return this.callSync(setCookieFn)
  }

  /**
   * Retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   */
  getCookies(url: string): Promise<Cookie[]>
  /**
   * Retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   * @param callback - A function to call after a cookie has been successfully retrieved.
   */
  getCookies(url: string, callback: Callback<Cookie[]>): void
  /**
   * Retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   * @param callback - A function to call after a cookie has been successfully retrieved.
   */
  getCookies(
    url: string | URL,
    options: GetCookiesOptions | undefined,
    callback: Callback<Cookie[]>,
  ): void
  /**
   * Retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookies(url: string | URL, options?: GetCookiesOptions): Promise<Cookie[]>
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getCookies(
    url: string | URL,
    options: GetCookiesOptions | undefined | Callback<Cookie[]>,
    callback?: Callback<Cookie[]>,
  ): unknown
  /**
   * @internal No doc because this is the overload implementation
   */
  getCookies(
    url: string | URL,
    options?: GetCookiesOptions | Callback<Cookie[]>,
    callback?: Callback<Cookie[]>,
  ): unknown {
    // RFC6365 S5.4
    if (typeof options === 'function') {
      callback = options
      options = defaultGetCookieOptions
    } else if (options === undefined) {
      options = defaultGetCookieOptions
    }
    const promiseCallback = createPromiseCallback(callback)
    const cb = promiseCallback.callback
    let context: UrlContext

    try {
      if (typeof url === 'string') {
        validators.validate(validators.isNonEmptyString(url), cb, url)
      }

      context = getCookieContext(url)

      validators.validate(
        validators.isObject(options),
        cb,
        safeToString(options),
      )

      validators.validate(typeof cb === 'function', cb)
    } catch (parameterError) {
      return promiseCallback.reject(parameterError as Error)
    }

    const host = canonicalDomain(context.hostname)
    const path = context.pathname || '/'

    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-19#section-5.8.3-2.1.2.3.2
    // deliberately expects the user agent to determine the notion of a "secure" connection,
    // and in practice this converges to a "potentially trustworthy origin" as defined in:
    // https://www.w3.org/TR/secure-contexts/#is-origin-trustworthy
    const potentiallyTrustworthy = isPotentiallyTrustworthy(
      url,
      this.allowSecureOnLocal,
    )

    let sameSiteLevel = 0
    if (options.sameSiteContext) {
      const sameSiteContext = checkSameSiteContext(options.sameSiteContext)
      if (sameSiteContext == null) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR))
      }
      sameSiteLevel = Cookie.sameSiteLevel[sameSiteContext]
      if (!sameSiteLevel) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR))
      }
    }

    const http = options.http ?? true

    const now = Date.now()
    const expireCheck = options.expire ?? true
    const allPaths = options.allPaths ?? false
    const store = this.store

    function matchingCookie(c: Cookie): boolean {
      // "Either:
      //   The cookie's host-only-flag is true and the canonicalized
      //   request-host is identical to the cookie's domain.
      // Or:
      //   The cookie's host-only-flag is false and the canonicalized
      //   request-host domain-matches the cookie's domain."
      if (c.hostOnly) {
        if (c.domain != host) {
          return false
        }
      } else {
        if (!domainMatch(host ?? undefined, c.domain ?? undefined, false)) {
          return false
        }
      }

      // "The request-uri's path path-matches the cookie's path."
      if (!allPaths && typeof c.path === 'string' && !pathMatch(path, c.path)) {
        return false
      }

      // "If the cookie's secure-only-flag is true, then the request-uri's
      // scheme must denote a "secure" protocol"
      if (c.secure && !potentiallyTrustworthy) {
        return false
      }

      // "If the cookie's http-only-flag is true, then exclude the cookie if the
      // cookie-string is being generated for a "non-HTTP" API"
      if (c.httpOnly && !http) {
        return false
      }

      // RFC6265bis-02 S5.3.7
      if (sameSiteLevel) {
        let cookieLevel: number
        if (c.sameSite === 'lax') {
          cookieLevel = Cookie.sameSiteLevel.lax
        } else if (c.sameSite === 'strict') {
          cookieLevel = Cookie.sameSiteLevel.strict
        } else {
          cookieLevel = Cookie.sameSiteLevel.none
        }
        if (cookieLevel > sameSiteLevel) {
          // only allow cookies at or below the request level
          return false
        }
      }

      // deferred from S5.3
      // non-RFC: allow retention of expired cookies by choice
      const expiryTime = c.expiryTime()
      if (expireCheck && expiryTime != undefined && expiryTime <= now) {
        store.removeCookie(c.domain, c.path, c.key, () => {}) // result ignored
        return false
      }

      return true
    }

    store.findCookies(
      host,
      allPaths ? null : path,
      this.allowSpecialUseDomain,
      (err, cookies): void => {
        if (err) {
          cb(err)
          return
        }

        if (cookies == null) {
          cb(null, [])
          return
        }

        cookies = cookies.filter(matchingCookie)

        // sorting of S5.4 part 2
        if ('sort' in options && options.sort !== false) {
          cookies = cookies.sort(cookieCompare)
        }

        // S5.4 part 3
        const now = new Date()
        for (const cookie of cookies) {
          cookie.lastAccessed = now
        }
        // TODO persist lastAccessed

        cb(null, cookies)
      },
    )

    return promiseCallback.promise
  }

  /**
   * Synchronously retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookiesSync(url: string, options?: GetCookiesOptions): Cookie[] {
    return this.callSync(this.getCookies.bind(this, url, options)) ?? []
  }

  /**
   * Accepts the same options as `.getCookies()` but returns a string suitable for a
   * `Cookie` header rather than an Array.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   * @param callback - A function to call after the `Cookie` header string has been created.
   */
  getCookieString(
    url: string,
    options: GetCookiesOptions,
    callback: Callback<string | undefined>,
  ): void
  /**
   * Accepts the same options as `.getCookies()` but returns a string suitable for a
   * `Cookie` header rather than an Array.
   *
   * @param url - The domain to store the cookie with.
   * @param callback - A function to call after the `Cookie` header string has been created.
   */
  getCookieString(url: string, callback: Callback<string | undefined>): void
  /**
   * Accepts the same options as `.getCookies()` but returns a string suitable for a
   * `Cookie` header rather than an Array.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookieString(url: string, options?: GetCookiesOptions): Promise<string>
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getCookieString(
    url: string,
    options: GetCookiesOptions | Callback<string | undefined>,
    callback?: Callback<string | undefined>,
  ): unknown
  /**
   * @internal No doc because this is the overload implementation
   */
  getCookieString(
    url: string,
    options?: GetCookiesOptions | Callback<string | undefined>,
    callback?: Callback<string | undefined>,
  ): unknown {
    if (typeof options === 'function') {
      callback = options
      options = undefined
    }
    const promiseCallback = createPromiseCallback(callback)
    const next: Callback<Cookie[]> = function (err, cookies) {
      if (err) {
        promiseCallback.callback(err)
      } else {
        promiseCallback.callback(
          null,
          cookies
            ?.sort(cookieCompare)
            .map((c) => c.cookieString())
            .join('; '),
        )
      }
    }

    this.getCookies(url, options, next)
    return promiseCallback.promise
  }

  /**
   * Synchronous version of `.getCookieString()`. Accepts the same options as `.getCookies()` but returns a string suitable for a
   * `Cookie` header rather than an Array.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookieStringSync(url: string, options?: GetCookiesOptions): string {
    return (
      this.callSync(
        options
          ? this.getCookieString.bind(this, url, options)
          : this.getCookieString.bind(this, url),
      ) ?? ''
    )
  }

  /**
   * Returns an array of strings suitable for `Set-Cookie` headers. Accepts the same options
   * as `.getCookies()`.
   *
   * @param url - The domain to store the cookie with.
   * @param callback - A function to call after the `Set-Cookie` header strings have been created.
   */
  getSetCookieStrings(
    url: string,
    callback: Callback<string[] | undefined>,
  ): void
  /**
   * Returns an array of strings suitable for `Set-Cookie` headers. Accepts the same options
   * as `.getCookies()`.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   * @param callback - A function to call after the `Set-Cookie` header strings have been created.
   */
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
    callback: Callback<string[] | undefined>,
  ): void
  /**
   * Returns an array of strings suitable for `Set-Cookie` headers. Accepts the same options
   * as `.getCookies()`.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getSetCookieStrings(
    url: string,
    options?: GetCookiesOptions,
  ): Promise<string[] | undefined>
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
    callback?: Callback<string[] | undefined>,
  ): unknown
  /**
   * @internal No doc because this is the overload implementation
   */
  getSetCookieStrings(
    url: string,
    options?: GetCookiesOptions | Callback<string[] | undefined>,
    callback?: Callback<string[] | undefined>,
  ): unknown {
    if (typeof options === 'function') {
      callback = options
      options = undefined
    }
    const promiseCallback = createPromiseCallback<string[] | undefined>(
      callback,
    )

    const next: Callback<Cookie[] | undefined> = function (err, cookies) {
      if (err) {
        promiseCallback.callback(err)
      } else {
        promiseCallback.callback(
          null,
          cookies?.map((c) => {
            return c.toString()
          }),
        )
      }
    }

    this.getCookies(url, options, next)
    return promiseCallback.promise
  }

  /**
   * Synchronous version of `.getSetCookieStrings()`. Returns an array of strings suitable for `Set-Cookie` headers.
   * Accepts the same options as `.getCookies()`.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getSetCookieStringsSync(
    url: string,
    options: GetCookiesOptions = {},
  ): string[] {
    return (
      this.callSync(this.getSetCookieStrings.bind(this, url, options)) ?? []
    )
  }

  /**
   * Serialize the CookieJar if the underlying store supports `.getAllCookies`.
   * @param callback - A function to call after the CookieJar has been serialized
   */
  serialize(callback: Callback<SerializedCookieJar>): void
  /**
   * Serialize the CookieJar if the underlying store supports `.getAllCookies`.
   */
  serialize(): Promise<SerializedCookieJar>
  /**
   * @internal No doc because this is the overload implementation
   */
  serialize(callback?: Callback<SerializedCookieJar>): unknown {
    const promiseCallback = createPromiseCallback<SerializedCookieJar>(callback)

    let type: string | null = this.store.constructor.name
    if (validators.isObject(type)) {
      type = null
    }

    // update README.md "Serialization Format" if you change this, please!
    const serialized: SerializedCookieJar = {
      // The version of tough-cookie that serialized this jar. Generally a good
      // practice since future versions can make data import decisions based on
      // known past behavior. When/if this matters, use `semver`.
      version: `tough-cookie@${version}`,

      // add the store type, to make humans happy:
      storeType: type,

      // CookieJar configuration:
      rejectPublicSuffixes: this.rejectPublicSuffixes,
      enableLooseMode: this.enableLooseMode,
      allowSpecialUseDomain: this.allowSpecialUseDomain,
      prefixSecurity: getNormalizedPrefixSecurity(this.prefixSecurity),

      // this gets filled from getAllCookies:
      cookies: [],
    }

    if (typeof this.store.getAllCookies !== 'function') {
      return promiseCallback.reject(
        new Error(
          'store does not support getAllCookies and cannot be serialized',
        ),
      )
    }

    this.store.getAllCookies((err, cookies) => {
      if (err) {
        promiseCallback.callback(err)
        return
      }

      if (cookies == null) {
        promiseCallback.callback(null, serialized)
        return
      }

      serialized.cookies = cookies.map((cookie) => {
        // convert to serialized 'raw' cookies
        const serializedCookie = cookie.toJSON()

        // Remove the index so new ones get assigned during deserialization
        delete serializedCookie.creationIndex

        return serializedCookie
      })

      promiseCallback.callback(null, serialized)
    })

    return promiseCallback.promise
  }

  /**
   * Serialize the CookieJar if the underlying store supports `.getAllCookies`.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   */
  serializeSync(): SerializedCookieJar | undefined {
    return this.callSync((callback) => {
      this.serialize(callback)
    })
  }

  /**
   * Alias of {@link CookieJar.serializeSync}. Allows the cookie to be serialized
   * with `JSON.stringify(cookieJar)`.
   */
  toJSON(): SerializedCookieJar | undefined {
    return this.serializeSync()
  }

  /**
   * Use the class method CookieJar.deserialize instead of calling this directly
   * @internal
   */
  _importCookies(serialized: unknown, callback: Callback<CookieJar>): void {
    let cookies: unknown[] | undefined = undefined

    if (
      serialized &&
      typeof serialized === 'object' &&
      inOperator('cookies', serialized) &&
      Array.isArray(serialized.cookies)
    ) {
      cookies = serialized.cookies
    }

    if (!cookies) {
      callback(new Error('serialized jar has no cookies array'), undefined)
      return
    }

    cookies = cookies.slice() // do not modify the original

    const putNext: ErrorCallback = (err) => {
      if (err) {
        callback(err, undefined)
        return
      }

      if (Array.isArray(cookies)) {
        if (!cookies.length) {
          callback(err, this)
          return
        }

        let cookie
        try {
          cookie = Cookie.fromJSON(cookies.shift())
        } catch (e) {
          callback(e instanceof Error ? e : new Error(), undefined)
          return
        }

        if (cookie === undefined) {
          putNext(null) // skip this cookie
          return
        }

        this.store.putCookie(cookie, putNext)
      }
    }

    putNext(null)
  }

  /**
   * @internal
   */
  _importCookiesSync(serialized: unknown): void {
    this.callSync(this._importCookies.bind(this, serialized))
  }

  /**
   * Produces a deep clone of this CookieJar. Modifications to the original do
   * not affect the clone, and vice versa.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - Transferring between store types is supported so long as the source
   *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
   *
   * @param callback - A function to call when the CookieJar is cloned.
   */
  clone(callback: Callback<CookieJar>): void
  /**
   * Produces a deep clone of this CookieJar. Modifications to the original do
   * not affect the clone, and vice versa.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - Transferring between store types is supported so long as the source
   *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
   *
   * @param newStore - The target {@link Store} to clone cookies into.
   * @param callback - A function to call when the CookieJar is cloned.
   */
  clone(newStore: Store, callback: Callback<CookieJar>): void
  /**
   * Produces a deep clone of this CookieJar. Modifications to the original do
   * not affect the clone, and vice versa.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - Transferring between store types is supported so long as the source
   *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
   *
   * @param newStore - The target {@link Store} to clone cookies into.
   */
  clone(newStore?: Store): Promise<CookieJar>
  /**
   * @internal No doc because this is the overload implementation
   */
  clone(
    newStore?: Store | Callback<CookieJar>,
    callback?: Callback<CookieJar>,
  ): unknown {
    if (typeof newStore === 'function') {
      callback = newStore
      newStore = undefined
    }

    const promiseCallback = createPromiseCallback<CookieJar>(callback)
    const cb = promiseCallback.callback

    this.serialize((err, serialized) => {
      if (err) {
        return promiseCallback.reject(err)
      }
      return CookieJar.deserialize(serialized ?? '', newStore, cb)
    })

    return promiseCallback.promise
  }

  /**
   * @internal
   */
  _cloneSync(newStore?: Store): CookieJar | undefined {
    const cloneFn =
      newStore && typeof newStore !== 'function'
        ? this.clone.bind(this, newStore)
        : this.clone.bind(this)
    return this.callSync((callback) => {
      cloneFn(callback)
    })
  }

  /**
   * Produces a deep clone of this CookieJar. Modifications to the original do
   * not affect the clone, and vice versa.
   *
   * <strong>Note</strong>: Only works if both the configured Store and destination
   * Store are synchronous.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - Transferring between store types is supported so long as the source
   *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
   *
   * @param newStore - The target {@link Store} to clone cookies into.
   */
  cloneSync(newStore?: Store): CookieJar | undefined {
    if (!newStore) {
      return this._cloneSync()
    }
    if (!newStore.synchronous) {
      throw new Error(
        'CookieJar clone destination store is not synchronous; use async API instead.',
      )
    }
    return this._cloneSync(newStore)
  }

  /**
   * Removes all cookies from the CookieJar.
   *
   * @remarks
   * - This is a new backwards-compatible feature of tough-cookie version 2.5,
   *     so not all Stores will implement it efficiently. For Stores that do not
   *     implement `removeAllCookies`, the fallback is to call `removeCookie` after
   *     `getAllCookies`.
   *
   * - If `getAllCookies` fails or isn't implemented in the Store, an error is returned.
   *
   * - If one or more of the `removeCookie` calls fail, only the first error is returned.
   *
   * @param callback - A function to call when all the cookies have been removed.
   */
  removeAllCookies(callback: ErrorCallback): void
  /**
   * Removes all cookies from the CookieJar.
   *
   * @remarks
   * - This is a new backwards-compatible feature of tough-cookie version 2.5,
   *     so not all Stores will implement it efficiently. For Stores that do not
   *     implement `removeAllCookies`, the fallback is to call `removeCookie` after
   *     `getAllCookies`.
   *
   * - If `getAllCookies` fails or isn't implemented in the Store, an error is returned.
   *
   * - If one or more of the `removeCookie` calls fail, only the first error is returned.
   */
  removeAllCookies(): Promise<void>
  /**
   * @internal No doc because this is the overload implementation
   */
  removeAllCookies(callback?: ErrorCallback): unknown {
    const promiseCallback = createPromiseCallback<undefined>(callback)
    const cb = promiseCallback.callback

    const store = this.store

    // Check that the store implements its own removeAllCookies(). The default
    // implementation in Store will immediately call the callback with a "not
    // implemented" Error.
    if (
      typeof store.removeAllCookies === 'function' &&
      store.removeAllCookies !== Store.prototype.removeAllCookies
    ) {
      // `Callback<undefined>` and `ErrorCallback` are *technically* incompatible, but for the
      // standard implementation `cb = (err, result) => {}`, they're essentially the same.
      store.removeAllCookies(cb as ErrorCallback)
      return promiseCallback.promise
    }

    store.getAllCookies((err, cookies): void => {
      if (err) {
        cb(err)
        return
      }

      if (!cookies) {
        cookies = []
      }

      if (cookies.length === 0) {
        cb(null, undefined)
        return
      }

      let completedCount = 0
      const removeErrors: Error[] = []

      // TODO: Refactor to avoid using callback
      const removeCookieCb: ErrorCallback = function removeCookieCb(removeErr) {
        if (removeErr) {
          removeErrors.push(removeErr)
        }

        completedCount++

        if (completedCount === cookies.length) {
          if (removeErrors[0]) cb(removeErrors[0])
          else cb(null, undefined)
          return
        }
      }

      cookies.forEach((cookie) => {
        store.removeCookie(
          cookie.domain,
          cookie.path,
          cookie.key,
          removeCookieCb,
        )
      })
    })

    return promiseCallback.promise
  }

  /**
   * Removes all cookies from the CookieJar.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - This is a new backwards-compatible feature of tough-cookie version 2.5,
   *     so not all Stores will implement it efficiently. For Stores that do not
   *     implement `removeAllCookies`, the fallback is to call `removeCookie` after
   *     `getAllCookies`.
   *
   * - If `getAllCookies` fails or isn't implemented in the Store, an error is returned.
   *
   * - If one or more of the `removeCookie` calls fail, only the first error is returned.
   */
  removeAllCookiesSync(): void {
    this.callSync<undefined>((callback) => {
      // `Callback<undefined>` and `ErrorCallback` are *technically* incompatible, but for the
      // standard implementation `cb = (err, result) => {}`, they're essentially the same.
      this.removeAllCookies(callback as ErrorCallback)
    })
  }

  /**
   * A new CookieJar is created and the serialized {@link Cookie} values are added to
   * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
   * the order in which they appear in the serialization.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param strOrObj - A JSON string or object representing the deserialized cookies.
   * @param callback - A function to call after the {@link CookieJar} has been deserialized.
   */
  static deserialize(
    strOrObj: string | object,
    callback: Callback<CookieJar>,
  ): void
  /**
   * A new CookieJar is created and the serialized {@link Cookie} values are added to
   * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
   * the order in which they appear in the serialization.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param strOrObj - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   * @param callback - A function to call after the {@link CookieJar} has been deserialized.
   */
  static deserialize(
    strOrObj: string | object,
    store: Store,
    callback: Callback<CookieJar>,
  ): void
  /**
   * A new CookieJar is created and the serialized {@link Cookie} values are added to
   * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
   * the order in which they appear in the serialization.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param strOrObj - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static deserialize(
    strOrObj: string | object,
    store?: Store,
  ): Promise<CookieJar>
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  static deserialize(
    strOrObj: string | object,
    store?: Store | Callback<CookieJar>,
    callback?: Callback<CookieJar>,
  ): unknown
  /**
   * @internal No doc because this is the overload implementation
   */
  static deserialize(
    strOrObj: string | object,
    store?: Store | Callback<CookieJar>,
    callback?: Callback<CookieJar>,
  ): unknown {
    if (typeof store === 'function') {
      callback = store
      store = undefined
    }

    const promiseCallback = createPromiseCallback<CookieJar>(callback)

    let serialized: unknown
    if (typeof strOrObj === 'string') {
      try {
        serialized = JSON.parse(strOrObj)
      } catch (e) {
        return promiseCallback.reject(e instanceof Error ? e : new Error())
      }
    } else {
      serialized = strOrObj
    }

    const readSerializedProperty = (property: string): unknown => {
      return serialized &&
        typeof serialized === 'object' &&
        inOperator(property, serialized)
        ? serialized[property]
        : undefined
    }

    const readSerializedBoolean = (property: string): boolean | undefined => {
      const value = readSerializedProperty(property)
      return typeof value === 'boolean' ? value : undefined
    }

    const readSerializedString = (property: string): string | undefined => {
      const value = readSerializedProperty(property)
      return typeof value === 'string' ? value : undefined
    }

    const jar = new CookieJar(store, {
      rejectPublicSuffixes: readSerializedBoolean('rejectPublicSuffixes'),
      looseMode: readSerializedBoolean('enableLooseMode'),
      allowSpecialUseDomain: readSerializedBoolean('allowSpecialUseDomain'),
      prefixSecurity: getNormalizedPrefixSecurity(
        readSerializedString('prefixSecurity') ?? 'silent',
      ),
    })

    jar._importCookies(serialized, (err) => {
      if (err) {
        promiseCallback.callback(err)
        return
      }
      promiseCallback.callback(null, jar)
    })

    return promiseCallback.promise
  }

  /**
   * A new CookieJar is created and the serialized {@link Cookie} values are added to
   * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
   * the order in which they appear in the serialization.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param strOrObj - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static deserializeSync(
    strOrObj: string | SerializedCookieJar,
    store?: Store,
  ): CookieJar {
    const serialized: unknown =
      typeof strOrObj === 'string' ? JSON.parse(strOrObj) : strOrObj

    const readSerializedProperty = (property: string): unknown => {
      return serialized &&
        typeof serialized === 'object' &&
        inOperator(property, serialized)
        ? serialized[property]
        : undefined
    }

    const readSerializedBoolean = (property: string): boolean | undefined => {
      const value = readSerializedProperty(property)
      return typeof value === 'boolean' ? value : undefined
    }

    const readSerializedString = (property: string): string | undefined => {
      const value = readSerializedProperty(property)
      return typeof value === 'string' ? value : undefined
    }

    const jar = new CookieJar(store, {
      rejectPublicSuffixes: readSerializedBoolean('rejectPublicSuffixes'),
      looseMode: readSerializedBoolean('enableLooseMode'),
      allowSpecialUseDomain: readSerializedBoolean('allowSpecialUseDomain'),
      prefixSecurity: getNormalizedPrefixSecurity(
        readSerializedString('prefixSecurity') ?? 'silent',
      ),
    })

    // catch this mistake early:
    if (!jar.store.synchronous) {
      throw new Error(
        'CookieJar store is not synchronous; use async API instead.',
      )
    }

    jar._importCookiesSync(serialized)
    return jar
  }

  /**
   * Alias of {@link CookieJar.deserializeSync}.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param jsonString - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static fromJSON(
    jsonString: string | SerializedCookieJar,
    store?: Store,
  ): CookieJar {
    return CookieJar.deserializeSync(jsonString, store)
  }
}
