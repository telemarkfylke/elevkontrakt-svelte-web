<script>
    import { getContractsWithId, getElevkontraktToken } from "$lib/useApi";
    import { page } from '$app/stores';
    import Alert from "$lib/components/alert.svelte";
    import IconSpinner from "$lib/components/IconSpinner.svelte";
    import { returnType } from "$lib/helpers/returnInvoiceType";
    import { formatDate } from "$lib/helpers/formatDate";


    let invoiceData = null;
    
    let showSuccessAlert = false
    let errorMessage = ''
    let successMessage = ''
    let successTitle = ''
    let responseMessage = ''

    const getContractsBySlug = async (slug) => {
        const targetCollection = 'invoices'
        try {
            const contracts = await getContractsWithId(slug, targetCollection);
            if(contracts?.error) {
                invoiceData = null;
                errorMessage = contracts.error
            } else {
                return contracts;
            }
            return contracts;
        } catch (error) {
            errorMessage = 'Error fetching contracts by slug:' + JSON.stringify(error)
        }
    }

    const returnStatusText = (status) => {
        switch(status) {
            case 'Ikke Fakturert':
                return 'notinvoiced'
            case 'Fakturert':
                return 'invoiced'
            case 'Betalt':
                return 'paid'
            default:
                return status
        }
    }

    const returnTotalPrice = (items) => {
        let total = 0
        items.forEach(item => {

            total += parseInt(item.sum || item.price)
        });
        return total
    }

    const checkForExtraFields = (items) => {
        // Returns the extra fields that are not part of the standard invoice item fields
        const standardFields = ['_id', 'name', 'price', 'description', 'active', 'metadata', 'auditLog']
        let extraFields = []
        items.forEach(item => {
            Object.keys(item).forEach(key => {
                if(!standardFields.includes(key) && !extraFields.includes(key)) {
                    extraFields.push(key)
                }
            })
        })
        return extraFields
    }

