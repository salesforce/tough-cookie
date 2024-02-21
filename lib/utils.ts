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
export const safeToString = (val: unknown): string => {
  // Using .toString() fails for null/undefined and implicit conversion (val + "") fails for symbols
  // and objects with null prototype
  if (val === undefined || val === null || typeof val.toString === 'function') {
    // Array#toString implicitly converts its values to strings, which is what we're trying to avoid
    return Array.isArray(val) ? val.map(safeToString).join() : String(val)
  } else {
    // This case should just be objects with null prototype, so we can just use Object#toString
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
