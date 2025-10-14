<script>
    import { goto } from "$app/navigation";
    import IconSpinner from "$lib/components/IconSpinner.svelte";
    import Input from "$lib/components/Input.svelte"
    import { getElevkontraktToken, getSettings, updateSettings } from '../../lib/useApi.js';
    
    let editPrices = false
    let editPriceException = false
    let isProcessing = false

    let errorMsg = ''
    let errorArray = []
    
    $:currentRegularPrice = ''
    $:currentReducedPrice = ''
    
    let regularPrice
    let reducedPrice

    const handleButtonClicks = async (clickedButton, action, token) => {
        errorMsg = '' // Reset error message
        let response
        if(clickedButton === 'Lagre priser') {
            isProcessing = true
            console.log('Saving prices:', { regularPrice, reducedPrice })  
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
                errorMsg = errorArray.join('. ') + '.'
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
                errorMsg = ''
                reloadPage() // Reload the page to reflect changes
            } else {
                errorMsg = 'Noe gikk galt ved lagring av priser. Vennligst prøv igjen.'
            }   
            console.log('Update object to be sent to API:', updateObject)
            isProcessing = false
            editPrices = false
        } else if (clickedButton === 'Lagre unntak') {
            // Save price exceptions

            const updateObject = { data: { prices: {} } }
            editPriceException = false
        } else if (clickedButton === 'Avbryt') {
            // Just close the modal
            if(action === 'editPrices') {
                editPrices = false
            } else if (action === 'editPriceException') {
                editPriceException = false
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
            {#await getSettings()}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:then settings}
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
                    {#if errorMsg}
                        <div class="error">
                            <p>{errorMsg}</p>
                        </div>
                    {/if}
                    <div>
                        <h2>Priser {#if editPrices} (redigeringsmodus){/if}</h2>
                        <div class="textBox">
                            <h3>Gjeldende priser:</h3>
                            <p>Ordinær pris: <strong>{settings ? settings.data.result[0].prices.regularPrice : 'Henter...'} Kr</strong></p>
                            <p>Redusert pris: <strong>{settings ? settings.data.result[0].prices.reducedPrice : 'Henter...'} Kr</strong></p>
                        </div>
                        <button on:click={() => editPrices = !editPrices}>{editPrices ? 'Avbryt redigering' : 'Rediger priser'}</button>
                    </div>
                    <br>
                    {#if editPrices}
                        <div class="textBox">
                            <p>Her kan du endre priser for leieavtaler.</p>
                            <p>Prisen som settes her vil gjelde for alle leieavtaler på det tidspunktet de blir fakturert.</p>
                        </div>
                        <h3>Normal pris: </h3>
                        <Input 
                            type="number" 
                            placeholder="Normal pris"
                            bind:value={regularPrice}
                        />
                        <br>
                        <h3>Redusert pris</h3>
                        <Input 
                            type="number" 
                            placeholder="Redusert pris" 
                            bind:value={reducedPrice}
                        /> 
                        <br>
                        <div>
                            <button on:click={() => handleButtonClicks('Lagre priser', 'editPrices', token)}>Lagre priser</button>
                            <button on:click={() => handleButtonClicks('Avbryt', 'editPrices', token)}>Avbryt</button>
                        </div>
                        <br>
                        <div class="textBox">
                            <h3>Sist redigert av:</h3>
                            <p>UPN: <strong>{settings ? settings.data.result[0].prices.lastEditedBy : 'Henter...'}</strong></p>
                            <p>Dato: <strong>{settings ? new Date(settings.data.result[0].prices.lastEditedAt).toLocaleString('no-NO', { dateStyle: 'full', timeStyle: 'short' }) : 'Henter...'}</strong></p>
                        </div>
                    {/if}
                    <div>
                        <h2>Unntak fra ordinær pris {#if editPriceException} (redigeringsmodus){/if}</h2>
                        <div></div>
                        <button on:click={() => editPriceException = !editPriceException}>{editPriceException ? 'Avbryt redigering' : 'Rediger unntak'}</button>
                    </div>
                    <br>
                    {#if editPriceException}
                        <div class="textBox">
                            <p>Her kan du legge til klasser/elever som skal få unntak fra ordinær pris. Disse vil bli fakturert til redusert pris.</p>
                        </div>
                        <div>

                            <button on:click={() => handleButtonClicks('Lagre unntak', 'editPriceException', token)}>Lagre unntak</button>
                            <button on:click={() => handleButtonClicks('Avbryt', 'editPriceException', token)}>Avbryt</button>
                        </div>
                    {/if}
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
</style>