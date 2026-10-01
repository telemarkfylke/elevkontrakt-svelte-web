<script>
    // Page buttons with the Designsystemet look. bind:current is 1-based. Hidden when there is one page.
    import { createEventDispatcher } from 'svelte'

    export let current = 1
    export let total = 1
    export let label = 'Sidenavigering'

    const dispatch = createEventDispatcher()

    // First, last, and the pages next to the current one. The rest collapse to "…".
    $: pages = Array.from({ length: total }, (_, i) => i + 1).reduce((list, page) => {
        if (page === 1 || page === total || Math.abs(page - current) <= 1) list.push(page)
        else if (list[list.length - 1] !== '…') list.push('…')
        return list
    }, [])

    function go (page) {
        if (page < 1 || page > total || page === current) return
        current = page
        dispatch('change', page)
    }
</script>

{#if total > 1}
    <nav class="ds-pagination" aria-label={label} data-size="sm">
        <ul>
            <li><button class="ds-button" data-variant="tertiary" type="button" disabled={current === 1} on:click={() => go(current - 1)}>Forrige</button></li>
            {#each pages as page}
                <li>
                    {#if page === '…'}
                        <span aria-hidden="true">…</span>
                    {:else}
                        <button
                            class="ds-button"
                            data-variant={page === current ? 'primary' : 'tertiary'}
                            type="button"
                            aria-current={page === current ? 'true' : undefined}
                            aria-label="Side {page}"
                            on:click={() => go(page)}
                        >{page}</button>
                    {/if}
                </li>
            {/each}
            <li><button class="ds-button" data-variant="tertiary" type="button" disabled={current === total} on:click={() => go(current + 1)}>Neste</button></li>
        </ul>
    </nav>
{/if}
