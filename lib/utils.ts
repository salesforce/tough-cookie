/** A callback function that expects an error to be passed. */
export type ErrorCallback = (error: Error, result?: never) => void

/** A callback function that expects a successful result. */
type SuccessCallback<T> = (error: null, result: T) => void

/** A callback function that accepts an error or a result. */
export type Callback<T> = SuccessCallback<T> & ErrorCallback

/** Safely converts any value to string, using the value's own `toString` when available. */
export const safeToString = (val: unknown) => {
  // Ideally, we'd just use String() for everything, but it breaks if `toString` is missing (mostly
  // values with no prototype), so we have to use Object#toString as a fallback.
  if (val === undefined || val === null || typeof val.toString === 'function') {
    return String(val)
  } else {
    return Object.prototype.toString.call(val)
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
