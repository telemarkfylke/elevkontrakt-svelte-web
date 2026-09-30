<script>
    // Frequently asked questions, filtered by the user's roles. The content is in questions.js.
    import DsScope from '$lib/components/ds/DsScope.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import { getElevkontraktToken } from '$lib/useApi.js'
    import { hasAnyRole, isElevkontraktAdmin } from '$lib/helpers/roles.js'
    import { TOPICS } from './questions.js'

    let query = ''

    const plainText = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    function visibleTopics (token, search) {
        const term = search.trim().toLowerCase()
        return TOPICS
            .map(topic => ({
                ...topic,
                questions: topic.questions
                    .filter(item => item.roles === null || hasAnyRole(token, item.roles))
                    .filter(item => !term || `${item.q} ${plainText(item.answer)}`.toLowerCase().includes(term))
            }))
            .filter(topic => topic.questions.length > 0)
    }
</script>

<DsScope>
    <main>
        <p class="ds-paragraph" data-size="sm"><a class="ds-link" href="/hjelp">← Tilbake til hjelp</a></p>

        <header>
            <h1 class="ds-heading" data-size="lg">Ofte stilte spørsmål</h1>
            <p class="ds-paragraph" data-variant="long">Svar på det mange lurer på om avtaler, PC-er og fakturering i Elevavtaler.</p>
        </header>

        <div role="search">
            <DsInput label="Søk i spørsmålene" type="search" icon="search" placeholder="For eksempel faktura, PC eller DigiTroll" autocomplete="off" bind:value={query} />
        </div>

        {#await getElevkontraktToken(true) then token}
            {@const topics = visibleTopics(token, query)}
            {@const total = topics.reduce((sum, topic) => sum + topic.questions.length, 0)}

            {#if query.trim()}
                <p class="ds-paragraph" data-size="sm" role="status">{total} spørsmål passer «{query.trim()}»</p>
            {:else}
                <nav aria-label="Temaer">
                    <ul class="jump">
                        {#each topics as topic (topic.id)}
                            <li>
                                <a href="#{topic.id}">
                                    <span class="material-symbols-outlined" aria-hidden="true">{topic.icon}</span>
                                    {topic.title}
                                    <span class="n">{topic.questions.length}</span>
                                </a>
                            </li>
                        {/each}
                    </ul>
                </nav>
            {/if}

            {#each topics as topic (topic.id)}
                <section class="topic" id={topic.id} aria-labelledby="h-{topic.id}">
                    <h2 class="ds-heading" data-size="sm" id="h-{topic.id}">
                        <span class="material-symbols-outlined" aria-hidden="true">{topic.icon}</span>
                        {topic.title}
                    </h2>
                    <div>
                        {#each topic.questions as item (item.q)}
                            <!-- Search results open, so the hit is visible. -->
                            <details class="ds-details" open={Boolean(query.trim())}>
                                <summary>
                                    {item.q}
                                    {#if item.who && isElevkontraktAdmin(token)}<span class="who"><DsTag>{item.who}</DsTag></span>{/if}
                                </summary>
                                <div class="answer">{@html item.answer}</div>
                            </details>
                        {/each}
                    </div>
                </section>
            {:else}
                <div class="none">
                    <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
                    <p class="ds-heading" data-size="2xs">Fant ingen spørsmål om «{query.trim()}»</p>
                    <p class="ds-paragraph" data-size="sm">Prøv et annet ord, eller se <a class="ds-link" href="/hjelp">veiledningene under Hjelp</a>.</p>
                </div>
            {/each}
        {/await}

        <DsAlert color="info" heading="Fant du ikke svaret?">
            <p class="ds-paragraph" data-size="sm">Ta kontakt med din nærmeste servicedesk. Oppgi at henvendelsen gjelder Elevavtaler, og hva du prøvde å gjøre.</p>
        </DsAlert>
    </main>
</DsScope>

<style>
    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 48rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-6, 1.5rem);
    }

    header {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3, 0.75rem);
    }

    .jump {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2);
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .jump a {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.75rem;
        border-radius: var(--ds-border-radius-full);
        border: 1px solid var(--ds-color-accent-border-subtle);
        background: var(--ds-color-accent-background-tinted);
        color: var(--ds-color-accent-text-default);
        text-decoration: none;
        font-size: 0.9rem;
    }

    .jump a:hover {
        background: var(--ds-color-accent-surface-hover);
    }

    .jump a:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer);
        outline-offset: 2px;
    }

    .jump .n {
        font-size: 0.78rem;
        font-variant-numeric: tabular-nums;
        color: var(--ds-color-accent-text-subtle);
    }

    .topic {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
        scroll-margin-top: 1rem;
    }

    .topic h2 {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .topic h2 .material-symbols-outlined {
        color: var(--ds-color-accent-text-subtle);
    }

    summary {
        font-weight: 600;
    }

    .who {
        margin-inline-start: var(--ds-size-2);
    }

    .answer {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .answer :global(.ds-list) {
        --dsc-list-margin-top: 0;
    }

    .answer :global(.status-table) {
        overflow-x: auto;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
    }

    .answer :global(.ds-table) {
        --dsc-table-padding: 0.55rem 0.8rem;
        min-width: 100%;
    }

    .answer :global(.ds-table td:first-child) {
        white-space: nowrap;
    }

    .answer :global(.ds-tag) {
        font-weight: 600;
    }

    .none {
        display: grid;
        justify-items: center;
        gap: var(--ds-size-2);
        text-align: center;
        padding: var(--ds-size-6) var(--ds-size-4);
        border: 2px dashed var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
    }

    .none .material-symbols-outlined {
        font-size: 2rem;
        color: var(--ds-color-accent-text-subtle);
    }
</style>
