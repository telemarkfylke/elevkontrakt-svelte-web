export const formatDate = (dateString, removeTime) => {
  if (!dateString || dateString === 'Ukjent') return 'Ukjent'
  if (typeof dateString !== 'string') return dateString
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    if (removeTime) {
      delete options.hour
      delete options.minute
    }
    const newDateString = new Date(dateString).toLocaleDateString('nb-NO', options)
    if (newDateString === 'Invalid Date') return dateString
    return newDateString
  } catch {
    return dateString
  }
}
