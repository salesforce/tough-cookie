/** A callback function that accepts an error or a result. */
export interface Callback<T> {
  (error: Error, result?: never): void
  (error: null, result: T): void
}

/** A callback function that only accepts an error. */
export interface ErrorCallback {
  (error: Error | null): void
}

/** Wrapped `Object.prototype.toString`, so that you don't need to remember to use `.call()`. */
export const objectToString = (obj: unknown) =>
  Object.prototype.toString.call(obj)

/** Safely converts any value to string, using the value's own `toString` when available. */
export const safeToString = (val: unknown) => {
  // Ideally, we'd just use String() for everything, but it breaks if `toString` is missing (mostly
  // values with no prototype), so we have to use Object#toString as a fallback.
  if (val === undefined || val === null || typeof val.toString === 'function') {
    return String(val)
  } else {
    return objectToString(val)
  }
}

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
    callback = (err, result) => {
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
    callback = (err, result) => {
      try {
        // If `err` is null, we know `result` must be `T`
        // The assertion isn't *strictly* correct, as `T` could be nullish, but, ehh, good enough...
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        err ? reject(err) : resolve(result!)
      } catch (e) {
        reject(e instanceof Error ? e : new Error())
      }
    }
  }

  return {
    promise,
    callback,
    resolve: (value: T) => {
      callback(null, value)
      return promise
    },
    reject: (error: Error) => {
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

/**
 * Symbol used by node.js for custom inspect output.
 * @see https://nodejs.org/docs/latest-v16.x/api/util.html#utilinspectcustom
 */
export const NODEJS_UTIL_INSPECT_CUSTOM = Symbol.for(
  'nodejs.util.inspect.custom',
)
