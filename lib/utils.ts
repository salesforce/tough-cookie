/** Signature for a generic callback function. */
export type Callback<T> = (error?: Error | null, result?: T) => void
/** Signature for a callback function that expects an error to be passed. */
export type ErrorCallback = (error: Error, result?: never) => void
