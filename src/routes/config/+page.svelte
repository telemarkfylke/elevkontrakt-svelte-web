<script>
    import { goto } from "$app/navigation";
    import IconSpinner from "$lib/components/IconSpinner.svelte";
    import Input from "$lib/components/Input.svelte"
    import { formatFnr } from "$lib/helpers/formatFnr.js";
    import { getElevkontraktToken, getSettings, searchContracts, updateSettings } from '../../lib/useApi.js';
    
    let editPrices = false
    let editPriceException = false
    let isProcessing = false
    let isLoadingSearchData = false

    let errorMessage = ''
    let personSearchValue = ''
    let errorArray = []

    let studentDataFromSettings = []
    let exceptionsToAdd = []
    let exceptionsToRemove = []
    $:currentRegularPrice = ''
    $:currentReducedPrice = ''
    
    let regularPrice = null
    let reducedPrice = null
    let userData = null

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
        } else if (clickedButton === 'Lagre unntak') {
            const updateObject = { data: { } }

            if(exceptionsToAdd.length > 0) {
                updateObject.data['exceptionsFromRegularPrices.students'] = [...exceptionsToAdd, ...studentDataFromSettings]
            }
            if(exceptionsToRemove.length > 0) {
                updateObject.data['exceptionsFromRegularPrices.students'] = [...studentDataFromSettings.filter(s => !exceptionsToRemove.includes(s)), ...exceptionsToAdd]
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

    const removeException = (student, action) => {
        if(action === 'add') {
            // Add the students to the array of students to be removed from the exception
            exceptionsToRemove = [...exceptionsToRemove, student]
            // Remove the student from the original data array
            studentDataFromSettings = studentDataFromSettings.filter(s => s !== student)
        } else if (action === 'remove') {
            // Find the student object in the array and remove it from the array.
            const index = exceptionsToRemove.indexOf(student)
            if (index > -1) {
                exceptionsToRemove = exceptionsToRemove.filter((_, i) => i !== index)
            }
            // Add the student back to the original data array
            studentDataFromSettings = [...studentDataFromSettings, student]
        }
    }

    const addException = (contract, action) => {
        // Add to exceptionsToAdd array if needed
        if(action === 'add') {
            // Add the students to the array of students to be removed from the exception
            exceptionsToAdd = [...exceptionsToAdd, contract]
            // Remove the student from the original data array
            userData = userData.filter(s => s !== contract)
        } else if (action === 'remove') {
            // Find the student object in the array and remove it from the array.
            const index = exceptionsToAdd.indexOf(contract)
            if (index > -1) {
                exceptionsToAdd = exceptionsToAdd.filter((_, i) => i !== index)
            }
            // Add the student back to the original data array
            userData = [...userData, contract]
        }
    }

    const getStudentData = async (searchValue) => {
        errorMessage = ''
        isLoadingSearchData = true;
        try {
            userData = await searchContracts(searchValue, 'regular');
            if (userData && userData.contracts && userData.contracts.length > 0) {
                contractData = userData.contracts[0]; 
            } else if (userData.error && userData.error.length > 0) {
                contractData = null;
                errorMessage = userData.error
            }
            isLoadingSearchData = false;
        } catch (error) {
            errorMessage = 'Noe gikk veldig galt' + JSON.stringify(error)
            isLoadingSearchData = false;
        }
    }

    const getSettingsData = async () => {
        const settings = await getSettings()
        studentDataFromSettings.push(...settings.data.result[0].exceptionsFromRegularPrices.students)
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
                                <div class="textBox">
                                    <p>Her kan du endre priser for leieavtaler.</p>
                                    <p>Prisen som settes her vil gjelde for alle leieavtaler på det tidspunktet de blir fakturert.</p>
                                </div>
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
                        {#if studentDataFromSettings.length > 0}
                            <h3>
                                <div class="header-title">
                                    <span class="material-symbols-outlined">person</span>
                                    Unntak som er aktive
                                </div>
                            </h3>
                            <div class="search-result">
                                {#each studentDataFromSettings as student}
                                    <div class="info-section">
                                        <div class="info-grid">
                                            <div class="info-item">
                                                <label>Elevnavn:</label>
                                                <span class="value">{student.name}</span>
                                            </div>
                                            <div class="info-item">
                                                {#if editPriceException}
                                                    <label>Fjern unntak:</label>
                                                    <div class="button-group">
                                                        <button class="button-remove" on:click={() => removeException(student, 'add')}>
                                                            <span class="material-symbols-outlined">remove_circle</span>
                                                        </button>
                                                    </div>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="info-section">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <p>Ingen aktive unntak</p>
                                        </div>
                                    </div>
                            </div>
                        {/if}
                        {#if exceptionsToRemove.length > 0}
                            <h3>
                                <div class="header-title">
                                    <span class="material-symbols-outlined">person</span>
                                    Unntak som skal fjernes
                                </div>
                            </h3>
                            <div class="search-result">
                                {#each exceptionsToRemove as student}
                                    <div class="info-section">
                                        <div class="info-grid">
                                            <div class="info-item">
                                                <label>Elevnavn:</label>
                                                <span class="value">{student.name}</span>
                                            </div>
                                            <div class="info-item">
                                                {#if editPriceException}
                                                    <label>Angre fjerning fra unntak:</label>
                                                    <div class="button-group">
                                                        <button on:click={() => removeException(student, 'remove')}>
                                                            <span class="material-symbols-outlined">add_circle</span>
                                                        </button>
                                                    </div>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        <!-- Price exceptions, add new students-->
                        {#if editPriceException}
                            <div class="info-section">
                                <div class="textBox">
                                    <p>Her kan du legge til elever som skal få unntak fra ordinær pris. Disse vil bli fakturert til redusert pris.</p>
                                    <p>Søk opp eleven ved navn, velg eleven fra listen og trykk "Legg til".</p>
                                </div>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <div class="searchField">
                                            <Input disabled="{isLoadingSearchData}" type="text" bind:value={personSearchValue} placeholder="Eleven sitt navn" keypressEvent={(e) => e.key === 'Enter' && getStudentData(personSearchValue)}/>
                                            <button disabled="{personSearchValue.length === 0 || isLoadingSearchData}" on:click={() => getStudentData(personSearchValue)}>
                                                {#if isLoadingSearchData}
                                                    <span class="spinner"></span>
                                                    Henter elev...
                                                {:else}
                                                    Hent elev
                                                {/if}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {#if isLoadingSearchData}
                                <div class="loading">
                                    <IconSpinner width={"32px"} />
                                </div>
                            {:else if userData}
                                {#if errorMessage}
                                    <div class="error-message">
                                        <p>{errorMessage}</p>
                                    </div>
                                {/if}
                                {#if !errorMessage}
                                    {#if exceptionsToAdd.length > 0}
                                        <h3>
                                            <div class="header-title">
                                                <span class="material-symbols-outlined">add_2</span>
                                                Elever som vil bli lagt til unntak
                                            </div>
                                        </h3>
                                        <div class="search-result">
                                            {#each exceptionsToAdd as exception}
                                                <div class="info-section">
                                                    <div class="info-grid">
                                                        <div class="info-item">
                                                            <label>Elevnavn:</label>
                                                            <span class="value">{exception.name}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Elev fødselsnummer:</label>
                                                            <span class="value">{formatFnr(exception.fnr)}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            {#if editPriceException}
                                                                <label>Angre unntak:</label>
                                                                <div class="button-group">
                                                                    <button class="button-remove" on:click={() => addException(exception, 'remove')}>
                                                                        <span class="material-symbols-outlined">remove_circle</span>
                                                                    </button>
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}
                                    {#if userData.length > 0}
                                        <h3>
                                            <div class="header-title">
                                                <span class="material-symbols-outlined">search</span>
                                                Resultat
                                            </div>
                                        </h3>
                                        <div class="search-result">
                                            {#each userData as contract}
                                                <div class="info-section">
                                                    <div class="info-grid">
                                                        <div class="info-item">
                                                            <label>Elevnavn:</label>
                                                            <span class="value">{contract.name}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Elev fødselsnummer:</label>
                                                            <span class="value">{formatFnr(contract.fnr)}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            {#if editPriceException}
                                                                <label>Legg til unntak:</label>
                                                                <div class="button-group">
                                                                    <button on:click={() => addException(contract, 'add')}>
                                                                        <span class="material-symbols-outlined">add_circle</span>
                                                                    </button>
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}
                                {/if}
                            {/if}
                            <div class="center">
                                <div class="button-group">
                                    <button disabled={(exceptionsToRemove.length === 0 && exceptionsToAdd.length === 0) ? true : false} on:click={() => handleButtonClicks('Lagre unntak', 'editPriceException', token)}>Lagre unntak</button>
                                    <button class="button-remove" on:click={() => handleButtonClicks('Avbryt', 'editPriceException', token)}>Avbryt</button>
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

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .searchField {
        display: flex;
        gap: 1rem;
        margin: 2rem 0;
        align-items: center;
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
     .error-message {
        background-color: var(--nype-10, #ffe5e5);
        border-left: 4px solid var(--nype-60, #ff4d4d);
        padding: 1rem 1.5rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
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