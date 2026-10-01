<script>
    /**
     * Icon button that opens a Designsystemet dropdown (native popover, placed by designsystemet-web).
     * Put <li><button class="ds-button" data-variant="tertiary">…</button></li> items in the slot.
     */
    export let label = 'Flere handlinger' // accessible name for the icon-only button
    export let icon = 'more_horiz'
    export let placement = 'bottom-end'

    const id = `ds-dropdown-${Math.random().toString(36).slice(2, 9)}`
    let popover

    export const close = () => popover?.hidePopover()
</script>

<button class="ds-button" data-variant="tertiary" data-size="sm" data-icon type="button" popovertarget={id} aria-label={label}>
    <span class="material-symbols-outlined" aria-hidden="true">{icon}</span>
</button>
<!-- A click on an item closes the menu. -->
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="ds-dropdown" popover {id} bind:this={popover} data-placement={placement} on:click={close}>
    <ul><slot /></ul>
</div>
