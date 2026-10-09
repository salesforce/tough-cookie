/** The brand is private so finite seconds are constructed through parse. */
declare const maxAgeSecondsBrand: unique symbol

/** A finite cookie lifetime measured in seconds. @internal */
export type MaxAgeSeconds = number & { readonly [maxAgeSecondsBrand]: true }

/** Finite seconds used by cookie lifetime calculations. @internal */
export const MaxAgeSeconds = {
  parse(input: number): MaxAgeSeconds | undefined {
    return Number.isFinite(input) ? (input as MaxAgeSeconds) : undefined
  },

  /** The 400-day upper bound recommended by RFC 6265bis-22. Not enforced. */
  MAX_RECOMMENDED: 34_560_000 as MaxAgeSeconds,

  toMilliseconds(input: MaxAgeSeconds): number {
    return input * 1000
  },
}
