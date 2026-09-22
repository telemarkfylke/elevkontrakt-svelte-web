<script>
    /** Designsystemet card, used to present a resolved person or organisation read-only. */
    export let color = undefined
</script>

<div class="ds-card" data-color={color}>
    <slot />
</div>
