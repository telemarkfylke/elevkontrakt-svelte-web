<script>
    /**
     * One contract as a collapsible card: type, source and status when closed; status summary,
     * details and fakturering when open. DigiTroll contracts get tabs, with Rådata for administrators.
     * Pass invoices to add a Fakturaer tab (undefined = no tab).
     * editRates shows "Registrer innbetaling" and fires `editRates`.
     */
    import { createEventDispatcher } from 'svelte'
    import DsAlert from './ds/DsAlert.svelte'
    import DsTag from './ds/DsTag.svelte'
    import DsTabs from './ds/DsTabs.svelte'
    import StatusTag from './StatusTag.svelte'
    import ContractStatusSummary from './ContractStatusSummary.svelte'
    import ContractInvoices from './contracts/ContractInvoices.svelte'
    import { formatFnr } from '$lib/helpers/formatFnr.js'
    import { formatShortDate } from '$lib/helpers/formatDate.js'
    import { contractYear } from '$lib/helpers/contractDate.js'
    import { returnLatestKnownContractInfo } from '$lib/helpers/latestKnownContractInfo'
    import { returnLatestKnownStudentInfo } from '$lib/helpers/latestKnownStudentInfo'
    import { isTrue, yesNoInfo } from '$lib/helpers/status.js'
    import { isElevkontraktAdmin } from '$lib/helpers/roles.js'
    import { formatKr, isInkasso, paidSoFar, rateSum } from '$lib/helpers/remisse.js'

    export let contract
    export let token
    export let open = false
    export let bare = false // only the contents, e.g. inside the side panel on Oversikt
    export let invoices = undefined // array, or null while loading
    export let invoicesState = 'ready' // loading | ready | error
    export let settings = null
    export let editRates = false

    const dispatch = createEventDispatcher()

    let tab = 'overview'
    let copied = false

    $: c = returnLatestKnownContractInfo(contract) ?? {}
    $: ending = pcEnding(contract)
    $: contractTabs = [
        { value: 'overview', label: 'Oversikt', icon: 'dashboard' },
        ...(invoices !== undefined ? [{ value: 'invoices', label: 'Fakturaer', icon: 'receipt', count: invoices?.length }] : []),
        ...(fromDigiTroll(contract) ? [{ value: 'digitroll', label: 'DigiTroll-data', icon: 'database' }] : []),
        ...(fromDigiTroll(contract) && isElevkontraktAdmin(token) ? [{ value: 'raw', label: 'Rådata', icon: 'data_object' }] : [])
    ]

    const fromDigiTroll = (contract) => isTrue(contract.isImportedFromDigiTroll)
    // School and class come from DigiTroll when the contract itself has none.
    const schoolFromDigiTroll = (contract) => (contract.elevInfo?.skole === 'Ukjent' || contract.elevInfo?.klasse === 'Ukjent') && Boolean(contract.digiTrollData)
    const known = (value) => value && value !== 'Ukjent' ? value : ''

    function pcEnding (contract) {
        const pc = contract.pcInfo ?? {}
        if (isTrue(pc.boughtOut)) return { icon: 'shopping_cart', text: `PC kjøpt ut ${formatShortDate(pc.buyOutDate)}` }
        if (isTrue(pc.returned)) return { icon: 'assignment_return', text: `PC innlevert ${formatShortDate(pc.returnedDate)}` }
        if (isTrue(pc.released)) return { icon: 'laptop_chromebook', text: 'PC ikke innlevert' }
        return { icon: 'laptop_chromebook', text: 'PC ikke utlevert' }
    }

    function paidText (contract) {
        if (String(c.kontraktType).toLowerCase() === 'låneavtale') return 'Faktureres ikke'
        const rates = Object.values(contract.fakturaInfo ?? {})
        return `${rates.filter(rate => String(rate.status).toLowerCase() === 'betalt').length} av ${rates.length} betalt`
    }

    async function copyRaw () {
        try { await navigator.clipboard.writeText(JSON.stringify(contract.digiTrollData, null, 2)) } catch { /* convenience */ }
        copied = true
        setTimeout(() => { copied = false }, 1500)
    }
</script>

