<script>
    // Historikk: search for an elev by name. One row per elev, with all their contracts.
    import DsScope from '$lib/components/ds/DsScope.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import DsPagination from '$lib/components/ds/DsPagination.svelte'
    import { formatFnr } from '$lib/helpers/formatFnr'
    import { formatShortDate } from '$lib/helpers/formatDate'
    import { hasAnyRole, HISTORY_ROLES } from '$lib/helpers/roles.js'
    import { getElevkontraktToken, getSearchScope, searchContracts } from '$lib/useApi'

    let query = ''
    let searched = ''
    let searching = false
    let results = null // null = not searched yet
    let error = ''
    let copiedId = ''
    let page = 1

    // Same page size as Oversikt.
    const PER_PAGE = 30
    $: totalPages = Math.max(1, Math.ceil((results?.length ?? 0) / PER_PAGE))
    $: pageResults = results?.slice((page - 1) * PER_PAGE, page * PER_PAGE) ?? []

    const tokenPromise = getElevkontraktToken(true)
    const scopePromise = tokenPromise.then(token => hasAnyRole(token, HISTORY_ROLES) ? getSearchScope(token) : { school: null })

    async function search (token) {
        const name = query.trim()
        if (!name || searching) return
        searching = true
        error = ''
        searched = name
        const response = await searchContracts(name, 'history', token)
        searching = false
        page = 1
        if (Array.isArray(response)) {
            results = response
        } else if (response?.error?.startsWith('Fant ingen')) {
            results = []
        } else {
            results = null
            error = 'Vi fikk ikke kontakt med avtaleregisteret. Prøv igjen om litt. Kontakt servicedesk hvis feilen fortsetter.'
        }
    }

    async function copy (id) {
        try { await navigator.clipboard.writeText(id) } catch { /* copying is a convenience */ }
        copiedId = id
        setTimeout(() => { if (copiedId === id) copiedId = '' }, 1500)
    }

    // Back from an elev re-runs the search. Only the text and page are kept: snapshots go to
    // sessionStorage, and the results contain fødselsnummer.
    export const snapshot = {
        capture: () => ({ searched, page }),
        restore: async (saved) => {
            if (!saved?.searched) return
            query = saved.searched
            await search(await tokenPromise)
            page = saved.page
        }
    }

    const historyHref = (student) => `/history/${student.id.join(',')}`
    const fromDigiTroll = (student) => student.contracts?.some(c => c.isImportedFromDigiTroll)
    const latest = (student) => student.contracts?.[0]
</script>

