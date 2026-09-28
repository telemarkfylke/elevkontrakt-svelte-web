<script>
    /**
     * Designsystemet card. With href it renders as a link, and the whole card is clickable
     * (Designsystemet styles a.ds-card itself, no JS needed).
     */
    export let color = undefined
    export let href = undefined
</script>

{#if href}
    <a class="ds-card" data-color={color} {href}>
        <slot />
    </a>
{:else}
    <div class="ds-card" data-color={color}>
        <slot />
    </div>
{/if}
