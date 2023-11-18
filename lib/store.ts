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

// disabling this lint on this whole file because Store should be abstract
// but we have implementations in the wild that may not implement all features
/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict'

import type { Cookie } from './cookie/cookie'
import type { Callback, ErrorCallback, Nullable } from './utils'

export class Store {
  synchronous: boolean

  constructor() {
    this.synchronous = false
  }

  findCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
  ): Promise<Nullable<Cookie>>
  findCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
    callback: Callback<Nullable<Cookie>>,
  ): void
  findCookie(
    _domain: Nullable<string>,
    _path: Nullable<string>,
    _key: Nullable<string>,
    _callback?: Callback<Nullable<Cookie>>,
  ): unknown {
    throw new Error('findCookie is not implemented')
  }

  findCookies(
    domain: Nullable<string>,
    path: Nullable<string>,
    allowSpecialUseDomain?: boolean,
  ): Promise<Cookie[]>
  findCookies(
    domain: Nullable<string>,
    path: Nullable<string>,
    allowSpecialUseDomain?: boolean,
    callback?: Callback<Cookie[]>,
  ): void
  findCookies(
    _domain: Nullable<string>,
    _path: Nullable<string>,
    _allowSpecialUseDomain: boolean | Callback<Cookie[]> = false,
    _callback?: Callback<Cookie[]>,
  ): unknown {
    throw new Error('findCookies is not implemented')
  }

  putCookie(cookie: Cookie): Promise<void>
  putCookie(cookie: Cookie, callback: ErrorCallback): void
  putCookie(_cookie: Cookie, _callback?: ErrorCallback): unknown {
    throw new Error('putCookie is not implemented')
  }

  updateCookie(oldCookie: Cookie, newCookie: Cookie): Promise<void>
  updateCookie(
    oldCookie: Cookie,
    newCookie: Cookie,
    callback: ErrorCallback,
  ): void
  updateCookie(
    _oldCookie: Cookie,
    _newCookie: Cookie,
    _callback?: ErrorCallback,
  ): unknown {
    // recommended default implementation:
    // return this.putCookie(newCookie, cb);
    throw new Error('updateCookie is not implemented')
  }

  removeCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
  ): Promise<void>
  removeCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
    callback: ErrorCallback,
  ): void
  removeCookie(
    _domain: Nullable<string>,
    _path: Nullable<string>,
    _key: Nullable<string>,
    _callback?: ErrorCallback,
  ): unknown {
    throw new Error('removeCookie is not implemented')
  }

  removeCookies(domain: string, path: Nullable<string>): Promise<void>
  removeCookies(
    domain: string,
    path: Nullable<string>,
    callback: ErrorCallback,
  ): void
  removeCookies(
    _domain: string,
    _path: Nullable<string>,
    _callback?: ErrorCallback,
  ): unknown {
    throw new Error('removeCookies is not implemented')
  }

  removeAllCookies(): Promise<void>
  removeAllCookies(callback: ErrorCallback): void
  removeAllCookies(_callback?: ErrorCallback): unknown {
    throw new Error('removeAllCookies is not implemented')
  }

  getAllCookies(): Promise<Cookie[]>
  getAllCookies(callback: Callback<Cookie[]>): void
  getAllCookies(_callback?: Callback<Cookie[]>): unknown {
    throw new Error(
      'getAllCookies is not implemented (therefore jar cannot be serialized)',
    )
  }
}
