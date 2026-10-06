<script>
    /**
     * Tabs with the Designsystemet look. bind:value selects the tab; the panel is the default slot (let:value).
     * tabs: [{ value, label, icon?, count?, dot? }] - dot is the screen reader text for an attention dot.
     */
    import { tick } from 'svelte'

    export let tabs = []
    export let value = tabs[0]?.value
    export let label = ''
    export let size = 'md'

    const id = `ds-tabs-${Math.random().toString(36).slice(2, 9)}`
    let tablist

    async function select (next, focus = false) {
        value = next
        if (!focus) return
        await tick()
        tablist.querySelector(`[data-value="${next}"]`)?.focus()
    }

    function handleKeydown (event) {
        const current = tabs.findIndex(tab => tab.value === value)
        const target = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }[event.key]
        if (target === undefined) return
        event.preventDefault()
        select(tabs[(target + tabs.length) % tabs.length].value, true)
    }
</script>

<div class="ds-tabs" data-size={size}>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <div role="tablist" aria-label={label || undefined} bind:this={tablist} on:keydown={handleKeydown}>
        {#each tabs as tab (tab.value)}
            <button
                type="button"
                role="tab"
                id="{id}-{tab.value}"
                data-value={tab.value}
                aria-selected={tab.value === value}
                aria-controls="{id}-panel"
                tabindex={tab.value === value ? 0 : -1}
                on:click={() => select(tab.value)}
            >
                {#if tab.icon}<span class="material-symbols-outlined" aria-hidden="true">{tab.icon}</span>{/if}
                {tab.label}
                {#if tab.count !== undefined}<span class="count">{tab.count}</span>{/if}
                {#if tab.dot}<span class="dot"><span class="ds-sr-only">{tab.dot}</span></span>{/if}
            </button>
        {/each}
    </div>
    <div role="tabpanel" id="{id}-panel" aria-labelledby="{id}-{value}" tabindex="0">
        <slot {value} />
    </div>
</div>

<style>
    [role='tab'] {
        display: inline-flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .count {
        font-size: 0.8rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        padding: 0 0.45rem;
        border-radius: var(--ds-border-radius-full);
        background: var(--ds-color-neutral-surface-tinted);
    }

    .dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--ds-color-warning-base-default);
    }

    [role='tabpanel'] {
        padding-top: var(--ds-size-4);
    }
</style>
