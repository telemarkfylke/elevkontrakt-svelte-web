<script>
    /**
     * Designsystemet, and the Telemark theming on top of it.
     *
     * Imported here rather than in the root layout so Vite keeps it out of the routes that do not
     * use it - no existing page changes appearance. Any route that wants Designsystemet wraps its
     * content in this.
     *
     * layers.css MUST stay first: layer order is decided by the first @layer statement loaded.
     * See layers.css.
     */
    import '$lib/styles/layers.css'
    import '@digdir/designsystemet-css'
    import '$lib/styles/designsystemet/telemark.css'
</script>

<!-- Light only: the app has no dark mode. data-typography primary = Nunito Sans for body. -->
<div class="ds-scope" data-color-scheme="light" data-size="md" data-typography="primary">
    <slot />
</div>

<style>
    /* The designmanual pairs Nunito for headings with Nunito Sans for body. app.css imports both,
       but Nunito was never referenced by any font-family - this finishes that. */
    .ds-scope :global(.ds-heading) {
        font-family: 'Nunito', 'Nunito Sans', Lato, sans-serif;
    }

    /**
     * Primary buttons follow the rest of the app: himmel background, black label, black border.
     * Designsystemet's own primary is the Vann accent with white text, which would make these pages
     * the odd ones out. Set through its --dsc-button-* properties so sizing, focus and disabled
     * handling stay.
     *
     * The background has to move with the label: #000 on himmel-20 is ~16:1, but on the dark Vann
     * accent it would be ~1.9:1.
     */
    .ds-scope :global(.ds-button[data-variant='primary']) {
        --dsc-button-background: var(--himmel-20);
        --dsc-button-background--hover: var(--himmel-30);
        --dsc-button-background--active: var(--himmel-40);
        --dsc-button-color: #000;
        --dsc-button-color--hover: #000;
        --dsc-button-color--active: #000;
        --dsc-button-border-color: #000;
    }
</style>
