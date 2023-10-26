import urlParse from 'url-parse'

import * as pubsuffix from '../pubsuffix-psl'
import * as validators from '../validators'
import { Store } from '../store'
import { MemoryCookieStore } from '../memstore'
import { pathMatch } from '../pathMatch'
import { Cookie } from './cookie'
import {
  Callback,
  ErrorCallback,
  createPromiseCallback,
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

function getCookieContext(url: string | URL) {
  if (url instanceof URL && 'query' in url) {
    return url
  }

  if (typeof url === 'string') {
    try {
      return urlParse(decodeURI(url))
    } catch {
      return urlParse(url)
    }
  }

  throw new Error('`url` argument is invalid')
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
  if (prefixSecurity != null) {
    const normalizedPrefixSecurity = prefixSecurity.toLowerCase()
    /* The three supported options */
    switch (normalizedPrefixSecurity) {
      case PrefixSecurityEnum.STRICT:
      case PrefixSecurityEnum.SILENT:
      case PrefixSecurityEnum.DISABLED:
        return normalizedPrefixSecurity
    }
  }
  /* Default is SILENT */
  return PrefixSecurityEnum.SILENT
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

  private callSync<T>(fn: (callback: Callback<T>) => void): T | undefined {
    if (!this.store.synchronous) {
      throw new Error(
        'CookieJar store is not synchronous; use async API instead.',
      )
    }
    let syncErr: Error | undefined
    let syncResult: T | undefined = undefined
    fn.call(this, (error, result) => {
      syncErr = error
      syncResult = result
    })
    if (syncErr) {
      throw syncErr
    }

    return syncResult
  }

  setCookie(
    cookie: string | Cookie,
    url: string,
    callback: Callback<Cookie>,
  ): void
  setCookie(
    cookie: string | Cookie,
    url: string,
    options: SetCookieOptions,
    callback: Callback<Cookie>,
  ): void
  setCookie(cookie: string | Cookie, url: string): Promise<Cookie>
  setCookie(
    cookie: string | Cookie,
    url: string,
    options: SetCookieOptions,
  ): Promise<Cookie>
  setCookie(
    cookie: string | Cookie,
    url: string,
    options: SetCookieOptions | Callback<Cookie>,
    callback?: Callback<Cookie>,
  ): unknown
  setCookie(
    cookie: string | Cookie,
    url: string,
    options?: SetCookieOptions | Callback<Cookie>,
    callback?: Callback<Cookie>,
  ): unknown {
    const promiseCallback = createPromiseCallback<Cookie>(arguments)
    const cb = promiseCallback.callback

    validators.validate(
      validators.isNonEmptyString(url),
      callback,
      safeToString(options),
    )
    let err

    if (typeof url === 'function') {
      return promiseCallback.reject(new Error('No URL was specified'))
    }

    const context = getCookieContext(url)
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
      return promiseCallback.reject(null)
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
        return promiseCallback.reject(options?.ignoreError ? null : err)
      }
      cookie = parsedCookie
    } else if (!(cookie instanceof Cookie)) {
      // If you're seeing this error, and are passing in a Cookie object,
      // it *might* be a Cookie object from another loaded version of tough-cookie.
      err = new Error(
        'First argument to setCookie must be a Cookie object or string',
      )
      return promiseCallback.reject(options?.ignoreError ? null : err)
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
            ? pubsuffix.getPublicSuffix(cdomain, {
                allowSpecialUseDomain: this.allowSpecialUseDomain,
                ignoreError: options?.ignoreError,
              })
            : null
        if (suffix == null && !IP_V6_REGEX_OBJECT.test(cookie.domain)) {
          // e.g. "com"
          err = new Error('Cookie has domain set to a public suffix')
          return promiseCallback.reject(options?.ignoreError ? null : err)
        }
      } catch (err) {
        if (options?.ignoreError) {
          return promiseCallback.reject(null)
        } else {
          if (err instanceof Error) {
            return promiseCallback.reject(err)
          } else {
            return promiseCallback.reject(null)
          }
        }
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
        return promiseCallback.reject(options?.ignoreError ? null : err)
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
      cookie.path = defaultPath(context.pathname ?? undefined)
      cookie.pathIsDefault = true
    }

    // S5.3 step 8: NOOP; secure attribute
    // S5.3 step 9: NOOP; httpOnly attribute

    // S5.3 step 10
    if (options?.http === false && cookie.httpOnly) {
      err = new Error("Cookie is HttpOnly and this isn't an HTTP API")
      return promiseCallback.reject(options?.ignoreError ? null : err)
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
        return promiseCallback.reject(options?.ignoreError ? null : err)
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
        return promiseCallback.reject(
          options?.ignoreError || ignoreErrorForPrefixSecurity
            ? null
            : new Error(errorMsg),
        )
      }
    }

    const store = this.store

    if (!store.updateCookie) {
      store.updateCookie = function (
        _oldCookie: Cookie,
        newCookie: Cookie,
        cb?: Callback<void>,
      ): Promise<void> {
        return this.putCookie(newCookie).then(
          () => {
            if (cb) {
              cb(undefined, undefined)
            }
          },
          (error: Error) => {
            if (cb) {
              cb(error, undefined)
            }
          },
        )
      }
    }

    function withCookie(
      err: Error | undefined,
      oldCookie: Cookie | undefined | null,
    ): void {
      if (err) {
        cb(err)
        return
      }

      const next = function (err: Error | undefined): void {
        if (err || typeof cookie === 'string') {
          cb(err)
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
          cb(options.ignoreError ? null : err)
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
    const setCookieFn = this.setCookie.bind(
      this,
      cookie,
      url,
      options as SetCookieOptions,
    )
    return this.callSync<Cookie>(setCookieFn)
  }

  // RFC6365 S5.4
  getCookies(url: string, callback: Callback<Cookie[]>): void
  getCookies(
    url: string,
    options: GetCookiesOptions | undefined,
    callback: Callback<Cookie[]>,
  ): void
  getCookies(url: string): Promise<Cookie[]>
  getCookies(
    url: string,
    options: GetCookiesOptions | undefined,
  ): Promise<Cookie[]>
  getCookies(
    url: string,
    options: GetCookiesOptions | undefined | Callback<Cookie[]>,
    callback?: Callback<Cookie[]>,
  ): unknown
  getCookies(
    url: string,
    options?: GetCookiesOptions | Callback<Cookie[]>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<Cookie[]>,
  ): unknown {
    const promiseCallback = createPromiseCallback<Cookie[]>(arguments)
    const cb = promiseCallback.callback

    validators.validate(validators.isNonEmptyString(url), cb, url)
    const context = getCookieContext(url)
    if (typeof options === 'function' || options === undefined) {
      options = defaultGetCookieOptions
    }
    validators.validate(validators.isObject(options), cb, safeToString(options))
    validators.validate(typeof cb === 'function', cb)

    const host = canonicalDomain(context.hostname)
    const path = context.pathname || '/'

    const secure =
      context.protocol &&
      (context.protocol == 'https:' || context.protocol == 'wss:')

    let sameSiteLevel = 0
    if (options?.sameSiteContext) {
      const sameSiteContext = checkSameSiteContext(options.sameSiteContext)
      if (sameSiteContext == null) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR))
      }
      sameSiteLevel = Cookie.sameSiteLevel[sameSiteContext]
      if (!sameSiteLevel) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR))
      }
    }

    const http = options?.http ?? true

    const now = Date.now()
    const expireCheck = options?.expire ?? true
    const allPaths = options?.allPaths ?? false
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
        // eslint-disable-next-line @typescript-eslint/no-empty-function
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
          cb(undefined, [])
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
    return (
      this.callSync<Cookie[]>(this.getCookies.bind(this, url, options)) ?? []
    )
  }

  getCookieString(
    url: string,
    options: GetCookiesOptions,
    callback: Callback<string>,
  ): void
  getCookieString(url: string, callback: Callback<string>): void
  getCookieString(url: string): Promise<string>
  getCookieString(url: string, options: GetCookiesOptions): Promise<string>
  getCookieString(
    url: string,
    options: GetCookiesOptions | Callback<string>,
    callback?: Callback<string>,
  ): unknown
  getCookieString(
    url: string,
    options?: GetCookiesOptions | Callback<string>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<string>,
  ): unknown {
    const promiseCallback = createPromiseCallback<string>(arguments)

    if (typeof options === 'function') {
      options = undefined
    }

    const next: Callback<Cookie[]> = function (
      err: Error | undefined,
      cookies: Cookie[] | undefined,
    ) {
      if (err || cookies === undefined) {
        promiseCallback.callback(err)
      } else {
        promiseCallback.callback(
          undefined,
          cookies
            .sort(cookieCompare)
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
      this.callSync<string>(
        this.getCookieString.bind(this, url, options as GetCookiesOptions),
      ) ?? ''
    )
  }

  getSetCookieStrings(url: string, callback: Callback<string[]>): void
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
    callback: Callback<string[]>,
  ): void
  getSetCookieStrings(url: string): Promise<string[]>
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
  ): Promise<string[]>
  getSetCookieStrings(
    url: string,
    options: GetCookiesOptions,
    callback?: Callback<string[]>,
  ): unknown
  getSetCookieStrings(
    url: string,
    options?: GetCookiesOptions | Callback<string[]>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<string[]>,
  ): unknown {
    const promiseCallback = createPromiseCallback<string[]>(arguments)

    if (typeof options === 'function') {
      options = undefined
    }

    const next: Callback<Cookie[]> = function (
      err: Error | undefined,
      cookies: Cookie[] | undefined,
    ) {
      if (err || cookies === undefined) {
        promiseCallback.callback(err)
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
      this.callSync<string[]>(
        this.getSetCookieStrings.bind(this, url, options),
      ) ?? []
    )
  }

  serialize(callback: Callback<SerializedCookieJar>): void
  serialize(): Promise<SerializedCookieJar>
  serialize(callback?: Callback<SerializedCookieJar>): unknown
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  serialize(_callback?: Callback<SerializedCookieJar>): unknown {
    const promiseCallback =
      createPromiseCallback<SerializedCookieJar>(arguments)
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

    if (
      !(
        this.store.getAllCookies &&
        typeof this.store.getAllCookies === 'function'
      )
    ) {
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
        promiseCallback.callback(undefined, serialized)
        return
      }

      serialized.cookies = cookies.map((cookie) => {
        // convert to serialized 'raw' cookies
        const serializedCookie = cookie.toJSON()

        // Remove the index so new ones get assigned during deserialization
        delete serializedCookie.creationIndex

        return serializedCookie
      })

      promiseCallback.callback(undefined, serialized)
    })

    return promiseCallback.promise
  }
  serializeSync(): SerializedCookieJar | undefined {
    return this.callSync<SerializedCookieJar>((callback) => {
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
      return callback(
        new Error('serialized jar has no cookies array'),
        undefined,
      )
    }

    cookies = cookies.slice() // do not modify the original

    const putNext = (err?: Error): void => {
      if (err) {
        return callback(err, undefined)
      }

      if (Array.isArray(cookies)) {
        if (!cookies.length) {
          return callback(err, this)
        }

        let cookie
        try {
          cookie = Cookie.fromJSON(cookies.shift())
        } catch (e) {
          return callback(e instanceof Error ? e : new Error(), undefined)
        }

        if (cookie === null) {
          return putNext(undefined) // skip this cookie
        }

        this.store.putCookie(cookie, putNext)
      }
    }

    putNext()
  }

  _importCookiesSync(serialized: unknown): void {
    this.callSync(this._importCookies.bind(this, serialized))
  }

  clone(callback: Callback<CookieJar>): void
  clone(newStore: Store, callback: Callback<CookieJar>): void
  clone(): Promise<CookieJar>
  clone(newStore: Store): Promise<CookieJar>
  clone(
    newStore?: Store | Callback<CookieJar>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<CookieJar>,
  ): unknown {
    if (typeof newStore === 'function') {
      newStore = undefined
    }

    const promiseCallback = createPromiseCallback<CookieJar>(arguments)
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
    return this.callSync((callback) => cloneFn(callback))
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
  removeAllCookies(callback?: ErrorCallback): unknown
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeAllCookies(_callback?: ErrorCallback): unknown {
    const promiseCallback = createPromiseCallback<void>(arguments)
    const cb = promiseCallback.callback

    const store = this.store

    // Check that the store implements its own removeAllCookies(). The default
    // implementation in Store will immediately call the callback with a "not
    // implemented" Error.
    if (
      typeof store.removeAllCookies === 'function' &&
      store.removeAllCookies !== Store.prototype.removeAllCookies
    ) {
      store.removeAllCookies(cb)
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
        cb(null)
        return
      }

      let completedCount = 0
      const removeErrors: Error[] = []

      function removeCookieCb(removeErr: Error | undefined) {
        if (removeErr) {
          removeErrors.push(removeErr)
        }

        completedCount++

        if (completedCount === cookies?.length) {
          cb(removeErrors.length ? removeErrors[0] : null)
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
    return this.callSync<void>((callback) => this.removeAllCookies(callback))
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
  static deserialize(strOrObj: string | object): Promise<CookieJar>
  static deserialize(
    strOrObj: string | object,
    store: Store,
  ): Promise<CookieJar>
  static deserialize(
    strOrObj: string | object,
    store?: Store | Callback<CookieJar>,
    callback?: Callback<CookieJar>,
  ): unknown
  static deserialize(
    strOrObj: string | object,
    store?: Store | Callback<CookieJar>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<CookieJar>,
  ): unknown {
    if (typeof store === 'function') {
      store = undefined
    }

    const promiseCallback = createPromiseCallback<CookieJar>(arguments)

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

    const readSerializedProperty = (property: string): unknown | undefined => {
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
      promiseCallback.callback(undefined, jar)
    })

    return promiseCallback.promise
  }

  static deserializeSync(
    strOrObj: string | SerializedCookieJar,
    store?: Store,
  ): CookieJar {
    const serialized: unknown =
      typeof strOrObj === 'string' ? JSON.parse(strOrObj) : strOrObj

    const readSerializedProperty = (property: string): unknown | undefined => {
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
