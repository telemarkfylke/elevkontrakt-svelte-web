<script>
    /**
     * Designsystemet, scoped to /contract - imported here rather than in the root layout so Vite
     * keeps it in this route's chunk and no other route changes appearance.
     *
     * @digdir/designsystemet-react is React-only; the -css package is plain CSS driven by data-*
     * attributes.
     *
     * layers.css MUST stay first: layer order is decided by the first @layer statement loaded, and
     * this route's CSS must not be able to fix it before app.css gets the chance. See layers.css.
     */
    import '$lib/styles/layers.css'
    import '@digdir/designsystemet-css'
    import '$lib/styles/designsystemet/telemark.css'
</script>

<!-- Light only: the app has no dark mode. data-typography primary = Nunito Sans for body. -->
<div class="ds-contract" data-color-scheme="light" data-size="md" data-typography="primary">
    <slot />
</div>

<style>
    /* The designmanual pairs Nunito for headings with Nunito Sans for body. app.css imports both,
       but Nunito was never referenced by any font-family - this finishes that. */
    .ds-contract :global(.ds-heading) {
        font-family: 'Nunito', 'Nunito Sans', Lato, sans-serif;
    }

    /* Already inside .contentContainer, so no width or padding is re-declared here. */
    .ds-contract {
        padding-block: 1rem 3rem;
    }

    /**
     * Primary buttons follow the rest of the app: himmel background, black label, black border.
     * Designsystemet's own primary is the Vann accent with white text, which makes /contract the odd
     * one out. Set through its --dsc-button-* properties so sizing, focus and disabled handling stay.
     *
     * The background has to move with the label: #000 on himmel-20 is ~16:1, but on the dark Vann
     * accent it would be ~1.9:1.
     */
    .ds-contract :global(.ds-button[data-variant='primary']) {
        --dsc-button-background: var(--himmel-20);
        --dsc-button-background--hover: var(--himmel-30);
        --dsc-button-background--active: var(--himmel-40);
        --dsc-button-color: #000;
        --dsc-button-color--hover: #000;
        --dsc-button-color--active: #000;
        --dsc-button-border-color: #000;
    }
</style>
