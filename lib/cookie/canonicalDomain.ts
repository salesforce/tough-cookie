import * as punycode from 'punycode/'
import { IP_V6_REGEX_OBJECT } from './constants'

// S5.1.2 Canonicalized Host Names
export function canonicalDomain(str: string | null) {
  if (str == null) {
    return null
  }
  let _str = str.trim().replace(/^\./, '') // S4.1.2.3 & S5.2.3: ignore leading .

  if (IP_V6_REGEX_OBJECT.test(_str)) {
    _str = _str.replace('[', '').replace(']', '')
  }

  // convert to IDN if any non-ASCII characters
  // eslint-disable-next-line no-control-regex
  if (/[^\u0001-\u007f]/.test(_str)) {
    _str = punycode.toASCII(_str)
  }

  return _str.toLowerCase()
}
