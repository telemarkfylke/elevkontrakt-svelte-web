<script>
    /**
     * Designsystemet file upload - a dashed drop zone rather than raw browser file-input chrome.
     *
     * .ds-file-upload positions the real <input type="file"> across the whole box at opacity 0, so
     * the entire area is clickable and drop-capable. That is also why there is no "Velg fil" button:
     * it would sit under the input, unable to receive the click.
     */
    export let label = ''
    export let description = 'Dra filen hit, eller klikk for å velge'
    export let accept = undefined
    export let error = ''
    export let disabled = false
    export let file = null
    export let id = `ds-file-${Math.random().toString(36).slice(2, 9)}`

    /** Emits the chosen File, or null when cleared. Base64 encoding stays the caller's concern. */
    export let onSelect = () => {}

    let inputEl
    let rejected = ''

    /**
     * `accept` only filters the picker dialog - a drag-and-drop, or picking "all files", walks
     * straight past it. Extension is checked as well as MIME because Windows reports .csv as
     * application/vnd.ms-excel often enough that type alone would reject valid files.
     */
    const matchesAccept = (candidate) => {
        if (!accept || !candidate) return true
        const name = candidate.name.toLowerCase()
        const type = (candidate.type || '').toLowerCase()
        return accept.split(',').map(a => a.trim().toLowerCase()).filter(Boolean).some(pattern => {
            if (pattern.startsWith('.')) return name.endsWith(pattern)
            if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1))
            return type === pattern
        })
    }

    const rejectionMessage = (candidate) => {
        const wanted = (accept ?? '').split(',').map(a => a.trim()).filter(a => a.startsWith('.'))
        const list = wanted.length === 0
            ? 'en støttet filtype'
            : wanted.length === 1
                ? `en ${wanted[0]}-fil`
                : `en fil av typen ${wanted.join(' eller ')}`
        return `«${candidate.name}» kan ikke brukes. Velg ${list}.`
    }

    const handleChange = (event) => {
        const picked = event?.target?.files?.[0] ?? null

        if (picked && !matchesAccept(picked)) {
            rejected = rejectionMessage(picked)
            file = null
            if (inputEl) inputEl.value = ''
            onSelect(null)
            return
        }

        rejected = ''
        file = picked
        onSelect(file)
    }

    const clear = () => {
        file = null
        rejected = ''
        if (inputEl) inputEl.value = ''
        onSelect(null)
    }

    $: message = error || rejected

    const formatSize = (bytes) => {
        if (!bytes && bytes !== 0) return ''
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
</script>

<div class="ds-field">
    {#if label}
        <label class="ds-label" for={id}>{label}</label>
    {/if}

    <div class="ds-file-upload">
        <input
            {id}
            bind:this={inputEl}
            type="file"
            {accept}
            {disabled}
            aria-invalid={message ? 'true' : undefined}
            on:change={handleChange}
        />
        <p class="ds-paragraph" data-size="sm" data-field="description">{description}</p>
    </div>

    {#if file}
        <ul class="selected-list">
            <li class="selected">
                <span class="ds-tag" data-color="success" data-size="sm">Valgt</span>
                <span class="filename">{file.name}</span>
                <span class="ds-paragraph filesize" data-size="sm">{formatSize(file.size)}</span>
                <!--
                    Icon-only, so it needs an explicit name - the ligature text is the glyph, not a label.
                -->
                <button
                    type="button"
                    class="remove"
                    aria-label="Fjern {file.name}"
                    title="Fjern filen"
                    on:click={clear}
                >
                    <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
            </li>
        </ul>
    {/if}

    {#if message}
        <p class="ds-validation-message" data-size="sm" role="alert">{message}</p>
    {/if}
</div>

<style>
    /**
     * DS's default sits the icon close to the top edge. Set through its own custom property rather
     * than a padding override, with more at the top since the icon leads.
     */
    .ds-file-upload {
        --dsc-file-upload-padding: var(--ds-size-10) var(--ds-size-6) var(--ds-size-8);
    }

    /* A list, so a multi-file version needs no markup change. */
    .selected-list {
        list-style: none;
        margin: var(--ds-size-4, 1rem) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2, 0.5rem);
    }

    .selected {
        display: flex;
        align-items: center;
        gap: var(--ds-size-3, 0.75rem);
        flex-wrap: wrap;
        padding: var(--ds-size-3, 0.75rem) var(--ds-size-4, 1rem);
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md, 4px);
        background: var(--ds-color-neutral-surface-tinted);
    }

    .filename {
        font-weight: var(--ds-font-weight-medium, 600);
        /* A long filename must not push the remove button off the row. */
        overflow-wrap: anywhere;
        min-width: 0;
    }

    .filesize {
        color: var(--ds-color-neutral-text-subtle);
    }

    /* Bare icon button. */
    .remove {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 6px;
        color: var(--ds-color-neutral-text-subtle);
        transition: background 0.1s, color 0.1s;
        /* Trailing edge, so the control stays put whatever the filename length. */
        margin-inline-start: auto;
    }

    .remove:hover {
        background: var(--ds-color-danger-surface-tinted);
        color: var(--ds-color-danger-text-default);
    }

    .remove:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        .remove { transition: none; }
    }

    /* Re-declared per component, since Svelte scopes styles. */
    .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        font-size: 1.25rem;
        line-height: 1;
    }
</style>