<DsScope>
    <main>
        {#await tokenPromise}
            <div class="center"><DsSpinner size="sm" title="Laster" /></div>
        {:then token}
            <h1 class="ds-heading" data-size="lg">Historikk</h1>

            {#if !hasAnyRole(token, HISTORY_ROLES)}
                <DsAlert color="warning" heading="Du har ikke tilgang til historikken">
                    <p class="ds-paragraph" data-size="sm">Historikken er for administratorer og skoleadministratorer. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else}
                <p class="ds-paragraph lead" data-size="sm">Søk etter en elev for å se avtaler fra tidligere skoleår.</p>

                <form class="search" role="search" on:submit|preventDefault={() => search(token)}>
                    <DsInput label="Elevens navn" type="search" icon="search" placeholder="Fornavn, etternavn eller begge" autocomplete="off" readonly={searching} bind:value={query} />
                    <DsButton type="submit" disabled={!query.trim()} loading={searching} loadingText="Søker …">Søk</DsButton>
                </form>

                {#await scopePromise then scope}
                    {#if scope.school}
                        <p class="ds-paragraph scope" data-size="sm">
                            <span class="material-symbols-outlined" aria-hidden="true">school</span>
                            Du søker i avtaler ved {scope.school}.
                        </p>
                    {/if}
                {/await}

                {#if error}
                    <DsAlert color="danger" heading="Søket feilet">
                        <p class="ds-paragraph" data-size="sm">{error}</p>
                    </DsAlert>
                {:else if searching}
                    <div class="table-wrap" aria-busy="true">
                        <div class="skeleton">{#each [1, 2, 3] as _}<div class="skel"></div>{/each}</div>
                    </div>
                {:else if results === null}
                    <div class="state">
                        <span class="material-symbols-outlined" aria-hidden="true">person_search</span>
                        <p class="ds-heading" data-size="2xs">Søk etter en elev</p>
                        <p class="ds-paragraph" data-size="sm">Skriv hele eller deler av navnet og trykk Søk. Du får én rad per elev, med alle avtalene eleven har hatt.</p>
                    </div>
                {:else if results.length === 0}
                    <div class="state">
                        <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
                        <p class="ds-heading" data-size="2xs">Ingen elever funnet</p>
                        {#await scopePromise then scope}
                            <p class="ds-paragraph" data-size="sm">Fant ingen avtaler for «{searched}»{scope.school ? ` ved ${scope.school}` : ''}. Sjekk stavemåten, eller prøv bare fornavn eller etternavn.</p>
                        {/await}
                    </div>
                {:else}
                    <h2 class="ds-heading" data-size="xs" id="results-title">{results.length === 1 ? '1 elev' : `${results.length} elever`} funnet for «{searched}»</h2>
                    <div class="table-wrap">
                        <table class="ds-table" data-size="sm" data-border aria-labelledby="results-title">
                            <thead>
                                <tr><th>Elev</th><th>Fødselsnummer</th><th>Siste avtale</th><th>Avtaler</th><th><span class="ds-sr-only">Handling</span></th></tr>
                            </thead>
                            <tbody>
                                {#each pageResults as student, i (student.fnr)}
                                    <tr>
                                        <td>
                                            <span class="who">
                                                <span class="name-line">
                                                    <a class="ds-link" href={historyHref(student)}><strong>{student.name}</strong></a>
                                                    {#if fromDigiTroll(student)}<DsTag color="plomme">DigiTroll</DsTag>{/if}
                                                </span>
                                                <small>{student.upn}</small>
                                            </span>
                                        </td>
                                        <td><span class="fnr">{formatFnr(student.fnr)}</span></td>
                                        <td>
                                            <span class="latest">
                                                {latest(student)?.type ?? student.contractType}
                                                <small>Opprettet {formatShortDate(latest(student)?.createdTimeStamp) || student.createdTimeStamp}</small>
                                            </span>
                                        </td>
                                        <td>
                                            <button class="ds-button" data-variant="tertiary" data-size="sm" type="button" popovertarget="contracts-{i}">
                                                {student.numberOfContracts} {student.numberOfContracts === 1 ? 'avtale' : 'avtaler'}
                                                <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
                                            </button>
                                            <div class="ds-popover contracts" popover id="contracts-{i}" data-placement="bottom-start">
                                                <p class="ds-heading" data-size="2xs">Avtaler for {student.name}</p>
                                                <ul>
                                                    {#each student.contracts ?? [] as contract (contract.id)}
                                                        <li>
                                                            <div class="row">
                                                                <span><strong>{contract.type}</strong> · {formatShortDate(contract.createdTimeStamp)}</span>
                                                                {#if contract.isImportedFromDigiTroll}
                                                                    <DsTag color="plomme">DigiTroll</DsTag>
                                                                {:else}
                                                                    <DsTag color="accent">Elevavtaler</DsTag>
                                                                {/if}
                                                            </div>
                                                            <div class="row id">
                                                                <code>{contract.id}</code>
                                                                <button class="ds-button" data-variant="tertiary" data-size="sm" data-icon type="button" aria-label="Kopier ID {contract.id}" on:click={() => copy(contract.id)}>
                                                                    <span class="material-symbols-outlined" aria-hidden="true">{copiedId === contract.id ? 'check' : 'content_copy'}</span>
                                                                </button>
                                                            </div>
                                                        </li>
                                                    {/each}
                                                </ul>
                                            </div>
                                        </td>
                                        <td class="go">
                                            <a class="ds-button" data-variant="secondary" data-size="sm" href={historyHref(student)}>
                                                Se historikk <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                                            </a>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <div class="table-foot">
                        <p class="ds-paragraph" data-size="sm">Viser {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, results.length)} av {results.length} elever</p>
                        <DsPagination bind:current={page} total={totalPages} />
                    </div>
                {/if}
            {/if}
        {/await}
    </main>
</DsScope>

<style>
    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 64rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .center {
        display: grid;
        place-items: center;
        padding: 2rem;
    }

    .lead,
    .scope,
    .who small,
    .latest small,
    .state .ds-paragraph {
        color: var(--ds-color-neutral-text-subtle);
    }

    .search {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: var(--ds-size-3);
    }

    .search > :global(.ds-field) {
        flex: 1 1 20rem;
        max-width: 32rem;
    }

    .scope {
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }

    .state {
        display: grid;
        justify-items: center;
        gap: var(--ds-size-2);
        text-align: center;
        padding: var(--ds-size-8, 2.5rem) var(--ds-size-4);
        border: 2px dashed var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
    }

    .state .material-symbols-outlined {
        font-size: 2.2rem;
        color: var(--ds-color-accent-text-subtle);
    }

    .state .ds-paragraph {
        max-width: 36rem;
    }

    .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
    }

    .ds-table {
        --dsc-table-padding: 0.7rem 0.9rem;
        min-width: 100%;
        font-variant-numeric: tabular-nums;
    }

    .ds-table > thead > tr > :global(*) {
        background: var(--ds-color-accent-background-tinted);
        white-space: nowrap;
    }

    .ds-table td {
        vertical-align: middle;
    }

    .who,
    .latest {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
    }

    .who small,
    .latest small {
        font-size: 0.8rem;
        overflow-wrap: anywhere;
    }

    .name-line {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .fnr {
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.9rem;
        white-space: nowrap;
    }

    .go {
        text-align: right;
        white-space: nowrap;
    }

    .table-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-3);
        font-variant-numeric: tabular-nums;
    }

    .contracts {
        min-width: 20rem;
        max-width: 26rem;
    }

    .contracts ul {
        list-style: none;
        margin: var(--ds-size-2) 0 0;
        padding: 0;
    }

    .contracts li {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--ds-size-2) 0;
        border-top: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .contracts li:first-child {
        border-top: 0;
    }

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-2);
    }

    .row.id {
        color: var(--ds-color-neutral-text-subtle);
    }

    .row code {
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.82rem;
        overflow-wrap: anywhere;
    }

    .skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: var(--ds-size-4);
    }

    .skel {
        height: 2.6rem;
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
