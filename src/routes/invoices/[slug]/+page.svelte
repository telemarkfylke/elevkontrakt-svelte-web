<script>
    // One invoice as a document: lines and total, status, who it went to, and who created it.
    import { onDestroy } from 'svelte'
    import { page } from '$app/stores'
    import { goto } from '$app/navigation'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsSteps from '$lib/components/ds/DsSteps.svelte'
    import StatusTag from '$lib/components/StatusTag.svelte'
    import { formatShortDate } from '$lib/helpers/formatDate'
    import { formatTimeUntilExport } from '$lib/helpers/xledgerExport.js'
    import { ratePrice } from '$lib/helpers/prices.js'
    import { hasAnyRole, BILLING_ROLES } from '$lib/helpers/roles.js'
    import { flashMessage } from '$lib/store'
    import { deleteInvoices, getContractsWithId, getElevkontraktToken, getSettings } from '$lib/useApi'

    const TYPE = { buyOut: 'Rater', extraInvoice: 'Tilleggstjenester' }
    const STANDARD_FIELDS = ['_id', 'name', 'price', 'description', 'active', 'metadata', 'auditLog']

    let invoice = null
    let settings = null
    let loadState = 'loading' // loading | ready | notFound
    let deleteOpen = false
    let deleting = false
    let deleteError = ''
    let copied = false
    let countdown = formatTimeUntilExport()

    const timer = setInterval(() => { countdown = formatTimeUntilExport() }, 30000)
    onDestroy(() => clearInterval(timer))

    const tokenPromise = getElevkontraktToken(true)
    const ready = tokenPromise.then(async token => {
        if (!hasAnyRole(token, BILLING_ROLES)) return token
        const [result, settingsResponse] = await Promise.all([getContractsWithId($page.params.slug, 'invoices'), getSettings()])
        settings = settingsResponse?.data?.result?.[0] ?? null
        if (Array.isArray(result) && result.length) {
            invoice = result[0]
            loadState = 'ready'
        } else {
            loadState = 'notFound'
        }
        return token
    })

    $: pending = invoice?.status === 'Ikke Fakturert'
    $: isRates = invoice?.type === 'buyOut'
    // A rate's price is set when it is sent, so an unsent rate invoice shows what the backend will use.
    $: preliminary = isRates && pending && settings
    $: items = invoice?.itemsFromCart ?? []
    $: lineAmount = (item) => preliminary ? ratePrice(settings, invoice.student) : (parseInt(item.sum ?? item.price, 10) || 0)
    $: total = items.reduce((sum, item) => sum + lineAmount(item), 0)

    const known = (value) => value && value !== 'Ukjent' ? value : ''
    const extraFields = (item) => Object.keys(item).filter(key => !STANDARD_FIELDS.includes(key) && String(item[key] ?? '').trim())

    // Sent: faktureringsDato on the invoice, or on the lines for rates. Paid or credited: betaltDato.
    function latestDate (...values) {
        const times = values.flat().map(v => new Date(v).getTime()).filter(Number.isFinite)
        return times.length ? new Date(Math.max(...times)).toISOString() : ''
    }
    $: sentDate = latestDate(invoice?.faktureringsDato, items.map(i => i.faktureringsDato))
    $: closedDate = latestDate(invoice?.betaltDato, items.map(i => i.betaltDato))

    $: ending = invoice?.status === 'Kreditert'
        ? { label: 'Kreditert', tone: 'plomme', mark: 'undo', date: formatShortDate(closedDate) }
        : invoice?.status === 'Overført inkasso'
            ? { label: 'Overført inkasso', tone: 'danger', mark: 'priority_high', date: formatShortDate(closedDate) }
            : { label: 'Betalt', done: invoice?.status === 'Betalt', date: formatShortDate(closedDate) }

    $: steps = invoice ? [
        { label: 'Opprettet', done: true, date: formatShortDate(invoice.createdTimeStamp) },
        { label: 'Sendt til Xledger', done: !pending, date: formatShortDate(sentDate), pending: 'I natt kl. 01.00' },
        ending
    ] : []

    async function copyId () {
        try { await navigator.clipboard.writeText(invoice._id) } catch { /* convenience */ }
        copied = true
        setTimeout(() => { copied = false }, 1500)
    }

    async function confirmDelete () {
        deleting = true
        deleteError = ''
        const response = await deleteInvoices(invoice._id)
        deleting = false
        if (response?.status !== 200) {
            deleteError = 'Fakturaen ble ikke slettet. Prøv igjen om litt. Den sendes til Xledger kl. 01.00 hvis den ikke blir slettet.'
            return
        }
        flashMessage.set(`Fakturaen til ${invoice.recipient?.navn ?? 'ansvarlig'} (kr ${total}) er slettet.`)
        deleteOpen = false
        goto('/invoices')
    }

    function back (event) {
        if (history.length > 1 && document.referrer.includes('/invoices')) {
            event.preventDefault()
            history.back()
        }
    }
