<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import Alert from '$lib/components/alert.svelte';
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import { formatDate } from '$lib/helpers/formatDate';
    import { returnType } from '$lib/helpers/returnInvoiceType';
    import { getInvoices, getElevkontraktToken, deleteInvoices } from '$lib/useApi';
    import { onMount } from 'svelte'

    // Design toggle — persisted in localStorage
    let useNewDesign = false

    // Alert states
    let showErrorAlert = false
    let errorTitle = ''
    let errorMessage = ''
    let showSuccessAlert = false
    let successTitle = ''
    let successMessage = ''

    // Old design: visibility toggles per group
    let showInvoiced = false
    let showNotInvoiced = false
    let showPaid = false
    let showOther = false

    // New design: filter / search / sort / pagination
    let activeFilter = 'all'
    let searchQuery = ''
    let sortKey = null
    let sortDir = 'asc'
    let currentPage = 1
    let rowsPerPage = 10

    const KNOWN_STATUSES = ['Fakturert', 'Ikke Fakturert', 'Betalt']

    // Countdown to 01:00 Europe/Oslo (handles CET/CEST automatically)
    let countdown = { hours: 0, minutes: 0, seconds: 0 }

    const getTimeUntil1AM = () => {
        const now = new Date()
        const parts = new Intl.DateTimeFormat('nb-NO', {
            timeZone: 'Europe/Oslo',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
        }).formatToParts(now)
        const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
        const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
        const s = parseInt(parts.find(p => p.type === 'second')?.value ?? '0')
        let diff = 3600 - (h * 3600 + m * 60 + s)
        if (diff <= 0) diff += 86400
        return { hours: Math.floor(diff / 3600), minutes: Math.floor((diff % 3600) / 60), seconds: diff % 60 }
    }

    onMount(() => {
        useNewDesign = localStorage.getItem('invoices-design') === 'new'
        countdown = getTimeUntil1AM()
        const tick = setInterval(() => { countdown = getTimeUntil1AM() }, 1000)

        const urlParams = new URLSearchParams($page.url.search);
        const successParam = urlParams.get('success');
        const errorParam = urlParams.get('error');

        if (successParam) {
            if (successParam === 'invoiceDeleted') {
                successTitle = 'Faktura slettet';
                successMessage = 'Fakturaen har blitt slettet.';
                showSuccessAlert = true;
            }
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('success')
            window.history.replaceState(null, '', newUrl)
        }

        if (errorParam) {
            if (errorParam === 'invoiceDeleteFailed') {
                errorTitle = 'Sletting av faktura feilet';
                errorMessage = 'Det oppsto en feil ved sletting av fakturaen. Prøv igjen senere.';
                showErrorAlert = true;
            }
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('error')
            window.history.replaceState(null, '', newUrl)
        }

        return () => clearInterval(tick)
    });

    const toggleDesign = () => {
        useNewDesign = !useNewDesign
        localStorage.setItem('invoices-design', useNewDesign ? 'new' : 'old')
    }

    const toggleFilter = (f) => {
        activeFilter = activeFilter === f ? 'all' : f
        currentPage = 1
    }

    const handleSort = (key) => {
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc'
        else { sortKey = key; sortDir = 'asc' }
        currentPage = 1
    }

    const getPageNumbers = (total, cur) => {
        if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
        const show = new Set([1, total, cur, cur - 1, cur + 1].filter(p => p >= 1 && p <= total))
        const srt = [...show].sort((a, b) => a - b)
        const result = []
        for (let i = 0; i < srt.length; i++) {
            if (i > 0 && srt[i] - srt[i - 1] > 1) result.push('...')
            result.push(srt[i])
        }
        return result
    }

    const statusConfig = {
        'Fakturert':      { cls: 'iv-badge--fakturert', label: 'Fakturert' },
        'Ikke Fakturert': { cls: 'iv-badge--ikke',      label: 'Ikke fakturert' },
        'Betalt':         { cls: 'iv-badge--betalt',    label: 'Betalt' },
    }
    const getBadgeConfig = (status) => statusConfig[status] ?? { cls: 'iv-badge--andre', label: status }

    const reloadPageWithSuccess = (successType) => {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('success', successType);
        window.location.href = currentUrl.toString();
    }

    const reloadPageWithError = (errorType) => {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('error', errorType);
        window.location.href = currentUrl.toString();
    }

    const handleErrorAlertClose = () => {
        showErrorAlert = false;
        errorTitle = '';
        errorMessage = '';
    }

    const handleSuccessAlertClose = () => {
        showSuccessAlert = false;
        successMessage = '';
        successTitle = '';
    }

    const deleteInvoice = async (id) => {
        try {
            const response = await deleteInvoices(id);
            if (response.status === 200) {
                reloadPageWithSuccess('invoiceDeleted');
            } else {
                reloadPageWithError('invoiceDeleteFailed');
            }
        } catch (err) {
            reloadPageWithError('invoiceDeleteFailed');
        }
    }
