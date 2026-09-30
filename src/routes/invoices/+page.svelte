<script>
    // Fakturaer: every invoice for administrators, your own for fakturering. Unsent ones can be deleted.
    import { onDestroy } from 'svelte'
    import DsScope from '$lib/components/ds/DsScope.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsPagination from '$lib/components/ds/DsPagination.svelte'
    import DsSelect from '$lib/components/ds/DsSelect.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import StatusTag from '$lib/components/StatusTag.svelte'
    import { formatShortDate } from '$lib/helpers/formatDate'
    import { formatTimeUntilExport } from '$lib/helpers/xledgerExport.js'
    import { ratePrice } from '$lib/helpers/prices.js'
    import { hasAnyRole, isElevkontraktAdmin, BILLING_ROLES } from '$lib/helpers/roles.js'
    import { getElevkontraktToken, getInvoices, deleteInvoices, getSettings } from '$lib/useApi'

    const TYPE = { buyOut: { label: 'Rater', icon: 'event_repeat' }, extraInvoice: { label: 'Tilleggstjenester', icon: 'inventory_2' } }
    const KNOWN = ['Ikke Fakturert', 'Fakturert', 'Betalt']
    const FILTERS = [['all', 'Alle'], ['Ikke Fakturert', 'Ikke fakturert'], ['Fakturert', 'Fakturert'], ['Betalt', 'Betalt'], ['other', 'Andre']]

    let invoices = []
    let settings = null
    let loadState = 'loading' // loading | ready | error
    let status = 'all'
    let query = ''
    let sort = { key: 'created', dir: 'descending' }
    let page = 1
    let perPage = 10
    let flash = ''
    let toDelete = null
    let deleting = false
    let deleteError = ''
    let countdown = formatTimeUntilExport()

    const timer = setInterval(() => { countdown = formatTimeUntilExport() }, 30000)
    onDestroy(() => clearInterval(timer))

    const tokenPromise = getElevkontraktToken(true)
    const ready = tokenPromise.then(async token => {
        if (!hasAnyRole(token, BILLING_ROLES)) return token
        const [response, settingsResponse] = await Promise.all([getInvoices(token.upn), getSettings()])
        settings = settingsResponse?.data?.result?.[0] ?? null
        if (response?.status === 200) {
            invoices = response.data
            loadState = 'ready'
        } else {
            loadState = 'error'
        }
        return token
    })

    const isPending = (invoice) => invoice.status === 'Ikke Fakturert'
    // A rate's price is set when it is sent, so an unsent rate invoice shows what the backend will use.
    const isPreliminary = (invoice) => invoice.type === 'buyOut' && isPending(invoice) && settings
    function amount (invoice) {
        const items = invoice.itemsFromCart ?? []
        if (isPreliminary(invoice)) return items.length * ratePrice(settings, invoice.student)
        return items.reduce((sum, item) => sum + (parseInt(item.sum ?? item.price, 10) || 0), 0)
    }

    $: counts = {
        all: invoices.length,
        'Ikke Fakturert': invoices.filter(i => i.status === 'Ikke Fakturert').length,
        Fakturert: invoices.filter(i => i.status === 'Fakturert').length,
        Betalt: invoices.filter(i => i.status === 'Betalt').length,
        other: invoices.filter(i => !KNOWN.includes(i.status)).length
    }

    function matches (invoice, term) {
        if (!term) return true
        return [invoice.student?.navn, invoice.recipient?.navn].some(name => name?.toLowerCase().includes(term))
    }

    const sortValue = {
        created: (i) => new Date(i.createdTimeStamp).getTime() || 0,
        type: (i) => TYPE[i.type]?.label ?? '',
        status: (i) => i.status ?? '',
        amount: (i) => amount(i)
    }

    $: filtered = invoices
        .filter(i => status === 'all' || (status === 'other' ? !KNOWN.includes(i.status) : i.status === status))
        .filter(i => matches(i, query.trim().toLowerCase()))
        .sort((a, b) => {
            const x = sortValue[sort.key](a)
            const y = sortValue[sort.key](b)
            const cmp = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'nb')
            return sort.dir === 'ascending' ? cmp : -cmp
        })
    $: totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
    $: if (page > totalPages) page = totalPages
    $: pageRows = filtered.slice((page - 1) * perPage, page * perPage)

    // Changing the filter, search or page size starts on page 1.
    $: status, query, perPage, (page = 1)

    function sortBy (key) {
        sort = { key, dir: sort.key === key && sort.dir === 'ascending' ? 'descending' : 'ascending' }
    }

    async function confirmDelete () {
        deleting = true
        deleteError = ''
        const response = await deleteInvoices(toDelete._id)
        deleting = false
        if (response?.status !== 200) {
            deleteError = 'Fakturaen ble ikke slettet. Prøv igjen om litt. Den sendes til Xledger kl. 01.00 hvis den ikke blir slettet.'
            return
        }
        invoices = invoices.filter(i => i._id !== toDelete._id)
        flash = `Fakturaen til ${toDelete.recipient?.navn ?? 'ansvarlig'} (kr ${amount(toDelete)}) er slettet.`
        toDelete = null
    }
