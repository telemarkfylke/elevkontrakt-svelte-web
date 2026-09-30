<script>
    /**
     * Oversikt: all elevavtaler the user may see. Search or filter, open a contract in the side panel,
     * and edit, move or delete it there. Administrators and IT-servicedesk also get delivery mode and export.
     */
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsCheckbox from '$lib/components/ds/DsCheckbox.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsDropdown from '$lib/components/ds/DsDropdown.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsPagination from '$lib/components/ds/DsPagination.svelte'
    import DsSelect from '$lib/components/ds/DsSelect.svelte'
    import DsTabs from '$lib/components/ds/DsTabs.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import StatusTag from '$lib/components/StatusTag.svelte'
    import ContractCard from '$lib/components/ContractCard.svelte'
    import Barcode from '$lib/components/contracts/Barcode.svelte'
    import EditContractDialog from '$lib/components/contracts/EditContractDialog.svelte'
    import MoveContractDialog from '$lib/components/contracts/MoveContractDialog.svelte'
    import { yesNoInfo } from '$lib/helpers/status.js'
    import { isElevkontraktAdmin, hasAnyRole, ELEVKONTRAKT_ADMIN } from '$lib/helpers/roles.js'
    import { searchContracts, filterContracts, schoolsIn, classesIn, contractType, isNewThisYear, missingInFint, sortContracts } from '$lib/helpers/contractFilters.js'
    import { getContracts, getElevkontraktToken, getExtendedUserInfo } from '$lib/useApi'

    const IT = 'elevkontrakt.itservicedesk-readwrite'
    const SCHOOL_WRITE = 'elevkontrakt.skoleadministrator-write'
    const SCHOOL_READ = 'elevkontrakt.skoleadministrator-read'
    const PER_PAGE = 30

    // Columns, in order. path is what the column shows and sorts on.
    const COLUMNS = [
        { key: 'navn', label: 'Navn', path: 'elevInfo.navn', sortable: true },
        { key: 'skole', label: 'Skole', path: 'elevInfo.skole', sortable: true },
        { key: 'klasse', label: 'Klasse', path: 'elevInfo.klasse', sortable: true },
        { key: 'barcode', label: 'Strekkode', help: 'Klikk på strekkoden for å kopiere brukernavnet' },
        { key: 'signert', label: 'Signert', path: 'isSigned', yesNo: true },
        { key: 'signertav', label: 'Signert av', path: 'signedBy.navn', sortable: true },
        { key: 'utlevert', label: 'PC utlevert', path: 'pcInfo.released', sortable: true, yesNo: true },
        { key: 'innlevert', label: 'PC innlevert', path: 'pcInfo.returned', sortable: true, yesNo: true },
        { key: 'kjopt', label: 'PC kjøpt ut', path: 'pcInfo.boughtOut', sortable: true, yesNo: true },
        { key: 'rate1', label: 'Faktura 1', path: 'fakturaInfo.rate1.status', sortable: true, status: true },
        { key: 'rate2', label: 'Faktura 2', path: 'fakturaInfo.rate2.status', sortable: true, status: true },
        { key: 'rate3', label: 'Faktura 3', path: 'fakturaInfo.rate3.status', sortable: true, status: true },
        { key: 'ansvarlig', label: 'Ansvarlig', path: 'ansvarligInfo.navn', sortable: true },
        { key: 'type', label: 'Avtaletype', path: 'unSignedskjemaInfo.kontraktType', sortable: true }
    ]
    const DELIVERY_COLUMNS = ['barcode', 'navn', 'skole', 'signert', 'dokument']
    const DOCUMENT_COLUMN = { key: 'dokument', label: 'Dokumentnummer', path: 'signedSkjemaInfo.archiveDocumentNumber' }

    let token = null
    let contracts = []
    let loadState = 'loading' // loading | ready | error
    let collection = 'regular'
    let tab = 'regular'
    let delivery = false
    let query = ''
    let type = ''
    let school = ''
    let klasse = ''
    let sort = { path: null, dir: 'ascending' }
    let page = 1
    let flash = ''
    let selectedId = null
    let panelOpen = false
    let editOpen = false
    let moveOpen = false
    let moveMode = 'move'

    async function load () {
        loadState = contracts.length ? loadState : 'loading'
        try {
            let result
            if (hasAnyRole(token, [ELEVKONTRAKT_ADMIN, IT])) {
                result = await getContracts(false, collection)
            } else if (token.previewSchool) {
                result = await getContracts(token.previewSchool, collection)
            } else {
                const { data } = await getExtendedUserInfo(token.upn)
                result = await getContracts(data.companyName, collection)
            }
            contracts = result?.result ?? []
            loadState = 'ready'
        } catch {
            loadState = 'error'
        }
    }

    const ready = getElevkontraktToken(true).then(async t => {
        token = t
        await load()
        return t
    })

    // Who may do what. Same rules as before.
    $: isAdmin = isElevkontraktAdmin(token)
    $: canEdit = hasAnyRole(token, [ELEVKONTRAKT_ADMIN, IT, SCHOOL_WRITE])
    $: showTools = hasAnyRole(token, [ELEVKONTRAKT_ADMIN, IT])
    $: showBarcode = hasAnyRole(token, [ELEVKONTRAKT_ADMIN, IT, SCHOOL_READ])

    $: columns = delivery
        ? DELIVERY_COLUMNS.map(key => key === 'dokument' ? DOCUMENT_COLUMN : COLUMNS.find(c => c.key === key))
        : COLUMNS.filter(c => c.key !== 'barcode' || showBarcode)

    // Search and filters can't be combined, as before.
    $: filterActive = Boolean(type || school || klasse)
    $: searching = Boolean(query.trim())
    $: visible = sortContracts(
        searching ? searchContracts(contracts, query) : filterContracts(contracts, { type, school, klasse }),
        sort.path, sort.dir
    )
    $: totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE))
    $: if (page > totalPages) page = totalPages
    $: rows = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    $: query, type, school, klasse, collection, (page = 1)
    $: schools = schoolsIn(contracts)
    $: classes = school ? classesIn(contracts, school) : []
    $: counts = { leie: contracts.filter(c => contractType(c) === 'leieavtale').length, laan: contracts.filter(c => contractType(c) === 'låneavtale').length }
    $: if (token && tab !== collection) switchCollection(tab)
    $: selected = contracts.find(c => c._id === selectedId) ?? null

    const valueAt = (contract, path) => path.split('.').reduce((value, key) => value?.[key], contract)
    const show = (value) => value === undefined || value === null || value === '' || String(value).toLowerCase() === 'ukjent' ? '' : value
    const rowState = (contract, delivery) => delivery ? (isNewThisYear(contract) ? 'new' : 'old') : (missingInFint(contract) ? 'fint' : '')

    function sortBy (path) {
        sort = { path, dir: sort.path === path && sort.dir === 'ascending' ? 'descending' : 'ascending' }
    }

    function resetFilters () {
        type = ''
        school = ''
        klasse = ''
    }

    async function switchCollection (next) {
        collection = next
        panelOpen = false
        flash = ''
        contracts = []
        await load()
    }

    function openContract (contract) {
        selectedId = contract._id
        panelOpen = true
    }

    function openEdit (contract) {
        selectedId = contract._id
        editOpen = true
    }

    function openMove (contract, mode) {
        selectedId = contract._id
        moveMode = mode
        moveOpen = true
    }

    // After a save the list is fetched again in place; the panel stays open on an edited contract.
    async function saved (event, closePanel) {
        flash = event.detail
        if (closePanel) panelOpen = false
        await load()
    }

    // CSV export: the same columns as before.
    function exportCsv () {
        const headers = [
            ['Fornavn', 'elevInfo.fornavn'], ['Etternavn', 'elevInfo.etternavn'], ['Epost', 'elevInfo.upn'], ['Skole', 'elevInfo.skole'],
            ['Trinn', 'elevInfo.trinn'], ['Klasse', 'elevInfo.klasse'], ['Status signering', 'isSigned'], ['Signert av', 'signedBy.navn'],
            ['PC - Utlevert', 'pcInfo.released'], ['Utlevert av', 'pcInfo.releasedBy'], ['Utlevert dato', 'pcInfo.releasedDate'],
            ['PC - Innlevert', 'pcInfo.returned'], ['Motatt av', 'pcInfo.returnedBy'], ['Innlevert dato', 'pcInfo.returnedDate'],
            ['Faktura 1', 'fakturaInfo.rate1.status'], ['Faktura 2', 'fakturaInfo.rate2.status'], ['Faktura 3', 'fakturaInfo.rate3.status'],
            ['Ansvarlig', 'ansvarligInfo.navn'], ['Avtale type', 'unSignedskjemaInfo.kontraktType']
        ]
        const cell = (value) => `"${String(typeof value === 'boolean' ? (value ? 'Ja' : 'Nei') : (value ?? '')).replace(/"/g, '""')}"`
        const lines = [headers.map(([label]) => cell(label)).join(','), ...contracts.map(c => headers.map(([, path]) => cell(valueAt(c, path))).join(','))]
        const link = document.createElement('a')
        link.href = encodeURI('data:text/csv;charset=utf-8,' + lines.join('\n'))
        link.download = `elevavtaler-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
    }
</script>

    <main>
        {#await ready}
            <h1 class="ds-heading" data-size="lg">Oversikt</h1>
            <div class="table-wrap" aria-busy="true"><div class="skeleton">{#each Array(8) as _}<div class="skel"></div>{/each}</div></div>
        {:then}
            <div class="page-head">
                <div>
                    <h1 class="ds-heading" data-size="lg">Oversikt</h1>
                    <p class="ds-paragraph lead" data-size="sm">
                        {collection === 'pcIkkeInnlevert' ? 'Elever som har sluttet, der PC-en ikke er innlevert eller ratene ikke er betalt.' : `Alle elevavtaler${hasAnyRole(token, [ELEVKONTRAKT_ADMIN, IT]) ? ' i fylket' : ' for skolen din'}.`}
                    </p>
                </div>
                {#if showTools && loadState === 'ready'}
                    <div class="page-actions">
                        <DsCheckbox type="switch" label="Utleveringsmodus" bind:checked={delivery} />
                        <DsButton variant="secondary" size="sm" on:click={exportCsv}><span class="material-symbols-outlined" aria-hidden="true">download</span>Eksporter CSV</DsButton>
                    </div>
                {/if}
            </div>

            {#if flash}
                <DsAlert color="success" dismissible on:dismiss={() => (flash = '')}><p class="ds-paragraph" data-size="sm">{flash}</p></DsAlert>
            {/if}

            {#if loadState === 'error'}
                <DsAlert color="danger" heading="Vi fikk ikke hentet avtalene">
                    <p class="ds-paragraph" data-size="sm">Last inn siden på nytt. Kontakt servicedesk hvis feilen fortsetter.</p>
                    <p class="ds-paragraph" data-size="sm"><DsButton variant="secondary" size="sm" on:click={load}><span class="material-symbols-outlined" aria-hidden="true">refresh</span>Prøv igjen</DsButton></p>
                </DsAlert>
            {:else}
                <div class="controls">
                    <div class="filter-bar" role="search">
                        <div class="fb-search">
                            <DsInput label="Søk" type="search" icon="search" placeholder="Navn, elevnummer, e-post, skole eller klasse" autocomplete="off" disabled={filterActive} bind:value={query} />
                            <button class="ds-button help" data-variant="tertiary" data-size="sm" data-icon type="button" popovertarget="search-help" aria-label="Hva kan du søke på?">
                                <span class="material-symbols-outlined" aria-hidden="true">help</span>
                            </button>
                            <div class="ds-popover search-help" popover id="search-help" data-placement="bottom-start">
                                <p class="ds-heading" data-size="2xs">Hva kan du søke på?</p>
                                <ul class="ds-list" data-size="sm">
                                    <li>Navnet til eleven eller den ansvarlige, elevnummer og e-post</li>
                                    <li>Hvem som har signert, skole, klasse og trinn</li>
                                    <li>Flere søkeord skilles med semikolon: <code>Bamble;2ABC</code></li>
                                    <li><code>signert:ja</code> eller <code>signert:nei</code>, også sammen med andre ord: <code>Bamble;signert:ja</code></li>
                                </ul>
                            </div>
                        </div>
                        <DsSelect label="Skole" disabled={searching} bind:value={school} on:change={() => (klasse = '')}>
                            <option value="">Alle skoler</option>
                            {#each schools as name}<option value={name}>{name}</option>{/each}
                        </DsSelect>
                        <DsSelect label="Klasse" disabled={searching || !school} bind:value={klasse}>
                            <option value="">{school ? 'Alle klasser' : 'Velg skole først'}</option>
                            {#each classes as name}<option value={name}>{name}</option>{/each}
                        </DsSelect>
                        <DsSelect label="Avtaletype" disabled={searching} bind:value={type}>
                            <option value="">Alle</option>
                            <option value="Leieavtale">Leieavtale</option>
                            <option value="Låneavtale">Låneavtale</option>
                        </DsSelect>
                    </div>
                    {#if searching}
                        <p class="ds-paragraph bar-status" data-size="sm" role="status">
                            <span class="material-symbols-outlined" aria-hidden="true">filter_alt</span>
                            <strong>{visible.length} treff</strong> på «{query.trim()}». Filtrene er av mens du søker.
                            <button class="ds-link link-btn" type="button" on:click={() => (query = '')}>Tøm søket</button>
                        </p>
                    {:else if filterActive}
                        <p class="ds-paragraph bar-status" data-size="sm" role="status">
                            <span class="material-symbols-outlined" aria-hidden="true">filter_alt</span>
                            Viser <strong>{visible.length} av {contracts.length}</strong> avtaler. Søket er av mens et filter er i bruk.
                            <button class="ds-link link-btn" type="button" on:click={resetFilters}>Nullstill filtre</button>
                        </p>
                    {/if}
                </div>

                {#snippet list()}

                    {#if delivery}
                        <p class="legend ds-paragraph" data-size="sm">
                            <span><i class="swatch new"></i>Ny elev i år</span><span><i class="swatch old"></i>Elev fra tidligere år</span>
                            <span class="muted">Skann eller klikk strekkoden for å kopiere brukernavnet.</span>
                        </p>
                    {:else if contracts.some(missingInFint)}
                        <p class="legend ds-paragraph" data-size="sm"><span><i class="swatch fint"></i>Ikke funnet i FINT på over 5 dager</span></p>
                    {/if}

                    {#if loadState === 'loading'}
                        <div class="table-wrap" aria-busy="true"><div class="skeleton">{#each Array(8) as _}<div class="skel"></div>{/each}</div></div>
                    {:else if !rows.length}
                        <div class="table-wrap">
                            <div class="empty">
                                <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
                                <p class="ds-heading" data-size="2xs">Ingen avtaler passer</p>
                                <p class="ds-paragraph" data-size="sm">{searching ? `Ingen treff på «${query.trim()}». Sjekk stavemåten eller søk på noe annet.` : 'Ingen avtaler passer filtrene. Prøv å nullstille dem.'}</p>
                            </div>
                        </div>
                    {:else}
                        <div class="table-wrap" class:delivery>
                            <table class="ds-table" data-size="sm" data-border>
                                <thead>
                                    <tr>
                                        {#each columns as column, i (column.key)}
                                            {#if column.sortable && !delivery}
                                                <th class:sticky={i === 0} aria-sort={sort.path === column.path ? sort.dir : 'none'}><button type="button" on:click={() => sortBy(column.path)}>{column.label}</button></th>
                                            {:else}
                                                <th class:sticky={i === 0}>
                                                    {column.label}
                                                    {#if column.help}<button class="th-help" type="button" data-tooltip={column.help}><span class="material-symbols-outlined" aria-hidden="true">help</span></button>{/if}
                                                </th>
                                            {/if}
                                        {/each}
                                        {#if canEdit && !delivery}<th>Handlinger</th>{/if}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each rows as contract (contract._id)}
                                        {@const state = rowState(contract, delivery)}
                                        <tr data-row={state || undefined} class:clickable={!delivery} on:click={(event) => { if (!delivery && !event.target.closest('button, a, [popover]')) openContract(contract) }}>
                                            {#each columns as column, i (column.key)}
                                                <td class:sticky={i === 0}>
                                                    {#if column.key === 'navn'}
                                                        <span class="who">
                                                            {#if delivery}
                                                                <strong>{contract.elevInfo?.navn}</strong>
                                                            {:else}
                                                                <button class="ds-link link-btn name" type="button" on:click={() => openContract(contract)}>{contract.elevInfo?.navn}</button>
                                                            {/if}
                                                            <small>{show(contract.elevInfo?.elevnr)}</small>
                                                        </span>
                                                        {#if !delivery && missingInFint(contract)}<DsTag color="warning">FINT</DsTag>{/if}
                                                    {:else if column.key === 'barcode'}
                                                        <Barcode upn={contract.elevInfo?.upn} large={delivery} />
                                                    {:else if column.yesNo}
                                                        {@const yn = yesNoInfo(valueAt(contract, column.path))}
                                                        <DsTag color={yn.color}>{yn.label}</DsTag>
                                                    {:else if column.status}
                                                        <StatusTag status={valueAt(contract, column.path)} />
                                                    {:else}
                                                        {show(valueAt(contract, column.path)) || '–'}
                                                    {/if}
                                                </td>
                                            {/each}
                                            {#if canEdit && !delivery}
                                                <td class="actions">
                                                    <DsButton variant="secondary" size="sm" on:click={() => openEdit(contract)}><span class="material-symbols-outlined" aria-hidden="true">edit</span>Rediger</DsButton>
                                                    {#if isAdmin}
                                                        <DsDropdown label="Flere handlinger for {contract.elevInfo?.navn}">
                                                            <li><button class="ds-button" data-variant="tertiary" type="button" on:click={() => openMove(contract, 'move')}><span class="material-symbols-outlined" aria-hidden="true">drive_file_move</span>Flytt avtale</button></li>
                                                            {#if collection === 'regular'}
                                                                <li><button class="ds-button" data-variant="tertiary" data-color="danger" type="button" on:click={() => openMove(contract, 'delete')}><span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett avtale</button></li>
                                                            {/if}
                                                        </DsDropdown>
                                                    {/if}
                                                </td>
                                            {/if}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                        <div class="table-foot">
                            <p class="ds-paragraph" data-size="sm">
                                Viser {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, visible.length)} av {visible.length} avtaler
                                {#if !searching && !filterActive}<span class="muted">· {counts.leie} leieavtaler · {counts.laan} låneavtaler</span>{/if}
                            </p>
                            <DsPagination bind:current={page} total={totalPages} />
                        </div>
                    {/if}
                {/snippet}

                {#if isAdmin}
                    <DsTabs tabs={[{ value: 'regular', label: 'Elever' }, { value: 'pcIkkeInnlevert', label: 'Har sluttet' }]} bind:value={tab} label="Hvilke elever" size="sm">
                        <div class="table-block">{@render list()}</div>
                    </DsTabs>
                {:else}
                    <div class="table-block">{@render list()}</div>
                {/if}

                <DsDialog bind:open={panelOpen} placement="right" width="clamp(min(100vw, 36rem), 66vw, 64rem)" labelledby="panel-title" closeLabel="Lukk panelet">
                    {#if selected}
                        <div class="panel-head">
                            <div>
                                <h2 class="ds-heading" data-size="md" id="panel-title">{selected.elevInfo?.navn}</h2>
                                <p class="ds-paragraph muted" data-size="sm">{selected.elevInfo?.skole} · {selected.elevInfo?.klasse} · {selected.unSignedskjemaInfo?.kontraktType}{selected.elevInfo?.elevnr ? ` · elevnr. ${selected.elevInfo.elevnr}` : ''}</p>
                            </div>
                            {#if canEdit}
                                <div class="panel-actions">
                                    <DsButton size="sm" on:click={() => openEdit(selected)}><span class="material-symbols-outlined" aria-hidden="true">edit</span>Rediger</DsButton>
                                    {#if isAdmin}
                                        <DsButton variant="secondary" size="sm" on:click={() => openMove(selected, 'move')}><span class="material-symbols-outlined" aria-hidden="true">drive_file_move</span>Flytt</DsButton>
                                        {#if collection === 'regular'}
                                            <DsButton variant="tertiary" color="danger" size="sm" on:click={() => openMove(selected, 'delete')}><span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett</DsButton>
                                        {/if}
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        {#key selected}
                            <ContractCard contract={selected} {token} bare />
                        {/key}
                    {/if}
                </DsDialog>

                <!-- Opened on top of the panel, which stays where it was. -->
                <EditContractDialog contract={selected} {token} {collection} bind:open={editOpen} on:saved={(event) => saved(event, false)} />
                <MoveContractDialog contract={selected} {collection} mode={moveMode} bind:open={moveOpen} on:saved={(event) => saved(event, true)} />
            {/if}
        {/await}
    </main>

<style>
    main {
        padding: var(--ds-size-4, 1rem) var(--ds-size-4, 1rem) 4rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
        max-width: 100%;
    }

    .lead,
    .muted {
        color: var(--ds-color-neutral-text-subtle);
    }

    .page-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-end;
        gap: var(--ds-size-3) var(--ds-size-6);
    }

    .page-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-3) var(--ds-size-5);
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .filter-bar {
        display: grid;
        grid-template-columns: minmax(16rem, 2fr) repeat(3, minmax(10rem, 1fr));
        gap: var(--ds-size-3);
        align-items: end;
    }

    @media (max-width: 1100px) {
        .filter-bar { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .fb-search { grid-column: 1 / -1; }
    }

    @media (max-width: 560px) {
        .filter-bar { grid-template-columns: 1fr; }
    }

    .fb-search {
        position: relative;
    }

    .help {
        position: absolute;
        top: 0;
        left: 2.6rem;
        min-height: 1.6rem !important;
        min-width: 1.6rem !important;
        padding: 0 !important;
    }

    .search-help {
        max-width: 26rem;
    }

    code {
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.88em;
        background: var(--ds-color-neutral-surface-tinted);
        padding: 0 0.3em;
        border-radius: 3px;
    }

    .bar-status {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .bar-status strong { color: var(--ds-color-neutral-text-default); }

    .link-btn {
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
        cursor: pointer;
        text-align: left;
    }

    .table-block {
        padding-top: var(--ds-size-3);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2) var(--ds-size-4);
    }

    .swatch {
        display: inline-block;
        width: 0.9rem;
        height: 0.9rem;
        border-radius: 3px;
        vertical-align: -2px;
        margin-inline-end: 0.35rem;
        border: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .swatch.new { background: var(--ds-color-success-surface-tinted); }
    .swatch.old { background: var(--ds-color-danger-surface-tinted); }
    .swatch.fint { background: var(--ds-color-warning-surface-tinted); }

    .table-wrap {
        overflow: auto;
        max-height: 70vh;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
    }

    .ds-table {
        --dsc-table-padding: 0.6rem 0.8rem;
        min-width: 100%;
        font-variant-numeric: tabular-nums;
    }

    .ds-table th {
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--ds-color-accent-background-tinted);
    }

    .ds-table td {
        vertical-align: middle;
        background: var(--ds-color-neutral-background-default);
    }

    .ds-table .sticky {
        position: sticky;
        left: 0;
        z-index: 1;
        box-shadow: inset -1px 0 0 var(--ds-color-neutral-border-subtle);
    }

    .ds-table th.sticky { z-index: 3; }

    tr[data-row='new'] > td { background: var(--ds-color-success-surface-tinted); }
    tr[data-row='old'] > td { background: var(--ds-color-danger-surface-tinted); }
    tr[data-row='fint'] > td { background: var(--ds-color-warning-surface-tinted); }

    tr.clickable { cursor: pointer; }
    tr.clickable:hover > td { background: var(--ds-color-neutral-surface-hover); }

    .who {
        display: inline-flex;
        flex-direction: column;
        line-height: 1.25;
        min-width: 11rem;
        vertical-align: middle;
    }

    .who small {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.8rem;
    }

    .name { font-weight: 700; }

    .th-help {
        all: unset;
        cursor: help;
        vertical-align: -3px;
        border-radius: var(--ds-border-radius-full);
        color: var(--ds-color-accent-text-subtle);
    }

    .th-help:focus-visible { outline: 3px solid var(--ds-color-focus-outer); }

    .th-help .material-symbols-outlined { font-size: 1rem; }

    .actions { white-space: nowrap; }

    .table-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-3);
        font-variant-numeric: tabular-nums;
    }

    .empty {
        display: grid;
        place-items: center;
        gap: var(--ds-size-2);
        padding: 3rem var(--ds-size-4);
        text-align: center;
    }

    .empty .material-symbols-outlined {
        font-size: 2rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .panel-head {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
        padding-bottom: var(--ds-size-4);
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .panel-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2);
    }

    .skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: var(--ds-size-4);
    }

    .skel {
        height: 2.2rem;
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
