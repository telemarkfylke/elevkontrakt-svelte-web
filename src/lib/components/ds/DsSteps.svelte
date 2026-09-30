<script>
    /**
     * Step line, e.g. Signert → PC utlevert → Innlevert.
     * steps: [{ label, done, date?, icon?, tone?, mark?, pending? }] - pending replaces "Ikke ennå" for that step
     * - icon: small icon after the label, e.g. 'shopping_cart' for "Kjøpt ut"
     * - tone: 'plomme' | 'danger' marks an alternative ending (Kreditert, Overført inkasso); mark is its dot icon
     */
    export let steps = []
    export let label = ''
    export let pending = 'Ikke ennå'
</script>

<ol class="steps" aria-label={label || undefined} style:--count={steps.length}>
    {#each steps as step}
        <li class:done={step.done} class:alt={step.tone} data-tone={step.tone}>
            <span class="dot" aria-hidden="true">
                {#if step.tone}
                    <span class="material-symbols-outlined">{step.mark ?? 'check'}</span>
                {:else if step.done}
                    <span class="material-symbols-outlined">check</span>
                {/if}
            </span>
            <span class="label">
                {step.label}
                {#if step.icon}<span class="material-symbols-outlined how" aria-hidden="true">{step.icon}</span>{/if}
                <span class="ds-sr-only">: {step.done || step.tone ? 'fullført' : 'ikke ennå'}</span>
            </span>
            <span class="date">{step.done || step.tone ? (step.date ?? '') : (step.pending ?? pending)}</span>
        </li>
    {/each}
</ol>

<style>
    .steps {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(var(--count), 1fr);
    }

    li {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-top: 2.1rem;
        font-size: 0.9rem;
    }

    .dot {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--ds-color-neutral-background-default);
        border: 2px solid var(--ds-color-neutral-border-default);
        color: var(--ds-color-accent-base-contrast-default);
    }

    .dot .material-symbols-outlined {
        font-size: 1rem;
        font-weight: 700;
    }

    .done .dot {
        background: var(--ds-color-accent-base-default);
        border-color: var(--ds-color-accent-base-default);
    }

    .alt[data-tone='plomme'] .dot {
        background: var(--ds-color-plomme-base-default);
        border-color: var(--ds-color-plomme-base-default);
    }

    .alt[data-tone='danger'] .dot {
        background: var(--ds-color-danger-base-default);
        border-color: var(--ds-color-danger-base-default);
    }

    /* Line to the next step: solid between two done steps, dashed otherwise. */
    li:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 0.7rem;
        left: 1.5rem;
        right: 0;
        border-top: 2px dashed var(--ds-color-neutral-border-default);
    }

    li.done:not(:last-child):has(+ li.done, + li.alt)::after {
        border-top-style: solid;
        border-color: var(--ds-color-accent-base-default);
    }

    .label {
        font-weight: 700;
    }

    li:not(.done):not(.alt) .label {
        font-weight: 600;
        color: var(--ds-color-neutral-text-subtle);
    }

    .how {
        font-size: 1rem;
        color: var(--ds-color-accent-text-subtle);
        vertical-align: -3px;
    }

    .date {
        font-size: 0.8rem;
        color: var(--ds-color-neutral-text-subtle);
        font-variant-numeric: tabular-nums;
    }
</style>
