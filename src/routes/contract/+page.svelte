<script>
    /**
     * Opprett elevavtaler. Extended to cover students with a fiktivt fødselsnummer and organisations
     * as ansvarlig.
     *
     * checkStudent handles the ordinary path; when it comes up short checkIdentifier classifies the
     * number, where FREG - not FINT - is the discriminator. The three failures stay apart because
     * each belongs to a different person: the admin checks the number, an archive administrator
     * fixes a missing saksnummer, and an unreachable archive is nobody's fault.
     */
    import IconSpinner from '$lib/components/IconSpinner.svelte'
    import Alert from '$lib/components/alert.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsCard from '$lib/components/ds/DsCard.svelte'
    import ContractForm from '$lib/components/ds/ContractForm.svelte'
    import { checkStudent, checkIdentifier, getElevkontraktToken, postManualContract } from '$lib/useApi.js'
    import { detectIdentifierType, normalizeIdentifier } from '$lib/helpers/identifier.js'
    import { isElevkontraktAdmin } from '$lib/helpers/roles.js'

    let studentSSN = ''
    let identity = null
    // The number `identity` actually describes, so an edit that lands back on the same digits does
    // not throw away a half-filled form.
    let lookedUpSSN = ''
    let lookupError = null // { heading, message, color }
    let isLoadingStudentData = false
    let searchError = ''
    let submittedData = null
    let isLoading = false
    let successMessage = ''
    let errorMessage = ''

    $: inputType = detectIdentifierType(studentSSN)

    const resetLookup = () => {
        identity = null
        lookedUpSSN = ''
        lookupError = null
        searchError = ''
        submittedData = null
        successMessage = ''
        errorMessage = ''
    }

    /**
     * Unmounting ContractForm discards the avtaletype, the uploaded PDF and the resolved ansvarlig,
     * so it must not happen by accident. While an elev is loaded the field is read-only and this
     * never fires; the guard covers the rest.
     */
    const handleSSNInput = () => {
        if (normalizeIdentifier(studentSSN) === lookedUpSSN) return
        resetLookup()
    }

    /** Explicit "start over", so losing the form is always a deliberate click. */
    const startNewLookup = () => {
        resetLookup()
        studentSSN = ''
    }

    /** Maps a failed classification onto a message aimed at whoever can act on it. */
    const describeFailure = (result) => {
        switch (result?.reason) {
            case 'requires-admin':
                // The number is fine; the caller is not an administrator. Only the API can tell us
                // this - a fiktivt fnr is indistinguishable from an ordinary one until it is looked
                // up - so the message it sends is the one shown.
                return {
                    color: 'warning',
                    heading: 'Krever administrator',
                    message: result.error
                }
            case 'no-case-number':
                return {
                    color: 'warning',
                    heading: 'Elevmappen mangler saksnummer',
                    message: `${result.error} Dette er ikke noe du kan rette selv — ta kontakt med arkivet.`
                }
            case 'lookup-failed':
                return {
                    color: 'warning',
                    heading: 'Oppslaget kunne ikke gjennomføres',
                    message: `${result.error} Nummeret er ikke nødvendigvis feil.`
                }
            case 'invalid-format':
                return { color: 'danger', heading: 'Ugyldig nummer', message: result.error }
            default:
                return {
                    color: 'danger',
                    heading: 'Fant ikke personen',
                    message: result?.error || 'Fant ikke personen i Folkeregisteret eller arkivet. Kontroller nummeret.'
                }
        }
    }

    const lookupStudent = async () => {
        resetLookup()
        const ssn = normalizeIdentifier(studentSSN)

        // Validated on click rather than by disabling, so the admin is told what is wrong.
        // Kept terse — the alert below the field carries the fuller explanation.
        if (detectIdentifierType(ssn) === 'orgnr') {
            searchError = 'Et organisasjonsnummer kan ikke være elev'
            return
        }
        if (detectIdentifierType(ssn) !== 'fnr') {
            searchError = 'Fødselsnummer må være 11 siffer'
            return
        }

        isLoadingStudentData = true

        try {
            // Ordinary path first, so a normal student keeps today's behaviour exactly.
            let student = null
            try {
                student = await checkStudent(ssn)
            } catch (error) {
                student = null
            }

            // Left deliberately broad: a fiktiv elev has no school orgnr either, so narrowing this
            // would stop them reaching the classification below. Falling through costs one request
            // and loses nothing, because the merge further down keeps whatever checkStudent answered.
            const studentUsable = student && !student.isNonFixAbleError && student.gotSchoolOrgNr !== false
            if (studentUsable) {
                identity = { ...student, identifier: ssn, fnr: ssn, fnrType: 'ordinær' }
                lookedUpSSN = ssn
                return
            }

            // checkStudent could not answer - unknown number, legitimate fiktiv fnr, or a lookup down.
            const classified = await checkIdentifier(ssn)
            if (!classified?.ok) {
                lookupError = describeFailure(classified)
                return
            }

            if (!classified.canBeElev) {
                lookupError = {
                    color: 'danger',
                    heading: 'Kan ikke være elev',
                    message: 'Et organisasjonsnummer kan ikke stå som elev på en avtale. Organisasjoner kan bare være ansvarlig.'
                }
                return
            }

            // Merged, not replaced. isUnder18, ansvarlig and schoolInfo exist only on the checkStudent
            // answer; classifying on top of nothing made ansvarligRequired false for a 16-year-old and
            // let the avtale through with no ansvarlig at all.
            identity = { ...(student ?? {}), ...classified, fnr: classified.identifier }
            lookedUpSSN = ssn
        } finally {
            isLoadingStudentData = false
        }
    }

    const postToManualContract = async (payload) => {
        isLoading = true
        successMessage = ''
        errorMessage = ''
        const result = await postManualContract(payload)
        submittedData = null
        isLoading = false

        if (result?.data?.result?.acknowledged === true) {
            successMessage = `Avtalen er opprettet og arkivert med dokumentnummer: ${result.data.document.signedSkjemaInfo.archiveDocumentNumber}. Ønsker du å opprette en ny avtale kan du skrive inn et nytt nummer og hente en ny elev.`
            identity = null
            lookedUpSSN = ''
            studentSSN = ''
        } else if (result?.data?.isDuplicate === true) {
            errorMessage = 'Eleven har allerede en aktiv avtale av denne typen. Avtalen ble ikke opprettet som ny, men lagret for gjennomgang. Ta kontakt med en administrator hvis dette ikke stemmer.'
        } else if (result?.data?.isFakturaInfoMismatch === true) {
            errorMessage = 'Det oppstod et avvik i fakturainformasjonen for avtalen. Avtalen ble ikke opprettet, men lagret for manuell gjennomgang av en administrator.'
        } else if (result?.response?.data?.error) {
            // Backend refused with a reason worth repeating verbatim.
            errorMessage = result.response.data.error
        } else {
            errorMessage = 'Noe gikk galt under oppretting av avtalen! Vennligst prøv igjen senere.'
        }
    }
