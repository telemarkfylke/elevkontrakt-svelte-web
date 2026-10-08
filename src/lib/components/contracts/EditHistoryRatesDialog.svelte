<script>
    /**
     * Registrer innbetaling: payments from remisser on a contract in Historikk. Administrators only.
     * A payment is added to betaltBeløp. Betalt only when the sum is paid. "Rett innbetalt beløp" and going
     * back to Overført inkasso set betaltBeløp directly; lowering it needs a Forklaring.
     * The backend checks the same rules, writes the changeLog and updates live copies of the rate.
     */
    import { createEventDispatcher } from 'svelte'
    import DsAlert from '../ds/DsAlert.svelte'
    import DsButton from '../ds/DsButton.svelte'
    import DsDialog from '../ds/DsDialog.svelte'
    import DsInput from '../ds/DsInput.svelte'
    import DsSelect from '../ds/DsSelect.svelte'
    import DsTag from '../ds/DsTag.svelte'
    import StatusTag from '../StatusTag.svelte'
    import { formatShortDate } from '$lib/helpers/formatDate.js'
    import { REMISSE_STATUSES, isRemisseRate, isInkasso, toAmount, storedAmount, paidSoFar, rateSum, remaining, round, formatKr, amountError, correctionError, statusError, reasonError, dateError, beforeBetalt, paysInFull, today } from '$lib/helpers/remisse.js'
    import { updateContractInfo } from '$lib/useApi'

    export let contract
    export let open = false

    const dispatch = createEventDispatcher()

    let edits = {}
    let saving = false
    let error = ''

    $: rateKeys = Object.keys(contract?.fakturaInfo ?? {})

    // A fresh dialog for every contract it opens on.
    $: if (open) reset(contract?._id)
    let resetFor = null
    function reset (id) {
        if (id === resetFor) return
        resetFor = id
        edits = Object.fromEntries(rateKeys.map(key => [key, { amount: '', status: '', statusTouched: false, date: '', correcting: false, correction: '', comment: '' }]))
        error = ''
    }
    $: if (!open) resetFor = null

    // A Betalt rate (set here) going back to Overført inkasso.
    const reverting = (rate, status) => !isInkasso(rate) && status === 'Overført inkasso'
    // The amount from before the rate was set to Betalt, or '' when it can't be found.
    const amountBeforeBetalt = (key) => {
        const before = beforeBetalt(contract, key)
        if (!before) return ''
        return before.betaltBeløp == null ? '0' : String(storedAmount(before.betaltBeløp))
    }

    function amountChanged (key, value) {
        const rate = contract.fakturaInfo[key]
        const edit = edits[key]
        edit.amount = value
        const ok = value.trim() !== '' && !amountError(rate, value)
        if (ok && !edit.date) edit.date = today()
        // Suggest Betalt when the rate is paid off, unless the admin picked a status.
        if (!edit.statusTouched) edit.status = paysInFull(rate, value) ? 'Betalt' : ''
        edits = edits
    }

    function statusChanged (key) {
        const rate = contract.fakturaInfo[key]
        const edit = edits[key]
        edit.statusTouched = true
        if (edit.status === 'Betalt' && !edit.date) edit.date = today()
        edit.correction = reverting(rate, edit.status) ? amountBeforeBetalt(key) : ''
        edits = edits
    }

    // "Rett innbetalt beløp" swaps the payment field for a field with the total paid.
    function toggleCorrecting (key) {
        const rate = contract.fakturaInfo[key]
        const edit = edits[key]
        edit.correcting = !edit.correcting
        edit.correction = edit.correcting ? String(paidSoFar(rate)) : ''
        edit.amount = ''
        edit.status = ''
        edit.statusTouched = false
        edits = edits
    }

    // Any field in the dialog that is wrong.
    function hasProblems () {
        return rateKeys.some(key => {
            const rate = contract.fakturaInfo[key]
            const edit = edits[key]
            if (!edit || !isRemisseRate(rate)) return false
            if ((isInkasso(rate) && edit.correcting) || reverting(rate, edit.status)) {
                return Boolean(correctionError(rate, edit.correction) || reasonError(rate, edit.correction, edit.comment))
            }
            if (!isInkasso(rate)) return false
            const needsDate = toAmount(edit.amount) > 0 || edit.status === 'Betalt'
            return Boolean(amountError(rate, edit.amount) || statusError(rate, edit.status, edit.amount) || (needsDate && dateError(edit.date)))
        })
    }

    // data['fakturaInfo.rateN.field'] to save, and expected = status and betaltBeløp as we saw them.
    // betaltDato only changes with the status, sistInnbetaltDato only with the amount.
    function paymentChanges () {
        const data = {}
        const expected = {}
        for (const key of rateKeys) {
            const rate = contract.fakturaInfo[key]
            const edit = edits[key]
            if (!edit || !isRemisseRate(rate)) continue
            const fields = {}
            const paid = paidSoFar(rate)
            const iso = (date) => new Date(date).toISOString()
            if (isInkasso(rate) && edit.correcting) {
                const corrected = round(toAmount(edit.correction))
                if (corrected !== paid) {
                    fields.betaltBeløp = corrected
                    if (corrected === 0 && rate.sistInnbetaltDato) fields.sistInnbetaltDato = ''
                }
            } else if (isInkasso(rate)) {
                const amount = toAmount(edit.amount)
                if (amount > 0) {
                    fields.betaltBeløp = round(paid + amount)
                    fields.sistInnbetaltDato = iso(edit.date)
                }
                if (edit.status === 'Betalt') {
                    fields.status = 'Betalt'
                    fields.betaltDato = iso(edit.date)
                    // No amount typed: the rest counts as paid. betaltBeløp also marks the rate as set here.
                    if (fields.betaltBeløp === undefined) fields.betaltBeløp = rateSum(rate) ?? paid
                }
            } else if (reverting(rate, edit.status)) {
                fields.status = 'Overført inkasso'
                fields.betaltDato = ''
                const corrected = round(toAmount(edit.correction))
                if (corrected !== paid) {
                    fields.betaltBeløp = corrected
                    // Back to the date of the last payment before Betalt, when the amount is back there too.
                    const before = beforeBetalt(contract, key)
                    if (corrected === 0) {
                        if (rate.sistInnbetaltDato) fields.sistInnbetaltDato = ''
                    } else if (before && storedAmount(before.betaltBeløp) === corrected) {
                        fields.sistInnbetaltDato = before.sistInnbetaltDato ?? ''
                    }
                }
            }
            if (edit.comment.trim()) fields.editReasonCustom = edit.comment.trim()
            if (!Object.keys(fields).length) continue
            for (const [field, value] of Object.entries(fields)) data[`fakturaInfo.${key}.${field}`] = value.toString()
            expected[`fakturaInfo.${key}.status`] = rate.status ?? null
            expected[`fakturaInfo.${key}.betaltBeløp`] = rate.betaltBeløp ?? null
        }
        return { data, expected }
    }

    async function save () {
        error = ''
        if (hasProblems()) {
            error = 'Rett opp feltene som er markert før du lagrer.'
            return
        }
        const { data, expected } = paymentChanges()
        if (!Object.keys(data).length) { error = 'Ingen endringer å lagre.'; return }
        saving = true
        let response
        try {
            response = await updateContractInfo(contract._id, { data, expected, updateData: true }, 'history')
        } catch (err) {
            response = err?.response
        }
        saving = false
        if (response?.status !== 200) {
            error = response?.data?.error ?? 'Endringen ble ikke lagret. Prøv igjen om litt. Kontakt servicedesk hvis feilen fortsetter.'
            return
        }
        open = false
        const live = response.data?.liveUpdated ?? 0
        dispatch('saved', {
            message: `Endringen på avtalen til ${contract.elevInfo?.navn} er lagret.${live ? ' Den samme raten er også oppdatert på elevens nyere avtale.' : ''}`,
            warning: response.data?.liveError ? 'Eleven kan ha en nyere avtale med de samme ratene, men den ble ikke oppdatert. Kontakt den som forvalter Elevavtaler.' : ''
        })
    }
