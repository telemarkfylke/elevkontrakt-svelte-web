<script>
    /**
     * Contract form for /contract, rebuilt on Designsystemet. Replaces Form.svelte for this route
     * only, which is left untouched. Adds an organisation as ansvarlig, and students with a fiktivt
     * fødselsnummer (name and address read-only from the archive, never typed).
     *
     * The rule shaping the ansvarlig section: a fiktivt fnr cannot become an Xledger customer, so it
     * can never be the ansvarlig - a fiktiv elev always needs a separate one, even when over 18.
     */
    import DsInput from './DsInput.svelte'
    import DsSelect from './DsSelect.svelte'
    import DsButton from './DsButton.svelte'
    import DsAlert from './DsAlert.svelte'
    import DsCard from './DsCard.svelte'
    import DsFileUpload from './DsFileUpload.svelte'
    import { lookupOrganisation, checkIdentifier, getSchools } from '$lib/useApi.js'
    import { detectIdentifierType, isValidOrgnrChecksum, formatOrgnr, normalizeIdentifier } from '$lib/helpers/identifier.js'
    import { isElevkontraktAdmin } from '$lib/helpers/roles.js'

    export let identity = null // the resolved elev, from checkIdentifier or checkStudent
    export let onSubmit = () => {}
    export let token = null
    // Owned by the parent, which knows whether the payload is still pending confirmation. A local
    // flag could only ever be set, so a failed post left the admin with no form and no PDF.
    export let collapsed = false

    /**
     * Three things here are administrator-only: an organisasjon as ansvarlig, a school picked by
     * hand, and (blocked before this component ever mounts) a fiktiv elev. The API refuses all three
     * as well - these checks only decide what is worth showing.
     */
    const isAdmin = isElevkontraktAdmin(token)

    // ---- Contract fields ----------------------------------------------------
    let type = ''
    let attachment = null
    let attachmentValue = null

    // ---- Ansvarlig ----------------------------------------------------------
    // The organisation option exists only on the ansvarlig slot - that is how "never the elev" is
    // enforced structurally rather than by a check someone could forget.
    let ansvarligType = 'person'
    let ansvarligInput = ''
    let ansvarligNavn = ''
    let ansvarligEpost = ''
    let organisasjon = null
    // Explicit flag rather than inferring from ansvarligNavn, so a person whose name came back blank
    // still gets a field instead of the section vanishing.
    let ansvarligResolved = false
    let ansvarligLookupError = ''
    let ansvarligLookupWarning = ''
    let isLookingUpAnsvarlig = false
    let selectedForesatt = ''
    // Hides the manual lookup, mirroring the old "Lås opp foresatt felt" toggle - otherwise the
    // common case (18+ student, or a single foresatt) looks like it demands a search it does not.
    let overrideAnsvarlig = false

    // ---- School fallback ----------------------------------------------------
    let schools = []
    let selectedSchoolOrgNr = ''
    let schoolsPromise = null
    // An outage and an empty list must not look alike: the select is required, so a silent [] is an
    // unfillable field with nothing to explain it.
    let schoolsError = ''
    // Gates the school picker: such a contract is silently removed from the active collection after
    // five days by the notFoundInFINT rule, so the admin acknowledges that first.
    let acceptedFintRisk = false

    let errors = {}

    $: isFiktivElev = identity?.fnrType === 'fiktiv'
    // Both lists. A foresatt who cannot be reached digitally is still a perfectly good ansvarlig on
    // a paper contract - that is the whole point of this route - and the old form offered them too.
    // Reading only `ansvarlig` left an under-18 student whose guardians are all non-notifiable
    // facing a manual fnr lookup with no sign that registered guardians exist.
    $: ikkeVarslesListe = identity?.ansvarligSomIkkeKanVarsles ?? []
    // Spread, not mapped: the options must stay the same object references, or bind:value on the
    // select loses its selection every time this recomputes.
    $: knownForesatte = [...(identity?.ansvarlig ?? []), ...ikkeVarslesListe]
    $: elevFnr = identity?.identifier ?? identity?.fnr ?? ''

    // An elev 18+ is their own ansvarlig - checkStudent already puts them in the list. Matched on fnr
    // rather than trusting isUnder18, so it holds whatever the list contains.
    $: selfAnsvarlig = knownForesatte.find(a => a?.foedselsEllerDNummer === elevFnr) ?? null
    $: isSelfAnsvarlig = Boolean(selfAnsvarlig) && knownForesatte.length === 1

    // Preselect the only candidate so the common cases need no input. Keyed on identity so it reruns
    // for a new elev without fighting the admin's own choice.
    let autoSelectedFor = null
    $: if (identity && autoSelectedFor !== identity) {
        autoSelectedFor = identity
        selectedForesatt = knownForesatte.length === 1 ? knownForesatte[0] : ''
        overrideAnsvarlig = false
        // Never carry an acknowledgement over to a different student.
        acceptedFintRisk = false
        selectedSchoolOrgNr = ''
    }

    // FINT supplies the school for almost every student, fiktiv ones included. The picker is only
    // for the uncommon case where there is no active elevforhold to derive it from.
    $: needsSchoolPicker = !identity?.school?.orgNr && !identity?.schoolInfo?.orgnr
    // Choosing a school by hand is administrator-only, and without a school there is no contract to
    // create - so the rest of the form would only waste a non-admin's time and then refuse.
    $: blockedForNonAdmin = needsSchoolPicker && !isAdmin
    $: if (needsSchoolPicker && !blockedForNonAdmin && schoolsPromise === null) {
        schoolsPromise = getSchools()
            .then((list) => { schools = list ?? []; return schools })
            .catch(() => {
                schoolsError = 'Kunne ikke hente listen over skoler. Last siden på nytt, eller prøv igjen senere.'
                schools = []
                return schools
            })
    }

    // The backend rejects this too; checking here only avoids a pointless round trip.
    $: ansvarligRequired = isFiktivElev || identity?.isUnder18 === true

    $: resolvedSchool = identity?.school?.orgNr
        ? { navn: identity.school.navn, orgNr: identity.school.orgNr }
        : identity?.schoolInfo?.orgnr
            ? { navn: identity.schoolInfo.navn, orgNr: identity.schoolInfo.orgnr }
            : selectedSchoolOrgNr
                ? { navn: schools.find(s => s.orgNr === selectedSchoolOrgNr)?.navn ?? '', orgNr: selectedSchoolOrgNr }
                : null

    $: ansvarligInputType = detectIdentifierType(ansvarligInput)

    /**
     * Drops everything derived from the previous lookup, on every edit of the identifier - all of it
     * describes the number that WAS looked up, so leaving it behind submits a name or fakturaepost
     * belonging to someone else.
     *
     * ansvarligType matters most: left at 'organisasjon' after the field is cleared, the "Velg
     * foresatt" select stays hidden and validation demands an org that is no longer resolved.
     */
    const resetAnsvarligLookup = () => {
        organisasjon = null
        ansvarligResolved = false
        ansvarligType = 'person'
        ansvarligNavn = ''
        ansvarligEpost = ''
        ansvarligLookupError = ''
        ansvarligLookupWarning = ''
    }

    /** Clears the preselection, so submit() never has to guess between a selected and a looked-up one. */
    const startOverrideAnsvarlig = () => {
        overrideAnsvarlig = true
        selectedForesatt = ''
        ansvarligInput = ''
        resetAnsvarligLookup()
    }

    /** Returns to the registered ansvarlig, restoring the preselection. */
    const cancelOverrideAnsvarlig = () => {
        overrideAnsvarlig = false
        ansvarligInput = ''
        resetAnsvarligLookup()
        selectedForesatt = knownForesatte.length === 1 ? knownForesatte[0] : ''
    }

    /**
     * Resolves whatever was typed in the ansvarlig field.
     *
     * 9 digits  -> Enhetsregisteret.
     * 11 digits -> must resolve in FREG. A number that only the ARCHIVE knows is a legitimate
     *              fiktiv person and perfectly valid as an elev, but is refused here.
     */
    const lookupAnsvarlig = async () => {
        resetAnsvarligLookup()
        const identifier = normalizeIdentifier(ansvarligInput)
        isLookingUpAnsvarlig = true

        try {
            if (ansvarligInputType === 'orgnr') {
                // The real gate: ansvarligType only ever becomes 'organisasjon' further down this
                // branch, so refusing here is what keeps a non-admin off the whole org flow.
                if (!isAdmin) {
                    ansvarligLookupError = 'Bare en administrator kan sette en virksomhet som ansvarlig. Ta kontakt med en administrator hvis avtalen skal faktureres til en virksomhet.'
                    return
                }
                if (!isValidOrgnrChecksum(identifier)) {
                    ansvarligLookupError = 'Ugyldig organisasjonsnummer (feil kontrollsiffer)'
                    return
                }
                const result = await lookupOrganisation(identifier)
                if (result?.error) {
                    ansvarligLookupError = result.error
                    return
                }
                organisasjon = result
                ansvarligResolved = true
                ansvarligType = 'organisasjon'
                ansvarligNavn = result.navn
                if (result.konkurs) ansvarligLookupWarning = 'Organisasjonen er registrert som konkurs.'
                else if (result.underAvvikling) ansvarligLookupWarning = 'Organisasjonen er under avvikling.'
                return
            }

            if (ansvarligInputType === 'fnr') {
                const result = await checkIdentifier(identifier)
                if (!result?.ok) {
                    ansvarligLookupError = result?.error || 'Fant ikke personen'
                    return
                }
                if (!result.canBeAnsvarlig) {
                    ansvarligLookupError = result.fnrType === 'fiktiv'
                        ? 'Dette er et fiktivt fødselsnummer. En ansvarlig må ha ordinært fødselsnummer eller organisasjonsnummer, siden det er den ansvarlige som faktureres.'
                        : 'Denne kan ikke være ansvarlig.'
                    return
                }
                ansvarligResolved = true
                ansvarligType = 'person'
                ansvarligNavn = result.navn || ''
                return
            }

            ansvarligLookupError = 'Oppgi enten 11 siffer (fødselsnummer) eller 9 siffer (organisasjonsnummer)'
        } finally {
            isLookingUpAnsvarlig = false
        }
    }

    // Clearing must clear the encoded payload too, or removing the file leaves the previous PDF
    // attached to the contract.
    const handleAttachment = async (file) => {
        if (!file) {
            attachment = null
            attachmentValue = null
            return
        }
        attachment = file
        attachmentValue = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result.split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const validate = () => {
        const found = {}
        if (!type) found.type = 'Type avtale er obligatorisk'
        if (!attachmentValue) found.attachment = 'Signert avtale må lastes opp'
        if (needsSchoolPicker && !acceptedFintRisk) {
            found.fintRisk = 'Du må bekrefte at eleven blir registrert i VIS innen fem dager før du kan velge skole'
        }
        if (!resolvedSchool?.orgNr) found.school = 'Skole er obligatorisk'

        if (ansvarligType === 'organisasjon') {
            if (!isAdmin) {
                // Unreachable while lookupAnsvarlig holds, but this is the check that survives an
                // edit to that branch. First, so it is not overwritten by the detail checks below.
                found.ansvarlig = 'Bare en administrator kan sette en virksomhet som ansvarlig'
            } else {
                if (!organisasjon) found.ansvarlig = 'Slå opp organisasjonsnummeret før du oppretter avtalen'
                if (!ansvarligEpost) found.ansvarligEpost = 'Fakturaepost er obligatorisk for organisasjoner'
            }
        } else if (!selectedForesatt && normalizeIdentifier(ansvarligInput) && !ansvarligResolved) {
            // Typed but never looked up. Accepting it would send an unverified number with a blank
            // name - the old form demanded 11 digits and a resolved name before it let this through.
            found.ansvarlig = 'Trykk «Slå opp» for å bekrefte nummeret før du oppretter avtalen'
        } else if (ansvarligRequired && !selectedForesatt && !ansvarligResolved) {
            found.ansvarlig = isFiktivElev
                ? 'En elev med fiktivt fødselsnummer må ha en ansvarlig, også når eleven er over 18 år'
                : 'Eleven er under 18 år og må ha en ansvarlig'
        }
        return found
    }

    const submit = () => {
        errors = validate()
        if (Object.keys(errors).length > 0) return

        const foresatt = selectedForesatt || null
        const payload = {
            name: identity?.navn ?? identity?.student?.fulltnavn ?? '',
            type,
            attachment: attachmentValue,
            schoolName: resolvedSchool?.navn ?? '',
            schoolOrgNumber: resolvedSchool?.orgNr ?? '',
            fnr: identity?.identifier ?? identity?.fnr ?? '',
            // Only the elev can be fiktiv; the backend defaults this to 'ordinær' when absent.
            elevFnrType: isFiktivElev ? 'fiktiv' : 'ordinær',
            ansvarligType,
            // The identifier slot: an orgnr for an organisation, an fnr for a person. This is the
            // field every Xledger CompanyNo builder reads, so it must be the number that was
            // RESOLVED and shown in the confirmation - lookupOrganisation can answer with an
            // underenhet, and billing the typed hovedenhet would not match what the admin approved.
            foresattFnr: ansvarligType === 'organisasjon'
                ? (organisasjon?.orgnr || normalizeIdentifier(ansvarligInput))
                : (foresatt?.foedselsEllerDNummer || (ansvarligResolved ? normalizeIdentifier(ansvarligInput) : '')),
            foresatt: foresatt || '',
            foresattValg: foresatt?.fulltnavn ?? '',
            foresattNavn: foresatt?.fulltnavn || ansvarligNavn || '',
            ansvarligNavn: ansvarligType === 'organisasjon' ? (organisasjon?.navn ?? ansvarligNavn) : ansvarligNavn,
            ansvarligEpost: ansvarligType === 'organisasjon' ? ansvarligEpost : undefined
        }
        onSubmit(payload)
    }
</script>

{#if identity && !collapsed}
    <div class="form">
        <!-- ---- Eleven -------------------------------------------------- -->
        <fieldset class="ds-fieldset">
            <legend class="ds-fieldset__legend ds-heading" data-size="xs">Eleven</legend>

            {#if isFiktivElev}
                <DsAlert color="warning" heading="Fiktivt fødselsnummer">
                    <p class="ds-paragraph" data-size="sm">
                        Navn og adresse er hentet fra arkivet og kan ikke redigeres her. Skal de endres,
                        må det gjøres i Public 360.
                    </p>
                </DsAlert>
            {/if}

            <DsInput label="Navn på elev" value={identity?.navn ?? identity?.student?.fulltnavn ?? ''} readonly />
            <DsInput label="Fødselsnummer/D-nummer" value={identity?.identifier ?? identity?.fnr ?? ''} readonly />

            {#if isFiktivElev && identity?.adresse?.gateadresse}
                <DsCard>
                    <p class="ds-heading" data-size="2xs">Adresse fra arkivet</p>
                    <p class="ds-paragraph" data-size="sm">
                        {identity.adresse.gateadresse}<br />
                        {identity.adresse.postnummer ?? ''} {identity.adresse.poststed ?? ''}
                    </p>
                </DsCard>
            {/if}

            {#if blockedForNonAdmin}
                <DsAlert color="warning" heading="Krever administrator">
                    <p class="ds-paragraph" data-size="sm">
                        Vi fant ingen aktivt elevforhold for denne eleven i VIS, så skolen må velges
                        manuelt. Det er det bare en administrator som kan gjøre.
                    </p>
                    <p class="ds-paragraph" data-size="sm">
                        Ta kontakt med en administrator og oppgi elevens nummer, eller vent til eleven
                        er registrert i VIS og opprett avtalen da.
                    </p>
                </DsAlert>
            {:else if needsSchoolPicker}
                <!--
                    The contract has a shelf life: updateStudentInfo stamps notFoundInFINT, and five
                    days later moves it out of kontrakter. Nothing warns anyone, so the admin decides
                    up front.
                -->
                <DsAlert color="warning" heading="Eleven finnes ikke i VIS">
                    <p class="ds-paragraph" data-size="sm">
                        Vi fant ingen aktivt elevforhold for denne eleven i VIS, så skolen må velges manuelt.
                    </p>
                    <p class="ds-paragraph" data-size="sm">
                        <strong>Avtalen blir automatisk flyttet ut av aktive avtaler hvis eleven fortsatt
                        ikke finnes i VIS om fem dager.</strong> Den havner da i historiske avtaler, og
                        ingen får beskjed når det skjer. Opprett bare avtalen her hvis du er helt sikker
                        på at eleven blir registrert i VIS innen fem dager — hvis ikke, vent til eleven
                        er på plass.
                    </p>
                </DsAlert>

                <div class="ds-field">
                    <input
                        class="ds-input"
                        type="checkbox"
                        id="bekreft-fint"
                        bind:checked={acceptedFintRisk}
                        aria-invalid={errors.fintRisk ? 'true' : undefined}
                    />
                    <label class="ds-label" for="bekreft-fint">
                        Jeg er sikker på at eleven blir registrert i VIS innen fem dager
                    </label>
                </div>
                {#if errors.fintRisk}
                    <p class="ds-validation-message" data-size="sm">{errors.fintRisk}</p>
                {/if}

                {#if acceptedFintRisk}
                    {#if schoolsError}
                        <DsAlert color="danger">
                            <p class="ds-paragraph" data-size="sm">{schoolsError}</p>
                        </DsAlert>
                    {:else}
                        <DsSelect label="Skole" bind:value={selectedSchoolOrgNr} error={errors.school}>
                            <option value="">Velg skole …</option>
                            {#each schools as school}
                                <option value={school.orgNr}>{school.navn}</option>
                            {/each}
                        </DsSelect>
                    {/if}
                {/if}
            {:else}
                <DsInput label="Skole" value={resolvedSchool?.navn ?? ''} readonly />
                <DsInput label="Skolens organisasjonsnummer" value={resolvedSchool?.orgNr ?? ''} readonly />
            {/if}
        </fieldset>

        <!-- Everything below needs a school to hang off, so a blocked non-admin stops here rather
             than filling in an ansvarlig and a PDF for a contract that cannot be created. -->
        {#if !blockedForNonAdmin}
        <!-- ---- Ansvarlig ------------------------------------------------ -->
        <fieldset class="ds-fieldset">
            <legend class="ds-fieldset__legend ds-heading" data-size="xs">Ansvarlig (den som faktureres)</legend>

            {#if isFiktivElev}
                <DsAlert color="info">
                    <p class="ds-paragraph" data-size="sm">
                        En elev med fiktivt fødselsnummer må alltid ha en egen ansvarlig, også når eleven
                        er over 18 år. Et fiktivt fødselsnummer kan ikke faktureres.
                    </p>
                </DsAlert>
            {/if}

            {#if knownForesatte.length > 0 && ansvarligType === 'person' && !overrideAnsvarlig}
                {#if isSelfAnsvarlig}
                    <!-- Eleven er over 18 og står som ansvarlig selv. Ingenting å velge. -->
                    <DsInput
                        label="Ansvarlig"
                        description="Eleven er over 18 år og er ansvarlig for avtalen selv."
                        value={selfAnsvarlig.fulltnavn}
                        readonly
                    />
                {:else}
                    <DsSelect label="Velg foresatt" bind:value={selectedForesatt} error={errors.ansvarlig}>
                        {#if knownForesatte.length > 1}
                            <option value="">Velg foresatt …</option>
                        {/if}
                        {#each knownForesatte as foresatt}
                            <option value={foresatt}>
                                {foresatt.fulltnavn}{ikkeVarslesListe.includes(foresatt) ? ' (kan ikke varsles digitalt)' : ''}
                            </option>
                        {/each}
                    </DsSelect>
                    {#if ikkeVarslesListe.length > 0}
                        <p class="ds-paragraph hint" data-size="sm">
                            En foresatt som ikke kan varsles digitalt kan likevel stå som ansvarlig på
                            en papiravtale — avtalen sendes ikke ut til signering herfra.
                        </p>
                    {/if}
                {/if}

                {#if isAdmin}
                    <div>
                        <DsButton variant="tertiary" on:click={startOverrideAnsvarlig}>
                            Bruk en annen ansvarlig
                        </DsButton>
                    </div>
                {/if}
            {/if}

            {#if overrideAnsvarlig || knownForesatte.length === 0}
                {#if overrideAnsvarlig}
                    <div>
                        <DsButton variant="tertiary" on:click={cancelOverrideAnsvarlig}>
                            Bruk registrert ansvarlig likevel
                        </DsButton>
                    </div>
                {/if}

                <div class="lookup-row">
                    <DsInput
                        label={isAdmin ? 'Fødselsnummer eller organisasjonsnummer' : 'Fødselsnummer'}
                        description={isAdmin ? '11 siffer for en person, 9 siffer for en virksomhet.' : '11 siffer.'}
                        bind:value={ansvarligInput}
                        inputmode="numeric"
                        maxlength={11}
                        error={errors.ansvarlig}
                        on:input={resetAnsvarligLookup}
                    />
                    <!-- Enabled even half-typed: lookupAnsvarlig reports the problem on click. -->
                    <DsButton
                        variant="secondary"
                        disabled={isLookingUpAnsvarlig}
                        loading={isLookingUpAnsvarlig}
                        loadingText="Slår opp …"
                        on:click={lookupAnsvarlig}
                    >
                        Slå opp
                    </DsButton>
                </div>

                {#if ansvarligInputType === 'orgnr' && !isAdmin}
                    <!-- Said while they type, rather than after a click that was always going to fail. -->
                    <p class="ds-paragraph hint" data-size="sm">
                        Dette ser ut som et organisasjonsnummer. Bare en administrator kan sette en
                        virksomhet som ansvarlig.
                    </p>
                {:else if ansvarligInputType}
                    <p class="ds-paragraph hint" data-size="sm">
                        Tolkes som {ansvarligInputType === 'orgnr' ? 'organisasjonsnummer' : 'fødselsnummer'}
                    </p>
                {/if}

                {#if ansvarligLookupError}
                    <DsAlert color="danger">
                        <p class="ds-paragraph" data-size="sm">{ansvarligLookupError}</p>
                    </DsAlert>
                {/if}

                {#if ansvarligLookupWarning}
                    <DsAlert color="warning">
                        <p class="ds-paragraph" data-size="sm">{ansvarligLookupWarning}</p>
                    </DsAlert>
                {/if}

                {#if organisasjon}
                    <DsCard>
                        <p class="ds-heading" data-size="2xs">{organisasjon.navn}</p>
                        <p class="ds-paragraph" data-size="sm">
                            Org.nr {formatOrgnr(organisasjon.orgnr)}
                            {#if organisasjon.kilde === 'underenhet'} (underenhet){/if}<br />
                            {organisasjon.adresse?.gateadresse ?? ''}<br />
                            {organisasjon.adresse?.postnummer ?? ''} {organisasjon.adresse?.poststed ?? ''}
                        </p>
                    </DsCard>
                    <DsInput
                        label="Fakturaepost"
                        description="Adressen fakturaen sendes til. Enhetsregisteret oppgir ofte bare en generell firmapost."
                        bind:value={ansvarligEpost}
                        type="email"
                        error={errors.ansvarligEpost}
                    />
                {:else if ansvarligResolved}
                    <!--
                        Read-only: fillManualDocument builds ansvarligInfo.navn from FREG, not from
                        this field, so anything typed here would never reach the contract.
                    -->
                    <DsInput
                        label="Navn på ansvarlig"
                        description="Hentet fra Folkeregisteret."
                        value={ansvarligNavn}
                        readonly
                    />
                {/if}
            {/if}
        </fieldset>

        <!-- ---- Avtalen -------------------------------------------------- -->
        <fieldset class="ds-fieldset">
            <legend class="ds-fieldset__legend ds-heading" data-size="xs">Avtalen</legend>

            <DsSelect label="Type avtale" bind:value={type} error={errors.type}>
                <option value="">Velg type …</option>
                <option value="Leieavtale">Leieavtale</option>
                <option value="Låneavtale">Låneavtale</option>
            </DsSelect>

            <DsFileUpload
                label="Signert avtale (PDF)"
                description="Dra PDF-en hit, eller klikk for å velge fil"
                accept="application/pdf"
                bind:file={attachment}
                error={errors.attachment}
                onSelect={handleAttachment}
            />
        </fieldset>

        <DsButton on:click={submit}>Opprett avtale</DsButton>
        {/if}
    </div>
{/if}

<style>
    .form {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-6, 1.5rem);
        max-width: 42rem;
    }

    .ds-fieldset {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4, 1rem);
    }

    /* The lookup field and its button sit on one row, but must stack on a narrow screen rather
       than squeezing the input to nothing. */
    .lookup-row {
        display: flex;
        gap: var(--ds-size-3, 0.75rem);
        align-items: flex-end;
        flex-wrap: wrap;
    }

    .lookup-row > :global(.ds-field) {
        flex: 1 1 18rem;
    }

    .hint {
        color: var(--ds-color-neutral-text-subtle, var(--vann-60));
        margin-top: calc(-1 * var(--ds-size-2, 0.5rem));
    }
</style>
