// Contract dates are ISO from Elevavtaler and dd.mm.yyyy from DigiTroll. Returns epoch ms, 0 if unknown.
export const contractTime = (value) => {
  const nb = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(value || '')
  const time = nb ? new Date(`${nb[3]}-${nb[2]}-${nb[1]}`).getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

// Year of a contract date, e.g. "2023", or '' if unknown.
export const contractYear = (value) => {
  const time = contractTime(value)
  return time ? String(new Date(time).getFullYear()) : ''
}
