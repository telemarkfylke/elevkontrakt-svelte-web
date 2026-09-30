// Invoices per contract, for Oversikt and Historikk. Only admin and billing roles may fetch them.
import { getInvoices, getSettings } from '$lib/useApi'

// All invoices the user may see, and the settings for preliminary rate prices.
export async function loadInvoiceData (token) {
  const [response, settingsResponse] = await Promise.all([getInvoices(token.upn), getSettings()])
  if (response?.status !== 200 || !Array.isArray(response.data)) throw new Error('Kunne ikke hente fakturaer')
  return { invoices: response.data, settings: settingsResponse?.data?.result?.[0] ?? null }
}

// An invoice belongs to the contract the elev had when it was made.
export const invoicesFor = (allInvoices, contractId) => allInvoices.filter(i => String(i.customerContractId) === String(contractId))

export const countInvoices = (allInvoices) => allInvoices.reduce((counts, i) => {
  const id = String(i.customerContractId)
  counts[id] = (counts[id] ?? 0) + 1
  return counts
}, {})
