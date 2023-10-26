/** A callback function that accepts an error or a result. */
export type Callback<T> = (error: Error | null, result: T | undefined) => void

/** Signature for a callback function that expects an error to be passed. */
export type ErrorCallback = (error: Error, result?: never) => void

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
  promise: Promise<T | undefined>
  callback: (error: Error | null, result?: T) => void
  resolve: (value: T | undefined) => Promise<T | undefined>
  reject: (error: Error | null) => Promise<T | undefined>
}

/** Converts a callback into a utility object where either a callback or a promise can be used. */
export function createPromiseCallback<T>(args: IArguments): PromiseCallback<T> {
  let callback: (error: Error | null | undefined, result: T | undefined) => void
  let resolve: (result: T | undefined) => void
  let reject: (error: Error | null) => void

  const promise = new Promise<T | undefined>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })

  const cb: unknown = args[args.length - 1]
  if (typeof cb === 'function') {
    callback = (err, result) => {
      try {
        cb(err, result)
      } catch (e) {
        reject(e instanceof Error ? e : new Error())
      }
    }
  } else {
    callback = (err, result) => {
      try {
        err ? reject(err) : resolve(result)
      } catch (e) {
        reject(e instanceof Error ? e : new Error())
      }
    }
  }

  return {
    promise,
    callback,
    resolve: (value: T | undefined) => {
      callback(null, value)
      return promise
    },
    reject: (error: Error | null | undefined) => {
      callback(error, undefined)
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
