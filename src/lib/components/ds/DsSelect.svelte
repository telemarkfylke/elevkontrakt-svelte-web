<script>
    /**
     * Designsystemet select. Same prop shape as the hand-rolled Select.svelte (value, error, label)
     * plus a description slot line, so a later swap is mechanical.
     *
     * Note .ds-input also styles <select> — Designsystemet has no separate .ds-select class.
     */
    export let value = ''
    export let label = ''
    export let error = ''
    export let description = ''
    export let disabled = false
    export let id = `ds-select-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="ds-field">
    {#if label}
        <label class="ds-label" for={id}>{label}</label>
    {/if}
    {#if description}
        <p class="ds-paragraph" data-size="sm" data-field="description">{description}</p>
    {/if}
    <select
        {id}
        class="ds-input"
        {disabled}
        bind:value
        aria-invalid={error ? 'true' : undefined}
        on:change
        on:blur
    >
        <slot />
    </select>
    {#if error}
        <p class="ds-validation-message" data-size="sm">{error}</p>
    {/if}
</div>
