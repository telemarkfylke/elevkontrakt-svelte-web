<script>
    /**
     * Designsystemet and the Telemark theme. Wraps the whole app from the root layout.
     * layers.css must load first: the first @layer statement sets the layer order.
     * designsystemet-web adds the behaviour: dialog closedby, tooltips, popovers and more.
     */
    import '$lib/styles/layers.css'
    import '@digdir/designsystemet-css'
    import '$lib/styles/designsystemet/telemark.css'
    import '@digdir/designsystemet-web'

    // Its warnings are for us, not for users.
    if (!import.meta.env.DEV) window.dsWarnings = false
</script>

<!-- Light only: the app has no dark mode. data-typography primary = Nunito Sans for body. -->
<div class="ds-scope" data-color-scheme="light" data-size="md" data-typography="primary">
    <slot />
</div>

<style>
    /* Nunito for headings, Nunito Sans for body, per the designmanual. */
    .ds-scope :global(.ds-heading) {
        font-family: 'Nunito', 'Nunito Sans', Lato, sans-serif;
    }

    /* Buttons follow telemarkfylke.no: pill shape and a bold label. */
    .ds-scope :global(.ds-button) {
        --dsc-button-border-radius: var(--ds-border-radius-full);
        font-weight: 700;
    }

    /* On the website these are links, and links are underlined. Action <button>s are not. */
    .ds-scope :global(a.ds-button) {
        text-decoration: underline;
    }
</style>
