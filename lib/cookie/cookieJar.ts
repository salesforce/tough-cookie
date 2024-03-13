import urlParse from 'url-parse'

import { getPublicSuffix } from '../getPublicSuffix'
import * as validators from '../validators'
import { ParameterError } from '../validators'
import { Store } from '../store'
import { MemoryCookieStore } from '../memstore'
import { pathMatch } from '../pathMatch'
import { Cookie } from './cookie'
import {
  Callback,
  createPromiseCallback,
  ErrorCallback,
  inOperator,
  safeToString,
} from '../utils'
import { canonicalDomain } from './canonicalDomain'
import {
  IP_V6_REGEX_OBJECT,
  PrefixSecurityEnum,
  SerializedCookieJar,
} from './constants'
import { defaultPath } from './defaultPath'
import { domainMatch } from './domainMatch'
import { cookieCompare } from './cookieCompare'
import { version } from '../version'

// This file was too big before we added max-lines, and it's ongoing work to reduce its size.
/* eslint max-lines: [1, 1200] */

const defaultSetCookieOptions: SetCookieOptions = {
  loose: false,
  sameSiteContext: undefined,
  ignoreError: false,
  http: true,
}

const defaultGetCookieOptions: GetCookiesOptions = {
  http: true,
  expire: true,
  allPaths: false,
  sameSiteContext: undefined,
  sort: undefined,
}

type SetCookieOptions = {
  loose?: boolean | undefined
  sameSiteContext?: 'strict' | 'lax' | 'none' | undefined
  ignoreError?: boolean | undefined
  http?: boolean | undefined
  now?: Date | undefined
}

type GetCookiesOptions = {
  http?: boolean | undefined
  expire?: boolean | undefined
  allPaths?: boolean | undefined
  sameSiteContext?: 'none' | 'lax' | 'strict' | undefined
  sort?: boolean | undefined
}

type CreateCookieJarOptions = {
  rejectPublicSuffixes?: boolean | undefined
  looseMode?: boolean | undefined
  prefixSecurity?: 'strict' | 'silent' | 'unsafe-disabled' | undefined
  allowSpecialUseDomain?: boolean | undefined
}

const SAME_SITE_CONTEXT_VAL_ERR =
  'Invalid sameSiteContext option for getCookies(); expected one of "strict", "lax", or "none"'

function getCookieContext(url: unknown): URL | urlParse<string> {
  if (url instanceof URL) {
    return url
  } else if (typeof url === 'string') {
    try {
      return urlParse(decodeURI(url))
    } catch {
      return urlParse(url)
    }
  } else {
    throw new ParameterError('`url` argument is not a string or URL.')
  }
}

function checkSameSiteContext(value: string) {
  validators.validate(validators.isNonEmptyString(value), value)
  const context = String(value).toLowerCase()
  if (context === 'none' || context === 'lax' || context === 'strict') {
    return context
  } else {
    return null
  }
}

/**
 *  If the cookie-name begins with a case-sensitive match for the
 *  string "__Secure-", abort these steps and ignore the cookie
 *  entirely unless the cookie's secure-only-flag is true.
 * @param cookie
 * @returns boolean
 */