</script>

    <main>
        <a class="ds-link back" href="/invoices" on:click={back}>
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>Tilbake til fakturaene
        </a>

        {#await ready}
            <div class="loading" aria-busy="true"><div class="skel tall"></div><div class="skel"></div><div class="skel big"></div></div>
        {:then token}
            {#if !hasAnyRole(token, BILLING_ROLES)}
                <h1 class="ds-heading" data-size="lg">Faktura</h1>
                <DsAlert color="warning" heading="Du har ikke tilgang til fakturaer">
                    <p class="ds-paragraph" data-size="sm">Fakturaer er for administratorer og økonomi. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else if loadState === 'notFound'}
                <DsAlert color="warning" heading="Fant ikke fakturaen">
                    <p class="ds-paragraph" data-size="sm">Den kan være slettet. Gå tilbake til fakturaene og prøv igjen.</p>
                </DsAlert>
            {:else}
                <header class="head">
                    <div>
                        <div class="title">
                            <h1 class="ds-heading" data-size="lg">Faktura: {TYPE[invoice.type] ?? invoice.type}</h1>
                            <StatusTag status={invoice.status} kind="invoice" size="md" />
                        </div>
                        <div class="meta">
                            <span><span class="material-symbols-outlined" aria-hidden="true">person</span>{invoice.student?.navn}</span>
                            <span><span class="material-symbols-outlined" aria-hidden="true">calendar_today</span>Opprettet {formatShortDate(invoice.createdTimeStamp)}</span>
                        </div>
                    </div>
                    <div class="big-total">
                        <small>{preliminary ? 'Foreløpig totalt' : 'Totalt'}</small>
                        <strong>kr {total}</strong>
                        {#if preliminary}<span class="muted">Endelig pris settes kl. 01.00</span>{/if}
                    </div>
                </header>

                <div class="layout">
                    <div class="col">
                        <div class="status-box">
                            <span class="box-label">Status</span>
                            <DsSteps {steps} label="Fakturaens status" />
                        </div>

                        {#if pending}
                            <div class="pending" role="status">
                                <span class="clock"><span class="material-symbols-outlined" aria-hidden="true">schedule_send</span></span>
                                <div>
                                    <p class="ds-heading" data-size="2xs">Fakturaen er ikke sendt ennå</p>
                                    <p class="ds-paragraph" data-size="sm">Den sendes til Xledger i natt kl. 01.00. Til da kan den slettes, hvis noe er feil. Om noe skulle være feil etter dette så må du ta kontakt med en administrator og få fakturaen kreditert i Xledger.</p>
                                </div>
                                <div class="side">
                                    <strong>{countdown}</strong>
                                    <span class="muted">til sending</span>
                                    <DsButton variant="secondary" color="danger" size="sm" on:click={() => { deleteError = ''; deleteOpen = true }}>
                                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett faktura
                                    </DsButton>
                                </div>
                            </div>
                        {:else if invoice.status === 'Kreditert'}
                            <DsAlert color="info"><p class="ds-paragraph" data-size="sm">Fakturaen er kreditert i Xledger og skal ikke betales.</p></DsAlert>
                        {:else}
                            <DsAlert color="info"><p class="ds-paragraph" data-size="sm">Fakturaen er sendt til Xledger og kan ikke slettes her. Er noe feil, må du ta kontakt med en administrator og få fakturaen kreditert i Xledger.</p></DsAlert>
                        {/if}

                        <section class="doc" aria-labelledby="lines-title">
                            <div class="doc-head">
                                <h2 class="ds-heading" data-size="xs" id="lines-title">
                                    <span class="material-symbols-outlined" aria-hidden="true">{isRates ? 'event_repeat' : 'inventory_2'}</span>{TYPE[invoice.type] ?? invoice.type}
                                </h2>
                                <span class="muted">{items.length} {items.length === 1 ? 'linje' : 'linjer'}</span>
                            </div>
                            <div class="table-wrap">
                                <table class="ds-table" data-size="sm">
                                    <thead>
                                        <tr>
                                            <th>Beskrivelse</th>
                                            {#if isRates}<th>Løpenummer</th><th>Faktureringsdato</th>{/if}
                                            <th class="num">Beløp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each items as item, i}
                                            <tr>
                                                <td>
                                                    <span class="line-name">{isRates ? `Rate ${i + 1}` : item.name}</span>
                                                    <span class="line-sub">{isRates ? (item.faktureringsår ? `Opprinnelig faktureringsår ${item.faktureringsår}` : '') : (item.description ?? '')}</span>
                                                    {#if !isRates && extraFields(item).length}
                                                        <dl class="extras">
                                                            {#each extraFields(item) as key}<div><dt>{key}:</dt><dd>{item[key]}</dd></div>{/each}
                                                        </dl>
                                                    {/if}
                                                </td>
                                                {#if isRates}
                                                    <td class="mono">{known(item.løpenummer) || '–'}</td>
                                                    <td>{formatShortDate(item.faktureringsDato) || '–'}</td>
                                                {/if}
                                                <td class="num">kr {lineAmount(item)}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                    <tfoot>
                                        <tr><td colspan={isRates ? 3 : 1}>{preliminary ? 'Foreløpig totalt' : 'Totalt'}</td><td class="num">kr {total}</td></tr>
                                    </tfoot>
                                </table>
                            </div>
                        </section>
                    </div>

                    <aside class="side-col" aria-label="Detaljer">
                        <section class="info recipient">
                            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">{pending ? 'schedule_send' : 'send'}</span>{pending ? 'Sendes til' : 'Sendt til'}</h3>
                            <dl><dt>Navn</dt><dd><strong>{invoice.recipient?.navn ?? 'Ukjent'}</strong></dd><dt>Rolle</dt><dd>Ansvarlig på avtalen</dd></dl>
                        </section>
                        <section class="info">
                            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">school</span>Elev</h3>
                            <p class="ds-paragraph muted" data-size="xs">Slik det var da fakturaen ble opprettet.</p>
                            <dl>
                                <dt>Navn</dt><dd>{invoice.student?.navn}</dd>
                                <dt>E-post</dt><dd>{invoice.student?.upn ?? ''}</dd>
                                <dt>Skole</dt><dd>{known(invoice.student?.skole) || 'Ingen data'}</dd>
                                <dt>Klasse</dt><dd>{known(invoice.student?.klasse) || 'Ingen data'}</dd>
                                <dt>Trinn</dt><dd>{known(invoice.student?.trinn) || 'Ingen data'}</dd>
                            </dl>
                        </section>
                        <section class="info">
                            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">badge</span>Opprettet av</h3>
                            <dl>
                                <dt>Navn</dt><dd>{invoice.invoiceCreatedBy?.name ?? 'Ukjent'}</dd>
                                <dt>Stilling</dt><dd>{invoice.invoiceCreatedBy?.jobTitle ?? ''}</dd>
                                <dt>Arbeidssted</dt><dd>{invoice.invoiceCreatedBy?.officeLocation ?? ''}</dd>
                                <dt>E-post</dt><dd>{invoice.invoiceCreatedBy?.email ?? ''}</dd>
                            </dl>
                        </section>
                        <section class="info">
                            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">tag</span>Faktura-ID</h3>
                            <div class="id-row">
                                <code class="mono">{invoice._id}</code>
                                <button class="ds-button" data-variant="tertiary" data-size="sm" data-icon type="button" aria-label="Kopier faktura-ID" on:click={copyId}>
                                    <span class="material-symbols-outlined" aria-hidden="true">{copied ? 'check' : 'content_copy'}</span>
                                </button>
                            </div>
                            {#if known(invoice.løpenummer)}<p class="ds-paragraph muted" data-size="xs">Løpenummer {invoice.løpenummer}</p>{/if}
                        </section>
                    </aside>
                </div>

                <DsDialog bind:open={deleteOpen} width="32rem" labelledby="delete-title" closedby={deleting ? 'none' : 'any'}>
                    <h2 class="ds-heading" data-size="sm" id="delete-title">Slette fakturaen til {invoice.recipient?.navn}?</h2>
                    <p class="ds-paragraph" data-size="sm">{TYPE[invoice.type] ?? invoice.type} for {invoice.student?.navn}, totalt <strong>kr {total}</strong>. Fakturaen er ikke sendt til Xledger ennå. Slettingen kan ikke angres.</p>
                    {#if deleteError}
                        <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{deleteError}</p></DsAlert>
                    {/if}
                    <svelte:fragment slot="footer">
                        <DsButton color="danger" loading={deleting} loadingText="Sletter …" on:click={confirmDelete}>
                            <span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett fakturaen
                        </DsButton>
                        <DsButton variant="secondary" disabled={deleting} on:click={() => (deleteOpen = false)}>Avbryt</DsButton>
                    </svelte:fragment>
                </DsDialog>
            {/if}
        {/await}
    </main>

<style>
    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 76rem;
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

    .muted { color: var(--ds-color-neutral-text-subtle); }
    .mono { font-family: ui-monospace, Consolas, monospace; font-size: 0.85em; }

    .head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-end;
        gap: var(--ds-size-3) var(--ds-size-6);
        padding-bottom: var(--ds-size-4);
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .title {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-3);
    }

    .meta {
        margin-top: var(--ds-size-2);
        color: var(--ds-color-neutral-text-subtle);
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-1) var(--ds-size-5);
    }

    .meta > span {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
    }

    .big-total {
        text-align: right;
        font-variant-numeric: tabular-nums;
        display: flex;
        flex-direction: column;
    }

    .big-total small {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.8rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 700;
    }

    .big-total strong {
        font-size: 2rem;
        line-height: 1.1;
        font-family: 'Nunito', 'Nunito Sans', sans-serif;
    }

    .big-total .muted { font-size: 0.8rem; }

    .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 20rem;
        gap: var(--ds-size-6);
        align-items: start;
    }

    @media (max-width: 1000px) {
        .layout { grid-template-columns: 1fr; }
    }

    .col {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
        min-width: 0;
    }

    .status-box {
        padding: var(--ds-size-4) var(--ds-size-5);
        background: var(--ds-color-accent-background-tinted);
        border-radius: var(--ds-border-radius-lg);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .box-label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--ds-color-accent-text-subtle);
    }

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

    .side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--ds-size-2);
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .side strong {
        font-size: 1.35rem;
        line-height: 1.1;
    }

    .side .muted { font-size: 0.8rem; }

    @media (max-width: 640px) {
        .pending { grid-template-columns: auto 1fr; }
        .side { grid-column: 1 / -1; align-items: flex-start; text-align: left; }
    }

    .doc {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
        overflow: hidden;
    }

    .doc-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--ds-size-3);
        padding: var(--ds-size-4) var(--ds-size-5);
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .doc-head h2 {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .doc-head h2 .material-symbols-outlined { color: var(--ds-color-accent-text-subtle); }

    .table-wrap { overflow-x: auto; }

    .ds-table {
        --dsc-table-padding: 0.7rem 1.25rem;
        min-width: 100%;
        font-variant-numeric: tabular-nums;
    }

    .ds-table > thead > tr > :global(*) {
        background: var(--ds-color-accent-background-tinted);
        white-space: nowrap;
    }

    .ds-table td { vertical-align: top; }

    .line-name { font-weight: 700; }

    .line-sub {
        display: block;
        font-size: 0.85rem;
        color: var(--ds-color-neutral-text-subtle);
        margin-top: 2px;
    }

    .extras {
        margin: 0.35rem 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 0.9rem;
        font-size: 0.85rem;
    }

    .extras div {
        display: flex;
        gap: 0.3rem;
    }

    .extras dt { color: var(--ds-color-neutral-text-subtle); }
    .extras dd { margin: 0; }

    .num {
        text-align: right;
        white-space: nowrap;
    }

    tfoot td {
        font-weight: 700;
        font-size: 1.05rem;
        border-top: 2px solid var(--ds-color-neutral-border-default);
    }

    .side-col {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .info {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        padding: var(--ds-size-4);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .info h3 {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
    }

    .info h3 .material-symbols-outlined { color: var(--ds-color-accent-text-subtle); }

    .info.recipient {
        border-color: var(--ds-color-accent-border-default);
        background: var(--ds-color-accent-background-tinted);
    }

    .info dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.3rem var(--ds-size-3);
        font-size: 0.9rem;
        margin: 0;
    }

    .info dt {
        color: var(--ds-color-neutral-text-subtle);
        white-space: nowrap;
    }

    .info dd {
        margin: 0;
        overflow-wrap: anywhere;
    }

    .id-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-2);
    }

    .id-row code { overflow-wrap: anywhere; }

    .loading {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .skel {
        height: 4rem;
        border-radius: var(--ds-border-radius-lg);
        background: linear-gradient(90deg, var(--ds-color-neutral-surface-tinted), var(--ds-color-neutral-background-tinted), var(--ds-color-neutral-surface-tinted));
        background-size: 200% 100%;
        animation: shimmer 1.4s linear infinite;
    }

    .skel.tall { height: 5rem; }
    .skel.big { height: 12rem; }

    @keyframes shimmer {
        to { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        .skel { animation: none; }
    }
</style>
