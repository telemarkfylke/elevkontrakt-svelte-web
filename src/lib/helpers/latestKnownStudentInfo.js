export const returnLatestKnownStudentInfo = (contractData) => {
  if (contractData.elevInfo.skole !== 'Ukjent' && contractData.elevInfo.klasse !== 'Ukjent') {
    return { skole: contractData.elevInfo.skole, klasse: contractData.elevInfo.klasse }
  }
  const digiTrollContracts = contractData?.digiTrollData?.contracts
  if (!digiTrollContracts || Object.keys(digiTrollContracts).length === 0) {
    return { skole: 'Ukjent', klasse: 'Ukjent' }
  }
  const latestContractKey = Object.keys(digiTrollContracts).sort().pop()
  const latestContract = digiTrollContracts[latestContractKey][0]
  return {
    skole: latestContract.Skole || 'Ukjent',
    klasse: latestContract.Klasse || 'Ukjent'
  }
}
