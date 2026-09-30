// Search, filter and sort for the contracts on Oversikt. Same rules as before the redesign.
import { isTrue } from './status.js'

/**
 * Terms are separated by ";" and must all match. "signert:ja" / "signert:nei" filters on signing.
 * Other terms match any text field on the contract or one level down (elevInfo.navn, signedBy.navn …).
 */
export function searchContracts (contracts, value) {
  const terms = value.toLowerCase().split(';').map(t => t.trim()).filter(Boolean)
  let result = contracts

  const signed = terms.find(t => t.startsWith('signert:'))
  if (signed) {
    const answer = signed.split(':')[1]
    if (answer === 'ja' || answer === 'nei') result = result.filter(c => isTrue(c.isSigned) === (answer === 'ja'))
  }

  for (const term of terms.filter(t => t !== signed)) {
    result = result.filter(contract => Object.values(contract).some(field => {
      if (typeof field === 'string') return field.toLowerCase().includes(term)
      if (field && typeof field === 'object') return Object.values(field).some(v => typeof v === 'string' && v.toLowerCase().includes(term))
      return false
    }))
  }
  return result
}

export const contractType = (contract) => String(contract.unSignedskjemaInfo?.kontraktType ?? '').toLowerCase()

export function filterContracts (contracts, { type, school, klasse }) {
  return contracts
    .filter(c => !type || contractType(c) === type.toLowerCase())
    .filter(c => !school || c.elevInfo?.skole === school)
    .filter(c => !school || !klasse || c.elevInfo?.klasse === klasse)
}

export const schoolsIn = (contracts) => [...new Set(contracts.map(c => c.elevInfo?.skole).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'))

export const classesIn = (contracts, school) => [...new Set(contracts.filter(c => c.elevInfo?.skole === school).map(c => c.elevInfo?.klasse).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'))

// Delivery mode: a contract archived this year belongs to a new elev (document number "26/…").
export function isNewThisYear (contract) {
  const year = String(new Date().getFullYear()).slice(-2)
  return String(contract.signedSkjemaInfo?.archiveDocumentNumber ?? '').split('/')[0] === year
}

// Not found in FINT for more than 5 days, marked yellow on Oversikt.
export function missingInFint (contract) {
  if (contract.notFoundInFINT?.message !== 'Student not found in FINT' || !contract.notFoundInFINT?.date) return false
  return Math.floor((Date.now() - new Date(contract.notFoundInFINT.date)) / 86400000) > 5
}

const byPath = (contract, path) => path.split('.').reduce((value, key) => value?.[key], contract)

export function sortContracts (contracts, path, dir) {
  if (!path) return contracts
  return [...contracts].sort((a, b) => {
    const cmp = String(byPath(a, path) ?? '').localeCompare(String(byPath(b, path) ?? ''), 'nb', { numeric: true })
    return dir === 'descending' ? -cmp : cmp
  })
}

// Billing year for a rate, following the school year August–June.
export function schoolYear (offset) {
  const now = new Date()
  return now.getFullYear() + offset - (now.getMonth() + 1 >= 8 ? 0 : 1)
}
