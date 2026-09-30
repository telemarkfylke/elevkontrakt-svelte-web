<script>
    /**
     * Native <dialog> with the Designsystemet look. Opened and closed through bind:open.
     * placement: undefined (centered) | left (drawer) | right (side panel).
     */
    import { createEventDispatcher } from 'svelte'

    export let open = false
    export let placement = undefined
    export let width = undefined // e.g. '44rem' or 'min(64rem, 66vw)'
    export let labelledby = undefined
    export let label = undefined
    export let closeLabel = 'Lukk'
    // any: Esc and a click outside close it. none: nothing closes it (use while saving).
    export let closedby = 'any'

    const dispatch = createEventDispatcher()
    let dialog

    $: if (dialog) sync(open)

    function sync (isOpen) {
        if (isOpen && !dialog.open) dialog.showModal()
        else if (!isOpen && dialog.open) dialog.close()
    }

    function handleClose () {
        open = false
        dispatch('close')
    }
</script>

<dialog
    bind:this={dialog}
    class="ds-dialog"
    data-placement={placement}
    {closedby}
    aria-labelledby={labelledby}
    aria-label={label}
    style:width
    on:close={handleClose}
>
    {#if closedby !== 'none'}
        <!-- Designsystemet draws the close icon on this button. -->
        <form method="dialog"><button class="ds-button" data-variant="tertiary" data-icon aria-label={closeLabel}></button></form>
    {/if}
    <div class="body">
        <slot />
    </div>
    {#if $$slots.footer}
        <div class="footer"><slot name="footer" /></div>
    {/if}
</dialog>

<style>
    .body {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4);
    }

    .footer {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2);
        margin-top: var(--ds-size-5);
    }

    dialog {
        max-width: calc(100vw - 2rem);
    }

    dialog[data-placement='left'],
    dialog[data-placement='right'] {
        max-width: 100vw;
    }
</style>
