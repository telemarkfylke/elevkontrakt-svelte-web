<script>
    import { onDestroy } from 'svelte'
    import AdminOnly from '$lib/components/AdminOnly.svelte'
    import DsFileUpload from '$lib/components/ds/DsFileUpload.svelte'
    import DsSelect from '$lib/components/ds/DsSelect.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsCard from '$lib/components/ds/DsCard.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import { startBulkInvoice, getBulkRun, listBulkRuns } from '$lib/useApi.js'
    import DsScope from '$lib/components/ds/DsScope.svelte'

    const POLL_MS = 2000
    const MAX_POLL_FAILURES = 5
    // A notFound rate this high on a file of any size means the wrong column was read, not that the
    // students are missing. Worth saying while the run can still be stopped.
    const WRONG_COLUMN_RATIO = 0.5

    let file = null
    let mode = 'boughtOut'
    let collections = 'regular,pcIkkeInnlevert'
    let fnrColumn = ''

    let stage = 'idle' // idle | previewing | preview | confirming | running | done
    let preview = null
    let progress = null
    let finished = null
    let errorMessage = ''
    let runId = null
    let lookupRunId = ''
    let recentRuns = []
    let copiedRunId = null
    let confirmed = false

    let poller = null
    let pollFailures = 0

    const stopPolling = () => {
        if (poller) clearInterval(poller)
        poller = null
    }
    onDestroy(stopPolling)

    const options = () => ({
        mode,
        collections: collections.split(',').map(value => value.trim()).filter(Boolean),
        fnrColumn: fnrColumn.trim() || undefined
    })

    const runDryRun = async () => {
        errorMessage = ''
        if (!file) {
            errorMessage = 'Velg en CSV-fil først.'
            return
        }
        preview = null
        stage = 'previewing'
        const report = await startBulkInvoice(file, { ...options(), dryRun: true })
        if (report?.fatal || report?.ok === false) {
            errorMessage = report?.fatal?.message ?? report?.error ?? 'Dry-run feilet.'
            stage = 'idle'
            return
        }
        preview = report
        confirmed = false
        stage = 'preview'
    }

    const startRealRun = async () => {
        errorMessage = ''
        finished = null
        progress = null
        pollFailures = 0
        runId = crypto.randomUUID()
        stage = 'running'

        // Not awaited on purpose: this request runs for minutes and Azure cuts the response long
        // before the run ends. The run record is what we follow.
        startBulkInvoice(file, { ...options(), dryRun: false, runId }).catch(() => {})

        poller = setInterval(pollOnce, POLL_MS)
        pollOnce()
    }

    const pollOnce = async () => {
        const record = await getBulkRun(runId)

        if (record?.ok === false) {
            // A 404 on the first polls just means the started record has not landed yet, so give it
            // a few - but never poll forever, or a run that never started spins silently.
            if (++pollFailures > MAX_POLL_FAILURES) {
                stopPolling()
                errorMessage = record.status === 404
                    ? `Fant ingen kjøring med id ${runId}. Kontroller i fakturaoversikten om noe ble fakturert.`
                    : record.error ?? 'Mistet kontakten med kjøringen.'
                stage = 'done'
            }
            return
        }

        pollFailures = 0
        if (record.status === 'completed' || record.status === 'failed') {
            stopPolling()
            finished = record
            progress = null
            stage = 'done'
            loadRecentRuns()
            return
        }
        progress = record
    }

    const lookUpRun = async () => {
        errorMessage = ''
        if (!lookupRunId.trim()) {
            errorMessage = 'Skriv inn en kjøre-id.'
            return
        }
        const record = await getBulkRun(lookupRunId.trim())
        if (record?.ok === false) {
            errorMessage = record.status === 404
                ? 'Fant ingen kjøring med denne id-en. Rapporter slettes etter oppbevaringstiden, men fakturaene finnes fortsatt.'
                : record.error
            return
        }
        stopPolling()
        runId = record.runId
        if (record.status === 'completed' || record.status === 'failed') {
            finished = record
            progress = null
            stage = 'done'
        } else {
            // Still live - pick up where it is and follow it to the end.
            progress = record
            finished = null
            stage = 'running'
            poller = setInterval(pollOnce, POLL_MS)
        }
    }

    const loadRecentRuns = async () => { recentRuns = await listBulkRuns(25) }

    const STATUS_TEXT = { started: 'Startet', running: 'Pågår', completed: 'Ferdig', failed: 'Stoppet' }
    const statusText = (status) => STATUS_TEXT[status] ?? status

    const openRun = (id) => {
        lookupRunId = id
        lookUpRun()
    }

    const copyRunId = async (id) => {
        try {
            await navigator.clipboard.writeText(id)
            copiedRunId = id
            setTimeout(() => { if (copiedRunId === id) copiedRunId = null }, 2000)
        } catch {
            // Clipboard is blocked in some browsers over http - fall back to showing the id.
            errorMessage = `Kunne ikke kopiere automatisk. Kjøre-id: ${id}`
        }
    }
    loadRecentRuns()

    const reset = () => {
        stopPolling()
        confirmed = false
        stage = 'idle'
        preview = null
        progress = null
        finished = null
        errorMessage = ''
        runId = null
    }

    const downloadReport = (report) => {
        const rows = [['fnr', 'navn', 'kontraktId', 'utfall', 'detalj', 'sum'].join(';')]
        for (const entry of report.invoiced ?? []) rows.push([entry.fnr, entry.navn, entry.contractId, 'fakturert', '', entry.total].join(';'))
        for (const entry of report.skipped ?? []) rows.push([entry.fnr, entry.navn ?? '', entry.contractId ?? '', 'hoppet over', entry.reason, ''].join(';'))
        for (const entry of report.multiMatch ?? []) rows.push([entry.fnr, entry.navn ?? '', '', 'flere treff', '', ''].join(';'))
        for (const entry of report.notFound ?? []) rows.push([entry.fnr, '', '', 'ikke funnet', '', ''].join(';'))
        for (const entry of report.errors ?? []) rows.push([entry.fnr, entry.navn ?? '', entry.contractId ?? '', 'feil', entry.error, ''].join(';'))

        // Blob rather than a data: URI - a several-hundred-row report is too big for one, and the
        // BOM keeps Excel from mangling the Norwegian characters.
        const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `fakturer-fra-fil-${report.runId ?? 'rapport'}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const kr = (value) => new Intl.NumberFormat('nb-NO').format(value ?? 0)

    $: percent = progress?.total ? Math.round((progress.processed / progress.total) * 100) : 0
    $: wrongColumnSuspected = progress?.processed > 10 && (progress.tallies?.notFound ?? 0) / progress.processed > WRONG_COLUMN_RATIO
    // Measured against the whole file, not against how many got invoiced: re-running a file is the
    // normal case, and then nothing is invoiced while every number is still found.
    $: manyNotFound = preview?.uniqueFnr > 10 && preview.notFound.length / preview.uniqueFnr > WRONG_COLUMN_RATIO
    $: report = finished?.report ?? null
</script>

<DsScope>
    <AdminOnly>
        <main>
            <h1 class="ds-heading" data-size="lg">Fakturer fra fil</h1>

            <DsCard>
                <p class="ds-heading" data-size="2xs">Slik gjør du det</p>
                <ol class="ds-list">
                    <li>Last opp CSV-fila med fødselsnumrene til elevene som skal faktureres.</li>
                    <li>Kjør en dry-run først - den viser hva som ville blitt fakturert, uten å fakturere.</li>
                    <li>Se over resultatet, og bekreft for å fakturere på ekte.</li>
                </ol>
                <p class="ds-paragraph">
                    <a class="ds-link" href="/hjelp/fakturer-fra-fil">Les hele veiledningen</a> - hvordan fila skal se ut,
                    hva de to typene betyr, og hvordan du leser rapporten.
                </p>
            </DsCard>

            {#if errorMessage}
                <DsAlert color="danger" heading="Noe gikk galt">
                    <p class="ds-paragraph">{errorMessage}</p>
                </DsAlert>
            {/if}

            {#if stage === 'idle' || stage === 'previewing'}
                <section>
                    <DsFileUpload
                        label="CSV-fil med fødselsnumre"
                        accept=".csv,text/csv"
                        bind:file
                        disabled={stage === 'previewing'}
                    />

                    <DsSelect label="Type fakturering" bind:value={mode}>
                        <option value="boughtOut">Utkjøp - fakturerer alle gjenstående terminer og merker PC-en som utkjøpt</option>
                        <option value="oneTime">Engangsfaktura - fakturerer kun første ubetalte termin</option>
                    </DsSelect>

                    <DsSelect label="Hvilke avtaler skal søkes i" bind:value={collections}>
                        <option value="regular,pcIkkeInnlevert">Aktive avtaler og PC ikke innlevert</option>
                        <option value="regular">Bare aktive avtaler</option>
                        <option value="pcIkkeInnlevert">Bare PC ikke innlevert</option>
                    </DsSelect>

                    <DsInput label="Kolonnenavn for fødselsnummer (valgfritt)" bind:value={fnrColumn} placeholder="Fylles ut automatisk" />

                    <div class="actions">
                        <DsButton loading={stage === 'previewing'} loadingText="Kjører dry-run ..." on:click={runDryRun}>
                            Kjør dry-run
                        </DsButton>
                    </div>
                    <p class="ds-paragraph" data-size="sm">En dry-run fakturerer ingen - den viser bare hva som ville skjedd.</p>
                </section>
            {/if}

            {#if stage === 'preview' && preview}
                <section>
                    <DsAlert color="info" heading="Dry-run - ingenting er fakturert ennå">
                        <p class="ds-paragraph">
                            <strong>{preview.totals.contracts}</strong> avtaler ville blitt fakturert
                            <strong>{preview.totals.rates}</strong> terminer, til sammen
                            <strong>kr {kr(preview.totals.sum)}</strong>.
                        </p>
                    </DsAlert>

                    <table class="ds-table" data-size="sm">
                        <thead>
                            <tr><th scope="col">Utfall</th><th scope="col">Antall</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Hoppet over</td><td>{preview.skipped.length}</td></tr>
                            <tr><td>Flere treff (faktureres ikke)</td><td>{preview.multiMatch.length}</td></tr>
                            <tr><td>Ikke funnet</td><td>{preview.notFound.length}</td></tr>
                            <tr><td>Ugyldige rader i fila</td><td>{preview.invalidRows.length}</td></tr>
                        </tbody>
                    </table>

                    {#if manyNotFound}
                        <DsAlert color="warning" heading="{preview.notFound.length} av {preview.uniqueFnr} fødselsnumre ga ingen treff">
                            <p class="ds-paragraph">
                                Det finnes ingen avtale på disse numrene. Når så mange mangler, er det som regel
                                fordi feil kolonne er lest, eller fordi Excel har gjort om numrene til tall
                                (<code>1,01011E+10</code>).
                            </p>
                            <p class="ds-paragraph">
                                Kontroller fila før du fakturerer - se
                                <a class="ds-link" href="/hjelp/fakturer-fra-fil">veiledningen</a>.
                            </p>
                        </DsAlert>
                    {/if}

                    <div class="ds-field confirm">
                        <input class="ds-input" type="checkbox" id="confirm-invoice" bind:checked={confirmed} />
                        <label class="ds-label" for="confirm-invoice">
                            Jeg har sett over rapporten og vil fakturere {preview.totals.contracts} avtaler for kr {kr(preview.totals.sum)}.
                        </label>
                    </div>

                    <div class="actions">
                        <DsButton disabled={!confirmed} on:click={startRealRun}>Fakturer {preview.totals.contracts} avtaler for kr {kr(preview.totals.sum)}</DsButton>
                        <DsButton variant="secondary" on:click={downloadReport.bind(null, preview)}>Last ned dry-run-rapporten</DsButton>
                        <DsButton variant="tertiary" on:click={reset}>Avbryt</DsButton>
                    </div>
                </section>
            {/if}

            {#if stage === 'running'}
                <section>
                    <DsAlert color="info" heading="Kjøringen pågår">
                        <p class="ds-paragraph">
                            Du kan trygt lukke fanen - kjøringen fortsetter, og rapporten dukker opp under
                            Tidligere kjøringer når den er ferdig.
                        </p>
                    </DsAlert>

                    {#if progress}
                        <p class="ds-paragraph">{progress.processed} av {progress.total} elever ({percent} %)</p>
                        <progress value={progress.processed} max={progress.total}></progress>

                        <table class="ds-table" data-size="sm">
                            <thead>
                                <tr><th scope="col">Utfall</th><th scope="col">Antall</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Fakturert</td><td>{progress.tallies.invoiced} - kr {kr(progress.tallies.sum)}</td></tr>
                                <tr><td>Hoppet over</td><td>{progress.tallies.skipped}</td></tr>
                                <tr><td>Ikke funnet</td><td>{progress.tallies.notFound}</td></tr>
                                <tr><td>Feil</td><td>{progress.tallies.errors}</td></tr>
                            </tbody>
                        </table>

                        {#if wrongColumnSuspected}
                            <DsAlert color="warning" heading="Mange blir ikke funnet">
                                <p class="ds-paragraph">
                                    Over halvparten av elevene så langt ble ikke funnet. Det tyder på at feil kolonne er lest.
                                    Kjøringen kan ikke stoppes herfra - kontakt IT hvis den må avbrytes.
                                </p>
                            </DsAlert>
                        {/if}

                        {#if progress.recent?.length}
                            <p class="ds-heading" data-size="2xs">Sist fakturert</p>
                            <ul class="ds-list feed">
                                {#each [...progress.recent].reverse() as entry}
                                    <li>{entry.navn ?? entry.fnr} - kr {kr(entry.total)}</li>
                                {/each}
                            </ul>
                        {/if}
                    {:else}
                        <DsSpinner />
                        <p class="ds-paragraph">Starter kjøringen ...</p>
                    {/if}
                </section>
            {/if}

            {#if stage === 'done' && finished && !report}
                <section>
                    <DsAlert color="warning" heading="Kjøringen er ferdig, men rapporten mangler">
                        <p class="ds-paragraph">
                            Kjøringen ble fullført, men den lagrede rapporten kunne ikke hentes. Fakturaene er
                            opprettet - søk dem opp i fakturaoversikten. Kjøre-id: <code>{runId}</code>
                        </p>
                    </DsAlert>
                    <div class="actions">
                        <DsButton variant="secondary" on:click={reset}>Ny kjøring</DsButton>
                    </div>
                </section>
            {/if}

            {#if stage === 'done' && report}
                <section>
                    <DsAlert color={finished.status === 'failed' ? 'danger' : 'success'} heading={finished.status === 'failed' ? 'Kjøringen stoppet' : 'Kjøringen er ferdig'}>
                        <p class="ds-paragraph">
                            Fakturerte <strong>{report.totals.contracts}</strong> avtaler /
                            <strong>{report.totals.rates}</strong> terminer, til sammen
                            <strong>kr {kr(report.totals.sum)}</strong>.
                        </p>
                        {#if report.fatal}
                            <p class="ds-paragraph">{report.fatal.message}</p>
                        {/if}
                    </DsAlert>

                    <table class="ds-table" data-size="sm">
                        <thead>
                            <tr><th scope="col">Utfall</th><th scope="col">Antall</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Hoppet over</td><td>{report.skipped.length}</td></tr>
                            <tr><td>Flere treff</td><td>{report.multiMatch.length}</td></tr>
                            <tr><td>Ikke funnet</td><td>{report.notFound.length}</td></tr>
                            <tr><td>Feil</td><td>{report.errors.length}</td></tr>
                        </tbody>
                    </table>

                    <p class="ds-paragraph">Kjøre-id: <code>{report.runId}</code></p>
                    <div class="actions">
                        <DsButton on:click={downloadReport.bind(null, report)}>Last ned rapporten</DsButton>
                        <DsButton variant="secondary" on:click={reset}>Ny kjøring</DsButton>
                    </div>
                </section>
            {/if}

            <section>
                <p class="ds-heading" data-size="2xs">Tidligere kjøringer</p>

                {#if recentRuns.length}
                    <table class="ds-table" data-size="sm">
                        <thead>
                            <tr>
                                <th scope="col">Tidspunkt</th>
                                <th scope="col">Type</th>
                                <th scope="col">Status</th>
                                <th scope="col">Avtaler</th>
                                <th scope="col">Beløp</th>
                                <th scope="col"><span class="visually-hidden">Handlinger</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each recentRuns as run}
                                <tr>
                                    <td>{run.startedAt ? new Date(run.startedAt).toLocaleString('nb-NO') : 'Ukjent'}</td>
                                    <td>{run.dryRun ? 'Dry-run' : 'Ekte'}</td>
                                    <td>{statusText(run.status)}</td>
                                    <td>{run.totals.contracts}</td>
                                    <td>kr {kr(run.totals.sum)}</td>
                                    <td>
                                        <div class="row-actions">
                                            <button
                                                class="ds-button"
                                                data-variant="tertiary"
                                                data-size="sm"
                                                data-icon
                                                type="button"
                                                on:click={() => openRun(run.runId)}
                                                aria-label="Åpne rapporten fra {run.startedAt ? new Date(run.startedAt).toLocaleString('nb-NO') : run.runId}"
                                                data-tooltip="Åpne rapporten"
                                            >
                                                <span class="material-symbols-outlined" aria-hidden="true">description</span>
                                            </button>
                                            <button
                                                class="ds-button"
                                                data-variant="tertiary"
                                                data-size="sm"
                                                data-icon
                                                type="button"
                                                on:click={() => copyRunId(run.runId)}
                                                aria-label="Kopier kjøre-id"
                                                data-tooltip={copiedRunId === run.runId ? 'Kopiert' : 'Kopier kjøre-id'}
                                            >
                                                <span class="material-symbols-outlined" aria-hidden="true">
                                                    {copiedRunId === run.runId ? 'check' : 'content_copy'}
                                                </span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {:else}
                    <p class="ds-paragraph">Ingen kjøringer ennå.</p>
                {/if}

                <details class="ds-details">
                    <summary>Har du fått en kjøre-id?</summary>
                    <div class="details-body">
                        <p class="ds-paragraph" data-size="sm">
                            Du trenger ikke id-en for å finne dine egne kjøringer - de står i lista over.
                            Feltet er for når noen andre har gitt deg en id, for eksempel IT, eller når du har
                            den fra filnavnet på en nedlastet rapport.
                        </p>
                        <DsInput label="Kjøre-id" bind:value={lookupRunId} placeholder="0f4c9a1e-..." />
                        <div class="actions">
                            <DsButton variant="secondary" on:click={lookUpRun}>Hent kjøring</DsButton>
                        </div>
                    </div>
                </details>
            </section>
        </main>
    </AdminOnly>
</DsScope>

<style>
    /* Designsystemet spaces list items for prose; --ds-size-3 between one-word items is too much. */
    /**
     * Designsystemet sets padding-inline from var(--ds-size-6) with no fallback. That token is built
     * through a space-toggle that does not resolve here, so the declaration is dropped and the
     * markers end up outside the text column. Set the component's own hook to a literal instead.
     */
    /* Tighter than Designsystemet's default, which spaces list items for prose. */
    .ds-list {
        --dsc-list-margin-top: var(--ds-size-2, 0.5rem);
    }

    /* No code styling in app.css, so <code> fell back to Courier New, which renders ø badly. */
    code {
        font-family: ui-monospace, Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
    }

    main {
        padding: var(--ds-size-4, 1rem);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-6, 1.5rem);
        max-width: 60rem;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3, 0.75rem);
    }

    /* Designsystemet's default is --ds-size-2 vertical; these tables are scanned, not skimmed. */
    .ds-table {
        --dsc-table-padding: var(--ds-size-4, 1rem) var(--ds-size-3, 0.75rem);
    }

    /* Designsystemet has no progress component, so this is a plain <progress>. */
    progress {
        width: 100%;
    }

    .confirm {
        padding-block: var(--ds-size-2, 0.5rem);
    }

    /* Buttons sit at their natural width - the column layout would otherwise stretch them. */
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2, 0.5rem);
    }

    .row-actions {
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }

    .details-body {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2, 0.5rem);
        padding-block-start: var(--ds-size-2, 0.5rem);
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }

    .feed {
        max-height: 14rem;
        overflow-y: auto;
    }
</style>
