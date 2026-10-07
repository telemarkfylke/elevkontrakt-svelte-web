<script>
    // Innstillinger (administrators): rate prices, the two exception lists, products, and access.
    import AccessGroups from '$lib/components/AccessGroups.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsCheckbox from '$lib/components/ds/DsCheckbox.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsDropdown from '$lib/components/ds/DsDropdown.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsPagination from '$lib/components/ds/DsPagination.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import DsTabs from '$lib/components/ds/DsTabs.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import DsTextarea from '$lib/components/ds/DsTextarea.svelte'
    import { formatFnr } from '$lib/helpers/formatFnr.js'
    import { formatShortDate } from '$lib/helpers/formatDate.js'
    import { isCalculatedProduct, PRODUCT } from '$lib/helpers/prices.js'
    import { isElevkontraktAdmin } from '$lib/helpers/roles.js'
    import { getElevkontraktToken, getProducts, getSettings, updateSettings, postProduct, updateProduct, deleteProduct, searchContracts } from '$lib/useApi.js'

    const STANDARD_FIELDS = ['_id', 'name', 'price', 'description', 'active', 'metadata', 'auditLog']
    // How each calculated product gets its price, shown instead of a price.
    const CALCULATED = {
        [PRODUCT.buyOutPC]: 'Restverdi etter trinn',
        [PRODUCT.egenandel]: 'Beløpet fylles inn',
        [PRODUCT.restverdi]: 'Beløpet fylles inn',
        [PRODUCT.yearlyRent]: 'Pris fra Priser'
    }
    const LISTS = {
        price: { key: 'exceptionsFromRegularPrices', title: 'Redusert pris', icon: 'sell' },
        flow: { key: 'exceptionsFromInvoiceFlow', title: 'Unntatt fra fakturaflyten', icon: 'block' }
    }
    const validPrice = (value) => /^\d{1,4}$/.test(String(value).trim())

    let token = null
    let settings = null
    let products = []
    let loadState = 'loading' // loading | ready | error
    let tab = 'prices'
    let flash = { text: '', color: 'success' }
    let saving = false

    // Prices
    let editingPrices = false
    let regular = ''
    let reduced = ''
    let priceError = ''

    // Exceptions: pending changes per list, and the search in each list
    let pending = { price: { add: [], remove: [] }, flow: { add: [], remove: [] } }
    let search = { price: { query: '', results: null, busy: false }, flow: { query: '', results: null, busy: false } }

    // The lists and the search results are paged, 10 at a time, since they sit in narrow columns.
    const PER_PAGE = 10
    let pages = { price: { people: 1, hits: 1 }, flow: { people: 1, hits: 1 } }
    const pageCount = (items) => Math.max(1, Math.ceil(items.length / PER_PAGE))
    const pageOf = (items, page) => items.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const range = (items, page) => `Viser ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, items.length)} av ${items.length}`

    // Everyone on a list, including the ones marked to be added.
    const withPending = (students, changes) => [
        ...students.map(student => ({ ...student, state: changes.remove.includes(student.fnr) ? 'removing' : '' })),
        ...changes.add.map(student => ({ ...student, state: 'adding' }))
    ]

    // Products
    let form = null // the product being added or edited
    let formError = ''
    let toDelete = null
    let deleteError = ''

    const ready = getElevkontraktToken(true).then(async t => {
        token = t
        if (isElevkontraktAdmin(t)) await load()
        return t
    })

    async function load () {
        const [settingsResponse, productsResponse] = await Promise.all([getSettings(), getProducts()])
        settings = settingsResponse?.data?.result?.[0] ?? null
        products = productsResponse?.data?.result ?? []
        loadState = settings ? 'ready' : 'error'
    }

    const say = (text, color = 'success') => { flash = { text, color } }
    // The template reads these reactive values, so a reload after saving shows the new lists.
    const studentsIn = (settings, list) => settings?.[LISTS[list].key]?.students ?? []
    $: lists = { price: studentsIn(settings, 'price'), flow: studentsIn(settings, 'flow') }
    $: everyoneIn = { price: withPending(lists.price, pending.price), flow: withPending(lists.flow, pending.flow) }
    $: changes = pending.price.add.length + pending.price.remove.length + pending.flow.add.length + pending.flow.remove.length
    $: tabs = [
        { value: 'prices', label: 'Priser', icon: 'payments' },
        { value: 'exceptions', label: 'Unntak', icon: 'person_alert', dot: changes ? 'Ulagrede endringer' : '' },
        { value: 'products', label: 'Produkter og tjenester', icon: 'storefront', count: products.length },
        { value: 'access', label: 'Tilganger', icon: 'admin_panel_settings' }
    ]

    // ---------- Prices ----------
    function startPrices () {
        regular = String(settings.prices?.regularPrice ?? '')
        reduced = String(settings.prices?.reducedPrice ?? '')
        priceError = ''
        editingPrices = true
    }

    async function savePrices () {
        if (!validPrice(regular) || !validPrice(reduced)) {
            priceError = 'Prisen må være hele kroner mellom 0 og 9 999, uten mellomrom eller komma.'
            return
        }
        saving = true
        const now = new Date().toISOString()
        const data = {
            'prices.regularPrice': String(parseInt(regular, 10)),
            'prices.reducedPrice': String(parseInt(reduced, 10)),
            'prices.lastEditedBy': token.upn,
            'prices.lastEditedAt': now
        }
        const response = await updateSettings({
            data,
            changeLog: { changedBy: token.upn, changedAt: now, changes: { regularPrice: data['prices.regularPrice'], reducedPrice: data['prices.reducedPrice'] } }
        })
        saving = false
        if (response?.status !== 200) {
            priceError = 'Prisene ble ikke lagret. Prøv igjen om litt.'
            return
        }
        editingPrices = false
        await load()
        say(`Prisene er lagret: ordinær kr ${data['prices.regularPrice']}, redusert kr ${data['prices.reducedPrice']}.`)
    }

    // ---------- Exceptions ----------
    async function findStudents (list) {
        const query = search[list].query.trim()
        if (!query) return
        search[list].busy = true
        const response = await searchContracts(query, 'regular', token)
        search[list] = { query, busy: false, results: Array.isArray(response) ? response : [] }
        pages[list].hits = 1
    }

    const onList = (everyone, fnr) => everyone.some(s => s.fnr === fnr)

    // Stored with the same fields as before; the per-contract list from the search is left out.
    function addStudent (list, student) {
        const { contracts, ...entry } = student
        pending[list].add = [...pending[list].add, entry]
        pages[list].people = pageCount(withPending(lists[list], pending[list])) // show the new one, at the end of the list
    }

    const removeStudent = (list, fnr) => { pending[list].remove = [...pending[list].remove, fnr] }
    function undo (list, fnr) {
        pending[list].add = pending[list].add.filter(s => s.fnr !== fnr)
        pending[list].remove = pending[list].remove.filter(f => f !== fnr)
        pages[list].people = Math.min(pages[list].people, pageCount(withPending(lists[list], pending[list])))
    }

    const discard = () => { pending = { price: { add: [], remove: [] }, flow: { add: [], remove: [] } } }

    async function saveExceptions () {
        saving = true
        const data = {}
        for (const list of Object.keys(LISTS)) {
            if (!pending[list].add.length && !pending[list].remove.length) continue
            data[`${LISTS[list].key}.students`] = [
                ...lists[list].filter(s => !pending[list].remove.includes(s.fnr)),
                ...pending[list].add
            ]
        }
        const response = await updateSettings({ data })
        saving = false
        if (response?.status !== 200) {
            say('Unntakene ble ikke lagret. Endringene står fortsatt markert, så du kan prøve igjen.', 'danger')
            return
        }
        discard()
        search = { price: { query: '', results: null, busy: false }, flow: { query: '', results: null, busy: false } }
        pages = { price: { people: 1, hits: 1 }, flow: { people: 1, hits: 1 } }
        await load()
        say('Unntakene er lagret.')
    }

    // ---------- Products ----------
    const extraFields = (product) => Object.keys(product).filter(key => !STANDARD_FIELDS.includes(key))
    const lastChange = (product) => product.auditLog?.[product.auditLog.length - 1]

    function openProduct (product = null) {
        formError = ''
        form = {
            product,
            name: product?.name ?? '',
            price: product && !isCalculatedProduct(product._id) ? String(product.price ?? '') : '',
            description: product?.description ?? '',
            active: product ? Boolean(product.active) : true,
            fields: product ? extraFields(product).map(key => ({ key, value: product[key] ?? '' })) : [],
            newKey: '',
            newValue: '',
            keyError: ''
        }
    }

    function addField () {
        const key = form.newKey.trim()
        if (STANDARD_FIELDS.includes(key)) {
            form.keyError = `«${key}» er et reservert navn. Bruk et annet feltnavn.`
        } else if (form.fields.some(f => f.key === key)) {
            form.keyError = 'Et felt med dette navnet finnes allerede.'
        } else {
            form.fields = [...form.fields, { key, value: form.newValue.trim() }]
            form.newKey = ''
            form.newValue = ''
            form.keyError = ''
        }
    }

    async function saveProduct () {
        const calculated = form.product && isCalculatedProduct(form.product._id)
        if (!form.name.trim()) { formError = 'Produktet må ha et navn.'; return }
        if (!calculated && !validPrice(form.price)) { formError = 'Prisen må være hele kroner mellom 0 og 9 999.'; return }
        saving = true
        formError = ''
        const now = new Date().toISOString()
        const fields = Object.fromEntries(form.fields.map(f => [f.key, f.value]))
        let response

        if (!form.product) {
            const product = {
                name: form.name.trim(),
                price: parseInt(form.price, 10),
                description: form.description,
                ...fields,
                active: form.active,
                metadata: { createdBy: token.upn, createdAt: now, updatedAt: now, version: 1 },
                auditLog: [{ upn: token.upn, action: 'created', timestamp: now, changes: { name: form.name.trim(), price: parseInt(form.price, 10), description: form.description, active: form.active } }]
            }
            response = await postProduct(product)
            if (response?.status !== 201) response = null
        } else {
            const original = form.product
            const changes = {}
            if (form.name.trim() !== original.name) changes.name = form.name.trim()
            if (!calculated && parseInt(form.price, 10) !== original.price) changes.price = parseInt(form.price, 10)
            if (form.description !== (original.description ?? '')) changes.description = form.description
            if (form.active !== Boolean(original.active)) changes.active = form.active
            for (const key of new Set([...extraFields(original), ...Object.keys(fields)])) {
                if ((fields[key] ?? null) !== (original[key] ?? null)) changes[key] = key in fields ? fields[key] : null
            }
            if (!Object.keys(changes).length) {
                saving = false
                formError = 'Ingen endringer å lagre.'
                return
            }
            response = await updateProduct(original._id, {
                data: { ...changes, 'metadata.updatedAt': now, 'metadata.version': (original.metadata?.version ?? 1) + 1 },
                auditLog: [...(original.auditLog ?? []), { upn: token.upn, action: 'updated', timestamp: now, changes }]
            })
            if (response?.status !== 200) response = null
        }

        saving = false
        if (!response) {
            formError = 'Produktet ble ikke lagret. Prøv igjen om litt.'
            return
        }
        const name = form.name.trim()
        const added = !form.product
        form = null
        await load()
        say(added ? `«${name}» er lagt til.` : `Endringene på «${name}» er lagret.`)
    }

    async function toggleActive (product) {
        const now = new Date().toISOString()
        const active = !product.active
        const response = await updateProduct(product._id, {
            data: { active, 'metadata.updatedAt': now, 'metadata.version': (product.metadata?.version ?? 1) + 1 },
            auditLog: [...(product.auditLog ?? []), { upn: token.upn, action: 'updated', timestamp: now, changes: { active } }]
        })
        if (response?.status !== 200) {
            say(`«${product.name}» ble ikke endret. Prøv igjen om litt.`, 'danger')
            return
        }
        toDelete = null
        await load()
        say(`«${product.name}» er ${active ? 'aktiv igjen' : 'gjort inaktiv'}.`)
    }

    async function confirmDelete () {
        saving = true
        deleteError = ''
        const response = await deleteProduct(toDelete._id)
        saving = false
        if (response?.status !== 200) {
            deleteError = 'Produktet ble ikke slettet. Prøv igjen om litt.'
            return
        }
        const name = toDelete.name
        toDelete = null
        await load()
        say(`«${name}» er slettet.`)
    }
