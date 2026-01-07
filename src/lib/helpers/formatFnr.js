export const formatFnr = (fnr) => {
  if (!fnr || fnr.length !== 11) return fnr
  return `${fnr.slice(0, 6)} ******`
}
