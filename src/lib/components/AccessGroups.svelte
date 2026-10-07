<script>
    /**
     * Innstillinger → Tilganger: who has which role. Each role is an EntraID group, changed through
     * the API right away (no save bar - Graph changes one member at a time).
     * Feedback goes to the page's alert through the `say` event.
     */
    import { createEventDispatcher, onMount } from 'svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsCheckbox from '$lib/components/ds/DsCheckbox.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsPagination from '$lib/components/ds/DsPagination.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import { getAccessGroups, searchAccessGroupCandidates, addAccessGroupMember, removeAccessGroupMember } from '$lib/useApi.js'

    export let me = '' // the signed-in user's object id

    const ADMIN_ROLE = 'elevkontrakt.administrator-readwrite'
    const ICONS = {
        [ADMIN_ROLE]: 'shield_person',
        'elevkontrakt.skoleadministrator-write': 'school',
        'elevkontrakt.skoleadministrator-read': 'visibility',
        'elevkontrakt.billing-readwrite': 'receipt_long',
        'elevkontrakt.billing-read': 'receipt',
        'elevkontrakt.itservicedesk-readwrite': 'support_agent'
    }
    const REQUIREMENT = {
        none: { icon: 'check_circle', text: 'Ingen krav' },
        school: { icon: 'school', text: 'Må jobbe på en skole' },
        digital: { icon: 'lan', text: 'Må tilhøre Digitale tjenester' }
    }
    const confirmText = (person, group) => person.requirement.reason === 'not-digital'
        ? `Jeg bekrefter at jeg vil legge til ${person.displayName} i ${group.label} selv om personen ikke tilhører Digitale tjenester.`
        : `Jeg bekrefter at jeg vil gi ${person.displayName} rollen ${group.label} selv om personen ikke jobber på en skole.`

    const dispatch = createEventDispatcher()
    const say = (text, color = 'success') => dispatch('say', { text, color })

    let groups = []
    let loadState = 'loading' // loading | ready | error
    let search = {} // per group: { query, error, results, busy, confirm: { userId: bool }, adding, failed: { userId: text } }
    let pages = {} // per group: { people, hits }
    let justAdded = {} // per group: the user id added last
    let toRemove = null // { group, member }
    let removing = false
    let removeError = ''

    const PER_PAGE = 10
    const pageCount = (items) => Math.max(1, Math.ceil(items.length / PER_PAGE))
    const pageOf = (items, page) => items.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const range = (items, page) => `Viser ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, items.length)} av ${items.length}`
    const byName = (a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '', 'nb')
    const place = (person) => [person.companyName, person.department].filter(Boolean).join(' · ')
    const isMember = (group, id) => group.members.some(m => m.id === id)

    onMount(load)

    async function load () {
        loadState = 'loading'
        const response = await getAccessGroups()
        if (response?.status !== 200) {
            loadState = 'error'
            return
        }
        groups = response.data
        search = Object.fromEntries(groups.map(g => [g.id, { query: '', error: '', results: null, busy: false, confirm: {}, adding: null, failed: {} }]))
        pages = Object.fromEntries(groups.map(g => [g.id, { people: 1, hits: 1 }]))
        loadState = 'ready'
    }

    async function find (group) {
        const s = search[group.id]
        const query = s.query.trim()
        if (query.length < 2) {
            s.error = 'Skriv minst to tegn.'
            search = search
            return
        }
        search[group.id] = { ...s, query, error: '', busy: true, confirm: {}, failed: {} }
        const response = await searchAccessGroupCandidates(group.id, query)
        if (response?.status !== 200) {
            search[group.id] = { ...search[group.id], busy: false, results: null, error: response?.data?.error ?? 'Søket feilet. Prøv igjen om litt.' }
            return
        }
        search[group.id] = { ...search[group.id], busy: false, results: response.data }
        pages[group.id].hits = 1
    }

    // An emptied field (also the x in the search field) clears the hits.
    function clearSearch (group) {
        search[group.id] = { ...search[group.id], query: '', error: '', results: null, confirm: {}, failed: {} }
        pages[group.id].hits = 1
    }

    // Puts the person on the group's list and shows the page they land on.
    function addToList (group, person) {
        if (!isMember(group, person.id)) group.members = [...group.members, person].sort(byName)
        groups = groups
        justAdded[group.id] = person.id
        pages[group.id].people = Math.floor(group.members.findIndex(m => m.id === person.id) / PER_PAGE) + 1
    }

    async function add (group, person) {
        const s = search[group.id]
        s.adding = person.id
        delete s.failed[person.id]
        search = search
        const response = await addAccessGroupMember(group.id, person.id, !person.requirement.ok)
        s.adding = null
        if (response?.status === 201) {
            addToList(group, response.data)
            say(`${person.displayName} har fått rollen ${group.label}. Tilgangen gjelder neste gang personen logger inn i Elevavtaler.`)
        } else if (response?.data?.reason === 'already-member') {
            addToList(group, response.data.member ?? person)
            say(`${person.displayName} har allerede rollen ${group.label}. Listen er oppdatert.`, 'info')
        } else {
            s.failed[person.id] = `${person.displayName} ble ikke lagt til. ${response?.data?.error ?? 'Prøv igjen om litt.'}`
        }
        search = search
    }

    function askRemove (group, member) {
        removeError = ''
        toRemove = { group, member }
    }

    async function remove () {
        const { group, member } = toRemove
        removing = true
        removeError = ''
        const response = await removeAccessGroupMember(group.id, member.id)
        removing = false
        if (response?.status !== 200 && response?.data?.reason !== 'not-member') {
            removeError = `${member.displayName} ble ikke fjernet. ${response?.data?.error ?? 'Prøv igjen om litt.'}`
            return
        }
        group.members = group.members.filter(m => m.id !== member.id)
        if (justAdded[group.id] === member.id) delete justAdded[group.id]
        pages[group.id].people = Math.min(pages[group.id].people, pageCount(group.members))
        groups = groups
        toRemove = null
        say(`${member.displayName} har ikke lenger rollen ${group.label}.`)
    }
