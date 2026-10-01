<script>
    // Historikk: search for an elev by name. One row per elev, with all their contracts.
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import StudentSearch from '$lib/components/StudentSearch.svelte'
    import { hasAnyRole, HISTORY_ROLES } from '$lib/helpers/roles.js'
    import { getElevkontraktToken, getSearchScope } from '$lib/useApi'

    const tokenPromise = getElevkontraktToken(true)
    const scopePromise = tokenPromise.then(token => hasAnyRole(token, HISTORY_ROLES) ? getSearchScope(token) : { school: null })

    let searchComponent
    let pendingRestore = null

    // Back from an elev re-runs the search.
    export const snapshot = {
        capture: () => searchComponent?.capture(),
        restore: (saved) => {
            if (searchComponent) searchComponent.restore(saved)
            else pendingRestore = saved
        }
    }

    $: if (searchComponent && pendingRestore) {
        searchComponent.restore(pendingRestore)
        pendingRestore = null
    }
</script>

    <main>
        {#await Promise.all([tokenPromise, scopePromise])}
            <div class="center"><DsSpinner size="sm" title="Laster" /></div>
        {:then [token, scope]}
            <h1 class="ds-heading" data-size="lg">Historikk</h1>

            {#if !hasAnyRole(token, HISTORY_ROLES)}
                <DsAlert color="warning" heading="Du har ikke tilgang til historikken">
                    <p class="ds-paragraph" data-size="sm">Historikken er for administratorer og skoleadministratorer. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else}
                <p class="ds-paragraph lead" data-size="sm">Søk etter en elev for å se avtaler fra tidligere skoleår.</p>
                <StudentSearch
                    bind:this={searchComponent}
                    {token}
                    collection="history"
                    school={scope.school}
                    hrefFor={(student) => `/history/${student.id.join(',')}`}
                    actionLabel="Se historikk"
                    idleText="Skriv hele eller deler av navnet og trykk Søk. Du får én rad per elev, med alle avtalene eleven har hatt."
                />
            {/if}
        {/await}
    </main>

<style>
    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 64rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .center {
        display: grid;
        place-items: center;
        padding: 2rem;
    }

    .lead {
        color: var(--ds-color-neutral-text-subtle);
    }
</style>
