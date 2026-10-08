// Payments from remisser on history rates. Only these statuses can be edited.
export const REMISSE_STATUSES = ['Betalt', 'Overført inkasso']

const lower = (value) => String(value ?? '').toLowerCase()

export const isInkasso = (rate) => lower(rate?.status) === 'overført inkasso'
const hasAmount = (rate) => rate?.betaltBeløp !== undefined && rate?.betaltBeløp !== null && rate?.betaltBeløp !== ''

// Overført inkasso, or Betalt set through Registrer innbetaling (it has betaltBeløp). Same rule as the backend.
export const isRemisseRate = (rate) => isInkasso(rate) || (lower(rate?.status) === 'betalt' && hasAmount(rate))

// Accepts "1 118", "600,50" and "600.5". NaN for anything else, also "1.118" (could mean 1 118).
export const toAmount = (value) => {
  const text = String(value ?? '').replace(/\s/g, '')
  return /^\d+([.,]\d{1,2})?$/.test(text) ? Number(text.replace(',', '.')) : NaN
}

// Stored values (sum, betaltBeløp) are read leniently, the same way as the backend.
export const storedAmount = (value) => Number(String(value ?? '').replace(/\s/g, '').replace(',', '.') || NaN)

export const paidSoFar = (rate) => {
  const amount = storedAmount(rate?.betaltBeløp)
  return Number.isFinite(amount) ? amount : 0
}

// null when the sum is missing or 'Ukjent'.
export const rateSum = (rate) => {
  const amount = storedAmount(rate?.sum)
  return amount > 0 ? amount : null
}

export const remaining = (rate) => {
  const sum = rateSum(rate)
  return sum === null ? null : Math.max(round(sum - paidSoFar(rate)), 0)
}

export const round = (amount) => Math.round(amount * 100) / 100

export const formatKr = (amount) => `kr ${Number(amount).toLocaleString('nb-NO', { maximumFractionDigits: 2 })}`

// Error text for a new payment, or '' when it is empty or fine.
// otherInkasso: another rate on the contract can take the rest.
export const amountError = (rate, input, otherInkasso = false) => {
  if (String(input ?? '').trim() === '') return ''
  const amount = toAmount(input)
  if (Number.isNaN(amount)) return 'Skriv beløpet med tall, for eksempel 1118 eller 600,50.'
  if (!(amount > 0)) return 'Skriv et beløp større enn 0.'
  const left = remaining(rate)
  if (left !== null && amount > left) return `Beløpet er høyere enn det som gjenstår (${formatKr(left)}).${otherInkasso ? ' Registrer resten på en annen faktura.' : ''}`
  return ''
}

// True when the new payment pays off the rate.
export const paysInFull = (rate, input) => {
  const left = remaining(rate)
  return left !== null && !amountError(rate, input) && toAmount(input) >= left
}

// Corrected betaltBeløp when a Betalt rate goes back to Overført inkasso. Must stay below the sum.
export const correctionError = (rate, input) => {
  if (String(input ?? '').trim() === '') return 'Skriv hvor mye som faktisk er betalt. Skriv 0 hvis ingenting er betalt.'
  const amount = toAmount(input)
  if (Number.isNaN(amount)) return 'Skriv beløpet med tall, for eksempel 1118 eller 600,50.'
  const sum = rateSum(rate)
  if (sum !== null && amount >= sum) return `Beløpet må være lavere enn summen (${formatKr(sum)}). Er hele summen betalt, skal status være Betalt.`
  return ''
}

// Status must match what is paid: Betalt only when the sum is paid, Overført inkasso only when it isn't.
// status '' means unchanged. With Betalt and no amount, the rest counts as paid.
export const statusError = (rate, status, input) => {
  if (!isInkasso(rate) || amountError(rate, input) || String(input ?? '').trim() === '') return ''
  const sum = rateSum(rate)
  if (sum === null) return ''
  const left = round(sum - paidSoFar(rate) - toAmount(input))
  if (status === 'Betalt' && left > 0) return `Fakturaen kan bare settes til Betalt når hele summen er betalt. Etter denne innbetalingen gjenstår ${formatKr(left)}.`
  if (status === '' && left <= 0) return 'Hele summen er betalt. Velg Betalt.'
  return ''
}

// Local date as YYYY-MM-DD, for <input type="date">.
export const today = () => new Date().toLocaleDateString('sv-SE')

// A date from 2015 up to today. A 2-digit year typed in the field gives year 0026, which fails here.
export const dateError = (date) => {
  if (!date) return 'Velg dato.'
  if (Number.isNaN(Date.parse(date)) || date < '2015-01-01' || date > today()) return 'Ugyldig dato. Velg en dato fra 2015 til i dag.'
  return ''
}

// Lowering betaltBeløp is a correction and needs a Forklaring (the backend checks this too).
export const reasonError = (rate, correctionInput, comment) => {
  const amount = toAmount(correctionInput)
  return !Number.isNaN(amount) && amount < paidSoFar(rate) && !String(comment ?? '').trim()
    ? 'Skriv hvorfor innbetalt beløp rettes ned.'
    : ''
}

// betaltBeløp and sistInnbetaltDato from before the save that set the rate to Betalt, from the change log.
// null when no such save is found. Each save is one array in changeLog.
export const beforeBetalt = (contract, rateKey) => {
  const saves = (contract?.changeLog ?? []).map(entry => Array.isArray(entry) ? entry : [entry])
  for (let i = saves.length - 1; i >= 0; i--) {
    const save = saves[i]
    if (!save.some(entry => entry?.field === `fakturaInfo.${rateKey}.status` && lower(entry.newValue) === 'betalt')) continue
    const old = (name) => save.find(entry => entry?.field === `fakturaInfo.${rateKey}.${name}`)?.oldValue ?? null
    return { betaltBeløp: old('betaltBeløp'), sistInnbetaltDato: old('sistInnbetaltDato') }
  }
  return null
}
