/**
 * The administrator role, in one place.
 *
 * Three capabilities on /contract are administrator-only - a fiktivt fødselsnummer as elev, an
 * organisasjon as ansvarlig, and a school chosen by hand - and both the page and the form have to
 * agree on who qualifies. A literal in each file is one rename away from disagreeing.
 *
 * These checks decide what is SHOWN. The API enforces the same three rules on every request
 * (assertManualContractAllowed in azf-elevkontrakt), because hiding a field stops nobody.
 */
export const ELEVKONTRAKT_ADMIN = 'elevkontrakt.administrator-readwrite'

/**
 * @param {Object} token - the decoded elevkontrakt token
 * @returns {Boolean}
 */
export const isElevkontraktAdmin = (token) => token?.roles?.includes(ELEVKONTRAKT_ADMIN) === true

/** The roles /contract admits. */
export const CONTRACT_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write']

/** The roles /history admits. */
export const HISTORY_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.skoleadministrator-write']

/** The roles that can see invoices. */
export const BILLING_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.billing-readwrite', 'elevkontrakt.billing-read']

/** The roles that see utleveringsmodus on Oversikt. */
export const DELIVERY_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.itservicedesk-readwrite']

/**
 * @param {Object} token - the decoded elevkontrakt token
 * @param {String[]} roles
 * @returns {Boolean}
 */
export const hasAnyRole = (token, roles) => token?.roles?.some((r) => roles.includes(r)) === true
