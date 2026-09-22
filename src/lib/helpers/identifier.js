/**
 * Mirrors src/lib/helpers/identifier.js in azf-elevkontrakt.
 *
 * Duplicated deliberately: this copy exists only to give the admin instant feedback while typing
 * (which field to show, whether the "Hent" button is enabled). The backend re-validates everything
 * and is the sole authority — nothing here is trusted server-side.
 */

const ORGNR_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2]

export const FNR_LENGTH = 11
export const ORGNR_LENGTH = 9

/** Strips pasted formatting without touching the digits. */
export const normalizeIdentifier = (value) => {
    if (value === undefined || value === null) return ''
    return value.toString().replace(/[\s. -]/g, '')
}

/**
 * Person or organisation, by length alone.
 *
 * Deliberately does NOT mod-11 check an 11-digit value: a fiktivt fødselsnummer frequently fails
 * mod-11, and rejecting those here would block the fiktiv flow entirely. Length gets you into the
 * person branch; FREG decides real vs fiktiv.
 *
 * @returns {'fnr'|'orgnr'|null}
 */
export const detectIdentifierType = (value) => {
    const normalized = normalizeIdentifier(value)
    if (!/^\d+$/.test(normalized)) return null
    if (normalized.length === FNR_LENGTH) return 'fnr'
    if (normalized.length === ORGNR_LENGTH) return 'orgnr'
    return null
}

/**
 * Mod-11 checksum for an organisasjonsnummer. A hard requirement, unlike the fnr case — BRREG
 * answers 400 for a bad checksum, so catching it here saves a round trip.
 */
export const isValidOrgnrChecksum = (value) => {
    const normalized = normalizeIdentifier(value)
    if (!/^\d{9}$/.test(normalized)) return false

    const digits = normalized.split('').map(Number)
    const sum = ORGNR_WEIGHTS.reduce((acc, weight, i) => acc + weight * digits[i], 0)
    const remainder = sum % 11
    const controlDigit = remainder === 0 ? 0 : 11 - remainder

    if (controlDigit === 10) return false
    return controlDigit === digits[8]
}

/** Human-readable label for the identifier type, for use in the UI. */
export const identifierLabel = (value) => {
    const type = detectIdentifierType(value)
    if (type === 'orgnr') return 'Organisasjonsnummer'
    if (type === 'fnr') return 'Fødselsnummer'
    return null
}

/** Formats an orgnr the way Brønnøysund does: 123 456 785. */
export const formatOrgnr = (value) => {
    const normalized = normalizeIdentifier(value)
    if (normalized.length !== ORGNR_LENGTH) return value
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`
}
