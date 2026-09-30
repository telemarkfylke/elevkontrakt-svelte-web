<script>
    // Designsystemet textarea. With maxlength it shows a "12/200" counter next to the label.
    export let value = ''
    export let label = ''
    export let description = ''
    export let error = ''
    export let placeholder = ''
    export let maxlength = undefined
    export let rows = 3
    export let disabled = false
    export let id = `ds-textarea-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="ds-field">
    <div class="label-row">
        {#if label}<label class="ds-label" for={id}>{label}</label>{/if}
        {#if maxlength}<span class="counter" aria-live="polite">{value.length}/{maxlength}</span>{/if}
    </div>
    {#if description}
        <p class="ds-paragraph" data-size="sm" data-field="description">{description}</p>
    {/if}
    <textarea
        {id}
        class="ds-input"
        {rows}
        {placeholder}
        {maxlength}
        {disabled}
        bind:value
        aria-invalid={error ? 'true' : undefined}
        on:input
        on:blur
    ></textarea>
    {#if error}
        <p class="ds-validation-message" data-size="sm">{error}</p>
    {/if}
</div>

<style>
    .label-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--ds-size-2);
    }

    .counter {
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
        color: var(--ds-color-neutral-text-subtle);
    }
</style>
