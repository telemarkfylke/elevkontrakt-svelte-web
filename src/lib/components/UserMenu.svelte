<script>
    // Name and initials in the topbar. Administrators can open "Vis som rolle" from here.
    import DsButton from './ds/DsButton.svelte'
    import DsCheckbox from './ds/DsCheckbox.svelte'
    import DsDialog from './ds/DsDialog.svelte'
    import DsSelect from './ds/DsSelect.svelte'
    import { ELEVKONTRAKT_ADMIN } from '$lib/helpers/roles.js'
    import { PREVIEW_ROLES, previewRoleInfo, setPreview } from '$lib/helpers/rolePreview.js'
    import { getSchools } from '$lib/useApi.js'

    export let token

    const ADMIN = 'admin'
    let open = false
    let role = ADMIN
    let school = ''
    let schoolError = ''
    let schoolsPromise = null

    $: isAdmin = (token.realRoles ?? token.roles).includes(ELEVKONTRAKT_ADMIN)
    $: needsSchool = previewRoleInfo(role)?.school === true
    $: if (needsSchool && !schoolsPromise) schoolsPromise = getSchools()
    $: if (role || school) schoolError = ''

    function start () {
        role = token.previewRole ?? ADMIN
        school = token.previewSchool ?? ''
        open = true
    }

    function apply () {
        if (role === ADMIN) return setPreview(null)
        if (needsSchool && !school) { schoolError = 'Velg en skole.'; return }
        setPreview({ role, school: needsSchool ? school : null })
    }

    const initials = (name = '') => {
        const parts = name.trim().split(/\s+/)
        return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
    }
</script>

{#if isAdmin}
    <button class="user trigger" type="button" aria-haspopup="dialog" on:click={start}>
        <span class="name">{token.name}</span>
        <span class="ds-avatar" data-size="sm" data-color="accent" aria-hidden="true">{initials(token.name)}</span>
        <span class="material-symbols-outlined chevron" aria-hidden="true">expand_more</span>
        <span class="ds-sr-only">Vis som rolle</span>
    </button>

    <DsDialog bind:open width="30rem" labelledby="preview-title">
        <h2 class="ds-heading" data-size="sm" id="preview-title">Vis som rolle</h2>
        <p class="ds-paragraph" data-size="sm">Se Elevavtaler slik en annen rolle ser det. Det endrer bare hva du ser. Alt du gjør, bruker fortsatt administratortilgangen din.</p>
        <fieldset class="ds-fieldset">
            <legend class="ds-label">Rolle</legend>
            <DsCheckbox type="radio" name="preview-role" label="Administrator (din rolle)" value={ADMIN} bind:group={role} />
            {#each PREVIEW_ROLES as option (option.value)}
                <DsCheckbox type="radio" name="preview-role" label={option.label} description={option.school ? 'Ser bare én skole' : 'Ser hele fylket'} value={option.value} bind:group={role} />
            {/each}
        </fieldset>
        {#if needsSchool}
            {#await schoolsPromise}
                <p class="ds-paragraph" data-size="sm">Henter skoler …</p>
            {:then schools}
                <DsSelect label="Skole" bind:value={school} error={schoolError}>
                    <option value="">Velg skole</option>
                    <!-- Departments share an org. number, so the name is the key. -->
                    {#each [...new Set((schools ?? []).map(s => s.navn))] as name (name)}<option value={name}>{name}</option>{/each}
                </DsSelect>
            {:catch}
                <p class="ds-paragraph error" data-size="sm">Vi fikk ikke hentet skolene. Prøv igjen om litt.</p>
            {/await}
        {/if}
        <svelte:fragment slot="footer">
            <DsButton on:click={apply}>{role === ADMIN ? 'Vis som administrator' : 'Vis som valgt rolle'}</DsButton>
            <DsButton variant="secondary" on:click={() => (open = false)}>Avbryt</DsButton>
        </svelte:fragment>
    </DsDialog>
{:else}
    <div class="user">
        <span class="name">{token.name}</span>
        <span class="ds-avatar" data-size="sm" data-color="accent" role="img" aria-label={token.name}>{initials(token.name)}</span>
    </div>
{/if}

<style>
    .user {
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .trigger {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
        padding: 2px 4px 2px var(--ds-size-3);
        border-radius: var(--ds-border-radius-full);
        cursor: pointer;
    }

    .trigger:hover {
        background: var(--ds-color-accent-surface-hover);
    }

    .trigger:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
    }

    .ds-avatar {
        font-weight: 700;
    }

    .chevron {
        font-size: 1.2rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .ds-fieldset {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .error {
        color: var(--ds-color-danger-text-default);
    }

    @media (max-width: 768px) {
        .name { display: none; }
        .trigger { padding-inline-start: 4px; }
    }
</style>
