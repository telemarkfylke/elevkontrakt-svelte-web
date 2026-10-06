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
    export let autocomplete = undefined
    export let icon = undefined // Material Symbols name shown inside the field, e.g. 'search'
    export let id = `ds-input-${Math.random().toString(36).slice(2, 9)}`

    const handleInput = ({ target }) => { value = target.value }
</script>

<div class="ds-field">
    {#if label && $$slots.label}
        <div class="label-row">
            <label class="ds-label" for={id}>{label}</label>
            <slot name="label" />
        </div>
    {:else if label}
        <label class="ds-label" for={id}>{label}</label>
    {/if}
    {#if description}
        <p class="ds-paragraph" data-size="sm" data-field="description">{description}</p>
    {/if}
    <div class="input-wrap" class:has-icon={icon}>
        {#if icon}<span class="material-symbols-outlined icon" aria-hidden="true">{icon}</span>{/if}
        <input
            {id}
            class="ds-input"
            {type}
            {placeholder}
            {disabled}
            {readonly}
            {maxlength}
            {inputmode}
            {autocomplete}
            {value}
            aria-invalid={error ? 'true' : undefined}
            on:input={handleInput}
            on:input
            on:blur
            on:keypress
            on:keydown
        />
    </div>
    {#if error}
        <p class="ds-validation-message" data-size="sm">{error}</p>
    {/if}
</div>

<style>
    /* Label with something next to it, e.g. a help button. */
    .label-row {
        display: flex;
        align-items: center;
        gap: var(--ds-size-1);
    }

    .input-wrap {
        position: relative;
    }

    .input-wrap input {
        width: 100%;
    }

    .has-icon input {
        padding-inline-start: 2.4rem;
    }

    .icon {
        position: absolute;
        z-index: 1;
        left: 0.7rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--ds-color-neutral-text-subtle);
        pointer-events: none;
    }
</style>