{#if bare}
    {@render contents()}
{:else}
<details class="contract" bind:open>
    <summary>
        <span class="material-symbols-outlined type-icon" aria-hidden="true">{String(c.kontraktType).toLowerCase() === 'låneavtale' ? 'handshake' : 'contract'}</span>
        <span class="title">
            <span class="t">
                {c.kontraktType} {contractYear(c.createdTimeStamp)}
                {#if fromDigiTroll(contract)}<DsTag color="plomme">DigiTroll</DsTag>{:else}<DsTag color="accent">Elevavtaler</DsTag>{/if}
            </span>
            <span class="d">
                Opprettet {formatShortDate(c.createdTimeStamp)}
                {#if known(returnLatestKnownStudentInfo(contract).skole)} · {returnLatestKnownStudentInfo(contract).skole}{schoolFromDigiTroll(contract) ? ' (sist kjente)' : ''}{/if}
            </span>
        </span>
        <span class="status">
            <span><span class="material-symbols-outlined" aria-hidden="true">{ending.icon}</span>{ending.text}</span>
            <span><span class="material-symbols-outlined" aria-hidden="true">payments</span>{paidText(contract)}</span>
            <span class="material-symbols-outlined chev" aria-hidden="true">expand_more</span>
        </span>
    </summary>

    {#if open}
        {@render contents()}
    {/if}
</details>
{/if}

{#snippet contents()}
    <div class="body" class:bare>
        {#if contractTabs.length > 1}
            <DsTabs tabs={contractTabs} bind:value={tab} label="Visning for avtalen" size="sm" let:value>
                {#if value === 'invoices'}
                    <ContractInvoices {invoices} state={invoicesState} {settings} digiTroll={fromDigiTroll(contract)} />
                {:else if value === 'digitroll'}
                    {@render digiTrollData(contract)}
                {:else if value === 'raw'}
                    <div class="raw-head">
                        <p class="ds-paragraph" data-size="sm">Dataene slik de ble importert fra DigiTroll. Bare for administratorer.</p>
                        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" on:click={copyRaw}>
                            <span class="material-symbols-outlined" aria-hidden="true">{copied ? 'check' : 'content_copy'}</span>
                            {copied ? 'Kopiert' : 'Kopier JSON'}
                        </button>
                    </div>
                    <pre class="raw">{JSON.stringify(contract.digiTrollData, null, 2)}</pre>
                {:else}
                    {@render overview(contract, c)}
                {/if}
            </DsTabs>
        {:else}
            {@render overview(contract, c)}
        {/if}
    </div>
{/snippet}

{#snippet overview(contract, c)}
    {@const student = returnLatestKnownStudentInfo(contract)}
    {@const isLoan = String(c.kontraktType).toLowerCase() === 'låneavtale'}
    <ContractStatusSummary {contract} />
    <div class="grid">
        <section class="card">
            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">person</span>Elev</h3>
            <dl>
                <dt>Navn</dt><dd>{contract.elevInfo.navn}</dd>
                <dt>Fødselsnummer</dt><dd class="mono">{formatFnr(contract.elevInfo.fnr)}</dd>
                <dt>Skole</dt><dd>{known(student.skole) || 'Ingen data'}</dd>
                <dt>Klasse</dt><dd>{known(student.klasse) || 'Ingen data'}</dd>
            </dl>
            {#if schoolFromDigiTroll(contract)}
                <div class="note">
                    <DsAlert color="info">
                        <p class="ds-paragraph" data-size="xs">Skole og klasse mangler på avtalen, så vi viser det DigiTroll sist hadde registrert. Det kan være utdatert. Se fanen DigiTroll-data.</p>
                    </DsAlert>
                </div>
            {/if}
        </section>
        <section class="card">
            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">description</span>Avtale</h3>
            <dl>
                <dt>Type</dt><dd>{c.kontraktType}</dd>
                <dt>Opprettet</dt><dd>{formatShortDate(c.createdTimeStamp) || 'Ingen data'}</dd>
                <dt>Ansvarlig</dt><dd>{known(c.ansvarligNavn) || known(contract.ansvarligInfo?.navn) || 'Ingen data'}</dd>
                <dt>Arkiv dokumentnr.</dt><dd>{known(c.archiveDocumentNumber) || 'Ingen data'}</dd>
                <dt>Referanse-ID</dt><dd>{known(c.refId) || 'Ingen data'}</dd>
                <dt>Filnavn</dt><dd>{known(c.acosName) || 'Ingen data'}</dd>
                <dt>UUID</dt><dd class="mono">{contract.uuid ?? 'Ingen data'}</dd>
            </dl>
        </section>
        <section class="card">
            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">fact_check</span>Status</h3>
            <div class="flags">
                {#each [['Signert', contract.isSigned], ['Importert til Xledger', contract.isImportedToXledger], ['Er elev', contract.isStudent]] as [label, value]}
                    {@const yn = yesNoInfo(value)}
                    <div><span>{label}</span><DsTag color={yn.color}>{yn.label}</DsTag></div>
                {/each}
                <div><span>Kilde</span>{#if fromDigiTroll(contract)}<DsTag color="plomme">DigiTroll</DsTag>{:else}<DsTag color="accent">Elevavtaler</DsTag>{/if}</div>
            </div>
        </section>
        <section class="card wide">
            <div class="card-head">
                <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>Fakturering</h3>
                {#if editRates}
                    <button class="ds-button" data-variant="secondary" data-size="sm" type="button" on:click={() => dispatch('editRates', contract)}>
                        <span class="material-symbols-outlined" aria-hidden="true">payments</span>Registrer innbetaling
                    </button>
                {/if}
            </div>
            {#if isLoan}
                <p class="ds-paragraph" data-size="sm"><StatusTag status="Utlån faktureres ikke" /> Låneavtaler faktureres ikke.</p>
            {:else}
                <div class="rates">
                    {#each Object.entries(contract.fakturaInfo ?? {}) as [key, rate]}
                        <div class="rate">
                            <div class="rate-head"><span>Faktura {key.slice(-1)}</span><StatusTag status={rate.status} /></div>
                            <dl>
                                <dt>Fakturert</dt><dd>{formatShortDate(rate.faktureringsDato) || 'Ingen data'}</dd>
                                <dt>Betalt</dt><dd>{formatShortDate(rate.betaltDato) || 'Ingen data'}</dd>
                                <dt>Sum</dt><dd>{rate.sum ? `kr ${rate.sum}` : 'Ingen data'}</dd>
                                {#if rate.betaltBeløp}
                                    <dt>Innbetalt</dt><dd>{formatKr(paidSoFar(rate))}{rateSum(rate) !== null ? ` av ${formatKr(rateSum(rate))}` : ''}</dd>
                                    {#if rate.sistInnbetaltDato && isInkasso(rate)}
                                        <dt>Sist innbetalt</dt><dd>{formatShortDate(rate.sistInnbetaltDato)}</dd>
                                    {/if}
                                {/if}
                                {#if rate.editReasonCustom}
                                    <dt>Forklaring</dt><dd>{rate.editReasonCustom}</dd>
                                {/if}
                            </dl>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
{/snippet}

{#snippet digiTrollData(contract)}
    {@const dt = contract.digiTrollData ?? {}}
    <div class="grid">
        <section class="card">
            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">person</span>Elev i DigiTroll</h3>
            <dl>
                <dt>Navn</dt><dd>{dt.Navn ?? 'Ingen data'}</dd>
                <dt>Personnr./brukernavn</dt><dd class="mono">{formatFnr(dt['Personnr./ Brukernavn'])}</dd>
                <dt>Antall avtaler</dt><dd>{dt['Antall kontrakter'] ?? 'Ingen data'}</dd>
            </dl>
        </section>
        {#each Object.entries(dt.contracts ?? {}) as [id, entries]}
            {@const e = entries[0] ?? {}}
            <section class="card">
                <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">description</span>Avtale {id}</h3>
                <dl>
                    <dt>Avtalenavn</dt><dd>{e.Avtalenavn ?? 'Ingen data'}</dd>
                    <dt>Bruker-ID</dt><dd>{e['Bruker ID'] ?? 'Ingen data'}</dd>
                    <dt>Laget</dt><dd>{e['Laget dato'] ?? 'Ingen data'}</dd>
                    <dt>Signeringsfrist</dt><dd>{e.Signeringsfrist ?? 'Ingen data'}</dd>
                    <dt>Filnavn</dt><dd>{e.Filnavn ?? 'Ingen data'}</dd>
                    <dt>Feide-ID</dt><dd>{e.FeideID ?? 'Ingen data'}</dd>
                    <dt>Kort Feide-ID</dt><dd>{e.ShortFeideID ?? 'Ingen data'}</dd>
                    <dt>Telefon</dt><dd>{e.Telefon ?? 'Ingen data'}</dd>
                </dl>
            </section>
            <section class="card">
                <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">draw</span>Signering, avtale {id}</h3>
                <dl>
                    <dt>Signert</dt><dd>{e['Signert dato'] ?? 'Ingen data'}</dd>
                    <dt>Signert av</dt><dd>{e['Signert av'] ?? 'Ingen data'}</dd>
                    <dt>Adresse</dt><dd>{[e['Signert av adresse'], [e['Signert av postnr'], e['Signert av sted']].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Ingen data'}</dd>
                    <dt>Telefon</dt><dd>{e['Signert av telefon'] ?? 'Ingen data'}</dd>
                    <dt>Signert på papir</dt><dd>{e['Signert på papir'] ?? 'Ingen data'}</dd>
                </dl>
            </section>
            <section class="card wide">
                <h3 class="ds-heading" data-size="2xs">
                    <span class="material-symbols-outlined" aria-hidden="true">payments</span>Betalinger i DigiTroll, avtale {id}
                    <span class="count">{entries.length} {entries.length === 1 ? 'oppføring' : 'oppføringer'}</span>
                </h3>
                <div class="table-wrap">
                    <table class="ds-table" data-size="sm">
                        <thead><tr><th>Beskrivelse</th><th>Frist</th><th>Sum</th><th>Betalt</th><th>Kvittering</th><th>Betalings-ID</th></tr></thead>
                        <tbody>
                            {#each entries as entry}
                                <tr>
                                    <td>{entry.Betalingsbeskrivelse ?? ''}</td>
                                    <td>{entry.Betalingsfrist ?? ''}</td>
                                    <td>{entry.Sum !== undefined ? `kr ${entry.Sum}` : ''}</td>
                                    <td>{entry.Betalt ?? ''}</td>
                                    <td>{entry.BetaltMedKvittering ?? ''}{entry.ExtKvittering ? ` (${entry.ExtKvittering})` : ''}</td>
                                    <td class="mono">{entry['Betalings ID'] ?? ''}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </section>
        {/each}
    </div>
{/snippet}

<style>
    .mono {
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.88em;
    }

    .contract {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
        overflow: hidden;
    }

    .contract[open] {
        border-color: var(--ds-color-accent-border-default);
        box-shadow: 0 1px 2px rgb(0 40 48 / 0.06), 0 6px 20px rgb(0 40 48 / 0.06);
    }

    summary {
        list-style: none;
        cursor: pointer;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--ds-size-3) var(--ds-size-4);
        padding: var(--ds-size-4) var(--ds-size-5);
    }

    summary::-webkit-details-marker {
        display: none;
    }

    summary:hover {
        background: var(--ds-color-neutral-surface-hover);
    }

    summary:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
        outline-offset: -3px;
    }

    .type-icon {
        font-size: 1.6rem;
        color: var(--ds-color-accent-text-subtle);
    }

    .title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .t {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2);
        font-weight: 700;
        font-size: 1.05rem;
    }

    .d,
    .status {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.88rem;
    }

    .status {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--ds-size-2) var(--ds-size-4);
    }

    .status > span {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        white-space: nowrap;
    }

    .status .material-symbols-outlined {
        font-size: 1.05rem;
        color: var(--ds-color-accent-text-subtle);
    }

    .chev {
        font-size: 1.5rem !important;
        transition: transform 0.15s ease;
    }

    .contract[open] .chev {
        transform: rotate(180deg);
    }

    @media (prefers-reduced-motion: reduce) {
        .chev { transition: none; }
    }

    @media (max-width: 640px) {
        summary { grid-template-columns: 1fr auto; }
        .type-icon { display: none; }
        .status { grid-column: 1 / -1; justify-content: flex-start; }
    }

    .body.bare { padding: 0; }

    .body {
        padding: 0 var(--ds-size-5) var(--ds-size-5);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4);
    }

    .body :global([role='tabpanel']) {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4);
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
        gap: var(--ds-size-3);
        align-items: start;
    }

    .card {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        padding: var(--ds-size-3) var(--ds-size-4);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .card.wide {
        grid-column: 1 / -1;
    }

    .card-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .card h3 {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .card h3 .material-symbols-outlined {
        color: var(--ds-color-accent-text-subtle);
    }

    .count {
        margin-left: auto;
        font-weight: 400;
        font-size: 0.85rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.3rem var(--ds-size-3);
        font-size: 0.9rem;
        margin: 0;
    }

    dt {
        color: var(--ds-color-neutral-text-subtle);
        white-space: nowrap;
    }

    dd {
        margin: 0;
        overflow-wrap: anywhere;
        font-variant-numeric: tabular-nums;
    }

    .note {
        margin-top: var(--ds-size-2);
    }

    .flags {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        font-size: 0.9rem;
    }

    .flags > div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .rates {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--ds-size-3);
    }

    @media (max-width: 700px) {
        .rates { grid-template-columns: 1fr; }
    }

    .rate {
        border-radius: var(--ds-border-radius-md);
        background: var(--ds-color-neutral-background-tinted);
        padding: var(--ds-size-3);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .rate-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--ds-size-2);
        font-weight: 700;
    }

    .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
    }

    .ds-table {
        --dsc-table-padding: 0.55rem 0.75rem;
        min-width: 100%;
        font-variant-numeric: tabular-nums;
    }

    .raw-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .raw {
        margin: 0;
        max-height: 24rem;
        overflow: auto;
        padding: var(--ds-size-4);
        background: var(--ds-color-neutral-background-tinted);
        border-radius: var(--ds-border-radius-md);
        font: 0.82rem/1.5 ui-monospace, Consolas, monospace;
    }
</style>
