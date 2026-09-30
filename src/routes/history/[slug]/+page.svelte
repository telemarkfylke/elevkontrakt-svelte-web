<script>
    // Historikk for one elev: every contract in the link, newest first.
    import { page } from '$app/stores'
    import DsScope from '$lib/components/ds/DsScope.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import DsTabs from '$lib/components/ds/DsTabs.svelte'
    import StatusTag from '$lib/components/StatusTag.svelte'
    import ContractStatusSummary from '$lib/components/ContractStatusSummary.svelte'
    import { formatFnr } from '$lib/helpers/formatFnr.js'
    import { formatShortDate } from '$lib/helpers/formatDate.js'
    import { contractTime, contractYear } from '$lib/helpers/contractDate.js'
    import { returnLatestKnownContractInfo } from '$lib/helpers/latestKnownContractInfo'
    import { returnLatestKnownStudentInfo } from '$lib/helpers/latestKnownStudentInfo'
    import { isTrue, yesNoInfo } from '$lib/helpers/status.js'
    import { hasAnyRole, isElevkontraktAdmin, HISTORY_ROLES } from '$lib/helpers/roles.js'
    import { getContractsWithId, getElevkontraktToken } from '$lib/useApi'

    const tokenPromise = getElevkontraktToken(true)

    // Newest first. The API returns { error } when nothing matches.
    async function loadContracts (slug) {
        const result = await getContractsWithId(slug, 'history')
        if (!Array.isArray(result)) throw new Error(result?.error || 'Ukjent feil')
        const sorted = [...result].sort((a, b) => contractTime(info(b).createdTimeStamp) - contractTime(info(a).createdTimeStamp))
        openIds = new Set(sorted.length ? [sorted[0]._id] : []) // the newest starts open
        return sorted
    }

    const info = (contract) => returnLatestKnownContractInfo(contract) ?? {}
    const fromDigiTroll = (contract) => isTrue(contract.isImportedFromDigiTroll)
    // School and class come from DigiTroll when the contract itself has none.
    const schoolFromDigiTroll = (contract) => (contract.elevInfo?.skole === 'Ukjent' || contract.elevInfo?.klasse === 'Ukjent') && Boolean(contract.digiTrollData)
    const known = (value) => value && value !== 'Ukjent' ? value : ''

    let openIds = new Set()
    let tabs = {}
    let copied = ''

    function toggle (id, event) {
        if (event.currentTarget.open) openIds.add(id)
        else openIds.delete(id)
        openIds = openIds
    }

    function tabsFor (contract, token) {
        if (!fromDigiTroll(contract)) return []
        return [
            { value: 'overview', label: 'Oversikt', icon: 'dashboard' },
            { value: 'digitroll', label: 'DigiTroll-data', icon: 'database' },
            ...(isElevkontraktAdmin(token) ? [{ value: 'raw', label: 'Rådata', icon: 'data_object' }] : [])
        ]
    }

    function pcEnding (contract) {
        const pc = contract.pcInfo ?? {}
        if (isTrue(pc.boughtOut)) return { icon: 'shopping_cart', text: `PC kjøpt ut ${formatShortDate(pc.buyOutDate)}` }
        if (isTrue(pc.returned)) return { icon: 'assignment_return', text: `PC innlevert ${formatShortDate(pc.returnedDate)}` }
        if (isTrue(pc.released)) return { icon: 'laptop_chromebook', text: 'PC ikke innlevert' }
        return { icon: 'laptop_chromebook', text: 'PC ikke utlevert' }
    }

    function paidText (contract) {
        if (String(info(contract).kontraktType).toLowerCase() === 'låneavtale') return 'Faktureres ikke'
        const rates = Object.values(contract.fakturaInfo ?? {})
        return `${rates.filter(rate => String(rate.status).toLowerCase() === 'betalt').length} av ${rates.length} betalt`
    }

    async function copyRaw (contract) {
        try { await navigator.clipboard.writeText(JSON.stringify(contract.digiTrollData, null, 2)) } catch { /* convenience */ }
        copied = contract._id
        setTimeout(() => { if (copied === contract._id) copied = '' }, 1500)
    }

    // Back to the search keeps the search (the search page restores it from its snapshot).
    function back (event) {
        if (history.length > 1 && document.referrer.includes('/history')) {
            event.preventDefault()
            history.back()
        }
    }
</script>

<DsScope>
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
                {#await loadContracts($page.params.slug)}
                    <div class="loading" aria-busy="true">
                        <div class="skel tall"></div><div class="skel"></div><div class="skel"></div>
                    </div>
                {:then contracts}
                    {@const first = contracts[0]}
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
                            {@const c = info(contract)}
                            {@const ending = pcEnding(contract)}
                            {@const contractTabs = tabsFor(contract, token)}
                            <details class="contract" open={openIds.has(contract._id)} on:toggle={(event) => toggle(contract._id, event)}>
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

                                {#if openIds.has(contract._id)}
                                    <div class="body">
                                        {#if contractTabs.length}
                                            <DsTabs tabs={contractTabs} bind:value={tabs[contract._id]} label="Visning for avtalen" size="sm" let:value>
                                                {#if value === 'digitroll'}
                                                    {@render digiTrollData(contract)}
                                                {:else if value === 'raw'}
                                                    <div class="raw-head">
                                                        <p class="ds-paragraph" data-size="sm">Dataene slik de ble importert fra DigiTroll. Bare for administratorer.</p>
                                                        <button class="ds-button" data-variant="secondary" data-size="sm" type="button" on:click={() => copyRaw(contract)}>
                                                            <span class="material-symbols-outlined" aria-hidden="true">{copied === contract._id ? 'check' : 'content_copy'}</span>
                                                            {copied === contract._id ? 'Kopiert' : 'Kopier JSON'}
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
                                {/if}
                            </details>
                        {/each}
                    </div>
                {:catch}
                    <DsAlert color="warning" heading="Fant ikke avtalene">
                        <p class="ds-paragraph" data-size="sm">Avtalene i lenken finnes ikke i historikken. De kan være flyttet tilbake til oversikten. Søk etter eleven på nytt.</p>
                    </DsAlert>
                {/await}
            {/if}
        {/await}
    </main>
</DsScope>

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
            <h3 class="ds-heading" data-size="2xs"><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>Fakturering</h3>
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
