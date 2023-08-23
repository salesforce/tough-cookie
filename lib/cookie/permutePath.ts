import * as validators from '../validators'

/**
 * Gives the permutation of all possible `pathMatch`es of a given path. The
 * array is in longest-to-shortest order. Handy for indexing.
 */
export function permutePath(path: string): string[] {
  validators.validate(validators.isString(path))
  if (path === '/') {
    return ['/']
  }
  const permutations = [path]
  while (path.length > 1) {
    const lindex = path.lastIndexOf('/')
    if (lindex === 0) {
      break
    }
    path = path.slice(0, lindex)
    permutations.push(path)
  }
  permutations.push('/')
  return permutations
}
