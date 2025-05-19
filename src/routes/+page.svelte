<script>
    import { goto } from '$app/navigation';
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import Table from '$lib/components/Table.svelte';
    import { getContracts, getElevkontraktToken, getExtendedUserInfo, putContractPCStatusChange } from '$lib/useApi';
    import { error } from '@sveltejs/kit';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';

    let headers
    let deliveryHeaders
    let response
    let token
    let showSearchInfo = false
    let showModal = false
    let isProcessing = false
    let isFilterApplied = false
    let deliveryModeActive = false
    let statusCode = 0
    let actionClicked
    let contractToBeEdited
    let saveErrorMessage = ""
    $: searchValue = ''
    $: searchResults = []

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

    const contracts = async (token) => {
        if(!token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))) {
            try {
                const { data } = await getExtendedUserInfo(token.upn)
                response = await getContracts(data.companyName)
            } catch (error) {
                throw error(500, 'Noe gikk galt med å hente kontrakter')
            }           

        } else {
            try {
                response = await getContracts()
            } catch (error) {
                throw error(500, 'Noe gikk galt med å hente kontrakter')
            }
        }
        // Create headers and data from response
        // Create fullview headers and keys
        headers = 
                [
                    {
                        label: "Navn",
                        key: "elevInfo.navn",
                        extra: [
                            { 
                                label: "Elevnummer",
                                key: "elevInfo.elevnr"
                            },
                            {
                                label: "Epost",
                                key: "elevInfo.upn"
                            }
                        ]
                    }, 
                    {
                        label: "Skole",
                        key: "elevInfo.skole",
                        extra: [ 
                            {
                                label: "Klasse",
                                key: "elevInfo.klasse"
                            },
                            {
                                label: "Trinn",
                                key: "elevInfo.trinn"
                            },
                        ]
                    },
                    {
                        label: "QrKode",
                        key: "elevInfo.upn",
                        extra: []
                    },
                    {
                        label: "Status signering",
                        key: "isSigned"
                    },
                    {
                        label: "Signert av",
                        key: "signedBy.navn",
                        extra: [
                            { 
                                label: "Signert dato",
                                key: "signedSkjemaInfo.createdTimeStamp"
                            },
                            {
                                label: "Dokumentnummer",
                                key: "signedSkjemaInfo.archiveDocumentNumber"
                            }
                        ]
                    },
                    {
                        label: "PC - Utlevert",
                        key: "pcInfo.released",
                        extra: [
                            {
                                label: "Utlevert av",
                                key: "pcInfo.releasedBy",
                            },
                            {
                                label: "Utlevert dato",
                                key: "pcInfo.releasedDate"
                            }
                        ]
                    },
                    {
                        label: "PC - Innlevert",
                        key: "pcInfo.returned",
                        extra: [
                            {
                                label: "Motatt av",
                                key: "pcInfo.returnedBy"
                            },
                            {
                                label: "Innlevert dato",
                                key: "pcInfo.returnedDate"
                            },
                        ]
                    },
                    {
                        label: "Faktura 1",
                        key: "fakturaInfo.rate1",
                        extra: [
                            // Fyllinn faktura data når vi har datastruktur
                        ]
                    },
                    {
                        label: "Faktura 2",
                        key: "fakturaInfo.rate2",
                        extra: [
                            // Fyllinn faktura data når vi har datastruktur
                        ]
                    },
                    {
                        label: "Faktura 3",
                        key: "fakturaInfo.rate3",
                        extra: [
                            // Fyllinn faktura data når vi har datastruktur
                        ]
                    },
                    {
                        label: "Ansvarlig",
                        key: "ansvarligInfo.navn"
                    },
                    {
                        label: "Kontraktstype",
                        key: "unSignedskjemaInfo.kontraktType"
                    },
            ]
        
        // Remove unwanted keys from the headers array
        if(!token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))) {
            // Show QRcode only for administrator and IT service desk
            headers = headers.filter(header => header.label !== 'QrKode') 
        }      
                            
        return response.result
    }

    const deliveryMode = () => {
        // Create a new headers array with only the headers that is needed for the delivery mode
        deliveryModeActive = !deliveryModeActive
        if(deliveryModeActive === true) {
            deliveryHeaders = headers.filter(header => header.label === 'QrKode' || header.label === 'Navn' || header.label === 'Skole' || header.label === 'Status signering')
        }   
    }

    const search = (searchValue) => {
		const filterFunc = (dataArray) => {
			const sv = searchValue.toLowerCase()
            const svArray = sv.split(';')
            if(svArray.lastIndexOf('') !== -1) {
                svArray.splice(svArray.lastIndexOf(''), 1)
            }
            const data = dataArray.filter((data) => {
                const searchInData = (searchData, searchValue) => {
                    // Get the keys of the searchData object
                    const keys = Object.keys(searchData);
                    // Check if any of the keys match the search value
                    for (const key of keys) {
                        // Check if the value of the key is an object
                        if (typeof searchData[key] === 'object' && searchData[key] !== null) {
                            // If it is an object, call the function recursively
                            if (searchInData(searchData[key], searchValue)) {
                                return true;
                            }
                        } else {
                            // If it is not an object, check if it matches the search value
                            if (searchData[key].toString().toLowerCase().startsWith(searchValue)) {
                                return true;
                            }
                        }
                    }                    
                }
                return searchInData(data, svArray)
            })
            return data
		}
        searchResults = filterFunc(response.result)
	}

    const handleModalButtonClicks = async (clickedButton, action) => {
        if(clickedButton === 'Lagre') {
            // Handle save action
            isProcessing = true
            let response
            if(action === "utlever") {
                const utleverpc = document.getElementById('utleverpc').checked
                if(utleverpc === true) {
                    try {
                        response = await putContractPCStatusChange(contractToBeEdited._id, { releasePC: true } )
                    } catch (error) {
                        saveErrorMessage = "Noe gikk galt, prøv igjen senere"
                        isProcessing = false
                    }
                } else {
                    saveErrorMessage = "Du må krysse av for å utlevere PC"
                    isProcessing = false
                }
            } else {
                const innleverpc = document.getElementById('innleverpc').checked
                if(innleverpc === true) {
                    try {
                        response = await putContractPCStatusChange(contractToBeEdited._id, { returnPC: true } )
                    } catch (error) {
                        saveErrorMessage = "Noe gikk galt, prøv igjen senere"
                        isProcessing = false
                    }
                } else {
                    saveErrorMessage = "Du må krysse av for å registrere inn PC"
                    isProcessing = false
                }
            }
            if(response.status === 200) {
                showModal = false
                saveErrorMessage = ""
                reloadPage()
            } else if (response.status !== 200) {
                saveErrorMessage = "Noe gikk galt, prøv igjen senere"
                isProcessing = false
            }
        } else if (clickedButton === 'Avbryt') {
            // Handle close action
            saveErrorMessage = ""
            showModal = false
        }
    }
