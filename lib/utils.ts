/**
 * A callback function that accepts an error or a result.
 * @public
 */
export interface Callback<T> {
  (error: Error, result?: never): void
  (error: null, result: T): void
}

/**
 * A callback function that only accepts an error.
 * @public
 */
export interface ErrorCallback {
  (error: Error | null): void
}

/**
 * The inverse of NonNullable<T>.
 * @public
 */
export type Nullable<T> = T | null | undefined

/** Wrapped `Object.prototype.toString`, so that you don't need to remember to use `.call()`. */
export const objectToString = (obj: unknown): string =>
  Object.prototype.toString.call(obj)

/**
 * Converts an array to string, safely handling symbols, null prototype objects, and recursive arrays.
 */
const safeArrayToString = (
  arr: unknown[],
  seenArrays: WeakSet<object>,
): string => {
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toString#description
  if (typeof arr.join !== 'function') return objectToString(arr)
  seenArrays.add(arr)
  const mapped = arr.map((val) =>
    val === null || val === undefined || seenArrays.has(val)
      ? ''
      : safeToStringImpl(val, seenArrays),
  )
  return mapped.join()
}

const safeToStringImpl = (val: unknown, seenArrays = new WeakSet()): string => {
  // Using .toString() fails for null/undefined and implicit conversion (val + "") fails for symbols
  // and objects with null prototype
  if (typeof val !== 'object' || val === null) {
    return String(val)
  } else if (typeof val.toString === 'function') {
    return Array.isArray(val)
      ? // Arrays have a weird custom toString that we need to replicate
        safeArrayToString(val, seenArrays)
      : // eslint-disable-next-line @typescript-eslint/no-base-to-string
        String(val)
  } else {
    // This case should just be objects with null prototype, so we can just use Object#toString
    return objectToString(val)
  }
}

/** Safely converts any value to string, using the value's own `toString` when available. */
export const safeToString = (val: unknown): string => safeToStringImpl(val)

/** Utility object for promise/callback interop. */
export interface PromiseCallback<T> {
  promise: Promise<T>
  callback: Callback<T>
  resolve: (value: T) => Promise<T>
  reject: (error: Error) => Promise<T>
}

/** Converts a callback into a utility object where either a callback or a promise can be used. */
export function createPromiseCallback<T>(cb?: Callback<T>): PromiseCallback<T> {
  let callback: Callback<T>
  let resolve: (result: T) => void
  let reject: (error: Error) => void

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })

  if (typeof cb === 'function') {
    callback = (err, result): void => {
      try {
        if (err) cb(err)
        // If `err` is null, we know `result` must be `T`
        // The assertion isn't *strictly* correct, as `T` could be nullish, but, ehh, good enough...
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        else cb(null, result!)
      } catch (e) {
        reject(e instanceof Error ? e : new Error())
      }
    }
  } else {
    callback = (err, result): void => {
      try {
        // If `err` is null, we know `result` must be `T`
        // The assertion isn't *strictly* correct, as `T` could be nullish, but, ehh, good enough...
        if (err) reject(err)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        else resolve(result!)
      } catch (e) {
        reject(e instanceof Error ? e : new Error())
      }
    }
  }

  return {
    promise,
    callback,
    resolve: (value: T): Promise<T> => {
      callback(null, value)
      return promise
    },
    reject: (error: Error): Promise<T> => {
      callback(error)
      return promise
    },
  }
}

export function inOperator<K extends string, T extends object>(
  k: K,
  o: T,
): o is T & Record<K, unknown> {
  return k in o
}