</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        {#if errorMessage}
            <Alert type="error" title="Feil" message={errorMessage} dismissible={true} on:close={() => errorMessage = ''} autoClose={true} autoCloseDelay={10000} position="fixed-top"/>
        {/if}
        {#if responseMessage}
            <Alert type="success" title="Suksess" message={responseMessage} dismissible={true} on:close={() => responseMessage = ''} autoClose={true} autoCloseDelay={10000} position="fixed-top"/>
        {/if}
        {#if showSuccessAlert}
            <Alert type="success" title={successTitle} message={successMessage} dismissible={true} on:close={handleSuccessAlertClose} autoClose={true} autoCloseDelay={8000} position="fixed-top"/>
        {/if}
        {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.billing-readwrite', 'elevkontrakt.billing-read'].includes(r))}
            {#await getContractsBySlug($page.params.slug)}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:then invoiceData}
                {#if errorMessage}
                    <div class="error-message">
                        <p>{errorMessage}</p>
                    </div>
                {/if}
                {#if !errorMessage}
                    <!-- Contract Info -->
                    {#each invoiceData as invoice}
                        <div class="contract-overview">
                            <h2 class={returnStatusText(invoice.status).toLowerCase()}>
                                <span class="material-symbols-outlined">receipt_long</span>
                                Faktura Detaljer
                            </h2>
                            <!-- Student Info -->
                            <div class="info-section">
                                <h3>
                                    <span class="material-symbols-outlined">description</span>
                                    Elev informasjon
                                </h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Navn: </label>
                                        <div class="value">{invoice.student.navn}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Epost: </label>
                                        <div class="value">{invoice.student.upn}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Skole på faktureringstidspunkt: </label>
                                        <div class="value">{invoice.student.skole}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Klasse på faktureringstidspunkt: </label>
                                        <div class="value">{invoice.student.klasse}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Trinn på faktureringstidspunkt: </label>
                                        <div class="value">{invoice.student.trinn}</div>
                                    </div>
                                </div>
                            </div>
                            <!-- Invoice Items (only for buyOut type) -->
                            {#if invoice.type === 'buyOut'}
                                <div class="info-section">
                                    <h3>
                                        <span class="material-symbols-outlined">description</span>
                                        Fakturerte rater for utkjøp
                                    </h3>
                                    {#each invoice.itemsFromCart as item, i}
                                        <h4>
                                            <span class="material-symbols-outlined">receipt</span>
                                            Rate {i + 1}
                                        </h4>
                                        <div class="info-grid">
                                            <div class="info-item">
                                                <label>Rate Faktureringsdato: </label>
                                                <div class="value">{formatDate(item.faktureringsDato)}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>Rate Status: </label>
                                                <div class="value">{item.status}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>Rate Sum: </label>
                                                <div class="value">{item.sum} Kr</div>
                                            </div>
                                            <div class="info-item">
                                                <label>Rate løpenummer: </label>
                                                <div class="value">{item.løpenummer}</div>
                                            </div>
                                        </div>
                                        <br>
                                    {/each}
                                    <br>
                                    <div class="info-item">
                                        <label>Total pris: </label>
                                        <div class="value">{returnTotalPrice(invoice.itemsFromCart)} Kr</div>
                                    </div>
                                </div>
                            {/if}
                            <!-- Invoice Items (only for extraInvoice type) -->
                            {#if invoice.type === 'extraInvoice'}
                                <div class="info-section">
                                    <h3>
                                        <span class="material-symbols-outlined">description</span>
                                        Fakturerte rater for produkter og tjenester
                                    </h3>
                                    {#each invoice.itemsFromCart as item, i}
                                        <h4>
                                            <span class="material-symbols-outlined">receipt</span>
                                            {item.name}
                                        </h4>
                                        <div class="info-grid">
                                            <div class="info-item">
                                                <label>Produkt beskrivelse: </label>
                                                <div class="value">{item.description}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>Rate Sum: </label>
                                                <div class="value">{item.price} Kr</div>
                                            </div>
                                            {#if checkForExtraFields(invoice.itemsFromCart).length > 0}
                                                {#each checkForExtraFields(invoice.itemsFromCart) as field}
                                                    <div class="info-item">
                                                        <label>{field}: </label>
                                                        <div class="value">{item[field]}</div>
                                                    </div>
                                                {/each}
                                            {/if}
                                        </div>
                                        <br>
                                    {/each}
                                    <br>
                                    <div class="info-item">
                                        <label>Total pris: </label>
                                        <div class="value">{returnTotalPrice(invoice.itemsFromCart)} Kr</div>
                                    </div>
                                </div>
                            {/if}
                            <!-- Invoice Information -->
                            <div class="info-section">
                                <h3>
                                    <span class="material-symbols-outlined">description</span>
                                    Faktura informasjon
                                </h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Type: </label>
                                        <div class="value">{returnType(invoice.type)}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Faktura sendt til: </label>
                                        <div class="value">{invoice.recipient.navn}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Faktura opprettet: </label>
                                        <div class="value">{formatDate(invoice.createdTimeStamp)}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Faktura status: </label>
                                        <div class="value">{invoice.status}</div>
                                    </div>
                                </div>
                            </div>
                            <!-- Invoice Created By Information -->
                            <div class="info-section">
                                <h3>
                                    <span class="material-symbols-outlined">description</span>
                                    Fakturert av
                                </h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Navn: </label>
                                        <div class="value">{invoice.invoiceCreatedBy.name}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Epost: </label>
                                        <div class="value">{invoice.invoiceCreatedBy.email}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Arbeidssted: </label>
                                        <div class="value">{invoice.invoiceCreatedBy.officeLocation}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Stilling: </label>
                                        <div class="value">{invoice.invoiceCreatedBy.jobTitle}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Faktura Database ID: </label>
                                        <div class="value">{invoice._id}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            {/await}
        {:else}
            <p class="error">Du har ikke tilgang til å se fakturaer.</p>
        {/if}
    {/await}
</main>

<style>
    main {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    h1 {
        color: var(--gress-80);
        margin-bottom: 1rem;
    }

    p {
        margin-bottom: 1rem;
        color: var(--vann-70, #333);
        line-height: 1.5;
    }

    .info-text {
        background-color: var(--gress-5, #f8fffe);
        border-left: 4px solid var(--gress-60);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }

    button {
        padding: 0.75rem 1.5rem;
        background-color: var(--gress-60);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }


    button:hover:not(:disabled) {
        background-color: var(--gress-70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .button-remove {
        padding: 0.75rem 1.5rem;
        background-color: var(--nype-60);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .button-remove:hover:not(:disabled) {
        background-color: var(--nype-70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .contract-card {
        margin-bottom: 3rem;
    }

    .results {
        margin-top: 2rem;
    }

    .contract-overview {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        overflow: hidden;
    }

    .contract-overview h2 {
        background: linear-gradient(135deg, var(--gress-60), var(--gress-70));
        color: white;
        padding: 2rem;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;

        &.invoiced {
            background: linear-gradient(135deg, var(--korn-60), var(--korn-70));
        }
        &.paid {
            background: linear-gradient(135deg, var(--gress-60), var(--gress-70));
        }
        &.other {
            background: linear-gradient(135deg, var(--plomme-60), var(--plomme-70));
        }
        &.notinvoiced {
            background: linear-gradient(135deg, var(--nype-60), var(--nype-70));
        }
    }

    .info-section {
        border-bottom: 1px solid var(--gress-10);
        padding: 2rem;
    }

    .info-section:last-child {
        border-bottom: none;
    }

    .info-section h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--gress-80);
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
        font-weight: 600;
    }

    .info-section h3 .material-symbols-outlined {
        font-size: 1.5rem;
        color: var(--gress-60);
    }

    .info-section h4 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--gress-80);
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
        font-weight: 600;
    }

    .info-section h4 .material-symbols-outlined {
        font-size: 1.5rem;
        color: var(--gress-60);
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .info-item label {
        font-weight: 600;
        color: var(--gress-70);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .info-item .value {
        padding: 0.75rem;
        background-color: var(--gress-5, #f8fffe);
        border-radius: 6px;
        border-left: 3px solid var(--gress-30);
        font-size: 1rem;
        min-height: 1.2rem;
    }

    .info-note {
        margin: 0.5rem;
        font-size: 0.9rem;
        font-style: italic;
    }

    .value.contract-type {
        background-color: var(--korn-10);
        border-left-color: var(--korn-50);
        font-weight: 600;
    }

    .value.uuid {
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        word-break: break-all;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-radius: 8px;
        background-color: var(--gress-5);
        border: 1px solid var(--gress-20);
    }

    .status-item label {
        font-weight: 600;
        color: var(--gress-80);
    }

    .status-badge {
        padding: 0.4rem 0.8rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .status-item.success .status-badge {
        background-color: var(--gress-20);
        color: var(--gress-80);
        border: 1px solid var(--gress-40);
    }

    .status-item.danger .status-badge {
        background-color: var(--nype-20, #fdd);
        color: var(--nype-80, #800);
        border: 1px solid var(--nype-40, #faa);
    }

    .status-item.warning .status-badge {
        background-color: var(--korn-20);
        color: var(--korn-80);
        border: 1px solid var(--korn-40);
    }

    .status-item.info .status-badge {
        background-color: var(--himmel-20, #e6f3ff);
        color: var(--himmel-80, #0066cc);
        border: 1px solid var(--himmel-40, #99d6ff);
    }

    .billing-timeline {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .billing-period {
        background-color: var(--gress-5);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--gress-20);
    }

    .period-header {
        background-color: var(--gress-10);
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--gress-20);
    }

    .period-header h4 {
        margin: 0;
        color: var(--gress-80);
        font-weight: 600;
    }

    .period-details {
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .detail-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--gress-70);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .detail-value {
        padding: 0.5rem;
        background-color: white;
        border-radius: 4px;
        border-left: 2px solid var(--gress-30);
        font-size: 0.9rem;
    }

    .pc-status {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .pc-status-item {
        background-color: var(--gress-5);
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid var(--gress-20);
        transition: all 0.2s ease;
    }

    .pc-status-item:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }

    .pc-status-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        color: var(--gress-80);
        font-weight: 600;
    }

    .pc-status-header .material-symbols-outlined {
        font-size: 1.5rem;
        color: var(--gress-60);
    }

    .pc-status-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .date-info {
        font-size: 0.85rem;
        color: var(--gress-60);
        font-style: italic;
    }

    .error-message {
        background-color: var(--nype-10, #ffe5e5);
        border-left: 4px solid var(--nype-60, #ff4d4d);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }

    .header-with-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }


    .button-group {
        display: flex;
        gap: 1rem;
    }

    .header-title {
        font-size: 1.5rem;
        font-weight: 600;
    }

    .toggle-button {
        background-color: transparent;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
    }

    .toggle-button:hover:not(:disabled) {
        background-color: transparent;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .not-invoiced {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
    }

    /* Extra fields styling in billing */
    .extra-field-input {
        min-width: 200px;
        flex: 1;
    }

    .extra-field-input :global(input) {
        font-size: 0.9rem;
        padding: 0.4rem;
        border: 1px solid var(--vann-30);
        border-radius: 4px;
        background-color: var(--vann-5);
    }

    .extra-field-input :global(input):focus {
        border-color: var(--vann-60);
        outline: none;
        box-shadow: 0 0 0 2px rgba(var(--vann-60), 0.2);
    }

    /* Responsive design */
    @media (max-width: 768px) {
        main {
            padding: 1rem;
        }

        .info-grid {
            grid-template-columns: 1fr;
        }

        .status-grid {
            grid-template-columns: 1fr;
        }

        .pc-status {
            grid-template-columns: 1fr;
        }

        .period-details {
            grid-template-columns: 1fr;
        }
    }

    /* Material Icons */
    .material-symbols-outlined {
        font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 24;
    }
</style>