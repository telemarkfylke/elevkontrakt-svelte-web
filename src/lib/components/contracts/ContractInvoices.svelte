<script>
    // The elev's invoices in the side panel on Oversikt, split into Rater and Tilleggstjenester.
    import DsAlert from '../ds/DsAlert.svelte'
    import DsSpinner from '../ds/DsSpinner.svelte'
    import StatusTag from '../StatusTag.svelte'
    import { formatShortDate } from '$lib/helpers/formatDate.js'
    import { invoiceTotal, isPreliminaryInvoice } from '$lib/helpers/prices.js'

    export let invoices = null // null while loading
    export let state = 'ready' // loading | ready | error
    export let settings = null
    export let digiTroll = false

    const GROUPS = [
        { type: 'buyOut', title: 'Rater', icon: 'event_repeat', empty: 'Ingen fakturaer for rater.' },
        { type: 'extraInvoice', title: 'Tilleggstjenester', icon: 'inventory_2', empty: 'Ingen fakturaer for tilleggstjenester.' }
    ]

    const newestFirst = (a, b) => (new Date(b.createdTimeStamp).getTime() || 0) - (new Date(a.createdTimeStamp).getTime() || 0)

    function covers (invoice) {
        const items = invoice.itemsFromCart ?? []
        if (invoice.type === 'buyOut') return items.length === 1 ? '1 rate' : `${items.length} rater`
        return items.map(item => item.name).filter(Boolean).join(', ') || 'Tilleggstjeneste'
    }
</script>

{#if state === 'error'}
    <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">Vi fikk ikke hentet fakturaene. Prøv igjen om litt, og kontakt servicedesk hvis feilen fortsetter.</p></DsAlert>
{:else if state === 'loading' || !invoices}
    <p class="ds-paragraph loading" data-size="sm"><DsSpinner size="xs" />Henter fakturaer …</p>
{:else}
    <div class="groups">
        {#each GROUPS as group (group.type)}
            {@const rows = invoices.filter(i => i.type === group.type).sort(newestFirst)}
            <section class="group">
                <h3 class="ds-heading" data-size="2xs">
                    <span class="material-symbols-outlined" aria-hidden="true">{group.icon}</span>{group.title}
                    <span class="count">{rows.length}</span>
                </h3>
                {#if rows.length}
                    <ul class="rows">
                        {#each rows as invoice (invoice._id)}
                            <li>
                                <a class="row" href="/invoices/{invoice._id}">
                                    <span class="main">
                                        <span class="what">{covers(invoice)}</span>
                                        <span class="date">Opprettet {formatShortDate(invoice.createdTimeStamp) || '–'}</span>
                                    </span>
                                    <span class="amount">
                                        kr {invoiceTotal(invoice, settings)}
                                        {#if isPreliminaryInvoice(invoice, settings)}<small title="Prisen på rater settes når fakturaen sendes kl. 01.00">foreløpig</small>{/if}
                                    </span>
                                    <StatusTag status={invoice.status} kind="invoice" />
                                    <span class="material-symbols-outlined chev" aria-hidden="true">chevron_right</span>
                                </a>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="ds-paragraph empty" data-size="sm">{group.empty}</p>
                {/if}
            </section>
        {/each}
        {#if digiTroll}
            <p class="ds-paragraph note" data-size="sm">Avtalen er hentet fra DigiTroll. Fakturaer som ble laget der, finnes ikke i Elevavtaler. Status for ratene ser du under Oversikt.</p>
        {/if}
    </div>
{/if}

<style>
    .loading {
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
        color: var(--ds-color-neutral-text-subtle);
    }

    .groups {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .group {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    h3 {
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    h3 .material-symbols-outlined {
        font-size: 1.2rem;
        color: var(--ds-color-accent-text-subtle);
    }

    .count {
        min-width: 1.4rem;
        padding: 0 0.4rem;
        border-radius: var(--ds-border-radius-full);
        background: var(--ds-color-neutral-surface-tinted);
        font-size: 0.8rem;
        text-align: center;
    }

    .rows {
        list-style: none;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        overflow: hidden;
    }

    .rows li + li {
        border-top: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto 1.2rem;
        align-items: center;
        gap: var(--ds-size-3);
        padding: var(--ds-size-2) var(--ds-size-3);
        color: var(--ds-color-neutral-text-default);
        text-decoration: none;
        font-variant-numeric: tabular-nums;
    }

    .row:hover {
        background: var(--ds-color-accent-surface-hover);
    }

    .row:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
        outline-offset: -3px;
    }

    .main {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .what {
        font-weight: 600;
        overflow-wrap: anywhere;
    }

    .date {
        font-size: 0.8rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .amount {
        white-space: nowrap;
        text-align: right;
    }

    .amount small {
        display: block;
        font-size: 0.75rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .chev {
        font-size: 1.2rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .empty,
    .note {
        color: var(--ds-color-neutral-text-subtle);
    }

    @media (max-width: 560px) {
        .row { grid-template-columns: minmax(0, 1fr) auto; }
        .row :global(.ds-tag) { grid-column: 1; justify-self: start; }
        .chev { display: none; }
    }
</style>