</script>

<main>
    {#await getElevkontraktToken(true)}
        <div class="loading">
            <IconSpinner width={"32px"} />
        </div>
    {:then token}
        {#await contracts(token)}
            <Table columns={[]} data={[]} loading={true} />
        {:then contractData}
            <div class="page-container">
                <div class="info-container">
                    {#if showSearchInfo === false}
                        <button class="info-button" on:click={() => showSearchInfo = !showSearchInfo}>Hva kan du søke på? 
                            <span class="material-symbols-outlined">keyboard_arrow_down</span>
                        </button>
                    {:else}
                        <button class="info-button" on:click={() => showSearchInfo = !showSearchInfo}>Hva kan du søke på? 
                            <span class="material-symbols-outlined">keyboard_arrow_up</span>
                        </button>
                        <div class="info-list">
                            <ul>
                                <li>Eleven/Ansvarlig sitt navn</li>
                                <li>Eleven sitt elevnummer</li>
                                <li>Eleven sin epost</li>
                            </ul>
                            <ul>
                                <li>Hvem som har signert</li>
                                <li>Skole, Klasse og Trinn</li>
                            </ul>
                        </div>
                        <div class="isSigned-info">
                            <p>Ønsker du å søke etter status på signeringen kan du bruke filteret "Kun signerte kontrakter".</p>
                        </div>
                    {/if}
                </div>
                <div class="icon-input" style="width: 80vw; max-width: 50rem;">
                    {#if !isFilterApplied}
                            <span class="material-symbols-outlined">search</span>
                            <input type="text" style="width: 40vw" bind:value={searchValue} on:input={() => { search(searchValue) }} placeholder="Søk" />
                    {:else}
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" style="width: 40vw" bind:value={searchValue} on:input={() => { search(searchValue) }} placeholder="Du kan ikke søke når filter er i bruk" disabled/>
                    {/if}
                </div>
                {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))}
                    {#if deliveryModeActive === false}
                        <div class="delivery-button">
                            <button on:click={ () => deliveryMode() }>Utleveringsmodus</button>
                        </div>
                    {:else}
                        <div class="delivery-button">
                            <button on:click={ () => deliveryMode() }>Tilbake til normalmodus</button>
                        </div>
                    {/if}
                {/if}
                <div class="table-container">
                    <!-- Table -->
                    {#if searchValue.length > 0}
                        <!-- Table that shows the searchresults -->
                        <Table columns={deliveryModeActive ? deliveryHeaders : headers} data={searchResults} loading={false} actions={{enabled: deliveryHeaders, actions:['Rediger']}} bind:clickedAction={actionClicked} bind:contractToBeEdited={contractToBeEdited} bind:buttonClicked={showModal} isSearchActive={true} bind:isFilterApplied={isFilterApplied}/>
                    {:else}
                        <!-- Table that shows all contracts -->
                        <Table columns={deliveryModeActive ? deliveryHeaders : headers} data={contractData} loading={false} actions={{enabled: deliveryHeaders, actions:['Rediger']}} bind:clickedAction={actionClicked} bind:contractToBeEdited={contractToBeEdited} bind:buttonClicked={showModal} isSearchActive={false} bind:isFilterApplied={isFilterApplied}/>
                    {/if}
                    <!-- Edit modal -->
                    {#key showModal}
                        {#if actionClicked === 'Rediger'}
                            {#if isProcessing === true}
                                <Modal bind:showModal={showModal} disableClickOutSide={true} disableStandardButton={true}>
                                    <div slot="header">
                                        <h2>Rediger kontrakt</h2>
                                    </div>
                                    <div slot="mainContent">
                                        <div class="info-container">
                                            <p>Kontrakt for: <strong>{contractToBeEdited.elevInfo.navn}</strong></p>
                                            <p>Kontraktstype: <strong>{contractToBeEdited.unSignedskjemaInfo.kontraktType}</strong></p>
                                            <br>
                                            <IconSpinner width="50px" />
                                            <p>Lagrer endring...</p>
                                        </div>
                                    </div>
                                </Modal>
                            {:else}
                                <Modal bind:showModal={showModal} disableClickOutSide={true} disableStandardButton={true} >
                                    <div slot="header">
                                        <h2>Rediger kontrakt</h2>
                                    </div>
                                    <div slot="mainContent">
                                        <p>Kontrakt for: <strong>{contractToBeEdited.elevInfo.navn}</strong></p>
                                        <p>Kontraktstype: <strong>{contractToBeEdited.unSignedskjemaInfo.kontraktType}</strong></p>
                                        <br>
                                        {#if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "false"}
                                            <p>Du kan levere ut pcen. Husk å krysse av og lagre.</p>
                                            <br>
                                            <div class="checkbox-container">
                                                <label for="utleverpc">Utlever PC?</label>
                                                <input type="checkbox" id="utleverpc" name="utleverpc" value="true" style="margin: 0.2rem;"/> 
                                                {#if saveErrorMessage.length > 0} 
                                                    <p style="color: red;">*</p>
                                                {:else}
                                                    <p>*</p>
                                                {/if}
                                            </div>
                                        {:else if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false"}
                                            <p>PCen er alt utlevert, skal den leveres inn? Husk å endre status</p>
                                            <br>
                                            <div class="checkbox-container">
                                                <label for="innleverpc">Registrer inn PC?</label>
                                                <input type="checkbox" id="innleverpc" name="innleverpc" value="true" style="margin: 0.2rem;"/> 
                                                {#if saveErrorMessage.length > 0} 
                                                    <p style="color: red;">*</p>
                                                {:else}
                                                    <p>*</p>
                                                {/if}
                                            </div>
                                        {:else if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "true"}
                                            <!-- TODO Når vi ser status fakturert/ubetalt på en faktura kan ikke pcen leveres inn. -->
                                            <p>PCen er alt innlevert</p>
                                            <p>Mener du at dette er feil, kontakt en administrator.</p>
                                        {:else}
                                            <p>Kontrakten er ikke signert, kan ikke utlevere PC</p>
                                        {/if}
                                        <br>
                                        {#if saveErrorMessage.length > 0}
                                            <p style="color: red;"> <strong>{saveErrorMessage} ❗</strong></p>
                                        {/if}
                                    </div>
                                    <div slot="saveButton">
                                        {#if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "false" || (contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false")}
                                            {#if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "false"}
                                                <button on:click={() => handleModalButtonClicks('Lagre', 'utlever')}>Lagre</button>
                                            {:else if contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false"}
                                                <button on:click={() => handleModalButtonClicks('Lagre', 'innlever')}>Lagre</button>
                                            {/if}
                                        {:else}
                                            <button disabled on:click={() => handleModalButtonClicks('Lagre')}>Lagre</button>
                                        {/if}
                                        <button on:click={() => handleModalButtonClicks('Avbryt')}>Avbryt</button>
                                    </div>
                                </Modal>
                            {/if}
                        {/if}
                    {/key}
                </div>
            </div>
        {:catch error}
            <p>{error.message}</p>
        {/await}
    {/await}
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
  .page-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  .table-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .icon-input {
        display: flex;
        align-items: center;
        margin: 1rem 0rem 1rem 0rem;
        padding: 0.5rem 0.5rem 0.5rem 0.5rem;
        border: 1px solid var(--himmel);
        width: 100%;
        border-radius: 5px;
    }
    .icon-input input:focus {
        outline: none;
    }
    .icon-input input::placeholder {
        color: var(--himmel);
    }
    .icon-input input:focus::placeholder {
        color: transparent;
    }
    .icon-input input {
        padding: 5px 16px 5px 5px;
        border: 1px solid var(--himmel);
        flex-grow: 1;
    }
    .icon-input span {
        padding: 0rem 0rem 0rem 0rem;
        font-size: 1.5rem;
    }
    .info-container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .info-button {
        all: unset;
        cursor: pointer;
        display: flex;
        flex-direction: row;
        font-size: larger;
    }
    .info-button:focus {
        outline: revert;
    }
    .info-button:hover {
        color: var(--himmel);
    }
    .info-button span {
        font-size: 1.5rem;
    }
    .info-list {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        margin: 1rem 0rem 0rem 0rem;
        border: 1px solid var(--vann-50);
        background-color: var(--vann-30);
        width: 100%;
    }
    .info-list ul {
        display: flex;
        flex-direction: column;
        list-style-type: none;
    }
    .info-list ul li {
        margin: 0.5rem 0rem 0.5rem 0rem;
    }
    .isSigned-info {
        border: 1px solid var(--vann-50);
        background-color: var(--vann-30);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .checkbox-container {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
    }
    .delivery-button {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0rem 0rem 1rem 0rem;
    }
</style>