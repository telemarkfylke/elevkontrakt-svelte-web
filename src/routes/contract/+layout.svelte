<script>
    /**
     * @digdir/designsystemet-react is React-only; the -css package is plain CSS driven by data-*
     * attributes. DsScope carries the imports, the theme wrapper and the shared Telemark overrides,
     * so every Designsystemet route is themed identically rather than each re-declaring them.
     */
    import DsScope from '$lib/components/ds/DsScope.svelte'
</script>

<DsScope>
    <!-- Already inside .contentContainer, so no width is re-declared here. -->
    <div class="contract-page">
        <slot />
    </div>
</DsScope>

<style>
    .contract-page {
        padding-block: 1rem 3rem;
    }
</style>
