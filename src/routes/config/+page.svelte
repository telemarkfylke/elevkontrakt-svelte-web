<script>
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from 'svelte';
    import IconSpinner from "$lib/components/IconSpinner.svelte";
    import Input from "$lib/components/Input.svelte"
    import SearchStudentData from "$lib/components/searchStudentData.svelte";
    import SelectionList from "$lib/components/selectionList.svelte";
    import Alert from "$lib/components/alert.svelte";
    import { formatFnr } from "$lib/helpers/formatFnr.js";
    import { getElevkontraktToken, getProducts, getSettings, postProduct, searchContracts, updateSettings, deleteProduct, updateProduct } from '../../lib/useApi.js';
    
    let editPrices = false
    let editPriceException = false
    let editInvoiceFlowBlock = false
    let editProducts = false
    let addProducts = false
    let removeProducts = false
    let isProcessing = false

    let errorMessage = ''
    let errorArray = []

    let responseMessage = ''
    
    // Success alert states
    let showSuccessAlert = false
    let successMessage = ''
    let successTitle = ''

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

    // Add new product/edit existing product states
    let originalProductData = null // This will hold the original data of the product being edited, used for comparison when saving edits
    let newProductName = ''
    let newProductPrice = null
    let newProductDescription = ''
    let newProductActive = ''

    // Remove product
    let productId = null

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
                reloadPageWithSuccess('prices-updated') // Reload with success parameter
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
                reloadPageWithSuccess('exceptions-updated') // Reload with success parameter
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
                reloadPageWithSuccess('exceptions-updated') // Reload with success parameter
            } else {
                errorMessage = 'Noe gikk galt ved lagring av nye unntak. Vennligst prøv igjen.'
            }
            isProcessing = false   
            editPriceException = false
        } else if (clickedButton === 'Lagre produkt' && action === 'addProduct') {
            if (newProductName.trim() === '') {
                errorMessage = 'Produktet må ha et navn.'
                isProcessing = false
                return
            }
            if (newProductPrice === null || !validatePrice(newProductPrice)) {
                errorMessage = 'Produktet må ha en gyldig pris.'
                isProcessing = false
                return
            }
            const newProduct = {
                name: newProductName,
                price: parseInt(newProductPrice),
                description: newProductDescription,
                active: newProductActive === 'ja' ? true : false,
                metadata: {
                    createdBy: token.upn,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1
                },
                auditLog: [
                    {
                        upn: token.upn,
                        action: 'created',
                        timestamp: new Date().toISOString(),
                        changes: {
                            name: newProductName,
                            price: parseInt(newProductPrice),
                            description: newProductDescription,
                            active: newProductActive === 'ja' ? true : false
                        }
                    }
                ]
            }
            response = await postProduct(newProduct)

            if (response && response.status === 201) {
                // Successfully added new product
                responseMessage = 'Produktet/tjenesten har blitt lagt til.'
                reloadPageWithSuccess('product-created') // Reload with success parameter
            } else {
                errorMessage = 'Noe gikk galt ved lagring av nytt produkt. Vennligst prøv igjen.'
            }
            isProcessing = false
  

        } else if (clickedButton === 'Fjern produkt' && action === 'removeProduct') {
            response = await handleDeleteProduct(productId)

            if (response && response.status === 200) {
                // Successfully deleted product
                responseMessage = 'Produktet/tjenesten har blitt fjernet.'
                productId = null
                reloadPageWithSuccess('product-deleted') // Reload with success parameter
            } else {
                errorMessage = 'Noe gikk galt ved fjerning av produkt. Vennligst prøv igjen.'
                productId = null
            }
            isProcessing = false

        } else if (clickedButton === 'Lagre endringer' && action === 'editProduct') {
            if (newProductPrice !== null && !validatePrice(newProductPrice)) {
                errorMessage = 'Ugyldig pris'
                isProcessing = false
                return
            }
            const updateObject = { data: {}, auditLog: originalProductData.auditLog ? [...originalProductData.auditLog] : [] }
            const changes = {}
            if (newProductName.trim() !== '' && newProductName !== originalProductData.name) {
                updateObject.data['name'] = newProductName
                changes.name = newProductName
            }
            if (newProductPrice !== null && parseInt(newProductPrice) !== originalProductData.price) {
                updateObject.data['price'] = parseInt(newProductPrice)
                changes.price = parseInt(newProductPrice)
            }
            if (newProductDescription.trim() !== '' && newProductDescription !== originalProductData.description) {
                updateObject.data['description'] = newProductDescription
                changes.description = newProductDescription
            }
            if (newProductActive !== '' && ((newProductActive === 'ja' && !originalProductData.active) || (newProductActive === 'nei' && originalProductData.active))) {
                updateObject.data['active'] = newProductActive === 'ja' ? true : false
                changes.active = newProductActive === 'ja' ? true : false
            }

            if (Object.keys(changes).length === 0) {
                errorMessage = 'Ingen endringer å lagre.'
                isProcessing = false
                return
            }
            updateObject.data['metadata.updatedAt'] = new Date().toISOString()
            updateObject.data['metadata.version'] = originalProductData.metadata.version + 1
            updateObject.auditLog.push({
                upn: token.upn,
                action: 'updated',
                timestamp: new Date().toISOString(),
                changes: changes
            })

            response = await updateProduct(productId, updateObject)

            if (response && response.status === 200) {
                // Successfully updated product
                responseMessage = 'Produktet/tjenesten har blitt redigert.'
                originalProductData = null
                reloadPageWithSuccess('product-edited') // Reload with success parameter
            } else {
                errorMessage = 'Noe gikk galt ved redigering av produkt. Vennligst prøv igjen.'
                originalProductData = null
            }
            isProcessing = false

        } else if (clickedButton === 'Avbryt') {
            if(action === 'editPrices') {
                editPrices = false
            } else if (action === 'editPriceException') {
                editPriceException = false
            } else if (action === 'editInvoiceException') {
                editInvoiceFlowBlock = false
            } else if (action === 'addProduct') {
                addProducts = false
            } else if (action === 'editProducts') {
                editProducts = false
            } else if (action === 'removeProduct') {
                removeProducts = false
            }
            isProcessing = false
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
    // Check for success parameters on page load
    onMount(() => {
        const urlParams = new URLSearchParams($page.url.search);
        if (urlParams.get('success') === 'product-created') {
            showSuccessAlert = true
            successTitle = 'Produkt opprettet!'
            successMessage = 'Produktet/tjenesten har blitt lagt til.'
            
            // Clean up URL by removing the success parameter
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('success')
            window.history.replaceState(null, '', newUrl)
        } else if (urlParams.get('success') === 'prices-updated') {
            showSuccessAlert = true
            successTitle = 'Priser oppdatert!'
            successMessage = 'Prisene har blitt oppdatert.'
            
            // Clean up URL
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('success')
            window.history.replaceState(null, '', newUrl)
        } else if (urlParams.get('success') === 'exceptions-updated') {
            showSuccessAlert = true
            successTitle = 'Unntak oppdatert!'
            successMessage = 'Unntakene har blitt oppdatert.'
            
            // Clean up URL
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('success')
            window.history.replaceState(null, '', newUrl)
        } else if (urlParams.get('success') === 'product-deleted') {
            showSuccessAlert = true
            successTitle = 'Produkt fjernet!'
            successMessage = 'Produktet/tjenesten har blitt fjernet.'
            
            // Clean up URL
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('success')
            window.history.replaceState(null, '', newUrl)
        } else if (urlParams.get('success') === 'product-edited') {
            showSuccessAlert = true
            successTitle = 'Produkt redigert!'
            successMessage = 'Produktet/tjenesten har blitt redigert.'
            
            // Clean up URL
            const newUrl = new URL($page.url)
            newUrl.searchParams.delete('success')
            window.history.replaceState(null, '', newUrl)
        }
    });

    const reloadPageWithSuccess = (successType) => {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('success', successType);
        window.location.href = currentUrl.toString();
    }

    const handleSuccessAlertClose = () => {
        showSuccessAlert = false;
        successMessage = '';
        successTitle = '';
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

    const getProductsData = async () => {
        const products = await getProducts()
        if(products && products.data && products.data.result) {
            return products
        } else {
            errorMessage = 'Noe gikk galt ved innhenting av produkter. Vennligst prøv igjen.'
        }
    }

    const handleDeleteProduct = async (productId) => {
        const response = await deleteProduct(productId)
        if (response && response.status === 200) {
            // Successfully deleted product
            responseMessage = 'Produktet/tjenesten har blitt fjernet.'
            reloadPageWithSuccess('product-deleted') // Reload with success parameter
        } else {
            errorMessage = 'Noe gikk galt ved fjerning av produkt. Vennligst prøv igjen.'
        }
    }
</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        <!-- Page header -->
        <h1>Instillinger</h1>
        <!-- Add 2nd role for invoicing -->
        {#if !token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
            <div class="error">
                <h2>Du har ikke tilgang til å endre innstillinger</h2>
                <p>Vennligst ta kontakt med din administrator for å få tilgang.</p>
            </div>
        {:else}
            {#if errorMessage}
                <Alert type="error" title="Feil" message={errorMessage} dismissible={true} on:close={() => errorMessage = ''} autoClose={true} autoCloseDelay={10000} position="fixed-top"/>
            {/if}
            {#if responseMessage}
                <Alert type="success" title="Suksess" message={responseMessage} dismissible={true} on:close={() => responseMessage = ''} autoClose={true} autoCloseDelay={10000} position="fixed-top"/>
            {/if}
            {#if showSuccessAlert}
                <Alert type="success" title={successTitle} message={successMessage} dismissible={true} on:close={handleSuccessAlertClose} autoClose={true} autoCloseDelay={8000} position="fixed-top"/>
            {/if}
            {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                {#await getSettingsData()}
                    <div class="loading">
                        <IconSpinner width={"32px"} />
                    </div>
                {:then settings}
                    {#if isProcessing}
                        <div class="loading">
                            <IconSpinner width={"32px"} />
                        </div>
                    {:else}
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
            <!-- Add 2nd role for invoicing -->
            {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                {#await getProductsData()}
                    <div class="loading">
                        <IconSpinner width={"32px"} />
                    </div>
                {:then products}
                    {#if isProcessing}
                        <div class="loading">
                            <IconSpinner width={"32px"} />
                        </div>
                    {:else}
                         <!-- Products overview -->
                        <div class="overview">
                            <h2>
                                <div class="header-with-buttons">
                                    <div class="header-title">
                                        <span class="material-symbols-outlined">storefront</span>
                                        Produkter/Tjenester {#if editProducts} (redigeringsmodus) {:else if addProducts} (legg til modus) {:else if removeProducts} (fjern modus){/if}
                                    </div>
                                    <div class="button-group">
                                        <button class="toggle-button" on:click={() => { addProducts = !addProducts; if (editProducts) editProducts = false; if (removeProducts) removeProducts = false; }}>
                                            <span class="material-symbols-outlined">
                                                {addProducts ? 'shopping_cart_off' : 'add_shopping_cart'}
                                            </span>
                                        </button>
                                        <button class="toggle-button" on:click={() => { removeProducts = !removeProducts; if (editProducts) editProducts = false; if (addProducts) addProducts = false; }}>
                                            <span class="material-symbols-outlined">
                                                {removeProducts ? 'shopping_cart_off' : 'remove_shopping_cart'}
                                            </span>
                                        </button>
                                        <button class="toggle-button" on:click={() => { editProducts = !editProducts; if (addProducts) addProducts = false; if (removeProducts) removeProducts = false; }}>
                                            <span class="material-symbols-outlined">
                                                {editProducts ? 'edit_off' : 'edit'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </h2>
                            <div class="info-section">
                                <div class="textBox">
                                    <p>Her kan du administrere produkter og tjenester.</p>
                                    <p>Produktene og Tjenestene som blir lagt til her vil være tilgjengelige for fakturering.</p>
                                    <br>
                                    <p>Trykk på <span class="material-symbols-outlined">add_shopping_cart</span> for å legge til et nytt produkt eller en ny tjeneste.</p>
                                    <br>
                                    <p>Trykk på <span class="material-symbols-outlined">remove_shopping_cart</span> så trykker du på <span class="material-symbols-outlined">remove_shopping_cart</span> i navnet på produktet eller tjenesten for å fjerne et eksisterende produkt eller en eksisterende tjeneste.</p>
                                    <br>
                                    <p>Trykk på <span class="material-symbols-outlined">edit</span> så trykker du på <span class="material-symbols-outlined">edit</span> i navnet på produktet eller tjenesten for å redigere et eksisterende produkt eller en eksisterende tjeneste.</p>
                                    <br>
                                    <p><strong>Husk:</strong> Endringer må lagres for at de skal tre i kraft.</p>
                                    <br>
                                    <p><strong>Merk:</strong> Et produkt eller en tjeneste må ha en gyldig pris for å kunne faktureres. Gyldig pris er en pris som er større enn null eller lavere enn 9999</p>
                                    <p>Produkter kan være aktive og innaktive, og kun aktive produkter kan faktureres. Du vil kunne se statusen for hvert produkt i oversikten.</p>
                                </div>
                            </div>
                            {#if products && products.data && products.data.result && products.data.result.length > 0}
                                {#each products.data.result as product, i}
                                    <div class="info-section">
                                        <div class="info-grid">
                                            <h4>
                                                <div class="header-with-buttons">
                                                    {product.name}
                                                    {#if editProducts}
                                                        <button class="button" on:click={() => { productId = product._id; originalProductData = product; }}>
                                                            <span class="material-symbols-outlined">
                                                                edit
                                                            </span>
                                                        </button>
                                                    {/if}
                                                    {#if removeProducts}
                                                        <button class="button" on:click={() => {  productId = product._id; handleButtonClicks('Fjern produkt', 'removeProduct', token); }}>
                                                            <span class="material-symbols-outlined">
                                                                remove_shopping_cart
                                                            </span>
                                                        </button>
                                                    {/if}
                                                </div>
                                            </h4>
                                            <div class="info-item">
                                                <label>Pris:</label>
                                                <span class="value">{product.price !== null ? product.price + ' Kr' : 'Ingen pris satt'}</span>
                                            </div>
                                            <div class="info-item"> 
                                                <label>Status:</label>
                                                <span class="value">{product.active ? 'Aktiv' : 'Inaktiv'}</span>
                                            </div>
                                            <div class="info-item">
                                                <label>Beskrivelse:</label>
                                                <span class="value">{product.description ? product.description : 'Ingen beskrivelse'}</span>
                                            </div>

                                            <!-- Field to edit -->
                                            {#if editProducts && product._id === productId}
                                                 <div class="info-item">
                                                    <label>Ny pris: </label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Pris i kroner"
                                                        bind:value={newProductPrice}
                                                    />
                                                </div>
                                            {/if}
                                            <!-- Field to edit -->
                                            {#if editProducts && product._id === productId}
                                                 <div class="info-item">
                                                    <label>Ny status: </label>
                                                    <select bind:value={newProductActive}>
                                                        <option value="ja">Aktiv</option>
                                                        <option value="nei">Inaktiv</option>
                                                    </select>
                                                </div>
                                            {/if}
                                            <!-- Field to edit -->
                                            {#if editProducts && product._id === productId}
                                                 <div class="info-item">
                                                    <label>Ny beskrivelse: </label>
                                                    <Input
                                                        type="text"
                                                        placeholder="Beskrivelse"
                                                        bind:value={newProductDescription}
                                                    />
                                                </div>
                                            {/if}

                                            <div class="info-item">
                                                <label>Opprettet av:</label>
                                                <span class="value">{product.metadata.createdBy}</span>
                                            </div>
                                            <div class="info-item">
                                                <label>Oppdatert:</label>
                                                <span class="value">{product.metadata.updatedAt}</span>
                                            </div>
                                            <div class="info-item">
                                                <label>Sist oppdatert av:</label>
                                                <span class="value">{product.auditLog.length > 0 ? product.auditLog[product.auditLog.length - 1].upn : 'Ukjent'}</span>
                                            </div>
                                        </div>
                                        <br>
                                        <!-- Buttons -->
                                            {#if editProducts && product._id === productId}
                                                <div class="center">
                                                    <div class="button-group">
                                                        <button on:click={() => handleButtonClicks('Lagre endringer', 'editProduct', token)}>Lagre</button>
                                                        <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'editProduct', token)}>Avbryt</button>
                                                    </div>
                                                </div>
                                            {/if}
                                    </div>
                                {/each}
                                {#if addProducts}
                                    <div class="info-section">
                                        <div class="textBox">
                                            <p>Du er i legg til modus.</p>
                                            <p>Fyll inn informasjonen for det nye produktet eller tjenesten og trykk "Lagre".</p>
                                        </div>
                                    </div>
                                    <div class="info-section">
                                        <div class="input-group">
                                            <div class="input">
                                                <label>Navn {newProductName.length}/50: </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Navn på produkt eller tjeneste"
                                                    maxlength="50"
                                                    bind:value={newProductName}
                                                />
                                            </div>
                                            <div class="input">
                                                <label>Pris: </label>
                                                <Input
                                                    type="number"
                                                    placeholder="Pris i kroner"
                                                    bind:value={newProductPrice}
                                                />
                                            </div>
                                            <div class="input">
                                                <label>Beskrivelse {newProductDescription.length}/200: </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Beskrivelse av produkt eller tjeneste"
                                                    maxlength="200"
                                                    bind:value={newProductDescription}
                                                />
                                            </div>
                                            <div class="input">
                                                <label>Skal produktet være tilgjengelig:</label>
                                                <select bind:value={newProductActive}>
                                                    <option value="ja">Ja</option>
                                                    <option value="nei">Nei</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div div class="center">
                                        <div class="button-group">
                                            <button on:click={() => handleButtonClicks('Lagre produkt', 'addProduct', token)}>Lagre</button>
                                            <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'addProduct', token)}>Avbryt</button>
                                        </div>
                                    </div>
                                {/if}
                            {:else}
                                <div class="textBox">
                                    <p>Ingen produkter eller tjenester funnet.</p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/await}
            {/if}
        {/if}
    {/await}
</main>

<style>
    main {
        padding: 1rem;
    }
    
    h4 {
        grid-column: 1 / -1; 
        margin-top: 0;
        gap: 0.5rem;
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