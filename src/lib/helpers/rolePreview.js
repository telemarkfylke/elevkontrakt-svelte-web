// "Vis som rolle": lets an administrator see the app as another role, and for school roles a school.
// Only changes what the frontend shows. API calls still use the real token.
import { ELEVKONTRAKT_ADMIN } from './roles.js'

// school: the role only sees its own school.
export const PREVIEW_ROLES = [
  { value: 'elevkontrakt.skoleadministrator-write', label: 'Skoleadministrator', school: true },
  { value: 'elevkontrakt.skoleadministrator-read', label: 'Skoleadministrator (lese)', school: true },
  { value: 'elevkontrakt.itservicedesk-readwrite', label: 'IT-servicedesk', school: false },
  { value: 'elevkontrakt.billing-readwrite', label: 'Fakturering', school: true },
  { value: 'elevkontrakt.billing-read', label: 'Fakturering (lese)', school: true }
]

const KEY = 'elevavtaler-preview'

export const previewRoleInfo = (role) => PREVIEW_ROLES.find(r => r.value === role)

export function getPreview () {
  try {
    const { role, school } = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') ?? {}
    const info = previewRoleInfo(role)
    if (!info || (info.school && !school)) return null
    return { role, school: info.school ? school : null }
  } catch {
    return null
  }
}

// Reloads, so every page reads the roles again. null goes back to the real role.
export function setPreview (preview) {
  try {
    if (preview) sessionStorage.setItem(KEY, JSON.stringify(preview))
    else sessionStorage.removeItem(KEY)
  } catch { /* nothing to keep */ }
  window.location.reload()
}

// Swaps the roles on a decoded token, but only for a real administrator.
export function applyPreview (token) {
  const preview = getPreview()
  if (!preview || !token.roles.includes(ELEVKONTRAKT_ADMIN)) return token
  // Nome's departments share one school name on the contracts, as in getSearchScope.
  const school = preview.school?.startsWith('Nome') ? 'Nome videregående skole' : preview.school
  return { ...token, realRoles: token.roles, roles: [preview.role], previewRole: preview.role, previewSchool: school }
}
