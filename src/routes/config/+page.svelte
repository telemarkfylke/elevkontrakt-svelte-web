<script>
    import { goto } from "$app/navigation";
    import IconSpinner from "$lib/components/IconSpinner.svelte";
    import Input from "$lib/components/Input.svelte"
    import SearchStudentData from "$lib/components/searchStudentData.svelte";
    import SelectionList from "$lib/components/selectionList.svelte";
    import { formatFnr } from "$lib/helpers/formatFnr.js";
    import { getElevkontraktToken, getSettings, searchContracts, updateSettings } from '../../lib/useApi.js';
    
    let editPrices = false
    let editPriceException = false
    let editInvoiceFlowBlock = false
    let isProcessing = false

    let errorMessage = ''
    let errorArray = []

    // Exceptions array
    let priceExceptionsDataFromSettings = []
    let invoiceExceptionsDataFromSettings = []

    // Price exceptions to add/remove
    let priceExceptionsToAdd = []
    let priceExceptionsToRemove = []

    // Invoice exceptions to add/remove
    let invoiceExceptionsToAdd = []
    let invoiceExceptionsToRemove = []
    
    // Prices
    let regularPrice = null
    let reducedPrice = null

    // Student data
    let userData = null

    // This functions will handle all the button clicks, 'Lagre' and 'Avbryt'
    const handleButtonClicks = async (clickedButton, action, token) => {
        errorMessage = '' // Reset error message
        let response
        isProcessing = true

        if(clickedButton === 'Lagre priser') {
            // Save prices
            if (regularPrice !== null && !validatePrice(regularPrice)) {
                errorArray.push('Ugyldig normal pris')
                isProcessing = false
            }
            if (reducedPrice !== null && !validatePrice(reducedPrice)) {
                errorArray.push('Ugyldig redusert pris')
                isProcessing = false
            }
            if (errorArray.length > 0) {
                errorMessage = errorArray.join('. ') + '.'
                errorArray = [] // Reset error array after displaying errors
                return
            }
            // Call API to save prices here
            const updateObject = { data: {} }
            if (regularPrice !== null) updateObject.data["prices.regularPrice"] = parseInt(regularPrice).toString()
            if (reducedPrice !== null) updateObject.data["prices.reducedPrice"] = parseInt(reducedPrice).toString()
            updateObject.data["prices.lastEditedBy"] = token.upn
            updateObject.data["prices.lastEditedAt"] = new Date().toISOString()
            updateObject.changeLog = { changedBy: token.upn, changedAt: new Date().toISOString(), changes: { regularPrice: updateObject.data["prices.regularPrice"], reducedPrice: updateObject.data["prices.reducedPrice"] } }

            response = await updateSettings(updateObject)
            if (response && response.status === 200) {
                // Successfully updated settings
                regularPrice = ''
                reducedPrice = ''
                errorMessage = ''
                reloadPage() // Reload the page to reflect changes
            } else {
                errorMessage = 'Noe gikk galt ved lagring av priser. Vennligst prøv igjen.'
            }   
            isProcessing = false
            editPrices = false
        } else if (clickedButton === 'Lagre unntak' && action === 'editPriceException') {
            const updateObject = { data: { } }

            if(priceExceptionsToAdd.length > 0) {
                updateObject.data['exceptionsFromRegularPrices.students'] = [...priceExceptionsToAdd, ...priceExceptionsDataFromSettings]
            }
            if(priceExceptionsToRemove.length > 0) {
                updateObject.data['exceptionsFromRegularPrices.students'] = [...priceExceptionsDataFromSettings.filter(s => !priceExceptionsToRemove.includes(s)), ...priceExceptionsToAdd]
            }
            response = await updateSettings(updateObject)

            if (response && response.status === 200) {
                // Successfully updated settings
                reloadPage() // Reload the page to reflect changes
            } else {
                errorMessage = 'Noe gikk galt ved lagring av nye unntak. Vennligst prøv igjen.'
            }
            isProcessing = false   
            editPriceException = false
        } else if (clickedButton === 'Lagre unntak' && action === 'editInvoiceFlowBlock') {
            const updateObject = { data: { } }

            if(invoiceExceptionsToAdd.length > 0) {
                updateObject.data['exceptionsFromInvoiceFlow.students'] = [...invoiceExceptionsToAdd, ...invoiceExceptionsDataFromSettings]
            }
            if(invoiceExceptionsToRemove.length > 0) {
                updateObject.data['exceptionsFromInvoiceFlow.students'] = [...invoiceExceptionsDataFromSettings.filter(s => !invoiceExceptionsToRemove.includes(s)), ...invoiceExceptionsToAdd]
            }
            response = await updateSettings(updateObject)

            if (response && response.status === 200) {
                // Successfully updated settings
                reloadPage() // Reload the page to reflect changes
            } else {
                errorMessage = 'Noe gikk galt ved lagring av nye unntak. Vennligst prøv igjen.'
            }
            isProcessing = false   
            editPriceException = false
        } else if (clickedButton === 'Avbryt') {
            // Just close the modal
            if(action === 'editPrices') {
                editPrices = false
            } else if (action === 'editPriceException') {
                editPriceException = false
            } else if (action === 'editInvoiceException') {
                editInvoiceFlowBlock = false
            }
        }
    }

    const validatePrice = (price) => {
        /**
         * Validate that the price is a number with minumum length of 1 and maximum length of 4.
         * No letters or special characters allowed.
         * Examples of valid prices: 0, 50, 100, 999, 1000
         * Examples of invalid prices: -50, 10000, 50.5, 50,00, abc, 50abc, $50
         */
        const regex = /^\d{1,4}$/
        return regex.test(price)
    }

    const reloadPage = () => {
        const thisPage = window.location.pathname;
        // Check if the current page is the same as the one we want to go to
        if (thisPage === '/') {
            // If the current page is the same, reload the page
            window.location.reload();
            return;
        }
        // If the current page is different, use goto to navigate to the new page
        // This will also reload the page
        goto('/').then(
            () => goto(thisPage)
        )
    }

    const getSettingsData = async () => {
        const settings = await getSettings()
        priceExceptionsDataFromSettings.push(...settings.data.result[0].exceptionsFromRegularPrices.students)
        invoiceExceptionsDataFromSettings.push(...settings.data.result[0].exceptionsFromInvoiceFlow.students)
        return settings
    }
