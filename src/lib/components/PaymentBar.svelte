<script>
    // "2 av 3 betalt" with one bar segment per rate, coloured by status.
    import { statusInfo } from '$lib/helpers/status.js'

    export let statuses = [] // e.g. ['Betalt', 'Fakturert', 'Ikke Fakturert']

    $: rates = statuses.map(status => statusInfo(status))
    $: paid = rates.filter(rate => rate.label === 'Betalt').length
</script>

<div class="payment">
    <p class="count"><strong>{paid} av {rates.length}</strong> betalt</p>
    <div class="bar" aria-hidden="true">
        {#each rates as rate}<span data-tone={rate.bar}></span>{/each}
    </div>
    <ul class="legend">
        {#each rates as rate, i}
            <li><span class="swatch" data-tone={rate.bar}></span>F{i + 1} {rate.label}</li>
        {/each}
    </ul>
</div>

<style>
    .count {
        font-size: 0.95rem;
        margin-bottom: var(--ds-size-2);
    }

    .bar {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 3px;
        height: 0.6rem;
        border-radius: var(--ds-border-radius-full);
        overflow: hidden;
    }

    .legend {
        list-style: none;
        margin: var(--ds-size-2) 0 0;
        padding: 0;
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: var(--ds-size-2);
        font-size: 0.8rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .legend li {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
    }

    .swatch {
        flex-shrink: 0;
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
    }

    [data-tone] { background: var(--tone); }
    [data-tone='success'] { --tone: var(--ds-color-success-base-default); }
    [data-tone='korn'] { --tone: var(--ds-color-korn-base-default); }
    [data-tone='plomme'] { --tone: var(--ds-color-plomme-base-default); }
    [data-tone='danger'] { --tone: var(--ds-color-danger-base-default); }
    [data-tone='neutral'] { --tone: var(--ds-color-neutral-border-default); }
    [data-tone='empty'] { --tone: var(--ds-color-neutral-surface-active); }
</style>