</script>

<DsScope>
    <main>
        {#await ready}
            <h1 class="ds-heading" data-size="lg">Fakturaer</h1>
            <div class="table-wrap" aria-busy="true"><div class="skeleton">{#each [1, 2, 3, 4, 5] as _}<div class="skel"></div>{/each}</div></div>
        {:then token}
            {@const admin = isElevkontraktAdmin(token)}
            <header>
                <h1 class="ds-heading" data-size="lg">Fakturaer</h1>
                <p class="ds-paragraph lead" data-size="sm">{admin ? 'Alle fakturaer som er opprettet i Elevavtaler.' : 'Fakturaer du har opprettet.'}</p>
            </header>

            {#if !hasAnyRole(token, BILLING_ROLES)}
                <DsAlert color="warning" heading="Du har ikke tilgang til fakturaer">
                    <p class="ds-paragraph" data-size="sm">Fakturaer er for administratorer og økonomi. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else if loadState === 'error'}
                <DsAlert color="danger" heading="Vi fikk ikke hentet fakturaene">
                    <p class="ds-paragraph" data-size="sm">Last inn siden på nytt. Kontakt servicedesk hvis feilen fortsetter.</p>
                </DsAlert>
            {:else}
                {#if flash}
                    <DsAlert color="success" dismissible on:dismiss={() => (flash = '')}>
                        <p class="ds-paragraph" data-size="sm">{flash}</p>
                    </DsAlert>
                {/if}

                {#if counts['Ikke Fakturert']}
                    <div class="pending" role="status">
                        <span class="clock"><span class="material-symbols-outlined" aria-hidden="true">schedule_send</span></span>
                        <div>
                            <p class="ds-heading" data-size="2xs">{counts['Ikke Fakturert']} {counts['Ikke Fakturert'] === 1 ? 'faktura venter' : 'fakturaer venter'} på å bli sendt</p>
                            <p class="ds-paragraph" data-size="sm">De sendes til Xledger i natt kl. 01.00. Til da kan de slettes, hvis noe er feil. Om noe skulle være feil etter dette så må du ta kontakt med en administrator og få fakturaen kreditert i Xledger.</p>
                        </div>
                        <div class="when"><strong>{countdown}</strong><small>til sending</small></div>
                    </div>
                {/if}

                <div class="filter-row">
                    <div class="ds-field status-filter">
                        <span class="ds-label" id="status-label">Status</span>
                        <div class="ds-toggle-group" data-size="sm" role="radiogroup" aria-labelledby="status-label">
                            {#each FILTERS as [value, label]}
                                <label class="ds-button" data-variant="tertiary">
                                    <input type="radio" name="status" {value} bind:group={status} />{label}<span class="count">{counts[value]}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                    <div class="search">
                        <DsInput label="Søk" type="search" icon="search" placeholder="Elev eller ansvarlig" autocomplete="off" bind:value={query} />
                    </div>
                </div>

                {#if pageRows.length}
                    <div class="table-wrap">
                        <table class="ds-table" data-size="sm" data-border>
                            <thead>
                                <tr>
                                    <th>Elev</th>
                                    <th>Ansvarlig</th>
                                    {#each [['type', 'Type', ''], ['amount', 'Beløp', 'num'], ['created', 'Opprettet', '']] as [key, label, cls]}
                                        <th class={cls} aria-sort={sort.key === key ? sort.dir : 'none'}><button type="button" on:click={() => sortBy(key)}>{label}</button></th>
                                    {/each}
                                    {#if admin}<th>Opprettet av</th>{/if}
                                    <th aria-sort={sort.key === 'status' ? sort.dir : 'none'}><button type="button" on:click={() => sortBy('status')}>Status</button></th>
                                    <th><span class="ds-sr-only">Handlinger</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each pageRows as invoice (invoice._id)}
                                    {@const type = TYPE[invoice.type] ?? { label: invoice.type, icon: 'receipt' }}
                                    <tr>
                                        <td>
                                            <span class="who">
                                                <a class="ds-link" href="/invoices/{invoice._id}"><strong>{invoice.student?.navn}</strong></a>
                                                <small>{invoice.student?.skole} · {invoice.student?.klasse}</small>
                                            </span>
                                        </td>
                                        <td>{invoice.recipient?.navn}</td>
                                        <td>
                                            <span class="type"><span class="material-symbols-outlined" aria-hidden="true">{type.icon}</span>{type.label}</span>
                                            {#if invoice.bulkRunId}<DsTag>Fra fil</DsTag>{/if}
                                        </td>
                                        <td class="num">
                                            kr {amount(invoice)}
                                            {#if isPreliminary(invoice)}<small class="prelim" title="Prisen på rater settes når fakturaen sendes kl. 01.00">foreløpig</small>{/if}
                                        </td>
                                        <td>
                                            <span class="date">{formatShortDate(invoice.createdTimeStamp)}
                                                <small>{invoice.createdTimeStamp ? `kl. ${new Date(invoice.createdTimeStamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : ''}</small>
                                            </span>
                                        </td>
                                        {#if admin}<td>{invoice.invoiceCreatedBy?.name ?? ''}</td>{/if}
                                        <td><StatusTag status={invoice.status} kind="invoice" /></td>
                                        <td class="act">
                                            {#if isPending(invoice)}
                                                <DsButton variant="tertiary" color="danger" size="sm" on:click={() => { deleteError = ''; toDelete = invoice }}>
                                                    <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                                                    Slett<span class="ds-sr-only"> fakturaen til {invoice.recipient?.navn} for {invoice.student?.navn}</span>
                                                </DsButton>
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <div class="table-foot">
                        <div class="per-page">
                            <DsSelect label="Rader per side" bind:value={perPage}>
                                {#each [10, 25, 50] as n}<option value={n}>{n}</option>{/each}
                            </DsSelect>
                        </div>
                        <p class="ds-paragraph" data-size="sm">Viser {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} av {filtered.length}</p>
                        <DsPagination bind:current={page} total={totalPages} />
                    </div>
                {:else}
                    <div class="table-wrap">
                        <div class="empty">
                            <span class="material-symbols-outlined" aria-hidden="true">{query || status !== 'all' ? 'search_off' : 'inbox'}</span>
                            <p class="ds-heading" data-size="2xs">{query || status !== 'all' ? 'Ingen fakturaer passer' : 'Ingen fakturaer ennå'}</p>
                            <p class="ds-paragraph" data-size="sm">{query || status !== 'all' ? 'Prøv et annet søk eller en annen status.' : 'Fakturaer du oppretter under Fakturering vises her.'}</p>
                            {#if query || status !== 'all'}
                                <DsButton variant="secondary" size="sm" on:click={() => { query = ''; status = 'all' }}>Vis alle fakturaer</DsButton>
                            {/if}
                        </div>
                    </div>
                {/if}

                <DsDialog open={Boolean(toDelete)} on:close={() => (toDelete = null)} width="32rem" labelledby="delete-title" closedby={deleting ? 'none' : 'any'}>
                    {#if toDelete}
                        <h2 class="ds-heading" data-size="sm" id="delete-title">Slette fakturaen til {toDelete.recipient?.navn}?</h2>
                        <p class="ds-paragraph" data-size="sm">{TYPE[toDelete.type]?.label ?? toDelete.type} for {toDelete.student?.navn}, opprettet {formatShortDate(toDelete.createdTimeStamp)}.</p>
                        <ul class="lines">
                            {#each toDelete.itemsFromCart ?? [] as item}
                                <li><span>{item.name ?? `Rate for ${item.faktureringsår}`}</span><span>kr {isPreliminary(toDelete) ? ratePrice(settings, toDelete.student) : (item.sum ?? item.price)}</span></li>
                            {/each}
                        </ul>
                        <div class="total"><span>Totalt</span><strong>kr {amount(toDelete)}</strong></div>
                        <p class="ds-paragraph" data-size="sm">Fakturaen er ikke sendt til Xledger ennå. Slettingen kan ikke angres. Skal eleven ha en riktig faktura, lager du en ny under Fakturering.</p>
                        {#if deleteError}
                            <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{deleteError}</p></DsAlert>
                        {/if}
                    {/if}
                    <svelte:fragment slot="footer">
                        <DsButton color="danger" loading={deleting} loadingText="Sletter …" on:click={confirmDelete}>
                            <span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett fakturaen
                        </DsButton>
                        <DsButton variant="secondary" disabled={deleting} on:click={() => (toDelete = null)}>Avbryt</DsButton>
                    </svelte:fragment>
                </DsDialog>
            {/if}
        {/await}
    </main>
</DsScope>

<style>
    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 84rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .lead { color: var(--ds-color-neutral-text-subtle); }

    .pending {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--ds-size-3) var(--ds-size-4);
        padding: var(--ds-size-4) var(--ds-size-5);
        border-radius: var(--ds-border-radius-lg);
        background: var(--ds-color-warning-surface-tinted);
        border: 1px solid var(--ds-color-warning-border-subtle);
    }

    .clock {
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--ds-color-warning-base-default);
        color: var(--ds-color-warning-base-contrast-default);
    }

    .clock .material-symbols-outlined { font-size: 1.5rem; }

    .when {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .when strong {
        display: block;
        font-size: 1.35rem;
        line-height: 1.1;
    }

    .when small { color: var(--ds-color-neutral-text-subtle); }

    @media (max-width: 640px) {
        .pending { grid-template-columns: auto 1fr; }
        .when { grid-column: 1 / -1; text-align: left; }
    }

    .filter-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--ds-size-3) var(--ds-size-5);
    }

    .status-filter { gap: var(--ds-size-1); }

    .ds-toggle-group label {
        display: inline-flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .count {
        font-variant-numeric: tabular-nums;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 0 0.45rem;
        border-radius: var(--ds-border-radius-full);
        background: var(--ds-color-neutral-surface-tinted);
        color: var(--ds-color-neutral-text-default);
        min-width: 1.5rem;
        text-align: center;
    }

    label:has(input:checked) .count {
        background: color-mix(in srgb, currentColor 22%, transparent);
        color: inherit;
    }

    .search { flex: 0 1 22rem; }

    .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
    }

    .ds-table {
        --dsc-table-padding: 0.65rem 0.85rem;
        min-width: 100%;
        font-variant-numeric: tabular-nums;
    }

    .ds-table > thead > tr > :global(*) {
        background: var(--ds-color-accent-background-tinted);
        white-space: nowrap;
    }

    .ds-table td { vertical-align: middle; }

    .who,
    .date {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
    }

    .who { min-width: 11rem; }

    .who small,
    .date small,
    .prelim {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.78rem;
    }

    .prelim { display: block; }

    .num {
        text-align: right;
        white-space: nowrap;
    }

    .type {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        white-space: nowrap;
        margin-right: var(--ds-size-2);
    }

    .type .material-symbols-outlined {
        color: var(--ds-color-accent-text-subtle);
        font-size: 1.1rem;
    }

    .act {
        text-align: right;
        white-space: nowrap;
        width: 1%;
    }

    .table-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--ds-size-3);
        font-variant-numeric: tabular-nums;
    }

    .per-page { width: 9rem; }

    .empty {
        display: grid;
        justify-items: center;
        gap: var(--ds-size-2);
        text-align: center;
        padding: var(--ds-size-8, 2.5rem) var(--ds-size-4);
    }

    .empty .material-symbols-outlined {
        font-size: 2.2rem;
        color: var(--ds-color-accent-text-subtle);
    }

    .lines {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-1);
        font-variant-numeric: tabular-nums;
    }

    .lines li {
        display: flex;
        justify-content: space-between;
        gap: var(--ds-size-3);
    }

    .total {
        display: flex;
        justify-content: space-between;
        padding-top: var(--ds-size-2);
        border-top: 2px solid var(--ds-color-neutral-border-default);
        font-variant-numeric: tabular-nums;
    }

    .skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: var(--ds-size-4);
    }

    .skel {
        height: 2.8rem;
        border-radius: var(--ds-border-radius-md);
        background: linear-gradient(90deg, var(--ds-color-neutral-surface-tinted), var(--ds-color-neutral-background-tinted), var(--ds-color-neutral-surface-tinted));
        background-size: 200% 100%;
        animation: shimmer 1.4s linear infinite;
    }

    @keyframes shimmer {
        to { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        .skel { animation: none; }
    }
</style>