</script>

<DsDialog bind:open width="46rem" labelledby="remisse-title" closedby={saving ? 'none' : 'any'}>
    {#if contract}
        <div>
            <h2 class="ds-heading" data-size="sm" id="remisse-title">Registrer innbetaling</h2>
            <div class="meta">
                <DsTag>{contract.elevInfo?.navn}</DsTag>
                <DsTag>{contract.unSignedskjemaInfo?.kontraktType}</DsTag>
            </div>
        </div>
        <p class="ds-paragraph" data-size="sm">Registrer beløpet fra remissen på riktig faktura. Er hele summen betalt, settes status til Betalt. Har eleven en nyere avtale med de samme ratene, oppdateres den også.</p>

        <div class="rates">
            {#each rateKeys.filter(key => edits[key]) as key (key)}
                {@const rate = contract.fakturaInfo[key]}
                {@const edit = edits[key]}
                {@const sum = rateSum(rate)}
                {@const inkasso = isInkasso(rate)}
                {@const correcting = (inkasso && edit.correcting) || reverting(rate, edit.status)}
                {@const otherInkasso = rateKeys.some(other => other !== key && isInkasso(contract.fakturaInfo[other]))}
                {@const amountErr = amountError(rate, edit.amount, otherInkasso)}
                {@const added = !edit.correcting && !amountErr && toAmount(edit.amount) > 0 ? toAmount(edit.amount) : 0}
                {@const statusErr = statusError(rate, edit.status, edit.amount)}
                {@const needsDate = toAmount(edit.amount) > 0 || edit.status === 'Betalt'}
                <fieldset class="rate" class:locked={!isRemisseRate(rate)}>
                    <legend>Faktura {key.slice(-1)} <StatusTag status={rate.status} /></legend>
                    {#if !isRemisseRate(rate)}
                        <p class="ds-paragraph full" data-size="sm">Kan ikke endres her. Bare rater med status Overført inkasso, eller som er satt til Betalt her, kan endres.</p>
                    {:else}
                        {#if inkasso}
                            <div class="full meter">
                                <span><strong>{formatKr(paidSoFar(rate) + added)}</strong> {sum !== null ? `av ${formatKr(sum)} betalt` : 'betalt (sum ukjent)'}</span>
                                {#if sum !== null}
                                    <div class="track" aria-hidden="true">
                                        <span style="width: {Math.min(paidSoFar(rate) / sum, 1) * 100}%"></span>
                                        <span class="add" style="width: {Math.min(added / sum, 1) * 100}%"></span>
                                    </div>
                                {/if}
                            </div>
                            {#if edit.correcting}
                                <div class="field">
                                    <DsInput label="Innbetalt beløp (kr)" inputmode="decimal" error={correctionError(rate, edit.correction)} bind:value={edits[key].correction} />
                                    {#if !correctionError(rate, edit.correction)}<span class="hint">Det som faktisk er betalt til nå</span>{/if}
                                    <button class="ds-link link-button" type="button" on:click={() => toggleCorrecting(key)}>Avbryt retting</button>
                                </div>
                            {:else}
                                <div class="field">
                                    <DsInput
                                        label="Innbetaling (kr)"
                                        inputmode="decimal"
                                        value={edit.amount}
                                        error={amountErr}
                                        on:input={(event) => amountChanged(key, event.target.value)}
                                    />
                                    {#if !amountErr && remaining(rate) !== null}<span class="hint">Gjenstår {formatKr(remaining(rate))}</span>{/if}
                                    {#if paidSoFar(rate) > 0}<button class="ds-link link-button" type="button" on:click={() => toggleCorrecting(key)}>Rett innbetalt beløp</button>{/if}
                                </div>
                                <div class="field">
                                    <DsInput type="date" label="Innbetalt dato" error={needsDate ? dateError(edit.date) : ''} bind:value={edits[key].date} />
                                    {#if !(needsDate && dateError(edit.date))}<span class="hint">Datoen på remissen</span>{/if}
                                </div>
                            {/if}
                        {:else}
                            <p class="ds-paragraph full muted" data-size="sm">
                                Betalt {formatShortDate(rate.betaltDato) || '(dato mangler)'}{rate.betaltBeløp ? ` · ${formatKr(paidSoFar(rate))}${sum !== null ? ` av ${formatKr(sum)}` : ''}` : ''}
                            </p>
                        {/if}
                        {#if !(inkasso && edit.correcting)}
                            <div class="field">
                                <DsSelect label="Status" error={statusErr} bind:value={edits[key].status} on:change={() => statusChanged(key)}>
                                    <option value="">Uendret ({rate.status})</option>
                                    {#each REMISSE_STATUSES.filter(status => status.toLowerCase() !== String(rate.status).toLowerCase()) as status}<option value={status}>{status}</option>{/each}
                                </DsSelect>
                                <!-- Hints only when DsSelect shows no error. -->
                                {#if !statusErr && edit.status === 'Betalt' && !edit.statusTouched}
                                    <span class="suggest"><span class="material-symbols-outlined" aria-hidden="true">check_circle</span>Hele beløpet er betalt, så Betalt er valgt.</span>
                                {:else if !statusErr && edit.status === 'Betalt' && edit.amount.trim() === '' && remaining(rate) !== null}
                                    <span class="hint">Resten ({formatKr(remaining(rate))}) registreres som betalt.</span>
                                {:else if edit.status === 'Overført inkasso'}
                                    <span class="hint">Betalt dato fjernes.</span>
                                {/if}
                            </div>
                        {/if}
                        {#if reverting(rate, edit.status)}
                            <div class="field">
                                <DsInput label="Innbetalt beløp (kr)" inputmode="decimal" error={correctionError(rate, edit.correction)} bind:value={edits[key].correction} />
                                {#if !correctionError(rate, edit.correction)}
                                    <span class="hint">{amountBeforeBetalt(key) !== '' ? `Før fakturaen ble satt til Betalt: ${formatKr(amountBeforeBetalt(key))}` : 'Det som faktisk er betalt'}</span>
                                {/if}
                            </div>
                        {/if}
                        <div class="full">
                            <DsInput
                                label="Forklaring ({edit.comment.length}/128)"
                                maxlength={128}
                                placeholder={correcting ? 'Påkrevd når beløpet rettes ned' : 'Valgfritt, for eksempel remissens nummer'}
                                error={correcting ? reasonError(rate, edit.correction, edit.comment) : ''}
                                bind:value={edits[key].comment}
                            />
                        </div>
                    {/if}
                </fieldset>
            {/each}
        </div>

        {#if error}
            <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{error}</p></DsAlert>
        {/if}
    {/if}

    <svelte:fragment slot="footer">
        <DsButton loading={saving} loadingText="Lagrer …" on:click={save}>Lagre</DsButton>
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

    .rates {
        display: grid;
        gap: var(--ds-size-4);
    }

    .rate {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        padding: var(--ds-size-5);
        margin: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
        gap: var(--ds-size-5) var(--ds-size-6);
    }

    @media (max-width: 640px) {
        .rate { grid-template-columns: 1fr; }
    }

    .rate.locked { background: var(--ds-color-neutral-background-tinted); }

    .rate legend {
        font-weight: 700;
        padding-inline: 0.3rem;
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .full { grid-column: 1 / -1; }

    .field {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .hint {
        font-size: 0.85rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .link-button {
        align-self: flex-start;
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .suggest {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.85rem;
        color: var(--ds-color-success-text-default);
    }

    .meter {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.9rem;
        font-variant-numeric: tabular-nums;
    }

    .track {
        display: flex;
        height: 0.45rem;
        border-radius: var(--ds-border-radius-full);
        background: var(--ds-color-neutral-surface-active);
        overflow: hidden;
    }

    .track span { background: var(--ds-color-success-base-default); }

    .track .add {
        background: repeating-linear-gradient(45deg, var(--ds-color-success-base-default) 0 4px, var(--ds-color-success-surface-active) 4px 8px);
    }
</style>
