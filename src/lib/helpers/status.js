// Label and colour for rate and invoice statuses. bar = segment colour in PaymentBar.
const STATUS = {
  'ikke fakturert': { label: 'Ikke fakturert', color: 'danger', bar: 'empty' },
  fakturert: { label: 'Fakturert', color: 'korn', bar: 'korn' },
  'fakturert - utkjøp': { label: 'Fakturert - Utkjøp', color: 'korn', bar: 'korn' },
  betalt: { label: 'Betalt', color: 'success', bar: 'success' },
  kreditert: { label: 'Kreditert', color: 'plomme', bar: 'plomme' },
  'overført inkasso': { label: 'Overført inkasso', color: 'danger', bar: 'danger' },
  'skal ikke betale': { label: 'Skal ikke betale', color: 'korn', bar: 'neutral' },
  'utlån faktureres ikke': { label: 'Utlån faktureres ikke', color: 'brand1', bar: 'neutral' }
}

/**
 * @param {String} status | e.g. 'Ikke Fakturert' (any case)
 * @param {'rate'|'invoice'} [kind] | An invoice that is not sent yet is a warning, not an error
 */
export const statusInfo = (status, kind = 'rate') => {
  const info = STATUS[String(status ?? '').trim().toLowerCase()]
  if (!info) return { label: status || 'Ukjent', color: 'neutral', bar: 'empty' }
  if (kind === 'invoice' && info.label === 'Ikke fakturert') return { ...info, color: 'warning' }
  return info
}

// The API stores most flags as the strings 'true' / 'false'.
export const isTrue = (value) => value === true || String(value).toLowerCase() === 'true'

export const yesNoInfo = (value) => isTrue(value) ? { label: 'Ja', color: 'success' } : { label: 'Nei', color: 'danger' }