</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        {#if !token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
            <div class="error">
                <h2>Du har ikke tilgang til å endre innstillinger</h2>
                <p>Vennligst ta kontakt med din administrator for å få tilgang.</p>
            </div>
        {:else}
            {#await getSettingsData()}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:then settings}
                <!-- Page header -->
                <h1>Instillinger</h1>
                <div class="textBox">
                    <p>Her kan du endre innstillinger for applikasjonen.</p>
                </div>

                {#if isProcessing}
                    <div class="loading">
                        <IconSpinner width={"32px"} />
                    </div>
                {:else}
                    <br>
                    {#if errorMessage}
                        <div class="error">
                            <p>{errorMessage}</p>
                        </div>
                    {/if}

                    <!-- Prices Overview -->
                    <div class="overview">
                        <h2>
                            <div class="header-with-buttons">
                                <div class="header-title">
                                    <span class="material-symbols-outlined">payments</span>
                                    Priser {#if editPrices} (redigeringsmodus){/if}
                                </div>
                                <div class="button-group">
                                    <button class="toggle-button" on:click={() => editPrices = !editPrices}>
                                        <span class="material-symbols-outlined">
                                            {editPrices ? 'edit_off' : 'edit'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </h2>
                        <div class="info-section">
                            <div class="textBox">
                                <p>Her kan du endre priser for leieavtaler.</p>
                                <p>Prisen som settes her vil gjelde for alle leieavtaler på det tidspunktet de blir fakturert.</p>
                                <p>Husk at endringer i prisene må lagres for å tre i kraft.</p>
                            </div>
                        </div>
                        <h3>
                            <div class="header-title">
                                <span class="material-symbols-outlined">payments</span>
                                Gjeldende priser
                            </div>
                        </h3>
                        <div class="info-section">
                            <div class="info-grid">
                                <div class="info-item">
                                     <label>Ordinær pris:</label>
                                    <span class="value">{settings ? settings.data.result[0].prices.regularPrice : 'Henter...'} Kr</span>
                                </div>
                                <div class="info-item">
                                     <label>Redusert pris:</label>
                                    <span class="value">{settings ? settings.data.result[0].prices.reducedPrice : 'Henter...'} Kr</span>
                                </div>
                            </div>
                        </div>

                        <!-- Edit Prices Section -->
                        {#if editPrices}
                            <div class="info-section">
                                <div class="input-group">
                                    <div class="input">
                                        <label>Normal pris: </label>
                                        <Input
                                            type="number"
                                            placeholder="Normal pris"
                                            bind:value={regularPrice}
                                        />
                                    </div>
                                    <div class="input">
                                        <label>Redusert pris: </label>
                                        <Input
                                            type="number"
                                            placeholder="Redusert pris"
                                            bind:value={reducedPrice}
                                        /> 
                                    </div>
                                </div>
                                <div class="button-group">
                                    {#if reducedPrice === null && regularPrice === null}
                                        <button disabled on:click={() => handleButtonClicks('Lagre priser', 'editPrices', token)}>Lagre priser</button>
                                        <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'editPrices', token)}>Avbryt</button>
                                    {:else}
                                        <button on:click={() => handleButtonClicks('Lagre priser', 'editPrices', token)}>Lagre priser</button>
                                        <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'editPrices', token)}>Avbryt</button>
                                    {/if}
                                </div>
                                <h3>
                                    <div class="header-title">
                                        <span class="material-symbols-outlined">person_edit</span>
                                        Sist redigert av
                                    </div>
                                </h3>
                                <div class="info-section">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>UPN:</label>
                                            <span class="value">{settings ? settings.data.result[0].prices.lastEditedBy : 'Henter...'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Dato:</label>
                                            <span class="value">{settings ? new Date(settings.data.result[0].prices.lastEditedAt).toLocaleString('no-NO', { dateStyle: 'full', timeStyle: 'short' }) : 'Henter...'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <br>

                    <!-- Current students with price exceptions -->
                    <div class="overview">
                        <h2>
                            <div class="header-with-buttons">
                                <div class="header-title">
                                    <span class="material-symbols-outlined">person</span>
                                    Unntak fra ordinær pris {#if editPriceException} (redigeringsmodus){/if}
                                </div>
                                <div class="button-group">
                                    <button class="toggle-button" on:click={() => editPriceException = !editPriceException}>
                                        <span class="material-symbols-outlined">
                                            {editPriceException ? 'edit_off' : 'edit'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </h2>
                        <div class="info-section">
                            <div class="textBox">
                                <p>Her kan du legge til elever som skal få unntak fra ordinær pris. Disse vil bli fakturert til redusert pris.</p>
                                <p>Søk opp eleven ved navn, velg eleven fra listen og trykk "Legg til".</p>
                                <p>Du kan også fjerne unntak ved å klikke på "Fjern" knappen ved siden av elevens navn.</p>
                                <p>Husk at endringer i unntakene må lagres for å tre i kraft.</p>
                            </div>
                        </div>

                        <!-- SelectionList, only shown if editPriceException === true -->
                        <SelectionList addExceptionFlag={true} removeExceptionFlag={true} editException={editPriceException} userData={userData} studentDataFromSettings={priceExceptionsDataFromSettings} bind:exceptionsToRemove={priceExceptionsToRemove} bind:exceptionsToAdd={priceExceptionsToAdd} />
                        
                        <!-- Buttons -->
                        {#if editPriceException}
                            <div class="center">
                                <div class="button-group">
                                    <button disabled={(priceExceptionsToAdd.length === 0 && priceExceptionsToRemove.length === 0) ? true : false} on:click={() => handleButtonClicks('Lagre unntak', 'editPriceException', token)}>Lagre unntak</button>
                                    <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'editPriceException', token)}>Avbryt</button>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <br>

                    <!-- Students blocked from normal invoice flow -->
                    <div class="overview">
                        <h2>
                            <div class="header-with-buttons">
                                <div class="header-title">
                                    <span class="material-symbols-outlined">person</span>
                                    Unntak fra ordinær fakturaflyt {#if editInvoiceFlowBlock} (redigeringsmodus){/if}
                                </div>
                                <div class="button-group">
                                    <button class="toggle-button" on:click={() => editInvoiceFlowBlock = !editInvoiceFlowBlock}>
                                        <span class="material-symbols-outlined">
                                            {editInvoiceFlowBlock ? 'edit_off' : 'edit'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </h2>


                       <div class="info-section">
                            <div class="textBox">
                                <p>Her kan du legge til elever som skal få unntak fra ordinær fakturaflyt. Disse vil ikke bli fakturert via den ordinære flyten og må faktureres manuelt.</p>
                                <p>Søk opp eleven ved navn, velg eleven fra listen og trykk "Legg til".</p>
                                <p>Du kan også fjerne unntak ved å klikke på "Fjern" knappen ved siden av elevens navn.</p>
                                <p>Husk at endringer i unntakene må lagres for å tre i kraft.</p>
                            </div>
                        </div>

                        <!-- SelectionList, only shown if editInvoiceFlowBlock === true -->
                        <SelectionList addExceptionFlag={true} removeExceptionFlag={true} editException={editInvoiceFlowBlock} userData={userData} studentDataFromSettings={invoiceExceptionsDataFromSettings} bind:exceptionsToRemove={invoiceExceptionsToRemove} bind:exceptionsToAdd={invoiceExceptionsToAdd} />

                        <!-- Buttons -->
                        {#if editInvoiceFlowBlock}
                            <div class="center">
                                <div class="button-group">
                                    <button disabled={(invoiceExceptionsToRemove.length === 0 && invoiceExceptionsToAdd.length === 0) ? true : false} on:click={() => handleButtonClicks('Lagre unntak', 'editInvoiceFlowBlock', token)}>Lagre unntak</button>
                                    <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'editInvoiceFlowBlock', token)}>Avbryt</button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            {/await}
        {/if}
    {/await}
</main>

<style>
    main {
        padding: 1rem;
    }

    .textBox {
        border: 1px solid var(--vann-10);
        background-color: var(--vann-20);
        padding: 1rem;
        border-radius: 8px;
        max-width: 600px;
        margin: 1rem 0;
        font-size: large;
    }

    .error {
        border: 1px solid var(--nype);
        background-color: var(--nype-10);
        padding: 1rem;
        border-radius: 8px;
        max-width: 600px;
        margin: 1rem 0;
        font-size: large;
    }

     button {
        padding: 0.75rem 1.5rem;
        background-color: var(--vann-60);
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

    button:hover:not(:disabled) {
        background-color: var(--vann-70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .button-group {
        display: flex;
        gap: 1rem;
    }

    .toggle-button {
        background-color: transparent;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
    }

    .info-section {
        border-bottom: 1px solid var(--gress-10);
        padding: 2rem;
    }

    .info-section:last-child {
        border-bottom: none;
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

    .overview {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        overflow: hidden;
    }

    .overview h2 {
        background: linear-gradient(135deg, var(--vann-60), var(--vann-70));
        color: white;
        padding: 2rem;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .overview h3 {
        padding: 1.5rem;
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
    }

    .header-with-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-title {
        font-size: 1.5rem;
        font-weight: 600;
    }
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .input {
        padding-bottom: 1rem;
        font-size: 1rem;
    }

    .search-result {
        border: 2px solid var(--gress-50);
        scroll-behavior: auto;
        margin: 0rem 1rem 1rem 1rem;
        border-radius: 17px;
        max-height: 50vh;
        overflow-x: hidden;
        overflow-y: scroll;
    }

    .center {
        display: flex;
        justify-content: center;
        margin: 1rem;
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        main {
            padding: 1rem;
        }

        .info-grid {
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