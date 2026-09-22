<script>
    /**
     * Designsystemet button. Only beats app.css's bare `button {}` rule because that rule sits in
     * @layer app.base, ordered before ds.components - see the layer declaration in app.css.
     */
    import DsSpinner from './DsSpinner.svelte'

    export let variant = 'primary' // primary | secondary | tertiary
    export let color = undefined // accent (default) | danger | neutral | ...
    export let type = 'button'
    export let disabled = false
    export let loading = false
    export let size = 'md'
    /** Replaces the label while loading, so the button says what it is doing. */
    export let loadingText = ''
</script>

<!--
    aria-busy keeps a loading button readable: Designsystemet renders any disabled button at 30%
    opacity, but `.ds-button[aria-busy=true]:disabled` restores it to 1.

    Prefer leaving a button enabled and explaining on click over disabling it for invalid input - a
    30%-opacity button is unreadable and silent about why.
-->
<button
    class="ds-button"
    data-variant={variant}
    data-color={color}
    data-size={size}
    {type}
    disabled={disabled || loading}
    aria-busy={loading ? 'true' : undefined}
    on:click
>
    {#if loading}
        <DsSpinner size="2xs" />
    {/if}
    {#if loading && loadingText}
        {loadingText}
    {:else}
        <slot />
    {/if}
</button>
