import * as validators from '../validators'
import { safeToString } from '../utils'

/** Converts a Date to a UTC string representation. */
export function formatDate(date: Date) {
  validators.validate(validators.isDate(date), safeToString(date))
  return date.toUTCString()
}
