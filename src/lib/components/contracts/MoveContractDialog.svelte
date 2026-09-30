<script>
    // Flytt eller slett en avtale. mode 'delete' moves it to the deleted collection, as before.
    import { createEventDispatcher } from 'svelte'
    import DsAlert from '../ds/DsAlert.svelte'
    import DsButton from '../ds/DsButton.svelte'
    import DsDialog from '../ds/DsDialog.svelte'
    import DsSelect from '../ds/DsSelect.svelte'
    import { moveContract } from '$lib/useApi'

    export let contract
    export let collection = 'regular'
    export let mode = 'move' // move | delete
    export let open = false

    const dispatch = createEventDispatcher()
    let target = ''
    let saving = false
    let error = ''
    let targetError = ''

    $: options = [
        { value: 'historic', label: 'Historikk' },
        collection === 'pcIkkeInnlevert'
            ? { value: 'regular', label: 'Tilbake til ordinære elever' }
            : { value: 'pcIkkeInnlevert', label: 'Har sluttet: PC ikke innlevert eller rater ikke betalt' }
    ]

    $: if (!open) { target = ''; error = ''; targetError = '' }

    // The API explains a refusal itself, e.g. the 409 when invoices are not settled.
    function refusal (response) {
        const message = response?.data?.error
        const invoices = Array.isArray(response?.data?.invoices) ? response.data.invoices.map(i => `${i.type}: ${i.status}`).join(', ') : ''
        return message ? (invoices ? `${message} (${invoices})` : message) : 'Noe gikk galt. Prøv igjen om litt, og kontakt servicedesk hvis feilen fortsetter.'
    }

    async function save () {
        error = ''
        targetError = ''
        const destination = mode === 'delete' ? 'deleted' : target
        if (!destination) { targetError = 'Velg hvor avtalen skal flyttes.'; return }
        saving = true
        const response = await moveContract(contract._id, destination, collection)
        saving = false
        if (response?.status !== 200) {
            error = refusal(response)
            return
        }
        const name = contract.elevInfo?.navn
        open = false
        dispatch('saved', mode === 'delete' ? `Avtalen til ${name} er slettet.` : `Avtalen til ${name} er flyttet.`)
    }
</script>

<DsDialog bind:open width="34rem" labelledby="move-title" closedby={saving ? 'none' : 'any'}>
    {#if contract}
        {#if mode === 'delete'}
            <h2 class="ds-heading" data-size="sm" id="move-title">Slette avtalen til {contract.elevInfo?.navn}?</h2>
            <p class="ds-paragraph">Avtalen flyttes til slettede avtaler og vises ikke lenger i oversikten. En administrator kan hente den tilbake.</p>
        {:else}
            <h2 class="ds-heading" data-size="sm" id="move-title">Flytt avtalen til {contract.elevInfo?.navn}</h2>
            <DsSelect label="Ny plassering" bind:value={target} error={targetError}>
                <option value="">Velg plassering</option>
                {#each options as option}<option value={option.value}>{option.label}</option>{/each}
            </DsSelect>
        {/if}
        {#if error}
            <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{error}</p></DsAlert>
        {/if}
    {/if}
    <svelte:fragment slot="footer">
        {#if mode === 'delete'}
            <DsButton color="danger" loading={saving} loadingText="Sletter …" on:click={save}><span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett avtale</DsButton>
        {:else}
            <DsButton loading={saving} loadingText="Flytter …" on:click={save}>Flytt avtale</DsButton>
        {/if}
        <DsButton variant="secondary" disabled={saving} on:click={() => (open = false)}>Avbryt</DsButton>
    </svelte:fragment>
</DsDialog>
