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
  depth?: number | null,
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

export function getUtilInspect(
  fallback: (value: unknown) => string,
  options: { requireUtil?: RequireUtil } = {},
): InspectCompatFunction {
  const _requireUtil = options.requireUtil || requireUtil
  const nodeUtil = _requireUtil()
  return function inspect(
    object: unknown,
    showHidden?: boolean,
    depth?: number | null,
    color?: boolean,
  ): string {
    return nodeUtil
      ? nodeUtil.inspect(object, showHidden, depth, color)
      : fallback(object)
  }
}
