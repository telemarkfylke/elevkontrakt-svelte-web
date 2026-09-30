<script>
    // Fakturering: find the elev to invoice. Administrators can also search among elever who have left.
    import { tick } from 'svelte'
    import { get } from 'svelte/store'
    import DsScope from '$lib/components/ds/DsScope.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import StudentSearch from '$lib/components/StudentSearch.svelte'
    import { hasAnyRole, isElevkontraktAdmin, ELEVKONTRAKT_ADMIN } from '$lib/helpers/roles.js'
    import { billingTargetCollection } from '$lib/store'
    import { getElevkontraktToken, getSearchScope } from '$lib/useApi'

    const BILLING_WRITE_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.billing-readwrite']

    const tokenPromise = getElevkontraktToken(true)
    const scopePromise = tokenPromise.then(token => hasAnyRole(token, BILLING_WRITE_ROLES) ? getSearchScope(token) : { school: null })

    // The invoice page reads the collection from the store, so the choice here must always set it.
    let collection = get(billingTargetCollection) === 'pcIkkeInnlevert' ? 'pcIkkeInnlevert' : 'regular'
    $: billingTargetCollection.set(collection)

    let searchComponent
    let pendingRestore = null

    // Back from an invoice re-runs the search in the same group.
    export const snapshot = {
        capture: () => ({ collection, search: searchComponent?.capture() }),
        restore: async (saved) => {
            if (saved?.collection) collection = saved.collection
            await tick() // a new group re-creates the search, restore into the new one
            if (searchComponent) searchComponent.restore(saved?.search)
            else pendingRestore = saved?.search
        }
    }

    $: if (searchComponent && pendingRestore) {
        searchComponent.restore(pendingRestore)
        pendingRestore = null
    }
</script>

<DsScope>
    <main>
        {#await Promise.all([tokenPromise, scopePromise])}
            <div class="center"><DsSpinner size="sm" title="Laster" /></div>
        {:then [token, scope]}
            <h1 class="ds-heading" data-size="lg">Fakturering</h1>

            {#if !hasAnyRole(token, BILLING_WRITE_ROLES)}
                <DsAlert color="warning" heading="Du har ikke tilgang til fakturering">
                    <p class="ds-paragraph" data-size="sm">Fakturering er for administratorer og økonomi. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else}
                <p class="ds-paragraph lead" data-size="sm">Finn eleven du skal fakturere. På neste side lager du fakturaen, enten fra elevens avtale eller for andre tjenester.</p>

                {#if isElevkontraktAdmin(token)}
                    <div class="ds-field collection">
                        <span class="ds-label" id="collection-label">Søk blant</span>
                        <div class="ds-toggle-group" data-size="sm" role="radiogroup" aria-labelledby="collection-label">
                            <label class="ds-button" data-variant="tertiary"><input type="radio" name="collection" value="regular" bind:group={collection} />Elever</label>
                            <label class="ds-button" data-variant="tertiary"><input type="radio" name="collection" value="pcIkkeInnlevert" bind:group={collection} />Har sluttet</label>
                        </div>
                        {#if collection === 'pcIkkeInnlevert'}
                            <p class="ds-paragraph hint" data-size="xs">Elever som har sluttet, der PC-en ikke er innlevert eller ratene ikke er betalt.</p>
                        {/if}
                    </div>
                {/if}

                <!-- A new group starts a new search. -->
                {#key collection}
                    <StudentSearch
                        bind:this={searchComponent}
                        {token}
                        {collection}
                        school={scope.school}
                        hrefFor={(student) => `/billing/${student.id.join(',')}`}
                        actionLabel="Fakturer"
                        actionIcon="receipt_long"
                        idleText="Skriv hele eller deler av navnet og trykk Søk. Velg eleven for å gå videre til fakturaen."
                        scopeText={collection === 'pcIkkeInnlevert' ? ' blant elever som har sluttet' : ''}
                    />
                {/key}
            {/if}
        {/await}
    </main>
</DsScope>

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

    .lead,
    .hint {
        color: var(--ds-color-neutral-text-subtle);
    }

    .collection {
        gap: var(--ds-size-1);
        align-self: flex-start;
    }
</style>
