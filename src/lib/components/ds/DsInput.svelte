<script>
    /**
     * Designsystemet text input.
     *
     * Same prop shape as the hand-rolled Input.svelte (value, error, label, disabled, placeholder,
     * maxlength) so the two can be swapped mechanically when the other routes migrate. The
     * difference is the markup: .ds-field wraps, .ds-label labels, .ds-input styles, and
     * .ds-validation-message replaces the hard-coded #f55 error text.
     */
    export let type = 'text'
    export let value = ''
    export let label = ''
    export let error = ''
    export let description = ''
    export let disabled = false
    export let readonly = false
    export let placeholder = ''
    export let maxlength = undefined
    export let inputmode = undefined
    export let id = `ds-input-${Math.random().toString(36).slice(2, 9)}`

    const handleInput = ({ target }) => { value = target.value }
</script>

<div class="ds-field">
    {#if label}
        <label class="ds-label" for={id}>{label}</label>
    {/if}
    {#if description}
        <p class="ds-paragraph" data-size="sm" data-field="description">{description}</p>
    {/if}
    <input
        {id}
        class="ds-input"
        {type}
        {placeholder}
        {disabled}
        {readonly}
        {maxlength}
        {inputmode}
        {value}
        aria-invalid={error ? 'true' : undefined}
        on:input={handleInput}
        on:input
        on:blur
        on:keypress
    />
    {#if error}
        <p class="ds-validation-message" data-size="sm">{error}</p>
    {/if}
</div>