</script>

{#await getElevkontraktToken(true)}
    <div class="loading">
        <IconSpinner width={'32px'} />
    </div>
{:then token}
    {#if !token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))}
        <Alert type="error" title="Feil" message="Du har ikke tilgang til å opprette en avtale. Vennligst ta kontakt med din administrator for å få tilgang." position="static" />
    {:else}
        <h1 class="ds-heading" data-size="lg">Opprett elevavtaler</h1>
        <p class="ds-paragraph">
            Her kan du opprette en elevavtale for en elev som ikke har en digital avtale.
            Fyll inn elevens fødselsnummer og trykk «Hent elev».
        </p>

        <DsCard>
            <p class="ds-heading" data-size="2xs">Papirversjon av skjemaene</p>
            <ul class="ds-list">
                <li><a class="ds-link" href="https://telemarkfylke.no/globalassets/tfk/dokumenter/opplaring-og-folkehelse/elev-pc/leieavtale/avtale-leie-elev-pc-og-utlansmidler---revidert-juni-26.pdf" target="_blank" rel="noreferrer">Leieavtale for utskrift</a></li>
                <li><a class="ds-link" href="https://telemarkfylke.no/globalassets/tfk/dokumenter/opplaring-og-folkehelse/elev-pc/laneavtale/avtale-utlan-elev-pc-og-gratis-laremidler---revidert-juni-26.pdf" target="_blank" rel="noreferrer">Låneavtale for utskrift</a></li>
                <li><a class="ds-link" href="https://telemarkfylke.no/no/meny/tjenester/opplaring-og-folkehelse/opplaring-i-skole/praktisk-informasjon/laneavtale-pc-og-lan-av-lareboker/Loan-PC-and-textbooks/" target="_blank" rel="noreferrer">Leie- og utlånsavtale på andre språk</a></li>
            </ul>
        </DsCard>

        <div class="search">
            <DsInput
                label="Elevens fødselsnummer"
                description="11 siffer. Fiktive fødselsnummer godtas så lenge eleven er registrert i arkivet."
                bind:value={studentSSN}
                inputmode="numeric"
                maxlength={11}
                error={searchError}
                readonly={Boolean(identity)}
                on:input={handleSSNInput}
            />
            {#if identity}
                <!-- Locked once an elev is loaded: editing here unmounts the form and takes the
                     uploaded PDF with it, so starting over is an explicit choice. -->
                <DsButton variant="secondary" on:click={startNewLookup}>Bytt elev</DsButton>
            {:else}
                <!-- Not disabled for a half-typed number: a disabled ds button renders at 30% opacity,
                     so it sat unreadable the whole time someone typed. Explains on click instead. -->
                <DsButton
                    disabled={isLoadingStudentData}
                    loading={isLoadingStudentData}
                    loadingText="Henter …"
                    on:click={lookupStudent}
                >
                    Hent elev
                </DsButton>
            {/if}
        </div>

        {#if inputType === 'orgnr'}
            <DsAlert color="info">
                <p class="ds-paragraph" data-size="sm">
                    Dette ser ut som et organisasjonsnummer. En organisasjon kan bare være ansvarlig,
                    ikke elev{#if isElevkontraktAdmin(token)} — legg det inn i ansvarlig-feltet lenger ned i skjemaet{:else}, og bare en administrator kan opprette en avtale der en virksomhet er ansvarlig{/if}.
                </p>
            </DsAlert>
        {/if}

        {#if lookupError}
            <DsAlert color={lookupError.color} heading={lookupError.heading}>
                <p class="ds-paragraph" data-size="sm">{lookupError.message}</p>
            </DsAlert>
        {/if}

        {#if identity}
            <!-- collapsed, not a flag inside the form: clearing submittedData - on cancel or on a
                 failed post - brings the filled-in form straight back. -->
            <ContractForm
                {identity}
                {token}
                collapsed={submittedData !== null}
                onSubmit={(payload) => (submittedData = payload)}
            />

            {#if submittedData}
                {#if isLoading}
                    <div class="loading"><IconSpinner width={'32px'} /></div>
                {:else}
                    <DsCard color="warning">
                        <p class="ds-heading" data-size="2xs">Er du sikker på at du vil opprette avtalen?</p>
                        <div class="confirm-actions">
                            <DsButton on:click={() => postToManualContract(submittedData)}>Opprett avtale</DsButton>
                            <DsButton variant="secondary" on:click={() => (submittedData = null)}>Avbryt</DsButton>
                        </div>
                    </DsCard>
                {/if}
            {/if}
        {/if}

        {#if successMessage}
            <Alert type="success" title="Suksess" message={successMessage} dismissible={true} on:close={() => (successMessage = '')} autoClose={true} autoCloseDelay={10000} position="fixed-top" />
        {/if}
        {#if errorMessage}
            <Alert type="error" title="Feil" message={errorMessage} dismissible={true} on:close={() => (errorMessage = '')} autoClose={true} autoCloseDelay={10000} position="fixed-top" />
        {/if}
    {/if}
{/await}

<style>
    .search {
        display: flex;
        gap: var(--ds-size-3, 0.75rem);
        align-items: flex-end;
        flex-wrap: wrap;
        margin-block: var(--ds-size-6, 1.5rem);
        max-width: 42rem;
    }

    .search > :global(.ds-field) {
        flex: 1 1 18rem;
    }

    .confirm-actions {
        display: flex;
        gap: var(--ds-size-3, 0.75rem);
        flex-wrap: wrap;
    }

    .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
    }
</style>