</script>

    <main>
        <header>
            <h1 class="ds-heading" data-size="lg">Innstillinger</h1>
            <p class="ds-paragraph lead" data-size="sm">Priser, unntak og produkter som brukes når elevavtaler faktureres, og hvem som har tilgang til Elevavtaler.</p>
        </header>

        {#await ready}
            <div class="center"><DsSpinner size="sm" title="Laster" /></div>
        {:then}
            {#if !isElevkontraktAdmin(token)}
                <DsAlert color="warning" heading="Du har ikke tilgang til innstillingene">
                    <p class="ds-paragraph" data-size="sm">Innstillingene er bare for administratorer. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else if loadState === 'error'}
                <DsAlert color="danger" heading="Innstillingene kunne ikke hentes">
                    <p class="ds-paragraph" data-size="sm">Last inn siden på nytt. Kontakt servicedesk hvis feilen fortsetter.</p>
                </DsAlert>
            {:else}
                {#if flash.text}
                    <DsAlert color={flash.color} dismissible on:dismiss={() => (flash = { text: '', color: 'success' })}>
                        <p class="ds-paragraph" data-size="sm">{flash.text}</p>
                    </DsAlert>
                {/if}

                <DsTabs {tabs} bind:value={tab} label="Innstillinger" let:value>
                    {#if value === 'prices'}
                        <section class="section" aria-labelledby="h-prices">
                            <div class="section-head">
                                <div>
                                    <h2 class="ds-heading" data-size="xs" id="h-prices"><span class="material-symbols-outlined" aria-hidden="true">payments</span>Priser for leieavtaler</h2>
                                    <p class="ds-paragraph lead" data-size="sm">Prisen på en rate settes når fakturaen sendes til Xledger kl. 01.00. En endring gjelder derfor også rater som ligger på en faktura som ikke er sendt ennå. Fakturaer som alt er sendt, og priser på tilleggstjenester, endres ikke.</p>
                                </div>
                                {#if !editingPrices}
                                    <DsButton variant="secondary" size="sm" on:click={startPrices}><span class="material-symbols-outlined" aria-hidden="true">edit</span>Endre priser</DsButton>
                                {/if}
                            </div>
                            <div class="prices">
                                {#each [['regular', 'Ordinær pris', 'Per rate, for de fleste elever'], ['reduced', 'Redusert pris', 'For elever på listen under Unntak']] as [key, label, help]}
                                    <div class="price-card">
                                        <span class="price-label">{label}</span>
                                        {#if editingPrices}
                                            {#if key === 'regular'}
                                                <DsInput label={label} inputmode="numeric" maxlength={4} bind:value={regular} />
                                            {:else}
                                                <DsInput label={label} inputmode="numeric" maxlength={4} bind:value={reduced} />
                                            {/if}
                                        {:else}
                                            <span class="price-value">kr {settings.prices?.[`${key}Price`] ?? '–'}</span>
                                        {/if}
                                        <small>{help}</small>
                                    </div>
                                {/each}
                            </div>
                            {#if editingPrices}
                                {#if priceError}
                                    <p class="ds-validation-message" data-size="sm">{priceError}</p>
                                {:else}
                                    <p class="ds-paragraph muted" data-size="xs">Hele kroner fra 0 til 9 999.</p>
                                {/if}
                                <div class="actions">
                                    <DsButton loading={saving} loadingText="Lagrer …" on:click={savePrices}>Lagre priser</DsButton>
                                    <DsButton variant="secondary" disabled={saving} on:click={() => (editingPrices = false)}>Avbryt</DsButton>
                                </div>
                            {/if}
                            {#if settings.prices?.lastEditedBy}
                                <p class="edited-by"><span class="material-symbols-outlined" aria-hidden="true">history</span>Sist endret av {settings.prices.lastEditedBy}{settings.prices.lastEditedAt ? `, ${new Date(settings.prices.lastEditedAt).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</p>
                            {/if}
                        </section>
                    {:else if value === 'exceptions'}
                        <div class="exc-grid">
                            {#each Object.entries(LISTS) as [list, meta] (list)}
                                {@const everyone = everyoneIn[list]}
                                {@const peoplePages = pageCount(everyone)}
                                <section class="section" aria-labelledby="h-{list}">
                                    <div>
                                        <h2 class="ds-heading" data-size="xs" id="h-{list}">
                                            <span class="material-symbols-outlined" aria-hidden="true">{meta.icon}</span>{meta.title} <span class="count">{lists[list].length}</span>
                                        </h2>
                                        <p class="ds-paragraph lead" data-size="sm">
                                            {#if list === 'price'}Elevene her faktureres med redusert pris (kr {settings.prices?.reducedPrice}) i stedet for ordinær pris.{:else}Elevene her faktureres ikke automatisk. De må faktureres manuelt under Fakturering.{/if}
                                        </p>
                                    </div>
                                    <ul class="people" aria-label={meta.title}>
                                        {#each pageOf(everyone, Math.min(pages[list].people, peoplePages)) as student (student.fnr)}
                                            <li class:removing={student.state === 'removing'} class:adding={student.state === 'adding'}>
                                                <span class="who">
                                                    <strong>
                                                        {student.name}
                                                        {#if student.state === 'removing'}<DsTag color="danger">Fjernes</DsTag>{:else if student.state === 'adding'}<DsTag color="success">Legges til</DsTag>{/if}
                                                    </strong>
                                                    <small>{formatFnr(student.fnr)}</small>
                                                </span>
                                                {#if student.state}
                                                    <DsButton variant="tertiary" size="sm" on:click={() => undo(list, student.fnr)}><span class="material-symbols-outlined" aria-hidden="true">undo</span>Angre</DsButton>
                                                {:else}
                                                    <DsButton variant="tertiary" color="danger" size="sm" on:click={() => removeStudent(list, student.fnr)}>
                                                        <span class="material-symbols-outlined" aria-hidden="true">person_remove</span>Fjern<span class="ds-sr-only"> {student.name} fra listen</span>
                                                    </DsButton>
                                                {/if}
                                            </li>
                                        {:else}
                                            <li><span class="empty">Ingen elever på listen.</span></li>
                                        {/each}
                                    </ul>
                                    {#if everyone.length > PER_PAGE}
                                        <div class="list-foot">
                                            <p class="ds-paragraph muted" data-size="xs">{range(everyone, Math.min(pages[list].people, peoplePages))}</p>
                                            <DsPagination bind:current={pages[list].people} total={peoplePages} label="Sider i {meta.title.toLowerCase()}" />
                                        </div>
                                    {/if}
                                    <form class="add-box" role="search" on:submit|preventDefault={() => findStudents(list)}>
                                        <div class="add-row">
                                            <DsInput label="Legg til elev" type="search" placeholder="Fornavn, etternavn eller begge" autocomplete="off" bind:value={search[list].query} />
                                            <DsButton type="submit" variant="secondary" size="sm" loading={search[list].busy} loadingText="Søker …">
                                                <span class="material-symbols-outlined" aria-hidden="true">search</span>Søk
                                            </DsButton>
                                        </div>
                                        {#if search[list].results?.length === 0}
                                            <p class="ds-paragraph muted" data-size="sm">Fant ingen elever for «{search[list].query}».</p>
                                        {:else if search[list].results}
                                            {@const hits = search[list].results}
                                            <ul class="hits">
                                                {#each pageOf(hits, pages[list].hits) as student (student.fnr)}
                                                    <li>
                                                        <span class="who"><strong>{student.name}</strong><small>{formatFnr(student.fnr)}</small></span>
                                                        {#if onList(everyoneIn[list], student.fnr)}
                                                            <span class="muted small">På listen</span>
                                                        {:else}
                                                            <DsButton variant="secondary" size="sm" on:click={() => addStudent(list, student)}><span class="material-symbols-outlined" aria-hidden="true">person_add</span>Legg til</DsButton>
                                                        {/if}
                                                    </li>
                                                {/each}
                                            </ul>
                                            {#if hits.length > PER_PAGE}
                                                <div class="list-foot">
                                                    <p class="ds-paragraph muted" data-size="xs">{range(hits, pages[list].hits)} treff</p>
                                                    <DsPagination bind:current={pages[list].hits} total={pageCount(hits)} label="Sider i søkeresultatet" />
                                                </div>
                                            {/if}
                                        {/if}
                                    </form>
                                </section>
                            {/each}
                        </div>
                    {:else if value === 'access'}
                        <AccessGroups me={token.oid} on:say={({ detail }) => say(detail.text, detail.color)} />
                    {:else}
                        <section class="section" aria-labelledby="h-products">
                            <div class="section-head">
                                <div>
                                    <h2 class="ds-heading" data-size="xs" id="h-products"><span class="material-symbols-outlined" aria-hidden="true">storefront</span>Produkter og tjenester</h2>
                                    <p class="ds-paragraph lead" data-size="sm">Aktive produkter kan legges på en faktura under Fakturering. Tomme ekstrafelt fylles ut når fakturaen lages.</p>
                                </div>
                                <DsButton size="sm" on:click={() => openProduct()}><span class="material-symbols-outlined" aria-hidden="true">add</span>Nytt produkt</DsButton>
                            </div>
                            <div class="table-wrap">
                                <table class="ds-table" data-size="sm" data-border>
                                    <thead><tr><th>Produkt</th><th class="num">Pris</th><th>Status</th><th>Ekstrafelt</th><th>Sist endret</th><th><span class="ds-sr-only">Handlinger</span></th></tr></thead>
                                    <tbody>
                                        {#each products as product (product._id)}
                                            {@const change = lastChange(product)}
                                            <tr>
                                                <td>
                                                    <span class="p-name">{product.name}{#if isCalculatedProduct(product._id)}<DsTag color="brand1">Beregnet pris</DsTag>{/if}</span>
                                                    <span class="p-desc">{product.description ?? ''}</span>
                                                </td>
                                                <td class="num">{#if isCalculatedProduct(product._id)}<span class="muted small">{CALCULATED[product._id]}</span>{:else}kr {product.price}{/if}</td>
                                                <td><DsTag color={product.active ? 'success' : 'neutral'}>{product.active ? 'Aktiv' : 'Inaktiv'}</DsTag></td>
                                                <td>
                                                    <span class="chips">
                                                        {#each extraFields(product) as key}
                                                            {#if String(product[key] ?? '').trim()}
                                                                <span class="chip">{key}: <strong>{product[key]}</strong></span>
                                                            {:else}
                                                                <span class="chip empty" title="Fylles ut ved fakturering">{key}</span>
                                                            {/if}
                                                        {:else}
                                                            <span class="muted">–</span>
                                                        {/each}
                                                    </span>
                                                </td>
                                                <td><span class="changed">{formatShortDate(product.metadata?.updatedAt) || '–'}<small>{change?.upn ?? product.metadata?.createdBy ?? ''}</small></span></td>
                                                <td class="act">
                                                    <DsButton variant="secondary" size="sm" on:click={() => openProduct(product)}><span class="material-symbols-outlined" aria-hidden="true">edit</span>Rediger</DsButton>
                                                    <DsDropdown label="Flere handlinger for {product.name}">
                                                        <li><button class="ds-button" data-variant="tertiary" type="button" on:click={() => toggleActive(product)}>
                                                            <span class="material-symbols-outlined" aria-hidden="true">{product.active ? 'visibility_off' : 'visibility'}</span>{product.active ? 'Gjør inaktiv' : 'Gjør aktiv'}
                                                        </button></li>
                                                        <li><button class="ds-button" data-variant="tertiary" data-color="danger" type="button" on:click={() => { deleteError = ''; toDelete = product }}>
                                                            <span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett
                                                        </button></li>
                                                    </DsDropdown>
                                                </td>
                                            </tr>
                                        {:else}
                                            <tr><td colspan="6" class="muted">Ingen produkter ennå.</td></tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    {/if}
                </DsTabs>

                {#if changes}
                    <div class="save-bar" role="region" aria-label="Ulagrede endringer">
                        <div class="inner">
                            <span class="msg"><span class="material-symbols-outlined" aria-hidden="true">edit_note</span><span><strong>{changes} {changes === 1 ? 'endring' : 'endringer'}</strong> i unntakene er ikke lagret</span></span>
                            <span class="btns">
                                <DsButton variant="secondary" size="sm" disabled={saving} on:click={discard}>Forkast</DsButton>
                                <DsButton size="sm" loading={saving} loadingText="Lagrer …" on:click={saveExceptions}>Lagre endringer</DsButton>
                            </span>
                        </div>
                    </div>
                {/if}

                <DsDialog open={Boolean(form)} on:close={() => (form = null)} width="40rem" labelledby="product-title" closedby={saving ? 'none' : 'any'}>
                    {#if form}
                        {@const calculated = form.product && isCalculatedProduct(form.product._id)}
                        <h2 class="ds-heading" data-size="sm" id="product-title">{form.product ? 'Rediger produkt' : 'Nytt produkt eller ny tjeneste'}</h2>
                        {#if calculated}
                            <DsAlert color="info"><p class="ds-paragraph" data-size="sm">Prisen på dette produktet regnes ut når fakturaen lages ({CALCULATED[form.product._id].toLowerCase()}). Du kan endre navn, beskrivelse, status og ekstrafelt.</p></DsAlert>
                        {/if}
                        <div class="form-grid">
                            <DsInput label="Navn" maxlength={50} bind:value={form.name} />
                            {#if !calculated}
                                <DsInput label="Pris (kr)" inputmode="numeric" maxlength={4} bind:value={form.price} />
                            {/if}
                            <div class="full"><DsTextarea label="Beskrivelse" rows={2} maxlength={200} bind:value={form.description} /></div>
                            <div class="full"><DsCheckbox type="switch" label="Aktiv, kan legges på fakturaer" bind:checked={form.active} /></div>
                            <fieldset class="ds-fieldset full">
                                <legend class="ds-label">Ekstrafelt <span class="muted">(valgfritt)</span></legend>
                                <p class="ds-paragraph muted" data-size="xs">For eksempel «Saksnummer» eller «Garanti». Står verdien tom, fyller den som fakturerer den inn.</p>
                                {#each form.fields as field, i (field.key)}
                                    <div class="field-row">
                                        <span class="field-key">{field.key}</span>
                                        <DsInput label="Verdi for {field.key}" placeholder="Tom: fylles ut ved fakturering" maxlength={100} bind:value={field.value} />
                                        <DsButton variant="tertiary" color="danger" size="sm" on:click={() => { form.fields = form.fields.filter((_, n) => n !== i) }}>
                                            <span class="material-symbols-outlined" aria-hidden="true">delete</span><span class="ds-sr-only">Fjern feltet {field.key}</span>
                                        </DsButton>
                                    </div>
                                {/each}
                                <div class="field-row new">
                                    <DsInput label="Nytt felt" placeholder="Feltnavn" maxlength={50} error={form.keyError} bind:value={form.newKey} />
                                    <DsInput label="Verdi" placeholder="Kan være tom" maxlength={100} bind:value={form.newValue} />
                                    <DsButton variant="secondary" size="sm" disabled={!form.newKey.trim()} on:click={addField}><span class="material-symbols-outlined" aria-hidden="true">add</span>Legg til</DsButton>
                                </div>
                            </fieldset>
                        </div>
                        {#if formError}
                            <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{formError}</p></DsAlert>
                        {/if}
                    {/if}
                    <svelte:fragment slot="footer">
                        <DsButton loading={saving} loadingText="Lagrer …" on:click={saveProduct}>{form?.product ? 'Lagre endringer' : 'Legg til produkt'}</DsButton>
                        <DsButton variant="secondary" disabled={saving} on:click={() => (form = null)}>Avbryt</DsButton>
                    </svelte:fragment>
                </DsDialog>

                <DsDialog open={Boolean(toDelete)} on:close={() => (toDelete = null)} width="32rem" labelledby="delete-title" closedby={saving ? 'none' : 'any'}>
                    {#if toDelete}
                        {#if isCalculatedProduct(toDelete._id)}
                            <h2 class="ds-heading" data-size="sm" id="delete-title">«{toDelete.name}» kan ikke slettes</h2>
                            <p class="ds-paragraph" data-size="sm">Prisen på produktet regnes ut i koden, og fakturasiden er avhengig av det. Vil du at det ikke skal kunne brukes, kan du gjøre det inaktivt.</p>
                        {:else}
                            <h2 class="ds-heading" data-size="sm" id="delete-title">Slette «{toDelete.name}»?</h2>
                            <p class="ds-paragraph" data-size="sm">Produktet kan ikke lenger legges på nye fakturaer, og slettingen kan ikke angres. Vil du bare skjule det for en periode, gjør det inaktivt i stedet.</p>
                            {#if deleteError}
                                <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{deleteError}</p></DsAlert>
                            {/if}
                        {/if}
                    {/if}
                    <svelte:fragment slot="footer">
                        {#if toDelete && !isCalculatedProduct(toDelete._id)}
                            <DsButton color="danger" loading={saving} loadingText="Sletter …" on:click={confirmDelete}><span class="material-symbols-outlined" aria-hidden="true">delete</span>Slett produktet</DsButton>
                        {/if}
                        {#if toDelete?.active}
                            <DsButton variant="secondary" disabled={saving} on:click={() => toggleActive(toDelete)}>{isCalculatedProduct(toDelete._id) ? 'Gjør inaktiv' : 'Gjør inaktiv i stedet'}</DsButton>
                        {/if}
                        <DsButton variant="tertiary" disabled={saving} on:click={() => (toDelete = null)}>Avbryt</DsButton>
                    </svelte:fragment>
                </DsDialog>
            {/if}
        {/await}
    </main>

<style>
    main {
        padding: var(--ds-size-4, 1rem) var(--ds-size-4, 1rem) 8rem;
        max-width: 72rem;
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
    .muted {
        color: var(--ds-color-neutral-text-subtle);
    }

    .small { font-size: 0.85rem; }

    .section {
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
        padding: var(--ds-size-5);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4);
    }

    .section-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--ds-size-3);
    }

    .section h2 {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .section h2 .material-symbols-outlined { color: var(--ds-color-accent-text-subtle); }

    .section .lead {
        max-width: 60ch;
        margin-top: var(--ds-size-1);
    }

    .count {
        font-variant-numeric: tabular-nums;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 0 0.45rem;
        border-radius: var(--ds-border-radius-full);
        background: var(--ds-color-neutral-surface-tinted);
    }

    .prices {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: var(--ds-size-4);
    }

    .price-card {
        border-radius: var(--ds-border-radius-md);
        background: var(--ds-color-accent-background-tinted);
        padding: var(--ds-size-4) var(--ds-size-5);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .price-label {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ds-color-accent-text-subtle);
    }

    .price-card :global(.ds-label) {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
    }

    .price-value {
        font-family: 'Nunito', 'Nunito Sans', sans-serif;
        font-size: 2rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
    }

    .price-card small { color: var(--ds-color-neutral-text-subtle); }

    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2);
    }

    .edited-by {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.88rem;
        color: var(--ds-color-neutral-text-subtle);
    }

    .exc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
        gap: var(--ds-size-5);
        align-items: start;
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

    .people li,
    .hits li {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--ds-size-2) var(--ds-size-3);
        padding: var(--ds-size-2) var(--ds-size-3);
    }

    .people li { border-top: 1px solid var(--ds-color-neutral-border-subtle); }
    .people li:first-child { border-top: 0; }

    .people li.adding {
        background: var(--ds-color-success-surface-tinted);
        box-shadow: inset 4px 0 0 var(--ds-color-success-base-default);
    }

    .people li.removing {
        background: var(--ds-color-danger-surface-tinted);
        box-shadow: inset 4px 0 0 var(--ds-color-danger-base-default);
    }

    .who {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
    }

    .who strong {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .removing .who strong { text-decoration: line-through; }

    .who small {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.8rem;
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

    .list-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-2);
        font-variant-numeric: tabular-nums;
    }

    .hits li {
        background: var(--ds-color-neutral-background-default);
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
    }

    .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-lg);
    }

    .ds-table {
        --dsc-table-padding: 0.7rem 0.85rem;
        min-width: 100%;
        font-variant-numeric: tabular-nums;
    }

    .ds-table > thead > tr > :global(*) {
        background: var(--ds-color-accent-background-tinted);
        white-space: nowrap;
    }

    .ds-table td { vertical-align: top; }

    .p-name {
        font-weight: 700;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .p-desc {
        display: block;
        font-size: 0.85rem;
        color: var(--ds-color-neutral-text-subtle);
        margin-top: 2px;
        max-width: 34ch;
    }

    .num {
        text-align: right;
        white-space: nowrap;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
    }

    .chip {
        display: inline-flex;
        gap: 0.3rem;
        align-items: center;
        font-size: 0.8rem;
        padding: 0.1rem 0.5rem;
        border-radius: var(--ds-border-radius-sm);
        background: var(--ds-color-neutral-surface-tinted);
    }

    .chip.empty {
        background: transparent;
        border: 1px dashed var(--ds-color-neutral-border-default);
        color: var(--ds-color-neutral-text-subtle);
    }

    .changed {
        display: flex;
        flex-direction: column;
    }

    .changed small {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.8rem;
    }

    .act {
        white-space: nowrap;
        text-align: right;
    }

    .save-bar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 30;
        display: flex;
        justify-content: center;
        padding: var(--ds-size-3) 16px calc(var(--ds-size-3) + env(safe-area-inset-bottom, 0px));
        pointer-events: none;
    }

    .save-bar .inner {
        pointer-events: auto;
        width: min(64rem, 100%);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-size-3);
        padding: var(--ds-size-3) var(--ds-size-5);
        background: var(--ds-color-neutral-background-default);
        border: 1px solid var(--ds-color-warning-border-default);
        border-radius: var(--ds-border-radius-lg);
        box-shadow: 0 10px 30px rgb(0 40 48 / 0.18);
    }

    .msg,
    .btns {
        display: flex;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 10rem;
        gap: var(--ds-size-4);
    }

    @media (max-width: 520px) {
        .form-grid { grid-template-columns: 1fr; }
    }

    .form-grid .full,
    .form-grid fieldset { grid-column: 1 / -1; }

    fieldset {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .field-row {
        display: grid;
        grid-template-columns: 10rem 1fr auto;
        gap: var(--ds-size-2);
        align-items: flex-end;
    }

    .field-row.new { grid-template-columns: 1fr 1fr auto; }

    .field-key {
        font-weight: 600;
        padding-bottom: 0.6rem;
        overflow-wrap: anywhere;
    }

    @media (max-width: 520px) {
        .field-row,
        .field-row.new { grid-template-columns: 1fr; }
    }
</style>
