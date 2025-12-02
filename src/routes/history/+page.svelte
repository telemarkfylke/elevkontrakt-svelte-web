<script>
    import { goto } from "$app/navigation";
    import IconSpinner from "$lib/components/IconSpinner.svelte";
    import Input from "$lib/components/Input.svelte";
    import { formatDate } from "$lib/helpers/formatDate";
    import { formatFnr } from "$lib/helpers/formatFnr";
    import { getElevkontraktToken, searchContracts } from "$lib/useApi";

    let personSearchValue = ''
    let isLoadingSearchData = false
    let contractData = null
    let userData = null
    let resultsVisible = true
    let contractOverviewVisible = false
    let digitrollDataVisible = false
    let digitrollDataRawVisible = false
    let errorMessage = ''

    const getHistoryData = async (searchValue) => {
        contractOverviewVisible = false
        errorMessage = ''
        isLoadingSearchData = true;
        try {
            userData = await searchContracts(searchValue, 'history');
            if (userData && userData.contracts && userData.contracts.length > 0) {
                // For simplicity, we take the first contract's data
                contractData = userData.contracts[0]; // In real scenario, fetch based on userData.contracts
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

    const handleVisibility = (section, i) => {
        if (section === 'contractOverview') {
            if(contractOverviewVisible === i){
                contractOverviewVisible = false;
            } else {
                contractOverviewVisible = i;
            }
        }
    }
</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))}
            <h1>Historikk søk</h1>
            <div class="info-text">
                <p>Her kan du søke etter en elev sin historikk ved å skrive inn elevens navn.</p>
                <p>Skriv inn navn på eleven i søkefeltet under og trykk på "Hent elev" knappen.</p>
                <br>
                <p><strong>Obs!</strong> Om en elev er importert fra digitroll og har ukjent skole eller klasse, vil den sist kjente informasjonen fra digitroll bli vist.</p>
                <p>Dette betyr også at informasjonen kan være utdatert eller ufullstendig. Du kan da se på informasjonen i digitroll-fanen for mer detaljer.</p>
            </div>

            <div class="searchField">
                <Input disabled="{isLoadingSearchData}" type="text" bind:value={personSearchValue} placeholder="Eleven sitt navn" />
                <button disabled="{personSearchValue.length === 0 || isLoadingSearchData}" on:click={() => getHistoryData(personSearchValue)}>
                    {#if isLoadingSearchData}
                        <span class="spinner"></span>
                        Henter elev...
                    {:else}
                        Hent elev
                    {/if}
                </button>
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
                    {#each userData as contract, i}
                        <!-- {console.log(contract)} -->
                        <div class="contract-overview">
                            <h2>
                                <div class="header-with-buttons">
                                    <div class="header-title">
                                        <span class="material-symbols-outlined">person</span>
                                        {contract.name} - {formatFnr(contract.fnr)}
                                    </div>
                                    <div class="button-group">
                                        <button class="toggle-button" on:click={() => goto(`/history/${contract.id}`)}>
                                            <span class="material-symbols-outlined">contract</span>
                                        </button>
                                        <button class="toggle-button" on:click={() => handleVisibility('contractOverview', i)}>
                                            <span class="material-symbols-outlined">
                                                {contractOverviewVisible === i ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </h2>
                            {#if contractOverviewVisible === i}
                                {console.log(contract)}
                                {#each contract.id as id}
                                    <div class="info-section">
                                        <div class="info-grid">
                                            <div class="info-item">
                                                <label>Database ID:</label>
                                                <span class="value">{id}</span>
                                            </div>
                                            <div class="info-item">
                                                <label>Avtaletype:</label>
                                                <span class="value">{contract.contractType}</span>
                                            </div>
                                            <div class="info-item">
                                                <label>Opprettet:</label>
                                                <span class="value">{contract.createdTimeStamp}</span>
                                            </div>
                                            <div class="info-item">
                                                <label>Gå til denne avtalen:</label>
                                                <div class="button-group">
                                                    <button class="button" on:click={() => goto(`/history/${contract.id}`)}>
                                                        <span class="material-symbols-outlined">contract</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                        <br>
                    {/each}
                {/if}
            {/if}
        {:else}
            <h1>Tilgang nektet</h1>
            <p>Du har ikke de nødvendige tillatelsene for å få tilgang til denne siden. Vennligst kontakt systemadministratoren hvis du mener dette er en feil.</p>
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

    .searchField {
        display: flex;
        gap: 1rem;
        margin: 2rem 0;
        align-items: center;
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

    /* Responsive design */
    @media (max-width: 768px) {
        main {
            padding: 1rem;
        }

        .searchField {
            flex-direction: column;
            align-items: stretch;
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