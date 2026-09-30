// Invoices are sent to Xledger every night at 01:00 Europe/Oslo.

/**
 * Time left until the next 01:00 in Oslo (handles summer time).
 * @param {Date} [now]
 * @returns {{ hours: Number, minutes: Number, seconds: Number }}
 */
export const timeUntilNextExport = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
  }).formatToParts(now)
  const get = (type) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)
  let diff = 3600 - (get('hour') * 3600 + get('minute') * 60 + get('second'))
  if (diff <= 0) diff += 86400
  return { hours: Math.floor(diff / 3600), minutes: Math.floor((diff % 3600) / 60), seconds: diff % 60 }
}

// e.g. "3 t 12 min", or "12 min" in the last hour
export const formatTimeUntilExport = (now = new Date()) => {
  const { hours, minutes } = timeUntilNextExport(now)
  return hours > 0 ? `${hours} t ${minutes} min` : `${minutes} min`
}