</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.billing-readwrite', 'elevkontrakt.billing-read'].includes(r))}
            {#if successMessage}
                <Alert type="success" title="Suksess" message={successMessage} dismissible={true} on:close={() => successMessage = ''} autoClose={true} autoCloseDelay={10000} position="fixed-top"/>
            {/if}
            {#if errorMessage}
                <Alert type="error" title="Feil" message={errorMessage} dismissible={true} on:close={() => errorMessage = ''} autoClose={true} autoCloseDelay={10000} position="fixed-top"/>
            {/if}

            {#await getInvoices(token.upn)}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:then data}
                {#if data.status === 200}

                    {#if useNewDesign}
                        <!-- ══ NEW DESIGN ══ -->
                        {@const counts = {
                            fakturert: data.data.filter(i => i.status === 'Fakturert').length,
                            ikke:      data.data.filter(i => i.status === 'Ikke Fakturert').length,
                            betalt:    data.data.filter(i => i.status === 'Betalt').length,
                            andre:     data.data.filter(i => !KNOWN_STATUSES.includes(i.status)).length,
                            total:     data.data.length
                        }}
                        {@const step1 = activeFilter === 'all'
                            ? data.data
                            : activeFilter === 'andre'
                                ? data.data.filter(i => !KNOWN_STATUSES.includes(i.status))
                                : data.data.filter(i => i.status === activeFilter)}
                        {@const q = searchQuery.trim().toLowerCase()}
                        {@const step2 = q ? step1.filter(i =>
                            i.student.navn.toLowerCase().includes(q) ||
                            i.recipient.navn.toLowerCase().includes(q)
                        ) : step1}
                        {@const processedInvoices = sortKey ? [...step2].sort((a, b) => {
                            const getVal = i => sortKey === 'status' ? i.status : sortKey === 'type' ? i.type : i.createdTimeStamp
                            const cmp = getVal(a) < getVal(b) ? -1 : getVal(a) > getVal(b) ? 1 : 0
                            return sortDir === 'asc' ? cmp : -cmp
                        }) : step2}
                        {@const totalPages = Math.max(1, Math.ceil(processedInvoices.length / rowsPerPage))}
                        {@const safePage = Math.min(currentPage, totalPages)}
                        {@const paginatedInvoices = processedInvoices.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)}

                        <div class="iv-page">
                            <header class="iv-page-header">
                                <h1 class="iv-page-title">
                                    <span class="material-symbols-outlined" aria-hidden="true">receipt</span>
                                    Fakturaoversikt
                                    <span class="iv-total-pill">{counts.total} fakturaer</span>
                                </h1>
                                <button class="iv-toggle-btn" on:click={toggleDesign} title="Bytt til gammel visning">
                                    <span class="material-symbols-outlined" aria-hidden="true" style="font-size:1rem">view_agenda</span>
                                    Gammel visning
                                </button>
                            </header>

                            <div class="iv-stat-strip" role="group" aria-label="Filtrer etter status">
                                <button class="iv-stat iv-stat--fakturert" class:is-active={activeFilter === 'Fakturert'} on:click={() => toggleFilter('Fakturert')} aria-pressed={activeFilter === 'Fakturert'}>
                                    <span class="iv-stat__count">{counts.fakturert}</span>
                                    <span class="iv-stat__label">Fakturert</span>
                                    <span class="iv-stat__sub">Sendt til kunde</span>
                                </button>
                                <button class="iv-stat iv-stat--ikke" class:is-active={activeFilter === 'Ikke Fakturert'} on:click={() => toggleFilter('Ikke Fakturert')} aria-pressed={activeFilter === 'Ikke Fakturert'}>
                                    <span class="iv-stat__count">{counts.ikke}</span>
                                    <span class="iv-stat__label">Ikke fakturert</span>
                                    <span class="iv-stat__sub iv-countdown" aria-live="off">
                                        {#if countdown.hours > 0}Faktureres om {countdown.hours}t {countdown.minutes}m{:else if countdown.minutes > 0}Faktureres om {countdown.minutes}m {countdown.seconds.toString().padStart(2, '0')}s{:else}Faktureres om {countdown.seconds}s{/if}
                                    </span>
                                </button>
                                <button class="iv-stat iv-stat--betalt" class:is-active={activeFilter === 'Betalt'} on:click={() => toggleFilter('Betalt')} aria-pressed={activeFilter === 'Betalt'}>
                                    <span class="iv-stat__count">{counts.betalt}</span>
                                    <span class="iv-stat__label">Betalt</span>
                                    <span class="iv-stat__sub">Avsluttet</span>
                                </button>
                                <button class="iv-stat iv-stat--andre" class:is-active={activeFilter === 'andre'} on:click={() => toggleFilter('andre')} aria-pressed={activeFilter === 'andre'}>
                                    <span class="iv-stat__count">{counts.andre}</span>
                                    <span class="iv-stat__label">Andre</span>
                                    <span class="iv-stat__sub">Øvrige</span>
                                </button>
                            </div>

                            <div class="iv-search-row">
                                <div class="iv-search">
                                    <span class="iv-search-icon material-symbols-outlined" aria-hidden="true">search</span>
                                    <input
                                        class="iv-search-input"
                                        type="text"
                                        placeholder="Søk på elev eller ansvarlig…"
                                        value={searchQuery}
                                        on:input={(e) => { searchQuery = e.target.value; currentPage = 1 }}
                                        aria-label="Søk i fakturaer"
                                    />
                                    {#if searchQuery}
                                        <button class="iv-search-clear" on:click={() => { searchQuery = ''; currentPage = 1 }} aria-label="Tøm søk">
                                            <span class="material-symbols-outlined" aria-hidden="true">close</span>
                                        </button>
                                    {/if}
                                </div>
                                <span class="iv-result-count" aria-live="polite">
                                    Viser {processedInvoices.length} av {counts.total}
                                </span>
                            </div>

                            <div class="iv-table-wrapper">
                                <div class="iv-table-scroll" role="region" aria-label="Fakturatabell">
                                    {#if processedInvoices.length === 0}
                                        <div class="iv-empty-state">
                                            <span class="material-symbols-outlined" aria-hidden="true">inbox</span>
                                            <p>Ingen fakturaer matcher søket ditt.</p>
                                            <button class="iv-reset-btn" on:click={() => { activeFilter = 'all'; searchQuery = ''; currentPage = 1 }}>
                                                Tilbakestill filter
                                            </button>
                                        </div>
                                    {:else}
                                        <table class="iv-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col" class="iv-col-student">Elev</th>
                                                    <th scope="col" class="iv-col-ansvarlig">Ansvarlig</th>
                                                    <th scope="col" class="iv-col-type iv-sortable" class:iv-sort-active={sortKey === 'type'} on:click={() => handleSort('type')} aria-sort={sortKey === 'type' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                                        <span class="iv-th-inner">Type <span class="iv-sort-icon" aria-hidden="true">{sortKey === 'type' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</span></span>
                                                    </th>
                                                    <th scope="col" class="iv-col-dato iv-sortable" class:iv-sort-active={sortKey === 'created'} on:click={() => handleSort('created')} aria-sort={sortKey === 'created' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                                        <span class="iv-th-inner">Opprettet <span class="iv-sort-icon" aria-hidden="true">{sortKey === 'created' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</span></span>
                                                    </th>
                                                    <th scope="col" class="iv-col-status iv-sortable" class:iv-sort-active={sortKey === 'status'} on:click={() => handleSort('status')} aria-sort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                                        <span class="iv-th-inner">Status <span class="iv-sort-icon" aria-hidden="true">{sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</span></span>
                                                    </th>
                                                    <th scope="col" class="iv-col-actions">Handlinger</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each paginatedInvoices as invoice (invoice._id)}
                                                    {@const badge = getBadgeConfig(invoice.status)}
                                                    <tr>
                                                        <td class="iv-col-student">
                                                            <div class="iv-student-name">{invoice.student.navn}</div>
                                                            <div class="iv-student-sub">{invoice.student.skole} · {invoice.student.klasse}</div>
                                                        </td>
                                                        <td class="iv-col-ansvarlig">{invoice.recipient.navn}</td>
                                                        <td class="iv-col-type">{returnType(invoice.type)}</td>
                                                        <td class="iv-col-dato">{formatDate(invoice.createdTimeStamp, true)}</td>
                                                        <td class="iv-col-status">
                                                            <span class="iv-badge {badge.cls}">
                                                                <span class="iv-badge-dot" aria-hidden="true"></span>
                                                                {badge.label}
                                                            </span>
                                                        </td>
                                                        <td class="iv-col-actions">
                                                            <div class="iv-action-group">
                                                                <button class="iv-action-btn" on:click={() => goto(`/invoices/${invoice._id}`)} aria-label="Se detaljer for {invoice.student.navn}" title="Se detaljer">
                                                                    <span class="material-symbols-outlined" aria-hidden="true">contract</span>
                                                                </button>
                                                                {#if invoice.status === 'Ikke Fakturert'}
                                                                    <button class="iv-action-btn iv-action-btn--delete" on:click={() => deleteInvoice(invoice._id)} aria-label="Slett faktura for {invoice.student.navn}" title="Slett">
                                                                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                                                                    </button>
                                                                {/if}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    {/if}
                                </div>

                                <div class="iv-pagination">
                                    <div class="iv-page-size">
                                        <label for="iv-rows-select">Rader per side</label>
                                        <select id="iv-rows-select" bind:value={rowsPerPage} on:change={() => currentPage = 1}>
                                            {#each [5, 10, 25, 50] as n}<option value={n}>{n}</option>{/each}
                                        </select>
                                    </div>
                                    <span class="iv-page-info">
                                        {processedInvoices.length === 0 ? '0–0' : `${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, processedInvoices.length)}`} av {processedInvoices.length}
                                    </span>
                                    <div class="iv-page-nav" role="navigation" aria-label="Sidenummerering">
                                        <button class="iv-page-btn" on:click={() => currentPage = Math.max(1, currentPage - 1)} disabled={currentPage <= 1} aria-label="Forrige side">
                                            <span class="material-symbols-outlined" aria-hidden="true" style="font-size:1.15rem">chevron_left</span>
                                        </button>
                                        {#each getPageNumbers(totalPages, safePage) as p}
                                            {#if p === '...'}
                                                <span class="iv-page-ellipsis" aria-hidden="true">…</span>
                                            {:else}
                                                <button class="iv-page-btn" class:is-active={p === safePage} on:click={() => currentPage = p} aria-label="Side {p}" aria-current={p === safePage ? 'page' : undefined}>{p}</button>
                                            {/if}
                                        {/each}
                                        <button class="iv-page-btn" on:click={() => currentPage = Math.min(totalPages, currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Neste side">
                                            <span class="material-symbols-outlined" aria-hidden="true" style="font-size:1.15rem">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    {:else}
                        <!-- ══ OLD DESIGN ══ -->
                        <div class="contract-card">
                            <h1>
                                <span class="material-symbols-outlined">receipt</span>
                                Fakturaoversikt
                                <button class="iv-toggle-btn" on:click={toggleDesign} title="Prøv ny visning">
                                    <span class="material-symbols-outlined" aria-hidden="true" style="font-size:1rem">table_chart</span>
                                    Prøv ny visning
                                </button>
                            </h1>
                            <div class="results">
                                <div class="contract-overview">
                                    <h2 class="invoiced">
                                        <div class="header-with-buttons">
                                            <div class="header-title">
                                                Fakturert ({data.data.filter(invoice => invoice.status === 'Fakturert').length})
                                            </div>
                                            <button class="toggle-button" on:click={() => showInvoiced = !showInvoiced}>
                                                <span class="material-symbols-outlined">
                                                    {showInvoiced ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </h2>
                                    {#each data.data as invoice}
                                        {#if invoice.status === 'Fakturert' && showInvoiced}
                                            <div class="info-section">
                                                <h3>
                                                    <div class="header-with-buttons">
                                                        <div class="header-title">
                                                            <span>Elev - {invoice.student.navn}</span>
                                                        </div>
                                                        <div class="button-group">
                                                        <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                            <span class="material-symbols-outlined">contract</span>
                                                        </button>
                                                        </div>
                                                    </div>
                                                </h3>
                                                <div class="info-grid">
                                                    <div class="info-item">
                                                        <span class="info-label">Navn på ansvarlig:</span>
                                                        <span class="value">{invoice.recipient.navn}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Opprettet:</span>
                                                        <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Type faktura:</span>
                                                        <span class="value">{returnType(invoice.type)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                                <br>
                                <div class="contract-overview">
                                    <h2 class="notinvoiced">
                                        <div class="header-with-buttons">
                                            <div class="header-title">
                                                Ikke Fakturert ({data.data.filter(invoice => invoice.status === 'Ikke Fakturert').length})
                                            </div>
                                            <button class="toggle-button" on:click={() => showNotInvoiced = !showNotInvoiced}>
                                                <span class="material-symbols-outlined">
                                                    {showNotInvoiced ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </h2>
                                    {#each data.data as invoice}
                                        {#if invoice.status === 'Ikke Fakturert' && showNotInvoiced}
                                            <div class="info-section">
                                                <h3>
                                                    <div class="header-with-buttons">
                                                        <div class="header-title">
                                                            <span>Elev - {invoice.student.navn}</span>
                                                        </div>
                                                        <div class="button-group">
                                                            <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                                <span class="material-symbols-outlined">contract</span>
                                                            </button>
                                                            <button class="toggle-button" on:click={() => deleteInvoice(invoice._id)}>
                                                                <span class="material-symbols-outlined">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </h3>
                                                <div class="info-grid">
                                                    <div class="info-item">
                                                        <span class="info-label">Navn på ansvarlig:</span>
                                                        <span class="value">{invoice.recipient.navn}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Opprettet:</span>
                                                        <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Type faktura:</span>
                                                        <span class="value">{returnType(invoice.type)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                                <br>
                                <div class="contract-overview">
                                    <h2 class="paid">
                                        <div class="header-with-buttons">
                                            <div class="header-title">
                                                Betalt ({data.data.filter(invoice => invoice.status === 'Betalt').length})
                                            </div>
                                            <button class="toggle-button" on:click={() => showPaid = !showPaid}>
                                                <span class="material-symbols-outlined">
                                                    {showPaid ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </h2>
                                    {#each data.data as invoice}
                                        {#if invoice.status === 'Betalt' && showPaid}
                                            <div class="info-section">
                                                <h3>
                                                    <div class="header-with-buttons">
                                                        <div class="header-title">
                                                            <span>Elev - {invoice.student.navn}</span>
                                                        </div>
                                                        <div class="button-group">
                                                        <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                            <span class="material-symbols-outlined">contract</span>
                                                        </button>
                                                        </div>
                                                    </div>
                                                </h3>
                                                <div class="info-grid">
                                                    <div class="info-item">
                                                        <span class="info-label">Navn på ansvarlig:</span>
                                                        <span class="value">{invoice.recipient.navn}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Opprettet:</span>
                                                        <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Type faktura:</span>
                                                        <span class="value">{returnType(invoice.type)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                                <br>
                                <div class="contract-overview">
                                    <h2 class="other">
                                        <div class="header-with-buttons">
                                            <div class="header-title">
                                                Andre ({data.data.filter(invoice => invoice.status !== 'Betalt' && invoice.status !== 'Fakturert' && invoice.status !== 'Ikke Fakturert').length})
                                            </div>
                                            <button class="toggle-button" on:click={() => showOther = !showOther}>
                                                <span class="material-symbols-outlined">
                                                    {showOther ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </h2>
                                    {#each data.data as invoice}
                                        {#if invoice.status !== 'Betalt' && invoice.status !== 'Fakturert' && invoice.status !== 'Ikke Fakturert' && showOther}
                                            <div class="info-section">
                                                <h3>
                                                    <div class="header-with-buttons">
                                                        <div class="header-title">
                                                            <span>Elev - {invoice.student.navn}</span>
                                                        </div>
                                                        <div class="button-group">
                                                        <button class="toggle-button" on:click={() => goto(`/invoices/${invoice._id}`)}>
                                                            <span class="material-symbols-outlined">contract</span>
                                                        </button>
                                                        </div>
                                                    </div>
                                                </h3>
                                                <div class="info-grid">
                                                    <div class="info-item">
                                                        <span class="info-label">Navn på ansvarlig:</span>
                                                        <span class="value">{invoice.recipient.navn}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Opprettet:</span>
                                                        <span class="value">{formatDate(invoice.createdTimeStamp)}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Type faktura:</span>
                                                        <span class="value">{returnType(invoice.type)}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <span class="info-label">Status faktura:</span>
                                                        <span class="value">{invoice.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/if}

                {:else}
                    <p class="error">Feil ved innhenting av fakturaer: {data.error}</p>
                {/if}
            {:catch invoiceError}
                <p class="error">Feil ved innhenting av fakturaer: {invoiceError.message}</p>
            {/await}
        {:else}
            <p class="error">Du har ikke tilgang til å se fakturaer.</p>
        {/if}
    {:catch tokenError}
        <p class="error">Feil ved innhenting av token: {tokenError.message}</p>
    {/await}
</main>

<style>
    main {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    h1 {
        color: var(--gress-80);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    p {
        margin-bottom: 1rem;
        color: var(--vann-70, #333);
        line-height: 1.5;
    }

    button {
        padding: 0.75rem 1.5rem;
        background-color: var(--gress-60);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    button:hover:not(:disabled) {
        background-color: var(--gress-70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .toggle-button {
        background-color: transparent;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
    }

    .toggle-button:hover:not(:disabled) {
        background-color: transparent;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .contract-card {
        margin-bottom: 3rem;
    }

    .results {
        margin-top: 2rem;
    }

    .contract-overview {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        overflow: hidden;
    }

    .contract-overview h2 {
        background: linear-gradient(135deg, var(--gress-60), var(--gress-70));
        color: white;
        padding: 2rem;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .contract-overview h2.invoiced  { background: linear-gradient(135deg, var(--korn-60), var(--korn-70)); }
    .contract-overview h2.paid      { background: linear-gradient(135deg, var(--gress-60), var(--gress-70)); }
    .contract-overview h2.other     { background: linear-gradient(135deg, var(--plomme-60), var(--plomme-70)); }
    .contract-overview h2.notinvoiced { background: linear-gradient(135deg, var(--nype-60), var(--nype-70)); }

    .info-section {
        border-bottom: 1px solid var(--gress-10);
        padding: 2rem;
    }

    .info-section:last-child {
        border-bottom: none;
    }

    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .info-label {
        font-weight: 600;
        color: var(--gress-70);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .info-item .value {
        padding: 0.75rem;
        background-color: var(--gress-5, #f8fffe);
        border-radius: 6px;
        border-left: 3px solid var(--gress-30);
        font-size: 1rem;
        min-height: 1.2rem;
    }

    .header-with-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .button-group {
        display: flex;
        gap: 1rem;
    }

    .header-title {
        font-size: 1.5rem;
        font-weight: 600;
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    /* Material Icons */
    .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }

    /* ══ NEW DESIGN ══ */

    .iv-page {
        padding: 0;
    }

    .iv-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.1rem;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .iv-page-title {
        color: var(--vann);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.55rem;
        font-weight: 700;
        margin: 0;
    }

    .iv-page-title .material-symbols-outlined {
        font-size: 1.75rem;
        color: var(--vann-70);
    }

    .iv-total-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.18rem 0.6rem;
        border-radius: 99px;
        background: var(--vann-10);
        border: 1px solid var(--vann-20);
        color: var(--vann-70);
        font-size: 0.72rem;
        font-weight: 600;
        margin-left: 0.25rem;
    }

    /* Toggle button — used in both designs */
    .iv-toggle-btn {
        all: unset;
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.28rem 0.7rem;
        border-radius: 6px;
        border: 1px solid var(--vann-30);
        background: white;
        color: var(--vann-70);
        transition: background 0.1s, color 0.1s;
        white-space: nowrap;
    }
    .iv-toggle-btn:hover {
        background: var(--vann-10);
        color: var(--vann);
    }

    /* Stat cards */
    .iv-stat-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.65rem;
        margin-bottom: 1rem;
    }

    .iv-stat {
        all: unset;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        padding: 0.85rem 1rem;
        background: white;
        border-radius: 8px;
        border: 1px solid var(--vann-20);
        border-left-width: 3px;
        box-shadow: 0 1px 3px rgba(0,60,72,0.06);
        transition: box-shadow 0.15s, background 0.15s;
        text-align: left;
    }

    .iv-stat:hover { box-shadow: 0 3px 10px rgba(0,60,72,0.13); }

    .iv-stat--fakturert { border-left-color: var(--korn); }
    .iv-stat--ikke      { border-left-color: var(--nype); }
    .iv-stat--betalt    { border-left-color: var(--gress); }
    .iv-stat--andre     { border-left-color: var(--plomme); }

    .iv-stat--fakturert.is-active { background: var(--korn-10); box-shadow: inset 0 2px 0 var(--korn), 0 2px 8px rgba(0,60,72,0.1); }
    .iv-stat--ikke.is-active      { background: var(--nype-10); box-shadow: inset 0 2px 0 var(--nype), 0 2px 8px rgba(0,60,72,0.1); }
    .iv-stat--betalt.is-active    { background: var(--gress-10); box-shadow: inset 0 2px 0 var(--gress), 0 2px 8px rgba(0,60,72,0.1); }
    .iv-stat--andre.is-active     { background: var(--plomme-10); box-shadow: inset 0 2px 0 var(--plomme), 0 2px 8px rgba(0,60,72,0.1); }

    .iv-stat__count { font-size: 1.75rem; font-weight: 700; line-height: 1; color: var(--vann); }
    .iv-stat__label { font-size: 0.77rem; font-weight: 600; color: var(--vann-70); margin-top: 0.2rem; }
    .iv-stat__sub   { font-size: 0.67rem; color: var(--vann-50); margin-top: 0.1rem; }

    .iv-countdown { display: inline-flex; align-items: center; gap: 0.3rem; font-variant-numeric: tabular-nums; }
    .iv-countdown::before {
        content: '';
        display: inline-block;
        width: 5px; height: 5px;
        border-radius: 50%;
        background: var(--nype-60);
        animation: iv-pulse 2s ease-in-out infinite;
        flex-shrink: 0;
    }
    @keyframes iv-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.3; }
    }
    @media (prefers-reduced-motion: reduce) {
        .iv-countdown::before { animation: none; }
    }

    /* Search */
    .iv-search-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
    }

    .iv-search {
        position: relative;
        flex: 0 1 320px;
        min-width: 180px;
    }

    .iv-search-icon {
        position: absolute;
        left: 0.52rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--vann-60);
        pointer-events: none;
        font-size: 1.1rem;
    }

    .iv-search-input {
        width: 100%;
        padding: 0.38rem 2rem 0.38rem 2rem;
        border-radius: 7px;
        border: 1px solid var(--vann-30);
        background: white;
        font-family: inherit;
        font-size: 0.82rem;
        color: var(--vann);
        outline: none;
        transition: border-color 0.1s, box-shadow 0.1s;
    }

    .iv-search-input:focus {
        border-color: var(--vann);
        box-shadow: 0 0 0 3px rgba(0,82,96,0.12);
    }

    .iv-search-input::placeholder { color: var(--vann-50); }

    .iv-search-clear {
        all: unset;
        cursor: pointer;
        position: absolute;
        right: 0.4rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--vann-50);
        display: flex;
        align-items: center;
        font-size: 0.95rem;
        border-radius: 3px;
        padding: 0.1rem;
    }

    .iv-search-clear:hover { color: var(--vann); background: var(--vann-10); }

    .iv-result-count {
        font-size: 0.72rem;
        color: var(--vann-60);
        font-style: italic;
        white-space: nowrap;
    }

    /* Table wrapper */
    .iv-table-wrapper {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,60,72,0.1), 0 0 0 1px rgba(0,60,72,0.07);
    }

    .iv-table-scroll {
        overflow-x: auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        max-height: calc(100vh - 22rem);
        min-height: 120px;
    }

    table.iv-table {
        border-collapse: collapse;
        width: 100%;
        background: white;
        font-size: 0.85rem;
    }

    table.iv-table thead tr { border-bottom: none; }

    table.iv-table thead th {
        background: var(--vann-10);
        position: sticky;
        top: 0;
        z-index: 1;
        box-shadow: 0 1px 0 var(--vann-20);
        padding: 0.65rem 0.9rem;
        text-align: left;
        font-size: 0.67rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--vann-60);
        white-space: nowrap;
    }

    table.iv-table tbody tr {
        border-bottom: 1px solid var(--vann-10);
        transition: background 0.08s;
    }

    table.iv-table tbody tr:hover  { background: var(--vann-10); }
    table.iv-table tbody tr:last-child { border-bottom: none; }

    table.iv-table td {
        padding: 0.7rem 0.9rem;
        vertical-align: middle;
        color: var(--vann);
    }

    th.iv-sortable {
        cursor: pointer;
        user-select: none;
        transition: background 0.08s, color 0.08s;
    }

    th.iv-sortable:hover { background: var(--vann-20); color: var(--vann); }
    th.iv-sort-active    { color: var(--vann); }

    .iv-th-inner { display: inline-flex; align-items: center; gap: 0.3rem; }
    .iv-sort-icon { font-size: 0.7rem; opacity: 0.45; }
    th.iv-sort-active .iv-sort-icon { opacity: 1; }

    .iv-col-student   { min-width: 180px; }
    .iv-col-ansvarlig { min-width: 150px; }
    .iv-col-type      { min-width: 130px; }
    .iv-col-dato      { min-width: 120px; white-space: nowrap; }
    .iv-col-status    { min-width: 145px; }
    .iv-col-actions   { min-width: 90px; white-space: nowrap; }

    .iv-student-name { font-weight: 600; color: var(--vann); line-height: 1.2; }
    .iv-student-sub  { font-size: 0.72rem; color: var(--vann-60); margin-top: 0.15rem; }

    /* Badges */
    .iv-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        padding: 0.18rem 0.55rem;
        border-radius: 99px;
        font-size: 0.72rem;
        font-weight: 600;
        border: 1px solid transparent;
    }

    .iv-badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .iv-badge--fakturert { background: var(--korn-20); color: var(--korn-80); border-color: var(--korn-40); }
    .iv-badge--fakturert .iv-badge-dot { background: var(--korn); }
    .iv-badge--ikke      { background: var(--nype-20); color: var(--nype-80); border-color: var(--nype-40); }
    .iv-badge--ikke .iv-badge-dot      { background: var(--nype); }
    .iv-badge--betalt    { background: var(--gress-20); color: var(--gress-80); border-color: var(--gress-40); }
    .iv-badge--betalt .iv-badge-dot    { background: var(--gress); }
    .iv-badge--andre     { background: var(--plomme-20); color: var(--plomme-80); border-color: var(--plomme-40); }
    .iv-badge--andre .iv-badge-dot     { background: var(--plomme); }

    /* Action buttons */
    .iv-action-group { display: flex; align-items: center; gap: 0.3rem; }

    .iv-action-btn {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 6px;
        color: var(--vann-70);
        transition: background 0.1s, color 0.1s;
    }

    .iv-action-btn:hover             { background: var(--vann-10); color: var(--vann); }
    .iv-action-btn--delete:hover     { background: var(--nype-10); color: var(--nype); }
    .iv-action-btn:focus-visible     { outline: 2px solid var(--vann); outline-offset: 2px; }

    /* Empty state */
    .iv-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        background: white;
        color: var(--vann-60);
        gap: 0.5rem;
        text-align: center;
    }

    .iv-empty-state .material-symbols-outlined { font-size: 2.5rem; color: var(--vann-30); }
    .iv-empty-state p { margin: 0; color: var(--vann-60); font-size: 0.88rem; }

    .iv-reset-btn {
        all: unset;
        cursor: pointer;
        margin-top: 0.5rem;
        padding: 0.4rem 1rem;
        border-radius: 6px;
        border: 1px solid var(--vann-30);
        font-size: 0.8rem;
        color: var(--vann);
        background: white;
        transition: background 0.1s;
    }

    .iv-reset-btn:hover { background: var(--vann-10); }

    /* Pagination */
    .iv-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.65rem 1rem;
        background: white;
        border-top: 1px solid var(--vann-10);
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .iv-page-size {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.72rem;
        color: var(--vann-60);
    }

    .iv-page-size select {
        all: unset;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.72rem;
        color: var(--vann);
        border: 1px solid var(--vann-30);
        border-radius: 5px;
        background: white;
        padding: 0.22rem 1.6rem 0.22rem 0.5rem;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23337580' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.45rem center;
    }

    .iv-page-size select:focus { outline: 2px solid var(--vann); outline-offset: 1px; }

    .iv-page-info {
        font-size: 0.72rem;
        color: var(--vann-60);
        font-style: italic;
    }

    .iv-page-nav { display: flex; align-items: center; gap: 0.2rem; }

    .iv-page-btn {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 1.8rem;
        height: 1.8rem;
        padding: 0 0.25rem;
        border-radius: 5px;
        font-size: 0.77rem;
        font-weight: 600;
        color: var(--vann-70);
        transition: background 0.1s, color 0.1s;
    }

    .iv-page-btn:hover:not([disabled]) { background: var(--vann-10); color: var(--vann); }
    .iv-page-btn.is-active             { background: var(--vann); color: white; }
    .iv-page-btn[disabled]             { opacity: 0.3; cursor: not-allowed; }
    .iv-page-btn:focus-visible         { outline: 2px solid var(--vann); outline-offset: 2px; }

    .iv-page-ellipsis { padding: 0 0.2rem; font-size: 0.8rem; color: var(--vann-50); }

    /* Responsive */
    @media (max-width: 1024px) {
        .iv-stat-strip { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
        main { padding: 1rem; }
        .iv-col-type, .iv-col-dato { display: none; }
        .iv-stat-strip { grid-template-columns: repeat(2, 1fr); }
        .iv-page-size label { display: none; }
        .info-grid { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
        .iv-stat, .iv-toggle-btn, .iv-search-input, .iv-action-btn, .iv-page-btn, .iv-reset-btn { transition: none; }
    }
</style>