function isSecurePrefixConditionMet(cookie: Cookie) {
  validators.validate(validators.isObject(cookie), safeToString(cookie))
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
function isHostPrefixConditionMet(cookie: Cookie) {
  validators.validate(validators.isObject(cookie))
  const startsWithHostPrefix =
    typeof cookie.key === 'string' && cookie.key.startsWith('__Host-')
  return (
    !startsWithHostPrefix ||
    (cookie.secure &&
      cookie.hostOnly &&
      cookie.path != null &&
      cookie.path === '/')
  )
}

function getNormalizedPrefixSecurity(prefixSecurity: string) {
  const normalizedPrefixSecurity = prefixSecurity.toLowerCase()
  switch (normalizedPrefixSecurity) {
    /* The three supported options */
    case PrefixSecurityEnum.STRICT:
    case PrefixSecurityEnum.SILENT:
    case PrefixSecurityEnum.DISABLED:
      return normalizedPrefixSecurity
    default:
      return PrefixSecurityEnum.SILENT
  }
}

export class CookieJar {
  readonly store: Store
  private readonly rejectPublicSuffixes: boolean
  private readonly enableLooseMode: boolean
  private readonly allowSpecialUseDomain: boolean
  readonly prefixSecurity: string

  constructor(
    store?: Store | null | undefined,
    options?: CreateCookieJarOptions | boolean,
  ) {
    if (typeof options === 'boolean') {
      options = { rejectPublicSuffixes: options }
    }
    this.rejectPublicSuffixes = options?.rejectPublicSuffixes ?? true
    this.enableLooseMode = options?.looseMode ?? false
    this.allowSpecialUseDomain = options?.allowSpecialUseDomain ?? true
    this.prefixSecurity = getNormalizedPrefixSecurity(
      options?.prefixSecurity ?? 'silent',
    )
    this.store = store ?? new MemoryCookieStore()
  }

  private callSync<T>(
    // Using tuples is needed to check if `T` is `never` because `T extends never ? true : false`
    // evaluates to `never` instead of `true`.
    fn: (callback: [T] extends [never] ? ErrorCallback : Callback<T>) => void,
  ): T | undefined {
    if (!this.store.synchronous) {
      throw new Error(
        'CookieJar store is not synchronous; use async API instead.',
      )
    }
    let syncErr: Error | null = null
    let syncResult: T | undefined = undefined
    fn.call(this, (error: Error | null, result?: T | undefined) => {
      syncErr = error
      syncResult = result
    })
    // This seems to be a false positive; it can't detect that the value may be changed in the callback
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-throw-literal
    if (syncErr) throw syncErr

    return syncResult
  }

  // TODO: We *could* add overloads based on the value of `options.ignoreError`, such that we only
  // return `undefined` when `ignoreError` is true. But would that be excessive overloading?
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    callback: Callback<Cookie | undefined>,
  ): void
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options: SetCookieOptions,
    callback: Callback<Cookie | undefined>,
  ): void
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options?: SetCookieOptions,
  ): Promise<Cookie | undefined>
  setCookie(
    cookie: string | Cookie,
    url: string | URL,
    options: SetCookieOptions | Callback<Cookie | undefined>,
    callback?: Callback<Cookie | undefined>,
  ): unknown
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

    if (typeof url === 'string') {
      validators.validate(
        validators.isNonEmptyString(url),
        callback,
        safeToString(options),
      )
    }

    const context = getCookieContext(url)

    let err

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

    const host = canonicalDomain(context.hostname)
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
        err = new Error('Cookie failed to parse')
        return options?.ignoreError
          ? promiseCallback.resolve(undefined)
          : promiseCallback.reject(err)
      }
      cookie = parsedCookie
    } else if (!(cookie instanceof Cookie)) {
      // If you're seeing this error, and are passing in a Cookie object,
      // it *might* be a Cookie object from another loaded version of tough-cookie.
      err = new Error(
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
          err = new Error('Cookie has domain set to a public suffix')

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
        err = new Error(
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

    // S5.3 step 8: NOOP; secure attribute
    // S5.3 step 9: NOOP; httpOnly attribute

    // S5.3 step 10
    if (options?.http === false && cookie.httpOnly) {
      err = new Error("Cookie is HttpOnly and this isn't an HTTP API")
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
        err = new Error('Cookie is SameSite but this is a cross-origin request')
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
          (error: Error) => cb?.(error),
        )
      }
    }

    function withCookie(
      err: Error | null,
      oldCookie: Cookie | undefined | null,
    ): void {
      if (err) {
        cb(err)
        return
      }

      const next = function (err: Error | null): void {
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

    store.findCookie(cookie.domain, cookie.path, cookie.key, withCookie)
    return promiseCallback.promise
  }
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

  // RFC6365 S5.4
  getCookies(url: string, callback: Callback<Cookie[]>): void
  getCookies(
    url: string | URL,
    options: GetCookiesOptions | undefined,
    callback: Callback<Cookie[]>,
  ): void
  getCookies(
    url: string | URL,
    options?: GetCookiesOptions | undefined,
  ): Promise<Cookie[]>
  getCookies(
    url: string | URL,
    options: GetCookiesOptions | undefined | Callback<Cookie[]>,
    callback?: Callback<Cookie[]>,
  ): unknown
  getCookies(
    url: string | URL,
    options?: GetCookiesOptions | Callback<Cookie[]>,
    callback?: Callback<Cookie[]>,
  ): unknown {
    if (typeof options === 'function') {
      callback = options
      options = defaultGetCookieOptions
    } else if (options === undefined) {
      options = defaultGetCookieOptions
    }
    const promiseCallback = createPromiseCallback(callback)
    const cb = promiseCallback.callback

    if (typeof url === 'string') {
      validators.validate(validators.isNonEmptyString(url), cb, url)
    }
    const context = getCookieContext(url)
    validators.validate(validators.isObject(options), cb, safeToString(options))
    validators.validate(typeof cb === 'function', cb)

    const host = canonicalDomain(context.hostname)
    const path = context.pathname || '/'

    const secure =
      context.protocol &&
      (context.protocol == 'https:' || context.protocol == 'wss:')

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

    function matchingCookie(c: Cookie) {
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
      if (c.secure && !secure) {
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
      if (expireCheck && expiryTime && expiryTime <= now) {
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
        if (options && 'sort' in options && options.sort !== false) {
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
  getCookiesSync(url: string, options?: GetCookiesOptions): Cookie[] {
    return this.callSync(this.getCookies.bind(this, url, options)) ?? []
  }

  getCookieString(
    url: string,
    options: GetCookiesOptions,
    callback: Callback<string | undefined>,
  ): void
  getCookieString(url: string, callback: Callback<string | undefined>): void
  getCookieString(url: string, options?: GetCookiesOptions): Promise<string>
  getCookieString(
    url: string,
    options: GetCookiesOptions | Callback<string | undefined>,
    callback?: Callback<string | undefined>,
  ): unknown
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
  getCookieStringSync(url: string, options?: GetCookiesOptions): string {
    return (
      this.callSync(
        options
          ? this.getCookieString.bind(this, url, options)
          : this.getCookieString.bind(this, url),
      ) ?? ''
    )
  }

  getSetCookieStrings(
    url: string,
    callback: Callback<string[] | undefined>,
  ): void
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
    callback: Callback<string[] | undefined>,
  ): void
  getSetCookieStrings(
    url: string,
    options?: GetCookiesOptions,
  ): Promise<string[] | undefined>
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
    callback?: Callback<string[] | undefined>,
  ): unknown
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

    const next: Callback<Cookie[]> = function (
      err: Error | null,
      cookies: Cookie[] | undefined,
    ) {
      if (err) {
        promiseCallback.callback(err)
      } else if (cookies === undefined) {
        promiseCallback.callback(null, undefined)
      } else {
        promiseCallback.callback(
          null,
          cookies.map((c) => {
            return c.toString()
          }),
        )
      }
    }

    this.getCookies(url, options, next)
    return promiseCallback.promise
  }
  getSetCookieStringsSync(
    url: string,
    options: GetCookiesOptions = {},
  ): string[] {
    return (
      this.callSync(this.getSetCookieStrings.bind(this, url, options)) ?? []
    )
  }

  serialize(callback: Callback<SerializedCookieJar>): void
  serialize(): Promise<SerializedCookieJar>
  serialize(callback?: Callback<SerializedCookieJar>): unknown {
    const promiseCallback = createPromiseCallback<SerializedCookieJar>(callback)
    const cb = promiseCallback.callback

    validators.validate(typeof cb === 'function', cb)
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
  serializeSync(): SerializedCookieJar | undefined {
    return this.callSync((callback) => {
      this.serialize(callback)
    })
  }

  toJSON() {
    return this.serializeSync()
  }

  // use the class method CookieJar.deserialize instead of calling this directly
  _importCookies(serialized: unknown, callback: Callback<CookieJar>) {
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

    const putNext = (err: Error | null): void => {
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

        if (cookie === null) {
          putNext(null)
          return // skip this cookie
        }

        this.store.putCookie(cookie, putNext)
      }
    }

    putNext(null)
  }

  _importCookiesSync(serialized: unknown): void {
    this.callSync(this._importCookies.bind(this, serialized))
  }

  clone(callback: Callback<CookieJar>): void
  clone(newStore: Store, callback: Callback<CookieJar>): void
  clone(newStore?: Store): Promise<CookieJar>
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

  _cloneSync(newStore?: Store): CookieJar | undefined {
    const cloneFn =
      newStore && typeof newStore !== 'function'
        ? this.clone.bind(this, newStore)
        : this.clone.bind(this)
    return this.callSync((callback) => {
      cloneFn(callback)
    })
  }

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

  removeAllCookies(callback: ErrorCallback): void
  removeAllCookies(): Promise<void>
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

      function removeCookieCb(removeErr: Error | null) {
        if (removeErr) {
          removeErrors.push(removeErr)
        }

        completedCount++

        if (completedCount === cookies?.length) {
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
  removeAllCookiesSync(): void {
    this.callSync<never>((callback) => {
      this.removeAllCookies(callback)
    })
  }

  static deserialize(
    strOrObj: string | object,
    callback: Callback<CookieJar>,
  ): void
  static deserialize(
    strOrObj: string | object,
    store: Store,
    callback: Callback<CookieJar>,
  ): void
  static deserialize(
    strOrObj: string | object,
    store?: Store,
  ): Promise<CookieJar>
  static deserialize(
    strOrObj: string | object,
    store?: Store | Callback<CookieJar>,
    callback?: Callback<CookieJar>,
  ): unknown
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

  static fromJSON(jsonString: SerializedCookieJar, store?: Store): CookieJar {
    return CookieJar.deserializeSync(jsonString, store)
  }
}
