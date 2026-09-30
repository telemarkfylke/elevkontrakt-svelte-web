<script>
    /**
     * Rediger avtale: PC-status and payments, with the same rules as before the redesign.
     * One PC action at a time. Administrators can switch off the checks with "Rediger som admin".
     */
    import { createEventDispatcher } from 'svelte'
    import DsAlert from '../ds/DsAlert.svelte'
    import DsButton from '../ds/DsButton.svelte'
    import DsCheckbox from '../ds/DsCheckbox.svelte'
    import DsDialog from '../ds/DsDialog.svelte'
    import DsInput from '../ds/DsInput.svelte'
    import DsSelect from '../ds/DsSelect.svelte'
    import DsTabs from '../ds/DsTabs.svelte'
    import DsTag from '../ds/DsTag.svelte'
    import StatusTag from '../StatusTag.svelte'
    import { isTrue } from '$lib/helpers/status.js'
    import { isElevkontraktAdmin } from '$lib/helpers/roles.js'
    import { contractType, schoolYear } from '$lib/helpers/contractFilters.js'
    import { updateContractInfo } from '$lib/useApi'

    export let contract
    export let token
    export let collection = 'regular'
    export let open = false

    const dispatch = createEventDispatcher()
    const REASONS = ['Feil faktureringsår', 'Feil status', 'Elev slutter', 'Utkjøp av PC', 'Privat PC', 'Overgang fra annet fylke']
    const ALL_STATUSES = ['Ikke Fakturert', 'Fakturert', 'Betalt', 'Skal ikke betale', 'Kreditert']

    let tab = 'pc'
    let asAdmin = false
    let pcChoice = ''
    let edits = {}
    let saving = false
    let error = ''

    $: isAdmin = isElevkontraktAdmin(token)
    $: pc = contract?.pcInfo ?? {}
    $: signed = isTrue(contract?.isSigned)
    $: released = isTrue(pc.released)
    $: returned = isTrue(pc.returned)
    $: boughtOut = isTrue(pc.boughtOut)
    $: rateKeys = Object.keys(contract?.fakturaInfo ?? {})
    $: anyUninvoiced = rateKeys.some(key => String(contract.fakturaInfo[key].status).toLowerCase() === 'ikke fakturert')
    $: canEditPayments = signed && contractType(contract) === 'leieavtale' && !returned &&
        token?.roles?.some(r => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))

    // Each option is what updateContractInfo gets sent.
    $: pcOptions = asAdmin
        ? [
            released ? { value: 'undoRelease', label: 'Angre utlevering av PC', data: { releasePC: 'false' } } : { value: 'release', label: 'Utlever PC', data: { releasePC: 'true' } },
            returned ? { value: 'undoReturn', label: 'Angre innlevering av PC', data: { returnPC: 'false' } } : { value: 'return', label: 'Registrer PC som innlevert', data: { returnPC: 'true' } },
            boughtOut ? { value: 'undoBuyOut', label: 'Angre utkjøp av PC', data: { buyOutPC: 'false' } } : { value: 'buyOut', label: 'Registrer PC som kjøpt ut', data: { buyOutPC: 'true' } }
        ]
        : signed && !released
            ? [{ value: 'release', label: 'Utlever PC', data: { releasePC: 'true' } }]
            : signed && released && !returned
                ? [
                    { value: 'return', label: 'Registrer PC som innlevert', data: { returnPC: 'true' } },
                    ...(!anyUninvoiced ? [{ value: 'buyOut', label: 'Registrer PC som kjøpt ut', data: { buyOutPC: 'true' } }] : [])
                ]
                : []

    $: tabs = [
        { value: 'pc', label: 'PC-status', icon: 'laptop_chromebook' },
        ...(canEditPayments ? [{ value: 'pay', label: 'Betalinger', icon: 'payments' }] : [])
    ]

    // A fresh dialog for every contract it opens on.
    $: if (open) reset(contract?._id)
    let resetFor = null
    function reset (id) {
        if (id === resetFor) return
        resetFor = id
        tab = 'pc'
        asAdmin = false
        pcChoice = ''
        edits = emptyEdits()
        error = ''
    }
    $: if (!open) resetFor = null

    const emptyEdits = () => Object.fromEntries(Object.keys(contract?.fakturaInfo ?? {}).map(key => [key, { status: '', faktureringsår: '', editReason: '', editReasonCustom: '' }]))

    function toggleAdmin () {
        pcChoice = ''
        edits = emptyEdits()
        error = ''
    }

    const rateEditable = (rate, asAdmin) => asAdmin || ['ikke fakturert', 'skal ikke betale'].includes(String(rate.status).toLowerCase())

    // Same shape as before: data['fakturaInfo.rateN.field'] plus a changeLog entry per change.
    function paymentChanges () {
        const data = {}
        const changeLog = []
        const now = new Date().toISOString()
        for (const key of rateKeys) {
            const change = edits[key]
            if (!change) continue
            const rate = contract.fakturaInfo[key]
            const fields = {}
            if (change.status && change.status !== rate.status) fields.status = change.status
            if (change.faktureringsår && String(change.faktureringsår) !== String(rate.faktureringsår)) fields.faktureringsår = change.faktureringsår
            if (change.editReason) fields.editReason = change.editReason
            if (change.editReasonCustom) fields.editReasonCustom = change.editReasonCustom
            for (const [field, value] of Object.entries(fields)) {
                data[`fakturaInfo.${key}.${field}`] = value.toString()
                changeLog.push({ field: `fakturaInfo.${key}.${field}`, oldValue: rate[field], newValue: value, timestamp: now, changedBy: token.upn })
            }
        }
        return { data, changeLog }
    }

    $: saveLabel = tab === 'pay'
        ? (asAdmin ? 'Lagre betalinger som admin' : 'Lagre betalinger')
        : (asAdmin ? 'Lagre som admin' : ({ release: 'Lagre utlevering', return: 'Lagre innlevering', buyOut: 'Lagre utkjøp' }[pcChoice] ?? 'Lagre'))

    async function save () {
        error = ''
        let payload
        if (tab === 'pay') {
            const { data, changeLog } = paymentChanges()
            if (!Object.keys(data).length) { error = 'Ingen endringer å lagre.'; return }
            payload = { data, changeLog, contractID: contract._id, updateData: true }
        } else {
            const option = pcOptions.find(o => o.value === pcChoice)
            if (!option) { error = 'Velg hva du vil registrere før du lagrer.'; return }
            payload = { ...option.data, upn: token.upn }
        }
        saving = true
        let response
        try {
            response = await updateContractInfo(contract._id, payload, collection)
        } catch (err) {
            response = err?.response
        }
        saving = false
        if (response?.status !== 200) {
            error = response?.data?.error ?? 'Endringen ble ikke lagret. Prøv igjen om litt. Kontakt servicedesk hvis feilen fortsetter.'
            return
        }
        open = false
        dispatch('saved', `Endringen på avtalen til ${contract.elevInfo?.navn} er lagret.`)
    }
