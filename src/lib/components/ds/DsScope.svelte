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
     *
     * designsystemet-web is the behaviour half: dialog closedby, command/commandfor invokers,
     * data-tooltip, popover, <ds-field>, <ds-pagination> and friends. Registered globally on first
     * import; the app is ssr = false so it only ever runs in the browser.
     */
    import '$lib/styles/layers.css'
    import '@digdir/designsystemet-css'
    import '$lib/styles/designsystemet/telemark.css'
    import '@digdir/designsystemet-web'

    // Its deprecation and missing-attribute warnings are for us, not for users.
    if (!import.meta.env.DEV) window.dsWarnings = false
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
     * Buttons follow telemarkfylke.no: pill shape and a bold label. Colours stay Designsystemet's,
     * so primary is white on the Vann accent (#005260, ~9:1) - the same as the website.
     * 700 rather than a --ds-font-weight-* token: the theme stops at semibold (600), and the site
     * uses Nunito Sans bold, which app.css loads.
     */
    .ds-scope :global(.ds-button) {
        --dsc-button-border-radius: var(--ds-border-radius-full);
        font-weight: 700;
    }

    /* On the website these are links, and links are underlined. Action <button>s are not. */
    .ds-scope :global(a.ds-button) {
        text-decoration: underline;
    }
</style>
