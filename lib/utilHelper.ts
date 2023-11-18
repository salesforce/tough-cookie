/**
 * It would nice to drop this entirely but, for whatever reason, we expose an
 * `inspect` method on `Cookie` and `MemoryCookieStore` that just delegates to
 * Node's `util.inspect` functionality. Since that functionality isn't supported
 * in non-Node environments (e.g.; React Native) this fallback is here to provide
 * equivalent behavior when it is not present.
 */

import type util from 'node:util'

type RequireUtil = () => typeof util | undefined
type InspectCompatFunction = (
  object: unknown,
  showHidden?: boolean,
  depth?: number,
  color?: boolean,
) => string

function requireUtil(): typeof util | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('util') as typeof util
  } catch (e) {
    return undefined
  }
}

// for v10.12.0+
function lookupCustomInspectSymbol(): symbol {
  return Symbol.for('nodejs.util.inspect.custom')
}

// for older node environments
function tryReadingCustomSymbolFromUtilInspect(options: {
  requireUtil?: RequireUtil
}): typeof util.inspect.custom | undefined {
  const _requireUtil = options.requireUtil || requireUtil
  const nodeUtil = _requireUtil()
  return nodeUtil ? nodeUtil.inspect.custom : undefined
}

export function getUtilInspect(
  fallback: (value: unknown) => string,
  options: { requireUtil?: RequireUtil } = {},
): InspectCompatFunction {
  const _requireUtil = options.requireUtil || requireUtil
  const nodeUtil = _requireUtil()
  return function inspect(
    object: unknown,
    showHidden?: boolean,
    depth?: number,
    color?: boolean,
  ): string {
    return nodeUtil
      ? nodeUtil.inspect(object, showHidden, depth, color)
      : fallback(object)
  }
}

export function getCustomInspectSymbol(
  options: {
    requireUtil?: RequireUtil
  } = {},
): symbol {
  // get custom inspect symbol for node environments
  return (
    tryReadingCustomSymbolFromUtilInspect(options) ||
    lookupCustomInspectSymbol()
  )
}