</script>

{#if loadState === 'loading'}
    <div class="loading"><DsSpinner size="sm" title="Laster" />Henter tilgangene fra Entra ID …</div>
{:else if loadState === 'error'}
    <DsAlert color="danger" heading="Tilgangene kunne ikke hentes">
        <p class="ds-paragraph" data-size="sm">Prøv igjen om litt. Kontakt servicedesk hvis feilen fortsetter.</p>
        <p><DsButton variant="secondary" size="sm" on:click={load}><span class="material-symbols-outlined" aria-hidden="true">refresh</span>Prøv igjen</DsButton></p>
    </DsAlert>
{:else}
    <p class="info-row"><span class="material-symbols-outlined" aria-hidden="true">info</span><span>Endringer lagres i Entra ID med en gang. En ny tilgang gjelder neste gang personen logger inn i Elevavtaler.</span></p>
    <div class="exc-grid">
        {#each groups as group (group.id)}
            {@const s = search[group.id]}
            {@const peoplePages = pageCount(group.members)}
            {@const peoplePage = Math.min(pages[group.id].people, peoplePages)}
            <section class="section" aria-labelledby="h-{group.id}">
                <div>
                    <h2 class="ds-heading" data-size="xs" id="h-{group.id}">
                        <span class="material-symbols-outlined" aria-hidden="true">{ICONS[group.role] ?? 'group'}</span>{group.label} <span class="count">{group.members.length}</span>
                    </h2>
                    <p class="ds-paragraph lead" data-size="sm">{group.description}</p>
                    <span class="req"><span class="material-symbols-outlined" aria-hidden="true">{REQUIREMENT[group.requirement].icon}</span>{REQUIREMENT[group.requirement].text}</span>
                    <span class="group-name">{group.name}</span>
                </div>
                <ul class="people" aria-label="Har rollen {group.label}">
                    {#each pageOf(group.members, peoplePage) as member (member.id)}
                        {@const self = member.id === me}
                        {@const fresh = justAdded[group.id] === member.id}
                        <li class:flagged={!member.requirement.ok && !fresh} class:adding={fresh}>
                            <span class="who">
                                <strong>
                                    {member.displayName}
                                    {#if self}<DsTag>Deg</DsTag>{/if}
                                    {#if fresh}<DsTag color="success">Lagt til</DsTag>{:else if !member.requirement.ok}<DsTag color="warning">Avvik</DsTag>{/if}
                                </strong>
                                <small>{member.userPrincipalName}</small>
                                {#if place(member)}<small>{place(member)}</small>{/if}
                                {#if !member.requirement.ok}
                                    <span class="why"><span class="material-symbols-outlined" aria-hidden="true">warning</span>{member.requirement.message}</span>
                                {/if}
                            </span>
                            {#if self && group.role === ADMIN_ROLE}
                                <span class="self-note">Du kan ikke fjerne deg selv</span>
                            {:else if group.canEdit}
                                <DsButton variant="tertiary" color="danger" size="sm" on:click={() => askRemove(group, member)}>
                                    <span class="material-symbols-outlined" aria-hidden="true">person_remove</span>Fjern<span class="ds-sr-only"> {member.displayName} fra {group.label}</span>
                                </DsButton>
                            {/if}
                        </li>
                    {:else}
                        <li><span class="empty">Ingen har denne rollen.</span></li>
                    {/each}
                </ul>
                {#if group.members.length > PER_PAGE}
                    <div class="list-foot">
                        <p class="ds-paragraph muted" data-size="xs">{range(group.members, peoplePage)}</p>
                        <DsPagination bind:current={pages[group.id].people} total={peoplePages} label="Sider i {group.label}" />
                    </div>
                {/if}
                {#if !group.canEdit}
                    <p class="locked"><span class="material-symbols-outlined" aria-hidden="true">lock</span>Bare administratorer i Teknologi og utvikling kan endre hvem som er administrator.</p>
                {:else}
                    <form class="add-box" role="search" on:submit|preventDefault={() => find(group)}>
                        <div class="add-row">
                            <DsInput label="Legg til ansatt" type="search" placeholder="Navn eller brukernavn (UPN)" autocomplete="off" error={s.error} bind:value={search[group.id].query} on:input={({ target }) => { if (!target.value) clearSearch(group) }} />
                            <DsButton type="submit" variant="secondary" size="sm" loading={s.busy} loadingText="Søker …">
                                <span class="material-symbols-outlined" aria-hidden="true">search</span>Søk
                            </DsButton>
                        </div>
                        {#if s.results?.length === 0}
                            <p class="ds-paragraph muted" data-size="sm">Fant ingen ansatte for «{s.query}».</p>
                        {:else if s.results}
                            <ul class="hits">
                                {#each pageOf(s.results, pages[group.id].hits) as person (person.id)}
                                    {@const member = isMember(group, person.id)}
                                    <li class:warn={!member && !person.requirement.ok}>
                                        <div class="hit-top">
                                            <span class="who">
                                                <strong>{person.displayName}</strong>
                                                <small>{person.userPrincipalName}</small>
                                                {#if place(person)}<small>{place(person)}</small>{/if}
                                            </span>
                                            {#if member}
                                                <span class="muted small">På listen</span>
                                            {:else if person.requirement.ok}
                                                <DsButton variant="secondary" size="sm" loading={s.adding === person.id} loadingText="Legger til …" on:click={() => add(group, person)}>
                                                    <span class="material-symbols-outlined" aria-hidden="true">person_add</span>Legg til
                                                </DsButton>
                                            {/if}
                                        </div>
                                        {#if !member && !person.requirement.ok}
                                            <div class="warn-box">
                                                <p class="ds-paragraph" data-size="sm"><strong>{person.requirement.message}</strong></p>
                                                <dl>
                                                    <dt>companyName</dt><dd>{person.companyName ?? '–'}</dd>
                                                    <dt>department</dt><dd>{person.department ?? '–'}</dd>
                                                </dl>
                                                <DsCheckbox label={confirmText(person, group)} bind:checked={search[group.id].confirm[person.id]} />
                                                <div>
                                                    <DsButton variant="secondary" size="sm" disabled={!s.confirm[person.id]} loading={s.adding === person.id} loadingText="Legger til …" on:click={() => add(group, person)}>
                                                        <span class="material-symbols-outlined" aria-hidden="true">person_add</span>Legg til likevel
                                                    </DsButton>
                                                </div>
                                            </div>
                                        {/if}
                                        {#if s.failed[person.id]}
                                            <p class="ds-validation-message" data-size="sm">{s.failed[person.id]}</p>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                            {#if s.results.length > PER_PAGE}
                                <div class="list-foot">
                                    <p class="ds-paragraph muted" data-size="xs">{range(s.results, pages[group.id].hits)} treff</p>
                                    <DsPagination bind:current={pages[group.id].hits} total={pageCount(s.results)} label="Sider i søkeresultatet" />
                                </div>
                            {/if}
                        {/if}
                    </form>
                {/if}
            </section>
        {/each}
    </div>
{/if}

<DsDialog open={Boolean(toRemove)} on:close={() => (toRemove = null)} width="32rem" labelledby="remove-title" closedby={removing ? 'none' : 'any'}>
    {#if toRemove}
        <h2 class="ds-heading" data-size="sm" id="remove-title">Fjerne {toRemove.member.displayName} fra {toRemove.group.label}?</h2>
        <p class="ds-paragraph" data-size="sm">Personen mister det rollen gir tilgang til fra neste innlogging. Du kan legge personen til igjen senere.</p>
        {#if removeError}
            <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{removeError}</p></DsAlert>
        {/if}
    {/if}
    <svelte:fragment slot="footer">
        <DsButton color="danger" loading={removing} loadingText="Fjerner …" on:click={remove}><span class="material-symbols-outlined" aria-hidden="true">person_remove</span>Fjern tilgangen</DsButton>
        <DsButton variant="secondary" disabled={removing} on:click={() => (toRemove = null)}>Avbryt</DsButton>
    </svelte:fragment>
</DsDialog>

<style>
    .loading {
        display: flex;
        align-items: center;
        gap: var(--ds-size-3);
        padding: var(--ds-size-6);
        color: var(--ds-color-neutral-text-subtle);
    }

    .info-row {
        display: flex;
        align-items: flex-start;
        gap: var(--ds-size-2);
        max-width: 80ch;
        font-size: 0.9rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .lead,
    .muted { color: var(--ds-color-neutral-text-subtle); }

    .small { font-size: 0.85rem; }

    .exc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(24rem, 100%), 1fr));
        gap: var(--ds-size-5);
        align-items: start;
    }

    .section {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
        padding: var(--ds-size-5);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4);
    }

    .section h2 {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
    }

    .section h2 .material-symbols-outlined { color: var(--ds-color-accent-text-subtle); }

    .section .lead {
        max-width: 60ch;
        margin-top: var(--ds-size-1);
    }

    .req {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.82rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .group-name {
        display: block;
        margin-top: var(--ds-size-1);
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.78rem;
        color: var(--ds-color-neutral-text-subtle);
        overflow-wrap: anywhere;
    }

    .count {
        font-variant-numeric: tabular-nums;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 0 0.45rem;
        border-radius: var(--ds-border-radius-full);
        background: var(--ds-color-neutral-surface-tinted);
    }

    .people,
    .hits {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .people {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        overflow: hidden;
    }

    .people li {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--ds-size-2) var(--ds-size-3);
        padding: var(--ds-size-2) var(--ds-size-3);
        border-top: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .people li:first-child { border-top: 0; }

    .people li.flagged { box-shadow: inset 4px 0 0 var(--ds-color-warning-base-default); }

    .people li.adding {
        background: var(--ds-color-success-surface-tinted);
        box-shadow: inset 4px 0 0 var(--ds-color-success-base-default);
    }

    .who {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1.35;
    }

    .who strong {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .who small {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.8rem;
        overflow-wrap: anywhere;
    }

    .why {
        display: flex;
        align-items: flex-start;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: var(--ds-color-warning-text-default);
    }

    .locked {
        display: flex;
        align-items: flex-start;
        gap: var(--ds-size-2);
        padding: var(--ds-size-3);
        border-radius: var(--ds-border-radius-md);
        background: var(--ds-color-neutral-background-tinted);
        font-size: 0.9rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .self-note {
        max-width: 9rem;
        text-align: right;
        font-size: 0.8rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .empty {
        grid-column: 1 / -1;
        text-align: center;
        color: var(--ds-color-neutral-text-subtle);
        padding: var(--ds-size-3);
    }

    .add-box {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: var(--ds-size-3);
        border-radius: var(--ds-border-radius-md);
        background: var(--ds-color-neutral-background-tinted);
    }

    .add-row {
        display: flex;
        gap: var(--ds-size-2);
        align-items: flex-end;
    }

    .add-row > :global(.ds-field) { flex: 1; }

    .hits {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-1);
    }

    .hits li {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: var(--ds-size-2) var(--ds-size-3);
        background: var(--ds-color-neutral-background-default);
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
    }

    .hits li.warn { border-color: var(--ds-color-warning-border-default); }

    .hit-top {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .warn-box {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
        padding: var(--ds-size-3);
        border-radius: var(--ds-border-radius-md);
        background: var(--ds-color-warning-surface-tinted);
    }

    .warn-box dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.1rem var(--ds-size-3);
        margin: 0;
        font-size: 0.85rem;
    }

    .warn-box dt { color: var(--ds-color-neutral-text-subtle); }

    .warn-box dd {
        margin: 0;
        font-weight: 600;
    }

    .list-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-2);
        font-variant-numeric: tabular-nums;
    }
</style>
