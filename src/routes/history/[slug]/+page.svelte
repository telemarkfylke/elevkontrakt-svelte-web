<script>
    // Historikk for one elev: every contract in the link, newest first.
    import { tick } from 'svelte'
    import { page } from '$app/stores'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import ContractCard from '$lib/components/ContractCard.svelte'
    import EditHistoryRatesDialog from '$lib/components/contracts/EditHistoryRatesDialog.svelte'
    import { formatFnr } from '$lib/helpers/formatFnr.js'
    import { contractTime } from '$lib/helpers/contractDate.js'
    import { returnLatestKnownContractInfo } from '$lib/helpers/latestKnownContractInfo'
    import { returnLatestKnownStudentInfo } from '$lib/helpers/latestKnownStudentInfo'
    import { isTrue } from '$lib/helpers/status.js'
    import { isRemisseRate } from '$lib/helpers/remisse.js'
    import { hasAnyRole, isElevkontraktAdmin, HISTORY_ROLES, BILLING_ROLES } from '$lib/helpers/roles.js'
    import { loadInvoiceData, invoicesFor } from '$lib/helpers/contractInvoices.js'
    import { getContractsWithId, getElevkontraktToken } from '$lib/useApi'

    const tokenPromise = getElevkontraktToken(true)

    // Contracts live in state so a save can refresh them in place.
    let allowed = false
    let contracts = []
    let loadState = 'loading' // loading | ready | error
    tokenPromise.then(token => { allowed = hasAnyRole(token, HISTORY_ROLES) }).catch(() => {})
    // Only a new slug reloads, not other $page updates.
    $: slug = $page.params.slug
    $: if (allowed) refresh(slug)

    // Only the latest load counts. afterSave keeps what is shown.
    // Returns 'ok', 'failed' or 'stale' (a newer load took over).
    let loadId = 0
    async function refresh (slug, afterSave = false) {
        const id = ++loadId
        if (!afterSave) {
            loadState = 'loading'
            flash = ''
            flashWarning = ''
            staleWarning = false
            reloading = false
            editOpen = false
        }
        try {
            const result = await loadContracts(slug)
            if (id !== loadId) return 'stale'
            contracts = result
            loadState = 'ready'
            return 'ok'
        } catch {
            if (id !== loadId) return 'stale'
            if (!afterSave) loadState = 'error'
            return 'failed'
        }
    }

    // Registrer innbetaling (remisser), administrators only.
    let editing = null
    let editSlug = null // the elev the dialog was opened for
    let editOpen = false
    let flash = ''
    let flashWarning = '' // saved, but the live copy of the rate was not updated
    let flashEl
    let staleWarning = false // saved, but the reload failed
    let reloading = false // reload after a save is running
    // Not while the shown data may be older than the last save, or the save would get a 409.
    const canEditRates = (token, contract, busy) => !busy && isElevkontraktAdmin(token) && Object.values(contract.fakturaInfo ?? {}).some(isRemisseRate)

    function editRates (event) {
        flash = ''
        flashWarning = ''
        editing = event.detail
        editSlug = slug
        editOpen = true
    }

    async function saved (event) {
        // The admin moved to another elev while saving: that page loads on its own.
        if (editSlug !== slug) return
        flash = event.detail.message
        flashWarning = event.detail.warning
        reloading = true
        const result = await refresh(slug, true)
        reloading = false
        if (result === 'stale') return
        staleWarning = result === 'failed'
        // The button the dialog came from may be gone, so focus moves to the message.
        await tick()
        flashEl?.focus()
    }

    // Invoices go with the contract they were made for. Only admin and billing roles may fetch them.
    let canSeeInvoices = false
    let allInvoices = null
    let invoiceSettings = null
    let invoicesState = 'idle' // idle | loading | ready | error

    tokenPromise.then(async token => {
        canSeeInvoices = hasAnyRole(token, BILLING_ROLES)
        if (!canSeeInvoices) return
        invoicesState = 'loading'
        try {
            ({ invoices: allInvoices, settings: invoiceSettings } = await loadInvoiceData(token))
            invoicesState = 'ready'
        } catch {
            invoicesState = 'error'
        }
    }).catch(() => {})

    // Newest first. The API returns { error } when nothing matches.
    async function loadContracts (slug) {
        const result = await getContractsWithId(slug, 'history')
        if (!Array.isArray(result)) throw new Error(result?.error || 'Ukjent feil')
        const created = (contract) => contractTime((returnLatestKnownContractInfo(contract) ?? {}).createdTimeStamp)
        return [...result].sort((a, b) => created(b) - created(a))
    }

    const fromDigiTroll = (contract) => isTrue(contract.isImportedFromDigiTroll)
    const known = (value) => value && value !== 'Ukjent' ? value : ''

    // Back to the search keeps the search (the search page restores it from its snapshot).
    function back (event) {
        if (history.length > 1 && document.referrer.includes('/history')) {
            event.preventDefault()
            history.back()
        }
    }
