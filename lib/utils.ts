/** Signature for a callback function that expects an error to be passed. */
export type ErrorCallback = (error: Error, result?: never) => void

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
