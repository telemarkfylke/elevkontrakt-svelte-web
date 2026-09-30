<script>
    import AdminOnly from '$lib/components/AdminOnly.svelte'
    import RoleOnly from '$lib/components/RoleOnly.svelte'
    import DsCard from '$lib/components/ds/DsCard.svelte'
    import { CONTRACT_ROLES } from '$lib/helpers/roles.js'
</script>

    <main>
        <header>
            <h1 class="ds-heading" data-size="lg">Hjelp</h1>
            <p class="ds-paragraph" data-variant="long">
                Veiledning og svar på spørsmål om hvordan du bruker Elevavtaler.
            </p>
        </header>

        <!-- Each section is labelled by its heading, so screen readers can jump between them. -->
        <section aria-labelledby="hjelp-alle">
            <h2 class="ds-heading" data-size="sm" id="hjelp-alle">For alle</h2>
            <ul class="topics">
                <li>
                    <DsCard href="/hjelp/faq">
                        <h3 class="ds-heading" data-size="xs">Ofte stilte spørsmål</h3>
                        <p class="ds-paragraph" data-size="sm">Svar på vanlige spørsmål om Elevavtaler.</p>
                    </DsCard>
                </li>
            </ul>
        </section>

        <!-- The roles /contract admits, administrators included. -->
        <RoleOnly roles={CONTRACT_ROLES}>
            <section aria-labelledby="hjelp-skole">
                <h2 class="ds-heading" data-size="sm" id="hjelp-skole">For skoleadministrator og IT-servicedesk</h2>
                <ul class="topics">
                    <li>
                        <DsCard href="/hjelp/opprett-elevavtale">
                            <h3 class="ds-heading" data-size="xs">Opprett elevavtale</h3>
                            <p class="ds-paragraph" data-size="sm">
                                Slik registrerer du en avtale eleven har signert på papir.
                            </p>
                        </DsCard>
                    </li>
                </ul>
            </section>
        </RoleOnly>

        <AdminOnly quiet>
            <section aria-labelledby="hjelp-admin">
                <h2 class="ds-heading" data-size="sm" id="hjelp-admin">Kun for administratorer</h2>
                <ul class="topics">
                    <li>
                        <DsCard href="/hjelp/fakturer-fra-fil">
                            <h3 class="ds-heading" data-size="xs">Fakturer fra fil</h3>
                            <p class="ds-paragraph" data-size="sm">
                                Slik fakturerer du mange elever samtidig ved å laste opp en CSV-fil.
                            </p>
                        </DsCard>
                    </li>
                </ul>
            </section>
        </AdminOnly>
    </main>

<style>
    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 60rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-8, 2rem);
    }

    header,
    section {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3, 0.75rem);
    }

    /* One column on a phone, as many ~16rem cards as fit otherwise. */
    .topics {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
        gap: var(--ds-size-4, 1rem);
    }

    /* Cards in a row line up at the same height. */
    .topics > li,
    .topics :global(.ds-card) {
        height: 100%;
    }
</style>