</script>

    <main>
        <a class="ds-link back" href="/history" on:click={back}>
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>Tilbake til søket
        </a>

        {#await tokenPromise}
            <div class="center"><DsSpinner size="sm" title="Laster" /></div>
        {:then token}
            {#if !hasAnyRole(token, HISTORY_ROLES)}
                <h1 class="ds-heading" data-size="lg">Historikk</h1>
                <DsAlert color="warning" heading="Du har ikke tilgang til historikken">
                    <p class="ds-paragraph" data-size="sm">Historikken er for administratorer og skoleadministratorer. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else}
                {#if loadState === 'loading'}
                    <div class="loading" aria-busy="true">
                        <div class="skel tall"></div><div class="skel"></div><div class="skel"></div>
                    </div>
                {:else if loadState === 'ready'}
                    {@const first = contracts[0]}

                    {#if flash}
                        <div class="flash" tabindex="-1" bind:this={flashEl}>
                            <DsAlert color="success" dismissible on:dismiss={() => (flash = '')}>
                                <p class="ds-paragraph" data-size="sm">{flash}</p>
                            </DsAlert>
                        </div>
                    {/if}
                    {#if flashWarning}
                        <DsAlert color="warning" dismissible on:dismiss={() => (flashWarning = '')}>
                            <p class="ds-paragraph" data-size="sm">{flashWarning}</p>
                        </DsAlert>
                    {/if}
                    <!-- Not dismissible: it is why Registrer innbetaling is hidden. -->
                    {#if staleWarning}
                        <DsAlert color="warning">
                            <p class="ds-paragraph" data-size="sm">Klarte ikke å hente avtalene på nytt, så siden viser det som sto før endringen. Last inn siden på nytt før du registrerer mer.</p>
                        </DsAlert>
                    {/if}
                    {@const student = returnLatestKnownStudentInfo(first)}
                    {@const fromElevavtaler = contracts.filter(c => !fromDigiTroll(c)).length}

                    <header class="student">
                        <div>
                            <h1 class="ds-heading" data-size="lg">{first.elevInfo.navn}</h1>
                            <div class="meta">
                                <span><span class="material-symbols-outlined" aria-hidden="true">badge</span><span class="mono">{formatFnr(first.elevInfo.fnr)}</span></span>
                                {#if known(student.skole)}
                                    <span><span class="material-symbols-outlined" aria-hidden="true">school</span>Sist kjente: {student.skole}{known(student.klasse) ? `, ${student.klasse}` : ''}</span>
                                {/if}
                                {#if first.elevInfo.upn}
                                    <span><span class="material-symbols-outlined" aria-hidden="true">mail</span>{first.elevInfo.upn}</span>
                                {/if}
                            </div>
                        </div>
                        <div class="sources">
                            <strong>{contracts.length} {contracts.length === 1 ? 'avtale' : 'avtaler'}</strong>
                            {#if fromElevavtaler}<span><DsTag color="accent">Elevavtaler</DsTag> {fromElevavtaler}</span>{/if}
                            {#if contracts.length - fromElevavtaler}<span><DsTag color="plomme">DigiTroll</DsTag> {contracts.length - fromElevavtaler}</span>{/if}
                        </div>
                    </header>

                    <div class="contracts" aria-label="Avtaler, nyeste først">
                        {#each contracts as contract (contract._id)}
                            <ContractCard
                                {contract}
                                {token}
                                open={contract._id === contracts[0]._id}
                                invoices={canSeeInvoices ? (allInvoices ? invoicesFor(allInvoices, contract._id) : null) : undefined}
                                {invoicesState}
                                settings={invoiceSettings}
                                editRates={canEditRates(token, contract, reloading || staleWarning)}
                                on:editRates={editRates}
                            />
                        {/each}
                    </div>

                    <EditHistoryRatesDialog contract={editing} bind:open={editOpen} on:saved={saved} />
                {:else}
                    <DsAlert color="warning" heading="Fant ikke avtalene">
                        <p class="ds-paragraph" data-size="sm">Avtalene i lenken finnes ikke i historikken. De kan være flyttet tilbake til oversikten. Søk etter eleven på nytt.</p>
                    </DsAlert>
                {/if}
            {/if}
        {/await}
    </main>

<style>
    /* Focused by script after a save, so screen readers read the message. */
    .flash:focus {
        outline: none;
    }

    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 64rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        align-self: flex-start;
    }

    .center {
        display: grid;
        place-items: center;
        padding: 2rem;
    }

    .mono {
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.88em;
    }

    .student {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-end;
        gap: var(--ds-size-3) var(--ds-size-6);
        padding-bottom: var(--ds-size-4);
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-1) var(--ds-size-5);
        margin-top: var(--ds-size-2);
        color: var(--ds-color-neutral-text-subtle);
    }

    .meta > span,
    .sources > span {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
    }

    .sources {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2) var(--ds-size-3);
    }

    .contracts {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .loading {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .skel {
        height: 4.2rem;
        border-radius: var(--ds-border-radius-lg);
        background: linear-gradient(90deg, var(--ds-color-neutral-surface-tinted), var(--ds-color-neutral-background-tinted), var(--ds-color-neutral-surface-tinted));
        background-size: 200% 100%;
        animation: shimmer 1.4s linear infinite;
    }

    .skel.tall {
        height: 5rem;
    }

    @keyframes shimmer {
        to { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        .skel { animation: none; }
    }
</style>
