<script>
    /**
     * Designsystemet spinner. Must be an <svg> with two <circle> children - the stylesheet draws it
     * entirely through stroke properties, so a <span class="ds-spinner"> renders as empty space.
     *
     * Sizes are fixed heights: 2xs .75rem, xs 1.25rem, sm 2rem. Inline in a button wants xs or less.
     */
    export let size = 'xs'
    /** Accessible label. Leave empty inside a button that already carries aria-busy. */
    export let title = ''
</script>

<svg
    class="ds-spinner"
    data-size={size}
    viewBox="0 0 50 50"
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
    aria-label={title || undefined}
>
    <circle class="ds-spinner__background" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
    <circle class="ds-spinner__circle" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
</svg>

<style>
    /* Follow the surrounding text rather than Designsystemet's default grey border colour, so the
       spinner stays legible on the himmel primary button as well as on a light surface. */
    .ds-spinner {
        --dsc-spinner-stroke: currentColor;
        --dsc-spinner-background: color-mix(in srgb, currentColor 20%, transparent);
    }
</style>
