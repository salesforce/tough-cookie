/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
'use strict'
import type { Cookie } from './cookie/cookie'
import { pathMatch } from './pathMatch'
import { permuteDomain } from './permuteDomain'
import { Store } from './store'
import { getCustomInspectSymbol, getUtilInspect } from './utilHelper'
import {
  Callback,
  createPromiseCallback,
  inOperator,
  ErrorCallback,
  Nullable,
} from './utils'

export type MemoryCookieStoreIndex = {
  [domain: string]: {
    [path: string]: {
      [key: string]: Cookie
    }
  }
}

export class MemoryCookieStore extends Store {
  override synchronous: boolean
  idx: MemoryCookieStoreIndex

  constructor() {
    super()
    this.synchronous = true
    this.idx = Object.create(null) as MemoryCookieStoreIndex
    const customInspectSymbol = getCustomInspectSymbol()
    if (customInspectSymbol) {
      Object.defineProperty(this, customInspectSymbol, {
        value: this.inspect.bind(this),
        enumerable: false,
        writable: false,
        configurable: false,
      })
    }
  }

  inspect() {
    const util = { inspect: getUtilInspect(inspectFallback) }
    return `{ idx: ${util.inspect(this.idx, false, 2)} }`
  }

  override findCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
  ): Promise<Nullable<Cookie>>
  override findCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
    callback: Callback<Cookie | undefined>,
  ): void
  override findCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
    callback?: Callback<Cookie | undefined>,
  ): unknown {
    const promiseCallback = createPromiseCallback(callback)
    if (domain == null || path == null || key == null) {
      return promiseCallback.resolve(undefined)
    }
    const result = this.idx?.[domain]?.[path]?.[key]
    return promiseCallback.resolve(result)
  }

  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain?: boolean,
  ): Promise<Cookie[]>
  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain?: boolean,
    callback?: Callback<Cookie[]>,
  ): void
  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain: boolean | Callback<Cookie[]> = false,
    callback?: Callback<Cookie[]>,
  ): unknown {
    if (typeof allowSpecialUseDomain === 'function') {
      callback = allowSpecialUseDomain
      // TODO: It's weird that `allowSpecialUseDomain` defaults to false with no callback,
      // but true with a callback. This is legacy behavior from v4.
      allowSpecialUseDomain = true
    }

    const results: Cookie[] = []
    const promiseCallback = createPromiseCallback<Cookie[]>(callback)

    if (!domain) {
      return promiseCallback.resolve([])
    }

    let pathMatcher: (
      domainIndex: MemoryCookieStoreIndex[string] | undefined,
    ) => void
    if (!path) {
      // null means "all paths"
      pathMatcher = function matchAll(domainIndex) {
        for (const curPath in domainIndex) {
          const pathIndex = domainIndex[curPath]
          for (const key in pathIndex) {
            const value = pathIndex[key]
            if (value) {
              results.push(value)
            }
          }
        }
      }
    } else {
      pathMatcher = function matchRFC(domainIndex) {
        //NOTE: we should use path-match algorithm from S5.1.4 here
        //(see : https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/canonical_cookie.cc#L299)
        for (const cookiePath in domainIndex) {
          if (pathMatch(path, cookiePath)) {
            const pathIndex = domainIndex[cookiePath]
            for (const key in pathIndex) {
              const value = pathIndex[key]
              if (value) {
                results.push(value)
              }
            }
          }
        }
      }
    }

    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain]
    const idx = this.idx
    domains.forEach((curDomain) => {
      const domainIndex = idx[curDomain]
      if (!domainIndex) {
        return
      }
      pathMatcher(domainIndex)
    })

    return promiseCallback.resolve(results)
  }

  override putCookie(cookie: Cookie): Promise<void>
  override putCookie(cookie: Cookie, callback: ErrorCallback): void
  override putCookie(cookie: Cookie, callback?: ErrorCallback): unknown {
    const promiseCallback = createPromiseCallback<undefined>(callback)

    const { domain, path, key } = cookie
    if (domain == null || path == null || key == null) {
      return promiseCallback.resolve(undefined)
    }

    const domainEntry =
      this.idx[domain] ??
      (Object.create(null) as MemoryCookieStoreIndex[string])

    this.idx[domain] = domainEntry

    const pathEntry =
      domainEntry[path] ??
      (Object.create(null) as MemoryCookieStoreIndex[string][string])

    domainEntry[path] = pathEntry

    pathEntry[key] = cookie

    return promiseCallback.resolve(undefined)
  }

  override updateCookie(oldCookie: Cookie, newCookie: Cookie): Promise<void>
  override updateCookie(
    oldCookie: Cookie,
    newCookie: Cookie,
    callback: ErrorCallback,
  ): void
  override updateCookie(
    _oldCookie: Cookie,
    newCookie: Cookie,
    callback?: ErrorCallback,
  ): unknown {
    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    return callback
      ? this.putCookie(newCookie, callback)
      : this.putCookie(newCookie)
  }

  override removeCookie(
    domain: string,
    path: string,
    key: string,
  ): Promise<void>
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    callback: ErrorCallback,
  ): void
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    callback?: ErrorCallback,
  ): unknown {
    const promiseCallback = createPromiseCallback<undefined>(callback)
    delete this.idx[domain]?.[path]?.[key]
    return promiseCallback.resolve(undefined)
  }

  override removeCookies(domain: string, path: string): Promise<void>
  override removeCookies(
    domain: string,
    path: string,
    callback: ErrorCallback,
  ): void
  override removeCookies(
    domain: string,
    path: string,
    callback?: ErrorCallback,
  ): unknown {
    const promiseCallback = createPromiseCallback<undefined>(callback)

    const domainEntry = this.idx[domain]
    if (domainEntry) {
      if (path) {
        delete domainEntry?.[path]
      } else {
        delete this.idx?.[domain]
      }
    }

    return promiseCallback.resolve(undefined)
  }

  override removeAllCookies(): Promise<void>
  override removeAllCookies(callback: ErrorCallback): void
  override removeAllCookies(callback?: ErrorCallback): unknown {
    const promiseCallback = createPromiseCallback<undefined>(callback)
    this.idx = Object.create(null) as MemoryCookieStoreIndex
    return promiseCallback.resolve(undefined)
  }

  override getAllCookies(): Promise<Cookie[]>
  override getAllCookies(callback: Callback<Cookie[]>): void
  override getAllCookies(callback?: Callback<Cookie[]>): unknown {
    const promiseCallback = createPromiseCallback<Cookie[]>(callback)

    const cookies: Cookie[] = []
    const idx = this.idx

    const domains = Object.keys(idx)
    domains.forEach((domain) => {
      const domainEntry = idx[domain] ?? {}
      const paths = Object.keys(domainEntry)
      paths.forEach((path) => {
        const pathEntry = domainEntry[path] ?? {}
        const keys = Object.keys(pathEntry)
        keys.forEach((key) => {
          const keyEntry = pathEntry[key]
          if (keyEntry != null) {
            cookies.push(keyEntry)
          }
        })
      })
    })

    // Sort by creationIndex so deserializing retains the creation order.
    // When implementing your own store, this SHOULD retain the order too
    cookies.sort((a, b) => {
      return (a.creationIndex || 0) - (b.creationIndex || 0)
    })

    return promiseCallback.resolve(cookies)
  }
}

