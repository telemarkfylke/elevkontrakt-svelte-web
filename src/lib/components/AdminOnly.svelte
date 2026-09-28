<script>
    /**
     * Route gate for the administrator-only pages.
     *
     * This decides what is SHOWN - the bundle ships to every signed-in user, so it is not a security
     * boundary. The API enforces the same role on every request.
     */
    import { getElevkontraktToken } from '$lib/useApi.js'
    import { isElevkontraktAdmin } from '$lib/helpers/roles.js'
    import DsSpinner from './ds/DsSpinner.svelte'
    import DsAlert from './ds/DsAlert.svelte'

    export let message = 'Du har ikke tilgang til denne siden. Ta kontakt med en administrator for å få tilgang.'
    // For gating a piece of a page, like a link: renders nothing unless the user is an administrator.
    export let quiet = false
</script>

{#if quiet}
    {#await getElevkontraktToken(true) then token}
        {#if isElevkontraktAdmin(token)}
            <slot {token} />
        {/if}
    {:catch}
        <!-- Nothing to show: the page around it still works without this piece. -->
    {/await}
{:else}
{#await getElevkontraktToken(true)}
    <div class="loading">
        <DsSpinner size="lg" title="Kontrollerer tilgang" />
    </div>
{:then token}
    {#if !isElevkontraktAdmin(token)}
        <div class="gate">
            <DsAlert color="danger" heading="Ingen tilgang">
                <p class="ds-paragraph">{message}</p>
            </DsAlert>
        </div>
    {:else}
        <slot {token} />
    {/if}
{:catch error}
    <div class="gate">
        <DsAlert color="danger" heading="Feil">
            <p class="ds-paragraph">Kunne ikke kontrollere tilgangen: {error.message}</p>
        </DsAlert>
    </div>
{/await}
{/if}

<style>
    .loading {
        display: flex;
        justify-content: center;
        padding: var(--ds-size-8, 2rem);
    }

    .gate {
        padding: var(--ds-size-4, 1rem);
    }
</style>
