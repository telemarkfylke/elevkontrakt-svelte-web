<script>
    import { page } from '$app/stores';
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import { formatDate } from '$lib/helpers/formatDate.js';
    import { formatFnr } from '$lib/helpers/formatFnr.js';
    import { returnLatestKnownContractInfo } from '$lib/helpers/latestKnownContractInfo';
    import { returnLatestKnownStudentInfo } from '$lib/helpers/latestKnownStudentInfo';
    import { getContractsWithId, getElevkontraktToken } from '$lib/useApi';
    import { get } from 'svelte/store';
    
    let isLoadingSearchData = false
    let contractData = null
    let digitrollDataVisible = false
    let digitrollDataRawVisible = false
    let contractOverviewVisible = false
    let errorMessage = ""

    const getContractsBySlug = async (slug) => {
        try {
            const contracts = await getContractsWithId(slug, 'history');
            if(contracts?.error) {
                contractData = null;
                errorMessage = contracts.error
            } else {
                return contracts;
            }
            return contracts;
        } catch (error) {
            errorMessage = 'Error fetching contracts by slug:' + JSON.stringify(error)
        }
    }

    const getStatusColor = (value) => {
        if (value === "true" || value === true || value === "Ja" || value === "Betalt") return "success";
        if (value === "false" || value === false || value === "Nei") return "danger";
        if (value === "Utlån faktureres ikke") return "info";
        if (value === "Ukjent") return "warning";
        return "default";
    }

    const getStatusLabel = (value) => {
        if (value === "true" || value === true) return "Ja";
        if (value === "false" || value === false) return "Nei";
        return value || "Ukjent";
    }

    const handleVisibility = (section, i) => {
        if (section === 'contractOverview') {
            if(contractOverviewVisible === i){
                contractOverviewVisible = false;
            } else {
                contractOverviewVisible = i;
            }
        } else if (section === 'digitrollData') {
            if(digitrollDataVisible === i) {
                digitrollDataVisible = false;
            } else {
                digitrollDataVisible = i;
            }
        } else if (section === 'digitrollDataRaw') {
            if(digitrollDataRawVisible === i) {
                digitrollDataRawVisible = false;
            } else {
                digitrollDataRawVisible = i;
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
            {#await getContractsBySlug($page.params.slug)}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:then contractsData}
                {#if errorMessage}
                    <div class="error-message">
                        <p>{errorMessage}</p>
                    </div>
                {/if}
                {#if !errorMessage}
                    {#each contractsData as contractData, i}
                        <div class="contract-card">
                            <h1>
                                <span class="material-symbols-outlined">contract</span>
                                {returnLatestKnownContractInfo(contractData)?.kontraktType} for {contractData.elevInfo.navn}, opprettet: {formatDate(returnLatestKnownContractInfo(contractData).createdTimeStamp, true)}
                            </h1>
                            <div class="results">
                                <div class="contract-overview">
                                    <h2>
                                        <div class="header-with-buttons">
                                            <div class="header-title">
                                                Avtaleoversikt for <strong>{contractData.elevInfo.navn} {contractData.isImportedFromDigiTroll === "true" ? "(Importert fra DigiTroll)" : ""}</strong>
                                            </div>
                                            <div class="button-group">
                                                <button class="toggle-button" on:click={() => handleVisibility('contractOverview', i)}>
                                                    <span class="material-symbols-outlined">
                                                        {contractOverviewVisible === i ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </h2>
                                    {#if contractOverviewVisible === i}
                                        <!-- Student Information -->
                                        <div class="info-section">
                                            <h3>
                                                <span class="material-symbols-outlined">person</span>
                                                Elevinformasjon
                                            </h3>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Navn:</label>
                                                    <span class="value">{contractData.elevInfo.navn}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Fødselsnummer:</label>
                                                    <span class="value">{formatFnr(contractData.elevInfo.fnr)}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Skole (Sist kjente):</label>
                                                    <span class="value">{returnLatestKnownStudentInfo(contractData).skole}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Klasse (Sist kjente):</label>
                                                    <span class="value">{returnLatestKnownStudentInfo(contractData).klasse}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Contract Status -->
                                        <div class="info-section">
                                            <h3>
                                                <span class="material-symbols-outlined">assignment</span>
                                                Avtalestatus
                                            </h3>
                                            <div class="status-grid">
                                                <div class="status-item {getStatusColor(contractData.isSigned)}">
                                                    <label>Signert:</label>
                                                    <span class="status-badge">{getStatusLabel(contractData.isSigned)}</span>
                                                </div>
                                                <div class="status-item {getStatusColor(contractData.isImportedToXledger)}">
                                                    <label>Importert til XLedger:</label>
                                                    <span class="status-badge">{getStatusLabel(contractData.isImportedToXledger)}</span>
                                                </div>
                                                <div class="status-item {getStatusColor(contractData.isStudent)}">
                                                    <label>Er student:</label>
                                                    <span class="status-badge">{getStatusLabel(contractData.isStudent)}</span>
                                                </div>
                                                <div class="status-item {getStatusColor(contractData.isImportedFromDigiTroll)}">
                                                    <label>Importert fra DigiTroll:</label>
                                                    <span class="status-badge">{getStatusLabel(contractData.isImportedFromDigiTroll)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Contract Information -->
                                        <div class="info-section">
                                            <h3>
                                                <span class="material-symbols-outlined">description</span>
                                                Avtaleinformasjon
                                            </h3>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Type:</label>
                                                    <span class="value contract-type">{returnLatestKnownContractInfo(contractData).kontraktType}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Opprettet:</label>
                                                    <span class="value">{formatDate(returnLatestKnownContractInfo(contractData).createdTimeStamp)}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>UUID (Database referanse):</label>
                                                    <span class="value uuid">{contractData.uuid}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Filnavn:</label>
                                                    <span class="value">{returnLatestKnownContractInfo(contractData).acosName}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Referanse ID:</label>
                                                    <span class="value">{returnLatestKnownContractInfo(contractData).refId}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Arkiv dokumentnummer:</label>
                                                    <span class="value">{returnLatestKnownContractInfo(contractData).archiveDocumentNumber}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Billing Information -->
                                        <div class="info-section">
                                            <h3>
                                                <span class="material-symbols-outlined">receipt_long</span>
                                                Faktureringsinformasjon
                                            </h3>
                                            <div class="billing-timeline">
                                                {#each Object.entries(contractData.fakturaInfo) as [rateName, rateInfo]}
                                                    <div class="billing-period">
                                                        <div class="period-header">
                                                            <h4>Rate {rateName.slice(-1)}</h4>
                                                            <span class="status-badge {getStatusColor(rateInfo.status === 'Utlån faktureres ikke' ? 'info' : rateInfo.status)}">
                                                                {rateInfo.status}
                                                            </span>
                                                        </div>
                                                        {#if rateInfo.status === 'Utlån faktureres ikke'}
                                                            <p class="info-note">Denne raten er ikke fakturert fordi utlån ikke faktureres.</p>
                                                        {:else}
                                                            <div class="period-details">
                                                                <div class="detail-item">
                                                                    <span class="detail-label">Faktureringsdato:</span>
                                                                    <span class="detail-value">{rateInfo.faktureringsDato}</span>
                                                                </div>
                                                                <div class="detail-item">
                                                                    <span class="detail-label">Betalt dato:</span>
                                                                    <span class="detail-value">{rateInfo.betaltDato}</span>
                                                                </div>
                                                                <div class="detail-item">
                                                                    <span class="detail-label">Sum:</span>
                                                                    <span class="detail-value">{rateInfo.sum}</span>
                                                                </div>
                                                            </div>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                        
                                        <!-- PC Information -->
                                        <div class="info-section">
                                            <h3>
                                                <span class="material-symbols-outlined">laptop</span>
                                                PC Informasjon
                                            </h3>
                                            <div class="pc-status">
                                                <div class="pc-status-item">
                                                    <div class="pc-status-header">
                                                        <span class="material-symbols-outlined">download</span>
                                                        <span>Utlevert</span>
                                                    </div>
                                                    <div class="pc-status-content">
                                                        <span class="status-badge {getStatusColor(contractData.pcInfo.released)}">
                                                            {getStatusLabel(contractData.pcInfo.released)}
                                                        </span>
                                                        {#if contractData.pcInfo.releasedDate !== "Ukjent"}
                                                            <span class="date-info">{formatDate(contractData.pcInfo.releasedDate)}</span>
                                                        {/if}
                                                    </div>
                                                </div>
                                                
                                                <div class="pc-status-item">
                                                    <div class="pc-status-header">
                                                        <span class="material-symbols-outlined">upload</span>
                                                        <span>Returnert</span>
                                                    </div>
                                                    <div class="pc-status-content">
                                                        <span class="status-badge {getStatusColor(contractData.pcInfo.returned)}">
                                                            {getStatusLabel(contractData.pcInfo.returned)}
                                                        </span>
                                                        {#if contractData.pcInfo.returnedDate !== "Ukjent"}
                                                            <span class="date-info">{formatDate(contractData.pcInfo.returnedDate)}</span>
                                                        {/if}
                                                    </div>
                                                </div>
                                                
                                                <div class="pc-status-item">
                                                    <div class="pc-status-header">
                                                        <span class="material-symbols-outlined">shopping_cart</span>
                                                        <span>Utkjøpt</span>
                                                    </div>
                                                    <div class="pc-status-content">
                                                        <span class="status-badge {getStatusColor(contractData.pcInfo.boughtOut)}">
                                                            {getStatusLabel(contractData.pcInfo.boughtOut)}
                                                        </span>
                                                        {#if contractData.pcInfo.buyOutDate !== "Ukjent"}
                                                            <span class="date-info">{formatDate(contractData.pcInfo.buyOutDate)}</span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            <br>
                            {#if contractData.isImportedFromDigiTroll === "true"}
                                <!-- DigiTroll Data Section -->
                                <div class="results-digitroll">
                                    <div class="contract-overview">
                                            <h2>
                                                <div class="header-with-buttons">
                                                    <div class="header-title">
                                                        DigiTroll Data for {contractData.digiTrollData?.Navn || "Unknown"}
                                                    </div>
                                                    <div class="button-group">
                                                        <button class="toggle-button" on:click={() => handleVisibility('digitrollData', i)}>
                                                            <span class="material-symbols-outlined">
                                                                {digitrollDataVisible === i ? 'visibility_off' : 'visibility'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </h2>
                                        {#if digitrollDataVisible === i}
                                            <!-- Elevinformasjon -->
                                            <div class="info-section">
                                                <h3>
                                                    <span class="material-symbols-outlined">person</span>
                                                    Elevinformasjon
                                                </h3>
                                                <div class="info-grid">
                                                    <div class="info-item">
                                                        <label>Navn:</label>
                                                        <span class="value">{contractData.digiTrollData.Navn}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <label>Fødselsnummer:</label>
                                                        <span class="value">{formatFnr(contractData.digiTrollData["Personnr./ Brukernavn"])}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <label>Skole (Sist kjente):</label>
                                                        <span class="value">{returnLatestKnownStudentInfo(contractData).skole}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <label>Klasse (Sist kjente):</label>
                                                        <span class="value">{returnLatestKnownStudentInfo(contractData).klasse}</span>
                                                    </div>
                                                    <div class="info-item">
                                                        <label>Antall avtaler:</label>
                                                        <span class="value">{contractData.digiTrollData["Antall kontrakter"]}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Avtale(r) -->
                                            {#each Object.entries(contractData.digiTrollData.contracts) as [contractId, contractList]}
                                                <div class="info-section">
                                                    <h3>
                                                        <span class="material-symbols-outlined">description</span>
                                                        Avtale ID: {contractId}
                                                    </h3>
                                                    <div class="info-grid">
                                                        <div class="info-item">
                                                            <label>Personnr./ Brukernavn:</label>
                                                            <span class="value">{formatFnr(contractList[0]["Personnr./ Brukernavn"])}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Avtale ID:</label>
                                                            <span class="value">{contractList[0]["Avtale ID"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Bruker ID:</label>
                                                            <span class="value">{contractList[0]["Bruker ID"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Avtalenavn:</label>
                                                            <span class="value">{contractList[0]["Avtalenavn"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Laget dato:</label>
                                                            <span class="value">{contractList[0]["Laget dato"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Filnavn:</label>
                                                            <span class="value">{contractList[0]["Filnavn"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert dato:</label>
                                                            <span class="value">{contractList[0]["Signert dato"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert av:</label>
                                                            <span class="value">{contractList[0]["Signert av"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert av adresse:</label>
                                                            <span class="value">{contractList[0]["Signert av adresse"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert av postnr:</label>
                                                            <span class="value">{contractList[0]["Signert av postnr"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert av sted:</label>
                                                            <span class="value">{contractList[0]["Signert av sted"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert av telefon:</label>
                                                            <span class="value">{contractList[0]["Signert av telefon"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signert på papir:</label>
                                                            <span class="value">{contractList[0]["Signert på papir"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Signeringsfrist:</label>
                                                            <span class="value">{contractList[0]["Signeringsfrist"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>FeideID:</label>
                                                            <span class="value">{contractList[0]["FeideID"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>ShortFeideID:</label>
                                                            <span class="value">{contractList[0]["ShortFeideID"]}</span>
                                                        </div>
                                                        <div class="info-item">
                                                            <label>Telefon:</label>
                                                            <span class="value">{contractList[0]["Telefon"]}</span>
                                                        </div>
                                                    </div>
                                                    <br>
                                                    {#each contractList as contract, i}
                                                        <div class="info-section">
                                                            <h4>
                                                                <span class="material-symbols-outlined">description</span>
                                                                Oppføring {i + 1}
                                                            </h4>
                                                            <div class="info-grid">
                                                                <div class="info-item">
                                                                    <label>Betalingsbeskrivelse:</label>
                                                                    <span class="value">{contract["Betalingsbeskrivelse"]}</span>
                                                                </div>
                                                                <div class="info-item">
                                                                    <label>Betalingsfrist:</label>
                                                                    <span class="value">{contract["Betalingsfrist"]}</span>
                                                                </div>
                                                                <div class="info-item">
                                                                    <label>BetaltMedKvittering:</label>
                                                                    <span class="value">{contract["BetaltMedKvittering"]}</span>
                                                                </div>
                                                                <div class="info-item">
                                                                    <label>ExtKvittering:</label>
                                                                    <span class="value">{contract["ExtKvittering"]}</span>
                                                                </div>
                                                                <div class="info-item">
                                                                    <label>Sum:</label>
                                                                    <span class="value">{contract["Sum"]}</span>
                                                                </div>
                                                                <div class="info-item">
                                                                    <label>Betalings ID:</label>
                                                                    <span class="value">{contract["Betalings ID"]}</span>
                                                                </div>
                                                                <div class="info-item">
                                                                    <label>Betalt:</label>
                                                                    <span class="value">{contract["Betalt"]}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/each}
                                        {/if}
                                    </div>
                                </div>

                                <!-- DigiTroll Rawdata Section -->
                                {#if token.roles.includes('elevkontrakt.administrator-readwrite')}
                                    <br>
                                    <div class="results-digitroll">
                                        <div class="contract-overview">
                                            <h2>
                                                <div class="header-with-buttons">
                                                    <div class="header-title">
                                                        DigiTroll Data (Rådata)
                                                    </div>
                                                    <div class="button-group">
                                                        <button class="toggle-button" on:click={() => handleVisibility('digitrollDataRaw', i)}>
                                                            <span class="material-symbols-outlined">
                                                                {digitrollDataRawVisible === i ? 'visibility_off' : 'visibility'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </h2>
                                            {#if digitrollDataRawVisible === i}
                                                <div class="info-section">
                                                    <pre>{JSON.stringify(contractData.digiTrollData, null, 2)}</pre>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    {/each}
                {/if}
            {/await}
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