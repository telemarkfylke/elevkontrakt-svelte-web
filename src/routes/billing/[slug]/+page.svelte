<script>
    /**
     * Invoice an elev: rates and tilleggstjenester on the left, the invoice (cart) on the right.
     * Rates and tilleggstjenester become two invoices. Nothing is sent before the user confirms.
     */
    import { page } from '$app/stores'
    import { get } from 'svelte/store'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsButton from '$lib/components/ds/DsButton.svelte'
    import DsDialog from '$lib/components/ds/DsDialog.svelte'
    import DsInput from '$lib/components/ds/DsInput.svelte'
    import DsSpinner from '$lib/components/ds/DsSpinner.svelte'
    import DsTag from '$lib/components/ds/DsTag.svelte'
    import StatusTag from '$lib/components/StatusTag.svelte'
    import ContractCard from '$lib/components/ContractCard.svelte'
    import { formatFnr } from '$lib/helpers/formatFnr.js'
    import { formatShortDate } from '$lib/helpers/formatDate.js'
    import { returnLatestKnownStudentInfo } from '$lib/helpers/latestKnownStudentInfo'
    import { hasAnyRole, isElevkontraktAdmin, ELEVKONTRAKT_ADMIN } from '$lib/helpers/roles.js'
    import { ADMIN_ONLY_PRODUCTS, productPrice, checkProductPrice, ratePrice, hasReducedPrice } from '$lib/helpers/prices.js'
    import { billingTargetCollection } from '$lib/store'
    import { getContractsWithId, getElevkontraktToken, getProducts, getSettings, sendInvoice } from '$lib/useApi'

    const BILLING_WRITE_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.billing-readwrite']
    const STANDARD_FIELDS = ['_id', 'name', 'price', 'description', 'active', 'metadata', 'auditLog']
    // Extra fields that hold the price itself, so they are not shown as text on the invoice line.
    const PRICE_FIELDS = ['Innkjøpspris PC', 'Egenandel', 'Restverdi']

    const collection = get(billingTargetCollection)
    const tokenPromise = getElevkontraktToken(true)

    let contracts = []
    let settings = null
    let products = []
    let loadState = 'loading' // loading | ready | notFound | error
    let loadError = ''

    let cart = { buyOut: [], extraInvoice: [] }
    let values = {} // what the user typed into empty extra fields, per product id
    let confirmOpen = false
    let sending = false
    let sendError = ''
    let flash = ''

    async function load (token) {
        const [contractResult, settingsResponse, productsResponse] = await Promise.all([
            getContractsWithId($page.params.slug, collection),
            getSettings(),
            getProducts()
        ])
        if (!Array.isArray(contractResult)) {
            loadState = 'notFound'
            return
        }
        settings = settingsResponse?.data?.result?.[0] ?? null
        const allProducts = productsResponse?.status === 200 ? productsResponse.data.result : []
        if (!settings || productsResponse?.status !== 200) {
            loadError = 'Priser eller produkter kunne ikke hentes. Last inn siden på nytt før du lager en faktura.'
        }
        products = allProducts.filter(p => isElevkontraktAdmin(token) || !ADMIN_ONLY_PRODUCTS.includes(p._id))
        contracts = contractResult
        loadState = 'ready'
    }

    const ready = tokenPromise.then(token => hasAnyRole(token, BILLING_WRITE_ROLES) ? load(token).then(() => token) : token)

    // The first contract in the link is the one being invoiced, as before.
    $: contract = contracts[0]
    $: elev = contract?.elevInfo
    $: rates = Object.entries(contract?.fakturaInfo ?? {}).map(([key, rate]) => ({ key, number: key.slice(-1), ...rate }))
    $: price = settings && elev ? ratePrice(settings, elev) : null
    $: reduced = settings && elev ? hasReducedPrice(settings, elev) : false
    $: activeProducts = products.filter(p => p.active)

    const isOpenRate = (rate) => String(rate.status).toLowerCase() === 'ikke fakturert'
    const rateInCart = (rate, cart) => cart.buyOut.some(item => item.faktureringsår === rate.faktureringsår)
    const productInCart = (product, cart) => cart.extraInvoice.some(item => item._id === product._id)
    const extraKeys = (product) => Object.keys(product).filter(key => !STANDARD_FIELDS.includes(key))
    const emptyKeys = (product) => extraKeys(product).filter(key => !String(product[key] ?? '').trim())
    const priceOf = (product, values) => productPrice(product, values[product._id], settings, elev)

    function toggleRate (rate) {
        cart.buyOut = rateInCart(rate, cart)
            ? cart.buyOut.filter(item => item.faktureringsår !== rate.faktureringsår)
            : [...cart.buyOut, { ...contract.fakturaInfo[rate.key], sum: price }] // the whole rate, as before
    }

    function toggleProduct (product) {
        if (productInCart(product, cart)) {
            cart.extraInvoice = cart.extraInvoice.filter(item => item._id !== product._id)
            return
        }
        const { price: amount } = priceOf(product, values)
        cart.extraInvoice = [...cart.extraInvoice, { ...product, ...(values[product._id] ?? {}), price: amount }]
    }

    function setValue (product, key, value) {
        values = { ...values, [product._id]: { ...(values[product._id] ?? {}), [key]: value } }
    }

    $: lines = [
        ...cart.buyOut.map(item => ({ key: `r${item.faktureringsår}`, group: 'rates', label: `Rate ${rates.find(r => r.faktureringsår === item.faktureringsår)?.number ?? ''}`, sub: `Opprinnelig faktureringsår ${item.faktureringsår}${reduced ? ' · redusert pris' : ''}`, sum: item.sum, remove: () => { cart.buyOut = cart.buyOut.filter(i => i !== item) } })),
        ...cart.extraInvoice.map(item => ({ key: `p${item._id}`, group: 'products', label: item.name, sub: extraKeys(item).filter(k => !PRICE_FIELDS.includes(k) && String(item[k] ?? '').trim()).map(k => `${k}: ${item[k]}`).join(' · '), sum: item.price, remove: () => { cart.extraInvoice = cart.extraInvoice.filter(i => i !== item) } }))
    ]
    $: total = lines.reduce((sum, line) => sum + Number(line.sum || 0), 0)
    $: invoiceCount = (cart.buyOut.length ? 1 : 0) + (cart.extraInvoice.length ? 1 : 0)

    async function create (token) {
        sending = true
        sendError = ''
        const response = await sendInvoice(cart, contract._id, token, collection)
        sending = false
        if (response?.status !== 200) {
            // 409: the API allows one unsent tilleggstjeneste-faktura per contract.
            sendError = response?.response?.status === 409
                ? 'Eleven har allerede en faktura for tilleggstjenester som ikke er sendt. Slett den under Fakturaer og lag en ny, eller vent til den er sendt i natt.'
                : 'Fakturaen ble ikke opprettet. Ingenting er sendt. Prøv igjen om litt, og kontakt servicedesk hvis feilen fortsetter.'
            return
        }
        flash = `${invoiceCount === 2 ? '2 fakturaer' : 'Fakturaen'} på totalt kr ${total} er opprettet for ${contract.ansvarligInfo?.navn ?? 'ansvarlig'}. ${invoiceCount === 2 ? 'De sendes' : 'Den sendes'} til Xledger kl. 01.00.`
        cart = { buyOut: [], extraInvoice: [] }
        values = {}
        confirmOpen = false
        await load(token) // show the new rate statuses without reloading the page
    }

    // Back to the search keeps the search (the search page restores it from its snapshot).
    function back (event) {
        if (history.length > 1 && document.referrer.includes('/billing')) {
            event.preventDefault()
            history.back()
        }
    }
