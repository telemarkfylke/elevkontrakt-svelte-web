<script>
    /**
     * Designsystemet alert. `color` says who must act: danger = the admin, warning = someone else
     * (e.g. an archive administrator), info = context.
     * dismissible adds a close button that fires `dismiss`; the parent removes the alert.
     */
    import { createEventDispatcher } from 'svelte'

    export let color = 'info' // info | warning | danger | success
    export let heading = ''
    export let dismissible = false
    export let dismissLabel = 'Lukk meldingen'

    const dispatch = createEventDispatcher()
</script>

<div class="ds-alert" class:dismissible data-color={color} role={color === 'danger' ? 'alert' : 'status'}>
    <div class="ds-alert-body">
        {#if heading}
            <p class="ds-heading" data-size="2xs">{heading}</p>
        {/if}
        <slot />
    </div>
    {#if dismissible}
        <button class="ds-button close" data-variant="tertiary" data-size="sm" data-icon type="button" aria-label={dismissLabel} on:click={() => dispatch('dismiss')}>
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
    {/if}
</div>

<style>
    /* Slotted paragraphs carry no margin of their own, so the body sets its own rhythm. */
    .ds-alert-body {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .dismissible {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--ds-size-3);
    }

    .close {
        margin-block: calc(-1 * var(--ds-size-2));
    }
</style>
