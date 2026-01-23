export const returnLatestKnownContractInfo = (contractData) => {
  if (contractData.signedSkjemaInfo.refId !== 'Ukjent' || contractData.signedSkjemaInfo.acosName !== 'Ukjent' && contractData?.digiTrollData === undefined) {
    return {
      refId: contractData.signedSkjemaInfo.refId,
      acosName: contractData.signedSkjemaInfo.acosName,
      kontraktType: contractData.signedSkjemaInfo.kontraktType || 'Ukjent',
      archiveDocumentNumber: contractData.signedSkjemaInfo.archiveDocumentNumber,
      createdTimeStamp: contractData.signedSkjemaInfo.createdTimeStamp,
      ansvarligNavn: contractData.ansvarligInfo.navn
    }
  } else if (contractData?.digiTrollData) {
    const digiTrollContracts = contractData?.digiTrollData?.contracts
    const latestContractKey = Object.keys(digiTrollContracts).sort().pop()
    const latestContract = digiTrollContracts[latestContractKey][0]
    return {
      refId: latestContract['Avtale ID'] || 'Ukjent',
      acosName: contractData.unSignedskjemaInfo.acosName,
      kontraktType: contractData.unSignedskjemaInfo.kontraktType || 'Ukjent',
      archiveDocumentNumber: 'Ukjent',
      createdTimeStamp: latestContract['Laget dato'] || 'Ukjent1'
    }
  } else {
    return { errorMessage: 'Noe gikk veldig galt' }
  }
}