</script>

    <main>
        <a class="ds-link back" href="/billing" on:click={back}>
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>Tilbake til søket
        </a>

        {#await ready}
            <div class="loading" aria-busy="true"><div class="skel tall"></div><div class="skel"></div><div class="skel big"></div></div>
        {:then token}
            {#if !hasAnyRole(token, BILLING_WRITE_ROLES)}
                <h1 class="ds-heading" data-size="lg">Fakturering</h1>
                <DsAlert color="warning" heading="Du har ikke tilgang til fakturering">
                    <p class="ds-paragraph" data-size="sm">Fakturering er for administratorer og økonomi. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang.</p>
                </DsAlert>
            {:else if loadState === 'notFound'}
                <DsAlert color="warning" heading="Fant ikke avtalen">
                    <p class="ds-paragraph" data-size="sm">Avtalen i lenken finnes ikke i denne gruppen. Den kan være flyttet. Søk etter eleven på nytt.</p>
                </DsAlert>
            {:else}
                {@const student = returnLatestKnownStudentInfo(contract)}
                <header class="student">
                    <h1 class="ds-heading" data-size="lg">Fakturer {elev.navn}</h1>
                    <div class="meta">
                        <span><span class="material-symbols-outlined" aria-hidden="true">badge</span><span class="mono">{formatFnr(elev.fnr)}</span></span>
                        <span><span class="material-symbols-outlined" aria-hidden="true">school</span>{student.skole}{student.klasse && student.klasse !== 'Ukjent' ? `, ${student.klasse}` : ''}{elev.trinn ? ` · ${elev.trinn}` : ''}</span>
                        {#if elev.upn}<span><span class="material-symbols-outlined" aria-hidden="true">mail</span>{elev.upn}</span>{/if}
                    </div>
                </header>

                {#if flash}
                    <DsAlert color="success" dismissible on:dismiss={() => (flash = '')}>
                        <p class="ds-paragraph" data-size="sm">{flash}</p>
                    </DsAlert>
                {/if}
                {#if loadError}
                    <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{loadError}</p></DsAlert>
                {/if}

                <div class="layout">
                    <div class="col">
                        {#each contracts as item (item._id)}
                            <ContractCard contract={item} {token} />
                        {/each}

                        <section class="section" aria-labelledby="h-rates">
                            <div class="section-head">
                                <h2 class="ds-heading" data-size="xs" id="h-rates"><span class="material-symbols-outlined" aria-hidden="true">event_repeat</span>Rater</h2>
                                <span class="muted">{rates.filter(isOpenRate).length ? `${rates.filter(isOpenRate).length} ikke fakturert` : 'Alle rater er fakturert'}</span>
                            </div>
                            {#if price !== null}
                                <p class="ds-paragraph lead" data-size="sm">
                                    Eleven har {reduced ? 'redusert pris' : 'ordinær pris'}, <strong>kr {price}</strong> per rate. Endelig pris settes når fakturaen sendes til Xledger kl. 01.00.
                                </p>
                            {/if}
                            <ul class="picks">
                                {#each rates as rate (rate.key)}
                                    {@const open = isOpenRate(rate)}
                                    {@const picked = rateInCart(rate, cart)}
                                    <li class="pick" class:picked class:locked={!open}>
                                        <div class="what">
                                            <span class="name">Rate {rate.number} {#if picked}<DsTag color="accent">I fakturaen</DsTag>{:else}<StatusTag status={rate.status} />{/if}</span>
                                            <small>Faktureringsår {rate.faktureringsår}{rate.betaltDato && rate.betaltDato !== 'Ukjent' ? ` · betalt ${formatShortDate(rate.betaltDato)}` : ''}</small>
                                        </div>
                                        <span class="price">
                                            {#if open}kr {price ?? '–'}<small>{reduced ? 'redusert pris' : 'ordinær pris'}</small>{:else}{rate.sum ? `kr ${rate.sum}` : ''}{/if}
                                        </span>
                                        <span class="act">
                                            {#if !open}
                                                <span class="muted small">Allerede behandlet</span>
                                            {:else if picked}
                                                <DsButton variant="tertiary" size="sm" on:click={() => toggleRate(rate)}><span class="material-symbols-outlined" aria-hidden="true">remove_shopping_cart</span>Fjern</DsButton>
                                            {:else}
                                                <DsButton variant="secondary" size="sm" disabled={price === null} on:click={() => toggleRate(rate)}><span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>Legg til</DsButton>
                                            {/if}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        </section>

                        <section class="section" aria-labelledby="h-products">
                            <div class="section-head">
                                <h2 class="ds-heading" data-size="xs" id="h-products"><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>Tilleggstjenester og annet</h2>
                                <span class="muted">{activeProducts.length} tilgjengelige</span>
                            </div>
                            <p class="ds-paragraph lead" data-size="sm">Faktureres som en egen faktura til ansvarlig, ved siden av ratene.</p>
                            <ul class="picks">
                                {#each activeProducts as product (product._id)}
                                    {@const computed = priceOf(product, values)}
                                    {@const check = checkProductPrice(computed)}
                                    {@const picked = productInCart(product, cart)}
                                    <li class="pick" class:picked>
                                        <div class="what">
                                            <span class="name">{product.name} {#if picked}<DsTag color="accent">I fakturaen</DsTag>{/if}</span>
                                            <small>{product.description ?? ''}</small>
                                        </div>
                                        <span class="price">
                                            {computed.price === null || Number.isNaN(computed.price) ? '–' : `kr ${computed.price}`}
                                            {#if computed.how}<small>{computed.how}</small>{/if}
                                        </span>
                                        <span class="act">
                                            {#if picked}
                                                <DsButton variant="tertiary" size="sm" on:click={() => toggleProduct(product)}><span class="material-symbols-outlined" aria-hidden="true">remove_shopping_cart</span>Fjern</DsButton>
                                            {:else}
                                                <DsButton variant="secondary" size="sm" disabled={!check.ok} on:click={() => toggleProduct(product)}><span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>Legg til</DsButton>
                                            {/if}
                                        </span>
                                        {#if !picked && emptyKeys(product).length}
                                            <div class="extra">
                                                {#each emptyKeys(product) as key}
                                                    <DsInput
                                                        label={PRICE_FIELDS.includes(key) ? `${key} (kr)` : `${key} (valgfritt)`}
                                                        value={values[product._id]?.[key] ?? ''}
                                                        maxlength={100}
                                                        inputmode={PRICE_FIELDS.includes(key) ? 'numeric' : undefined}
                                                        placeholder={PRICE_FIELDS.includes(key) ? 'For eksempel 1500' : 'Fyll inn'}
                                                        error={check.level === 'block' && PRICE_FIELDS.includes(key) ? check.message : ''}
                                                        on:input={(event) => setValue(product, key, event.target.value)}
                                                    />
                                                {/each}
                                            </div>
                                        {/if}
                                        {#if !picked && check.level === 'block' && !emptyKeys(product).some(k => PRICE_FIELDS.includes(k))}
                                            <div class="warn"><DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{check.message}</p></DsAlert></div>
                                        {:else if !picked && check.level === 'need'}
                                            <p class="ds-paragraph muted small warn" data-size="xs">{check.message}</p>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        </section>
                    </div>

                    <aside class="cart" id="cart" aria-labelledby="h-cart">
                        <div class="cart-head">
                            <h2 class="ds-heading" data-size="xs" id="h-cart">Faktura</h2>
                            <div class="recipient">
                                <span class="material-symbols-outlined" aria-hidden="true">person</span>
                                <span>Sendes til <strong>{contract.ansvarligInfo?.navn ?? 'Ukjent'}</strong><br /><span class="muted">Ansvarlig på avtalen</span></span>
                            </div>
                        </div>
                        <div class="cart-body">
                            {#if !lines.length}
                                <div class="cart-empty">
                                    <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
                                    <p class="ds-paragraph" data-size="sm">Ingen linjer ennå. Legg til rater eller tilleggstjenester fra listen.</p>
                                </div>
                            {:else}
                                {#each [['rates', 'Rater', 1], ['products', 'Tilleggstjenester', 2]] as [group, title, n]}
                                    {@const groupLines = lines.filter(line => line.group === group)}
                                    {#if groupLines.length}
                                        <div class="inv-group">
                                            <h3 class="ds-heading" data-size="2xs">{title} {#if invoiceCount === 2}<small>faktura {n} av 2</small>{/if}</h3>
                                            <ul class="lines">
                                                {#each groupLines as line (line.key)}
                                                    <li>
                                                        <span>{line.label}{#if line.sub}<small>{line.sub}</small>{/if}</span>
                                                        <strong>kr {line.sum}</strong>
                                                        <button class="ds-button" data-variant="tertiary" data-size="sm" data-icon type="button" aria-label="Fjern {line.label}" on:click={line.remove}>
                                                            <span class="material-symbols-outlined" aria-hidden="true">close</span>
                                                        </button>
                                                    </li>
                                                {/each}
                                            </ul>
                                        </div>
                                    {/if}
                                {/each}
                                <div class="total"><span>Totalt</span><strong>kr {total}</strong></div>
                                {#if cart.buyOut.length}
                                    <p class="fine"><span class="material-symbols-outlined" aria-hidden="true">info</span>Prisen på ratene settes endelig når fakturaen sendes kl. 01.00. Endres prisene under Innstillinger før det, følger ratene med.</p>
                                {/if}
                            {/if}
                            <div class="cart-foot">
                                {#if invoiceCount === 2}
                                    <p class="fine"><span class="material-symbols-outlined" aria-hidden="true">call_split</span>Rater og tilleggstjenester blir to fakturaer.</p>
                                {/if}
                                <DsButton disabled={!invoiceCount} on:click={() => { sendError = ''; confirmOpen = true }}>
                                    <span class="material-symbols-outlined" aria-hidden="true">send</span>{invoiceCount === 2 ? 'Opprett 2 fakturaer' : 'Opprett faktura'}
                                </DsButton>
                                <p class="fine"><span class="material-symbols-outlined" aria-hidden="true">schedule</span>Fakturaen sendes til Xledger kl. 01.00 når mottakeren er klar i Xledger. Der blir den synlig når økonomiavdelingen har godkjent den.</p>
                            </div>
                        </div>
                    </aside>
                </div>

                {#if lines.length}
                    <div class="cart-bar">
                        <span><strong>kr {total}</strong> <span class="muted">· {lines.length} {lines.length === 1 ? 'linje' : 'linjer'}</span></span>
                        <a class="ds-button" data-variant="primary" data-size="sm" href="#cart">Til fakturaen <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span></a>
                    </div>
                {/if}

                <DsDialog bind:open={confirmOpen} width="34rem" labelledby="confirm-title" closedby={sending ? 'none' : 'any'}>
                    <h2 class="ds-heading" data-size="sm" id="confirm-title">{invoiceCount === 2 ? 'Opprette 2 fakturaer' : 'Opprette fakturaen'} til {contract.ansvarligInfo?.navn ?? 'ansvarlig'}?</h2>
                    {#each [['rates', invoiceCount === 2 ? 'Faktura 1: Rater' : 'Rater'], ['products', invoiceCount === 2 ? 'Faktura 2: Tilleggstjenester' : 'Tilleggstjenester']] as [group, title]}
                        {@const groupLines = lines.filter(line => line.group === group)}
                        {#if groupLines.length}
                            <div class="inv-group">
                                <h3 class="ds-heading" data-size="2xs">{title}</h3>
                                <ul class="lines plain">
                                    {#each groupLines as line (line.key)}
                                        <li><span>{line.label}{#if line.sub}<small>{line.sub}</small>{/if}</span><strong>kr {line.sum}</strong></li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    {/each}
                    <div class="total"><span>Totalt</span><strong>kr {total}</strong></div>
                    <p class="fine"><span class="material-symbols-outlined" aria-hidden="true">schedule</span>Sendes til Xledger kl. 01.00. Den kan ikke endres etter at den er opprettet. Er noe feil, sletter du fakturaen under <strong>Fakturaer</strong> og lager en ny før kl. 01.00.</p>
                    {#if sendError}
                        <DsAlert color="danger"><p class="ds-paragraph" data-size="sm">{sendError}</p></DsAlert>
                    {/if}
                    <svelte:fragment slot="footer">
                        <DsButton loading={sending} loadingText="Oppretter …" on:click={() => create(token)}>{invoiceCount === 2 ? 'Opprett fakturaene' : 'Opprett fakturaen'}</DsButton>
                        <DsButton variant="secondary" disabled={sending} on:click={() => (confirmOpen = false)}>Avbryt</DsButton>
                    </svelte:fragment>
                </DsDialog>
            {/if}
        {:catch}
            <DsAlert color="danger" heading="Siden kunne ikke lastes">
                <p class="ds-paragraph" data-size="sm">Last inn siden på nytt. Kontakt servicedesk hvis feilen fortsetter.</p>
            </DsAlert>
        {/await}
    </main>

<style>
    main {
        padding: var(--ds-size-4, 1rem) var(--ds-size-4, 1rem) 7rem;
        max-width: 84rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        align-self: flex-start;
    }

    .muted { color: var(--ds-color-neutral-text-subtle); }
    .small { font-size: 0.85rem; }
    .mono { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }

    .student {
        padding-bottom: var(--ds-size-4);
        border-bottom: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-1) var(--ds-size-5);
        margin-top: var(--ds-size-2);
        color: var(--ds-color-neutral-text-subtle);
    }

    .meta > span {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
    }

    .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 22rem;
        gap: var(--ds-size-6);
        align-items: start;
    }

    @media (max-width: 1100px) {
        .layout { grid-template-columns: 1fr; }
    }

    .col {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-5);
        min-width: 0;
    }

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
        align-items: baseline;
        gap: var(--ds-size-3);
    }

    .section-head h2 {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .section-head h2 .material-symbols-outlined { color: var(--ds-color-accent-text-subtle); }

    .lead {
        color: var(--ds-color-neutral-text-subtle);
        max-width: 60ch;
    }

    .picks {
        list-style: none;
        margin: 0;
        padding: 0;
        border: 1px solid var(--ds-color-neutral-border-subtle);
        border-radius: var(--ds-border-radius-md);
        overflow: hidden;
    }

    .pick {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: var(--ds-size-2) var(--ds-size-4);
        padding: var(--ds-size-3) var(--ds-size-4);
        border-top: 1px solid var(--ds-color-neutral-border-subtle);
    }

    .pick:first-child { border-top: 0; }

    .pick.picked {
        background: var(--ds-color-accent-surface-tinted);
        box-shadow: inset 4px 0 0 var(--ds-color-accent-base-default);
    }

    .pick.locked { background: var(--ds-color-neutral-background-tinted); }

    .what {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .name {
        font-weight: 700;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ds-size-2);
    }

    .what small,
    .price small {
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.85rem;
        font-weight: 400;
    }

    .price {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        text-align: right;
    }

    .price small { display: block; font-size: 0.78rem; }

    .act { justify-self: end; }

    .extra {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
        gap: var(--ds-size-3);
    }

    .warn { grid-column: 1 / -1; }

    @media (max-width: 560px) {
        .pick { grid-template-columns: 1fr auto; }
        .price { text-align: left; grid-column: 1; }
        .act { grid-column: 2; grid-row: 1 / span 2; }
    }

    .cart {
        position: sticky;
        top: var(--ds-size-5);
        border: 1px solid var(--ds-color-accent-border-default);
        border-radius: var(--ds-border-radius-lg);
        background: var(--ds-color-neutral-background-default);
        box-shadow: 0 1px 2px rgb(0 40 48 / 0.06), 0 10px 30px rgb(0 40 48 / 0.08);
        overflow: hidden;
    }

    @media (max-width: 1100px) {
        .cart { position: static; }
    }

    .cart-head {
        padding: var(--ds-size-4) var(--ds-size-5);
        background: var(--ds-color-accent-background-tinted);
        border-bottom: 1px solid var(--ds-color-accent-border-subtle);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-2);
    }

    .recipient {
        display: flex;
        gap: var(--ds-size-2);
        align-items: flex-start;
        font-size: 0.92rem;
    }

    .recipient .material-symbols-outlined { color: var(--ds-color-accent-text-subtle); }

    .cart-body {
        padding: var(--ds-size-4) var(--ds-size-5);
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4);
    }

    .cart-empty {
        text-align: center;
        color: var(--ds-color-neutral-text-subtle);
        display: grid;
        gap: var(--ds-size-2);
        justify-items: center;
        padding-block: var(--ds-size-4);
    }

    .cart-empty .material-symbols-outlined {
        font-size: 2rem;
        color: var(--ds-color-accent-text-subtle);
    }

    .inv-group h3 {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: var(--ds-size-2);
    }

    .inv-group h3 small {
        font-weight: 400;
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.8rem;
    }

    .lines {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-1);
    }

    .lines li {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--ds-size-2);
        font-size: 0.92rem;
        font-variant-numeric: tabular-nums;
    }

    .lines.plain li { grid-template-columns: 1fr auto; }

    .lines small {
        display: block;
        color: var(--ds-color-neutral-text-subtle);
        font-size: 0.78rem;
    }

    .total {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-top: var(--ds-size-3);
        border-top: 2px solid var(--ds-color-neutral-border-default);
        font-variant-numeric: tabular-nums;
    }

    .total strong { font-size: 1.35rem; }

    .cart-foot {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .cart-foot :global(.ds-button) {
        width: 100%;
        justify-content: center;
    }

    .fine {
        font-size: 0.82rem;
        color: var(--ds-color-neutral-text-subtle);
        display: flex;
        gap: 0.4rem;
        align-items: flex-start;
    }

    .fine .material-symbols-outlined {
        font-size: 1rem;
        margin-top: 1px;
    }

    .cart-bar { display: none; }

    @media (max-width: 1100px) {
        .cart-bar {
            display: flex;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 30;
            padding: var(--ds-size-3) 16px calc(var(--ds-size-3) + env(safe-area-inset-bottom, 0px));
            background: var(--ds-color-neutral-background-default);
            border-top: 1px solid var(--ds-color-neutral-border-default);
            box-shadow: 0 -6px 20px rgb(0 40 48 / 0.1);
            justify-content: space-between;
            align-items: center;
            gap: var(--ds-size-3);
            font-variant-numeric: tabular-nums;
        }
    }

    .loading {
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-3);
    }

    .skel {
        height: 4.2rem;
        border-radius: var(--ds-border-radius-lg);
        background: linear-gradient(90deg, var(--ds-color-neutral-surface-tinted), var(--ds-color-neutral-background-tinted), var(--ds-color-neutral-surface-tinted));
        background-size: 200% 100%;
        animation: shimmer 1.4s linear infinite;
    }

    .skel.tall { height: 5rem; }
    .skel.big { height: 12rem; }

    @keyframes shimmer {
        to { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        .skel { animation: none; }
    }
</style>