</script>

<DsDialog bind:open width="44rem" labelledby="edit-title" closedby={saving ? 'none' : 'any'}>
    {#if contract}
        <div>
            <h2 class="ds-heading" data-size="sm" id="edit-title">Rediger avtale</h2>
            <div class="meta">
                <DsTag>{contract.elevInfo?.navn}</DsTag>
                <DsTag>{contract.unSignedskjemaInfo?.kontraktType}</DsTag>
                <DsTag>{contract.elevInfo?.skole} · {contract.elevInfo?.klasse}</DsTag>
            </div>
        </div>

        {#if isAdmin}
            <DsCheckbox type="switch" label="Rediger som admin" bind:checked={asAdmin} on:change={toggleAdmin} />
            {#if asAdmin}
                <DsAlert color="danger">
                    <p class="ds-paragraph" data-size="sm"><strong>Kontrollene er slått av.</strong> Du kan endre alt, også det som vanligvis er låst. Vær sikker før du lagrer.</p>
                </DsAlert>
            {/if}
        {/if}

        <div class:admin-on={asAdmin}>
            <DsTabs {tabs} bind:value={tab} label="Hva vil du endre" size="sm" let:value>
                {#if value === 'pay'}
                    <div class="rates">
                        {#each rateKeys.filter(key => edits[key]) as key (key)}
                            {@const rate = contract.fakturaInfo[key]}
                            <fieldset class="rate">
                                <legend>Faktura {key.slice(-1)} <StatusTag status={rate.status} /></legend>
                                {#if rateEditable(rate, asAdmin)}
                                    {#if isAdmin}
                                        <DsSelect label="Faktureringsår" bind:value={edits[key].faktureringsår}>
                                            <option value="">Uendret ({rate.faktureringsår})</option>
                                            {#each [0, 1, 2] as offset}<option value={schoolYear(offset)}>{schoolYear(offset)}</option>{/each}
                                        </DsSelect>
                                    {/if}
                                    <DsSelect label="Ny status" bind:value={edits[key].status}>
                                        <option value="">Uendret ({rate.status})</option>
                                        {#each isAdmin ? ALL_STATUSES : ['Skal ikke betale'] as status}<option value={status}>{status}</option>{/each}
                                    </DsSelect>
                                    <DsSelect label="Grunn til endring" bind:value={edits[key].editReason}>
                                        <option value="">Velg grunn</option>
                                        {#each REASONS as reason}<option value={reason}>{reason}</option>{/each}
                                    </DsSelect>
                                    <div class="full">
                                        <DsInput label="Forklaring ({edits[key]?.editReasonCustom.length ?? 0}/128)" maxlength={128} placeholder="Valgfritt, maks 128 tegn" bind:value={edits[key].editReasonCustom} />
                                    </div>
                                {:else}
                                    <p class="ds-paragraph full" data-size="sm">Faktura {key.slice(-1)} er allerede behandlet. Sum, status og faktureringsår kan ikke endres.</p>
                                {/if}
                            </fieldset>
                        {/each}
                    </div>
                {:else if pcOptions.length}
                    <fieldset class="ds-fieldset">
                        <legend class="ds-label">
                            {asAdmin ? 'Du redigerer som admin. Velg én handling.' : !released ? 'Avtalen er signert, og PC-en kan leveres ut.' : 'PC-en er levert ut. Skal den leveres inn eller kjøpes ut?'}
                        </legend>
                        <div class="options">
                            {#each pcOptions as option (option.value)}
                                <DsCheckbox type="radio" name="pc-action" value={option.value} label={option.label} bind:group={pcChoice} />
                            {/each}
                        </div>
                    </fieldset>
                {:else if returned || boughtOut}
                    <DsAlert color="info"><p class="ds-paragraph" data-size="sm">PC-en er allerede {returned ? 'innlevert' : 'kjøpt ut'}. Mener du at dette er feil, kontakt en administrator.</p></DsAlert>
                {:else}
                    <DsAlert color="info">
                        <p class="ds-paragraph" data-size="sm">Du kan ikke endre PC-status for denne avtalen. Det kan være fordi:</p>
                        <ul class="ds-list" data-size="sm"><li>avtalen ikke er signert</li><li>PC-en allerede er innlevert eller kjøpt ut</li><li>en eller flere fakturaer har status «Ikke fakturert»</li></ul>
                    </DsAlert>
                {/if}
            </DsTabs>
        </div>

        {#if !canEditPayments && !asAdmin}
            <p class="ds-paragraph muted" data-size="xs">Betalinger kan bare endres på signerte leieavtaler der PC-en ikke er innlevert.</p>
        {/if}

        {#if error}
            <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{error}</p></DsAlert>
        {/if}
    {/if}

    <svelte:fragment slot="footer">
        <DsButton loading={saving} loadingText="Lagrer …" disabled={tab === 'pc' && !pcOptions.length} on:click={save}>{saveLabel}</DsButton>
        <DsButton variant="secondary" disabled={saving} on:click={() => (open = false)}>Avbryt</DsButton>
    </svelte:fragment>
</DsDialog>

<style>
    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2);
        margin-top: var(--ds-size-2);
    }

    .muted { color: var(--ds-color-neutral-text-subtle); }

    .options {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .rates {
        display: grid;
        gap: var(--ds-size-4);
    }

    .rate {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        padding: var(--ds-size-4);
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: var(--ds-size-3) var(--ds-size-4);
    }

    .rate legend {
        font-weight: 700;
        padding-inline: 0.3rem;
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .full { grid-column: 1 / -1; }

    .admin-on .rate { border-color: var(--ds-color-danger-border-default); }
</style>
