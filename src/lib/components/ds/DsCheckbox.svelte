<script>
    // Checkbox, radio or switch in a Designsystemet field. Checkbox/switch: bind:checked. Radio: bind:group + value.
    export let type = 'checkbox' // checkbox | radio | switch
    export let label = ''
    export let description = ''
    export let checked = false
    export let group = undefined
    export let value = undefined
    export let name = undefined
    export let disabled = false
    export let id = `ds-check-${Math.random().toString(36).slice(2, 9)}`

    function handleChange (event) {
        if (type === 'radio') group = value
        else checked = event.target.checked
    }
</script>

<div class="ds-field">
    <input
        {id}
        class="ds-input"
        type={type === 'switch' ? 'checkbox' : type}
        role={type === 'switch' ? 'switch' : undefined}
        {name}
        {value}
        {disabled}
        checked={type === 'radio' ? group === value : checked}
        on:change={handleChange}
        on:change
    />
    <label class="ds-label" for={id} data-weight="regular">{label}<slot /></label>
    {#if description}
        <p class="ds-paragraph" data-size="sm" data-field="description">{description}</p>
    {/if}
</div>