export function inspectFallback(val: unknown): string {
  if (typeof val === 'string') {
    return `'${val}'`
  }

  if (val && typeof val === 'object') {
    const domains = Object.keys(val)
    if (domains.length === 0) {
      return '[Object: null prototype] {}'
    }
    let result = '[Object: null prototype] {\n'
    Object.keys(val).forEach((domain, i) => {
      if (inOperator(domain, val)) {
        result += formatDomain(domain, val[domain])
        if (i < domains.length - 1) {
          result += ','
        }
        result += '\n'
      }
    })
    result += '}'
    return result
  }

  return String(val)
}

function formatDomain(domainName: string, domainValue: unknown) {
  if (typeof domainValue === 'string') {
    return `'${domainValue}'`
  }

  if (domainValue && typeof domainValue === 'object') {
    const indent = '  '
    let result = `${indent}'${domainName}': [Object: null prototype] {\n`
    Object.keys(domainValue).forEach((path, i, paths) => {
      if (inOperator(path, domainValue)) {
        result += formatPath(path, domainValue[path])
        if (i < paths.length - 1) {
          result += ','
        }
        result += '\n'
      }
    })
    result += `${indent}}`
    return result
  }

  return String(domainValue)
}

function formatPath(pathName: string, pathValue: unknown) {
  if (typeof pathValue === 'string') {
    return `'${pathValue}'`
  }

  if (pathValue && typeof pathValue === 'object') {
    const indent = '    '
    let result = `${indent}'${pathName}': [Object: null prototype] {\n`
    Object.keys(pathValue).forEach((cookieName, i, cookieNames) => {
      if (inOperator(cookieName, pathValue)) {
        const cookie = pathValue[cookieName]
        if (
          cookie != null &&
          typeof cookie === 'object' &&
          inOperator('inspect', cookie) &&
          typeof cookie.inspect === 'function'
        ) {
          const inspectedValue: unknown = cookie.inspect()
          if (typeof inspectedValue === 'string') {
            result += `      ${cookieName}: ${inspectedValue}`
            if (i < cookieNames.length - 1) {
              result += ','
            }
            result += '\n'
          }
        }
      }
    })
    result += `${indent}}`
    return result
  }

  return String(pathValue)
}
