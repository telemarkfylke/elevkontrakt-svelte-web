<script>
    import { goto } from '$app/navigation';
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import Input from '$lib/components/Input.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import Select from '$lib/components/Select.svelte';
    import Table from '$lib/components/Table.svelte';
    import { getContracts, getElevkontraktToken, getExtendedUserInfo, updateContractInfo, deleteContract } from '$lib/useApi';
    import { error } from '@sveltejs/kit';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';

    let headers
    let deliveryHeaders
    let response
    let token
    let responseCopy

    let updatedValues = {
        rate1: {
            status: '',
            faktureringsår: '',
            sum: '',
            editReason: ''
        },
        rate2: {
            status: '',
            faktureringsår: '',
            sum: '',
            editReason: ''
        },
        rate3: {
            status: '',
            faktureringsår: '',
            sum: '',
            editReason: ''
        }
    }

    let showSearchInfo = false
    let showModal = false
    let isProcessing = false
    let isFilterApplied = false
    let deliveryModeActive = false
    let enabledActions = false
    let unLockPCFields = false
    let unLockUpdateFields = false

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
        // Enable actions for administrators
        if(token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))) {
            enabledActions = true
        }
        if(!token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))) {
            try {
                const { data } = await getExtendedUserInfo(token.upn)
                response = await getContracts(data.companyName)
            } catch (error) {
                throw error(500, 'Noe gikk galt med å hente avtaler')
            }           

        } else {
            try {
                response = await getContracts()
            } catch (error) {
                throw error(500, 'Noe gikk galt med å hente avtaler')
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
                                label: "Trinn",
                                key: "elevInfo.trinn"
                            },
                        ]
                    },
                    {
                        label: "Klasse",
                        key: "elevInfo.klasse"
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
                                key: "pcInfo.releaseBy",
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
                        label: "PC - Kjøpt ut",
                        key: "pcInfo.boughtOut",
                        extra: [
                            {
                                label: "Registrert kjøpt ut av",
                                key: "pcInfo.buyOutBy"
                            },
                            {
                                label: "Kjøpt ut dato",
                                key: "pcInfo.buyOutDate"
                            }
                        ]
                    },
                    {
                        label: "Faktura 1",
                        key: "fakturaInfo.rate1.status",
                        extra: [
                            // Fyllinn faktura data når vi har datastruktur
                        ]
                    },
                    {
                        label: "Faktura 2",
                        key: "fakturaInfo.rate2.status",
                        extra: [
                            // Fyllinn faktura data når vi har datastruktur
                        ]
                    },
                    {
                        label: "Faktura 3",
                        key: "fakturaInfo.rate3.status",
                        extra: [
                            // Fyllinn faktura data når vi har datastruktur
                        ]
                    },
                    {
                        label: "Ansvarlig",
                        key: "ansvarligInfo.navn"
                    },
                    {
                        label: "Avtale type",
                        key: "unSignedskjemaInfo.kontraktType"
                    },
            ]
        
        // Remove unwanted keys from the headers array
        if(!token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))) {
            // Show QRcode only for administrator and IT service desk
            headers = headers.filter(header => header.label !== 'QrKode') 
        }
        
        
        responseCopy = JSON.parse(JSON.stringify(response.result))                        
        return response.result
    }

    const deliveryMode = () => {
        // Create a new headers array with only the headers that is needed for the delivery mode
        deliveryModeActive = !deliveryModeActive
        if(deliveryModeActive === true) {
            deliveryHeaders = headers.filter(header => header.label === 'QrKode' || header.label === 'Navn' || header.label === 'Skole' || header.label === 'Status signering')
            deliveryHeaders.push({
                label: 'Dokumentnummer',
                key: 'signedSkjemaInfo.archiveDocumentNumber'
            })
        }
    }

    const search = (searchValue) => {
        const filterFunc = (dataArray) => {
            const sv = searchValue.toLowerCase();
            const svArray = sv.split(';').filter(s => s !== '');

            // Special handling for isSigned:true or isSigned:false
            const isSignedSearch = svArray.find(s => s.startsWith('signert:'));
            let filteredData = dataArray;

            if (isSignedSearch) {
                let value = isSignedSearch.split(':')[1];
                // Normalize value to lowercase for comparison
                value = value.toLowerCase();    
                // Convert 'ja' to 'true' and 'nei' to 'false'
                // This allows for searching with 'signert:ja' or 'signert:nei' 
                if (value === 'ja') {
                    value = 'true';
                } else if (value === 'nei') {
                    value = 'false';
                } else {
                    // If the value is not true or false, we can skip filtering
                    return filteredData;
                }
                filteredData = filteredData.filter(item => {
                    // Normalize both to string for comparison
                    return String(item.isSigned).toLowerCase() === value;
                });
                // Remove isSigned from further search
                svArray.splice(svArray.indexOf(isSignedSearch), 1);
            }

            // A recursive function that takes the dataArray and the svArray and returns the filtered dataArray
            const filterRecursive = (dataArray, svArray) => {
                if (svArray.length === 0) {
                    return dataArray;
                }
                const currentSv = svArray[0];
                const filtered = dataArray.filter(item => {
                    // Check if the currentSv is in any of the keys in the item
                    return Object.keys(item).some(key => {
                        if (typeof item[key] === 'string') {
                            return item[key].toLowerCase().includes(currentSv);
                        } else if (typeof item[key] === 'object' && item[key] !== null) {
                            // If the key is an object, check if any of the values in the object contains the currentSv
                            return Object.values(item[key]).some(value => typeof value === 'string' && value.toLowerCase().includes(currentSv));
                        }
                        return false;
                    });
                });
                // Call the function recursively with the filtered data and the rest of the svArray
                return filterRecursive(filtered, svArray.slice(1));
            };
            return filterRecursive(filteredData, svArray);
        };
        searchResults = filterFunc(response.result);
    }

    const handleModalButtonClicks = async (clickedButton, action, token) => {
        if(clickedButton === 'Lagre') {
            // Handle save action
            isProcessing = true
            let response
            if(action === "utlever") {
                const utleverpc = document.getElementById('utleverpc')?.checked
                if(utleverpc === true) {
                    try {
                        response = await updateContractInfo(contractToBeEdited._id, { releasePC: true, upn: token.upn } )
                    } catch (error) {
                        saveErrorMessage = "Noe gikk galt, prøv igjen senere"
                        isProcessing = false
                    }
                } else {
                    saveErrorMessage = "Du må krysse av for å utlevere PC"
                    isProcessing = false
                }
            } else if (action === "innlever/utkjop") {
                const innleverpc = document.getElementById('innleverpc')?.checked
                const utkjoppc = document.getElementById('utkjoppc')?.checked
                if(!innleverpc && !utkjoppc) {
                    saveErrorMessage = "Du må krysse av for å registrere innlevering eller utkjøp av PC"
                    isProcessing = false
                    return
                }
                if(innleverpc === true && utkjoppc === true) {
                    saveErrorMessage = "Du kan ikke registrere både innlevering og utkjøp av PC samtidig"
                    isProcessing = false
                    return
                }
                if(utkjoppc === true) {
                    try {
                        response = await updateContractInfo(contractToBeEdited._id, { buyOutPC: true, upn: token.upn } )
                    } catch (error) {
                        saveErrorMessage = "Noe gikk galt, prøv igjen senere"
                        isProcessing = false
                    }
                } else {
                    // saveErrorMessage = "Du må krysse av for å registrere utkjop av PC"
                    isProcessing = false
                }
                if(innleverpc === true) {
                    try {
                        response = await updateContractInfo(contractToBeEdited._id, { returnPC: true, upn: token.upn } )
                    } catch (error) {
                        saveErrorMessage = "Noe gikk galt, prøv igjen senere"
                        isProcessing = false
                    }
                } else {
                    // saveErrorMessage = "Du må krysse av for å registrere inn PC"
                    isProcessing = false
                }   
            } else if (action === "oppdater") {
                const fieldsChanged = fieldsHaveChanged()
                if(fieldsChanged.hasChanged) {
                    // Build the object to be sent to the API
                    const updateData = { data: {} }
                    for (const [key, value] of Object.entries(fieldsChanged.fieldsChanged)) {
                        updateData.data[`fakturaInfo.${key}`] = value.toString()
                    }
                    // Return ID and the updateData and updateData = true to the API
                    /**
                     * E.G
                     * {
                     *  contractID: contractToBeEdited._id,
                     *  updateData: true,
                     *  data: {
                     *      'fakturaInfo.rate1.status': 'Fakturert',
                     *      'fakturaInfo.rate1.faktureringsår': 2024,
                     *      'fakturaInfo.rate1.sum': 2000,
                     *      changeLog: [
                     *          {
                     *              field: 'fakturaInfo.rate1.status',
                     *              oldValue: 'Ikke fakturert',
                     *              newValue: 'Fakturert',
                     *              timestamp: new Date().toISOString(),
                     *              changedBy: token.upn
                     *          },
                     *          {
                     *              field: 'fakturaInfo.rate1.faktureringsår',
                     *              oldValue: 2023,
                     *              newValue: 2024,
                     *              timestamp: new Date().toISOString(),
                     *              changedBy: token.upn
                     *          },
                     *          {
                     *              field: 'fakturaInfo.rate1.sum',
                     *              oldValue: 1000,
                     *              newValue: 2000,
                     *              timestamp: new Date().toISOString(),
                     *              changedBy: token.upn
                     *          }
                     *      ]
                     *  }
                     * }
                    */
                    updateData.changeLog = []
                    for (const [key, value] of Object.entries(fieldsChanged.fieldsChanged)) {
                        updateData.changeLog.push({
                            field: `fakturaInfo.${key}`,
                            oldValue: contractToBeEdited.fakturaInfo[key.split('.')[0]][key.split('.')[1]],
                            newValue: value,
                            timestamp: new Date().toISOString(),
                            changedBy: token.upn
                        })
                    }
                    updateData.contractID = contractToBeEdited._id
                    updateData.updateData = true

                    response = await updateContractInfo(contractToBeEdited._id, updateData )
                } else {
                    saveErrorMessage = "Ingen endringer å lagre"
                    isProcessing = false
                    return
                }
            } else if (action === "slett") {
                try {
                    response = await deleteContract(contractToBeEdited._id)
                } catch (error) {
                    saveErrorMessage = "Noe gikk galt, prøv igjen senere"
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

    const exportData = () => {
        // Export data to CSV with selectable headers and fields
        // 1. Define available headers and their keys
        const availableHeaders = [
            // { label: "Fulltnavn", key: "elevInfo.navn" },
            { label: "Fornavn", key: "elevInfo.fornavn" },
            { label: "Etternavn", key: "elevInfo.etternavn" },
            // { label: "Elevnummer", key: "elevInfo.elevnr" },
            { label: "Epost", key: "elevInfo.upn" },
            { label: "Skole", key: "elevInfo.skole" },
            { label: "Trinn", key: "elevInfo.trinn" },
            { label: "Klasse", key: "elevInfo.klasse" },
            // { label: "Status signering", key: "isSigned" },
            // { label: "Signert av", key: "signedBy.navn" },
            // { label: "Signert dato", key: "signedSkjemaInfo.createdTimeStamp" },
            // { label: "Dokumentnummer", key: "signedSkjemaInfo.archiveDocumentNumber" },
            // { label: "PC - Utlevert", key: "pcInfo.released" },
            // { label: "Utlevert av", key: "pcInfo.releasedBy" },
            // { label: "Utlevert dato", key: "pcInfo.releasedDate" },
            // { label: "PC - Innlevert", key: "pcInfo.returned" },
            // { label: "Motatt av", key: "pcInfo.returnedBy" },
            // { label: "Innlevert dato", key: "pcInfo.returnedDate" },
            { label: "Faktura 1", key: "fakturaInfo.rate1.status" },
            { label: "Faktura 2", key: "fakturaInfo.rate2.status" },
            { label: "Faktura 3", key: "fakturaInfo.rate3.status" },
            // { label: "Ansvarlig", key: "ansvarligInfo.navn" },
            { label: "Avtale type", key: "unSignedskjemaInfo.kontraktType" }
        ];
        /**
         * Keep for later, maybe we want to let the user select which columns to export (maybe not)
         */
        // // 2. Prompt user for which columns to export, prompt is good enough for Tormod
        // const selectedLabels = prompt(
        //     "Skriv inn hvilke kolonner du vil eksportere, separert med komma:\n" +
        //     availableHeaders.map(h => h.label).join(", "),
        //     availableHeaders.map(h => h.label).join(", ")
        // );
        // if (!selectedLabels) return;
        // const selected = selectedLabels.split(",").map(s => s.trim()).filter(Boolean);
        // const selectedHeaders = availableHeaders.filter(h => selected.includes(h.label));
        // if (selectedHeaders.length === 0) {
        //     alert("Ingen gyldige kolonner valgt.");
        //     return;
        // }

        // 3. Helper to get nested value by key string (e.g. "elevInfo.navn")
        const getValue = (obj, key) => {
            return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ""), obj);
        }

        // 4. Build CSV rows
        const csvRows = [availableHeaders.map(h => `${h.label}`).join(",") ]
        response.result.forEach(row => {
            csvRows.push(
            availableHeaders.map(h => {
                let val = getValue(row, h.key)
                if (typeof val === "boolean") val = val ? "Ja" : "Nei"
                if (val === null || val === undefined) val = ""
                return `${String(val).replace(/"/g, '""')}`
            }).join(",")
            )
        });

        // 5. Download CSV
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `elevavtaler-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const countContracts = () => {
        let count = {}

        // Count the number of contracts if type leieavtale and låneavtale
        response.result.forEach(contract => {
            if (contract.unSignedskjemaInfo.kontraktType.toLowerCase() === 'leieavtale' || contract.unSignedskjemaInfo.kontraktType.toLowerCase() === 'låneavtale') {
                if (count[contract.unSignedskjemaInfo.kontraktType.toLowerCase()]) {
                    count[contract.unSignedskjemaInfo.kontraktType.toLowerCase()] += 1;
                } else {
                    count[contract.unSignedskjemaInfo.kontraktType.toLowerCase()] = 1;
                }
            }
        });
        // If there is no contracts of type leieavtale or låneavtale, return 0
        if (Object.keys(count).length === 0) {
            return 0;
        }

        return count
    }

    const assignActionBasedOnRole = (token) => {
        // If the user is an administrator or IT service desk, enable actions
        // NB! Assign actions based on roles, not on enabledActions variable
        if(token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))) {
            return ['Rediger', 'Slett']
        } 
        if (token.roles.some((r) => ['elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))) {
            return ['Rediger']
        } 
        if (!token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))) {
            return []
        }
    }

    const fieldsHaveChanged = () => {
        // Check if any of the fields in contractToBeEdited have changed compared to the original response data

        // Check if fakturaInfo.rateX.status, .fakturaInfo.rateX.faktureringsår, fakturaInfo.rateX.sum have changed
        let fieldsChanged = {}
        for (let i = 1; i <= 3; i++) {
            if (updatedValues[`rate${i}`].status !== '' && updatedValues[`rate${i}`].status !== contractToBeEdited.fakturaInfo[`rate${i}`].status) fieldsChanged[`rate${i}.status`] = updatedValues[`rate${i}`].status
            if (updatedValues[`rate${i}`].faktureringsår !== '' && updatedValues[`rate${i}`].faktureringsår !== contractToBeEdited.fakturaInfo[`rate${i}`].faktureringsår) fieldsChanged[`rate${i}.faktureringsår`] = updatedValues[`rate${i}`].faktureringsår
            if (updatedValues[`rate${i}`].sum !== '' && updatedValues[`rate${i}`].sum !== contractToBeEdited.fakturaInfo[`rate${i}`].sum) fieldsChanged[`rate${i}.sum`] = updatedValues[`rate${i}`].sum
            if (updatedValues[`rate${i}`].editReason !== '' ) fieldsChanged[`rate${i}.editReason`] = updatedValues[`rate${i}`].editReason;
        }

        return { hasChanged: Object.keys(fieldsChanged).length > 0, fieldsChanged }
    }

    const unLockFieldsHandler = (fieldToUnlock) => {
        if (fieldToUnlock === "PC") {
            unLockPCFields = !unLockPCFields
            unLockUpdateFields = false
        } else if (fieldToUnlock === "Update") {
            unLockUpdateFields = !unLockUpdateFields
            unLockPCFields = false
        }
    }

    const getCorrectYear = (rateNumber) => {
        // Returns the correct billing year based on the rate number and current month
        // We follow a school year from August to June next year
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // Months are zero-based
        if (currentMonth >= 8) { // August to December
            return currentYear + rateNumber;
        } else { // January to July
            return currentYear + rateNumber - 1;
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
                            <p>Ønsker du å søke etter status på signeringen kan du bruke filteret "Kun signerte avtaler".</p>
                            <p>Om du ønsker å søke etter flere verdier, kan du bruke semikolon (;) som skille.</p>
                            <p>F.eks Bamble;2ABC</p>
                            <p>Vil du søke etter signerte avtaler, kan du bruke "signert:ja" som filter.</p>
                            <p>Vil du søke etter ikke-signerte avtaler, kan du bruke "signert:nei" som filter.</p>
                            <p>Dette kan du kombinere med andre filtre for mer spesifikke søk.</p>
                            <p>F.eks Bamble;2ABC;signert:ja</p>
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
                    <div class="hidden-buttons">
                        {#if deliveryModeActive === false}
                            <div class="delivery-button">
                                <button on:click={ () => deliveryMode() }>Utleveringsmodus</button>
                            </div>
                        {:else}
                            <div class="delivery-button">
                                <button on:click={ () => deliveryMode() }>Tilbake til normalmodus</button>
                            </div>
                        {/if}
                        {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))}
                            <div class="delivery-button">
                                <button on:click={() => exportData()}>Eksporter data</button>
                            </div>
                        {/if}
                    </div>
                {/if}
                <div class="table-container">
                    <!-- Table -->
                    {#if searchValue.length > 0}
                        <!-- Table that shows the searchresults -->
                        <Table columns={deliveryModeActive ? deliveryHeaders : headers} data={searchResults} loading={false} actions={{enabled: (enabledActions === true && deliveryModeActive === false), actions: assignActionBasedOnRole(token)}} bind:clickedAction={actionClicked} bind:contractToBeEdited={contractToBeEdited} bind:buttonClicked={showModal} isSearchActive={true} bind:isFilterApplied={isFilterApplied} bind:deliveryModeActive={deliveryModeActive} itemsPerPage={30}/>
                    {:else}
                        <!-- Table that shows all contracts -->
                        <Table columns={deliveryModeActive ? deliveryHeaders : headers} data={contractData} loading={false} actions={{enabled: (enabledActions === true && deliveryModeActive === false), actions: assignActionBasedOnRole(token)}} bind:clickedAction={actionClicked} bind:contractToBeEdited={contractToBeEdited} bind:buttonClicked={showModal} isSearchActive={false} bind:isFilterApplied={isFilterApplied} bind:deliveryModeActive={deliveryModeActive} itemsPerPage={30}/>
                    {/if}
                    <!-- Edit modal -->
                    {#key showModal}
                        {#if actionClicked === 'Rediger'}
                            {#if isProcessing === true}
                                <Modal bind:showModal={showModal} disableClickOutSide={true} disableStandardButton={true}>
                                    <div slot="header">
                                        <h2>Rediger avtale</h2>
                                    </div>
                                    <div slot="mainContent">
                                        <div class="info-container">
                                            <p>Avtale for: <strong>{contractToBeEdited.elevInfo.navn}</strong></p>
                                            <p>Avtale type: <strong>{contractToBeEdited.unSignedskjemaInfo.kontraktType}</strong></p>
                                            <br>
                                            <IconSpinner width="50px" />
                                            <p>Lagrer endring...</p>
                                        </div>
                                    </div>
                                </Modal>
                            {:else}
                                <Modal bind:showModal={showModal} disableClickOutSide={true} disableStandardButton={true} >
                                    <div slot="header">
                                        <h2>Rediger Avtale</h2>
                                    </div>
                                    <div slot="mainContent">
                                        <p>Avtale for: <strong>{contractToBeEdited.elevInfo.navn}</strong></p>
                                        <p>Avtale type: <strong>{contractToBeEdited.unSignedskjemaInfo.kontraktType}</strong></p>
                                        <br>
                                        {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite'].includes(r))}
                                            {#if !unLockPCFields}
                                                <button style="margin-bottom: 1rem;" on:click={() => unLockFieldsHandler("PC")}>
                                                    Rediger PC-status 🔓
                                                </button>
                                            {:else}
                                                <button style="margin-bottom: 1rem;" on:click={() => unLockFieldsHandler("PC")}>
                                                    Avbryt redigering 🔒
                                                </button>
                                            {/if}
                                            {#if unLockPCFields}
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
                                                {:else if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false" && contractToBeEdited.fakturaInfo.rate1.status.toLowerCase() !== "ikke fakturert" && contractToBeEdited.fakturaInfo.rate2.status.toLowerCase() !== "ikke fakturert" && contractToBeEdited.fakturaInfo.rate3.status.toLowerCase() !== "ikke fakturert"}
                                                    <p>PCen er alt utlevert, skal den leveres inn? Husk å endre status</p>
                                                    <br>
                                                    <div class="checkbox-container">
                                                        <div class="checkbox-item">
                                                            <label for="innleverpc">Registrer inn PC?</label>
                                                            <input type="checkbox" id="innleverpc" name="innleverpc" value="true" style="margin: 0.2rem;"/> 
                                                            {#if saveErrorMessage.length > 0} 
                                                                <p style="color: red;">*</p>
                                                            {:else}
                                                                <p>*</p>
                                                            {/if}
                                                        </div>
                                                        <div class="checkbox-item">
                                                            <label for="utkjoppc">Registrer PC som utkjøpt?</label>
                                                            <input type="checkbox" id="utkjoppc" name="utkjoppc" value="true" style="margin: 0.2rem;"/> 
                                                            {#if saveErrorMessage.length > 0} 
                                                                <p style="color: red;">*</p>
                                                            {:else}
                                                                <p>*</p>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                {:else if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false" && (contractToBeEdited.fakturaInfo.rate1.status.toLowerCase() === "ikke fakturert" || contractToBeEdited.fakturaInfo.rate2.status.toLowerCase() === "ikke fakturert" && contractToBeEdited.fakturaInfo.rate3.status.toLowerCase() === "ikke fakturert")}
                                                    <p>PCen er alt utlevert, skal den leveres inn?</p>
                                                    <p>PCen kan ikke leveres inn før alle fakturaene er betalt/fakturert, eller har status "Skal ikke betale"</p>
                                                {:else if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "true"}
                                                    <p>PCen er alt innlevert</p>
                                                    <p>Mener du at dette er feil, kontakt en administrator.</p>
                                                {:else if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.boughtOut === "true"} 
                                                    <p>PCen er alt kjøpt ut</p>
                                                    <p>Mener du at dette er feil, kontakt en administrator.</p>
                                                {:else}
                                                    <p>Du kan ikke redigere pc-status, dette kan være av ulike grunner: </p>
                                                    <div class="info-list" style="background-color: white; border-color:white;">
                                                        <ul>
                                                            <li>Avtalen er ikke signert</li>
                                                            <li>PCen er allerede innlevert</li>
                                                            <li>PCen er allerede kjøpt ut</li>
                                                            <li>En eller flere fakturaer har status "Ikke fakturert"</li>
                                                        </ul>
                                                    </div>
                                                {/if}
                                            {/if}
                                        {/if}
                                        {#if contractToBeEdited.isSigned === "true" && contractToBeEdited.unSignedskjemaInfo.kontraktType.toLowerCase() === "leieavtale" && contractToBeEdited.pcInfo.returned === "false"}
                                            {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))}
                                                {#if !unLockUpdateFields}
                                                    <button style="margin-bottom: 1rem;" on:click={() => unLockFieldsHandler("Update")}>
                                                        Rediger betalinger 🔓
                                                    </button>
                                                {:else}
                                                    <button style="margin-bottom: 1rem;" on:click={() => unLockFieldsHandler("Update")}>
                                                        Avbryt redigering 🔒
                                                    </button>
                                                {/if}
                                                {#if unLockUpdateFields}
                                                    <h4>Faktura 1</h4>
                                                    <div>
                                                        {#if contractToBeEdited.fakturaInfo.rate1.status.toLowerCase() === "ikke fakturert" || contractToBeEdited.fakturaInfo.rate1.status.toLowerCase() === "skal ikke betale" || contractToBeEdited.fakturaInfo.rate1.status.toLowerCase() === "fakturert"}
                                                            {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                                                                <!-- <Input type="text" label="Endre sum fra: {contractToBeEdited.fakturaInfo.rate1.sum}" bind:value={updatedValues.rate1.sum} placeholder={contractToBeEdited.fakturaInfo.rate1.sum} /> -->
                                                                <Select label="Endre faktureringsår fra: {contractToBeEdited.fakturaInfo.rate1.faktureringsår}" bind:value={updatedValues.rate1.faktureringsår}>
                                                                    <option value={getCorrectYear(0)}>{getCorrectYear(0)}</option>
                                                                    <option value={getCorrectYear(1)}>{getCorrectYear(1)}</option>
                                                                    <option value={getCorrectYear(2)}>{getCorrectYear(2)}</option>
                                                                </Select>
                                                            {/if}
                                                            <Select label="Endre status fra: {contractToBeEdited.fakturaInfo.rate1.status}" bind:value={updatedValues.rate1.status}>
                                                                {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                                                                    <option value="Ikke Fakturert">Ikke Fakturert</option>
                                                                    <option value="Fakturert">Fakturert</option>
                                                                    <option value="Betalt">Betalt</option>
                                                                    <option value="Skal ikke betale">Skal ikke betale</option>
                                                                {:else}
                                                                    <option value="Skal ikke betale">Skal ikke betale</option>
                                                                {/if}
                                                            </Select>
                                                            <Select label="Grunn til redigering" bind:value={updatedValues.rate1.editReason}>
                                                                <option value="">Velg grunn</option>
                                                                <option value="Feil faktureringsår">Feil faktureringsår</option>
                                                                <option value="Feil status">Feil status</option>
                                                                <option value="Elev slutter">Elev slutter</option>
                                                                <option value="Utkjøp av PC">Utkjøp av PC</option>
                                                                <option value="Privat PC">Privat PC</option>
                                                            </Select>
                                                        {:else}
                                                            <p>Faktura 1 er allerede håndtert, kan ikke endre sum, status eller faktureringsår</p>
                                                        {/if}
                                                    </div>
                                                    <h4>Faktura 2</h4>
                                                    <div>
                                                        {#if contractToBeEdited.fakturaInfo.rate2.status.toLowerCase() === "ikke fakturert" || contractToBeEdited.fakturaInfo.rate2.status.toLowerCase() === "skal ikke betale" || contractToBeEdited.fakturaInfo.rate2.status.toLowerCase() === "fakturert"}
                                                            {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                                                                <!-- <Input type="text" label="Endre sum fra: {contractToBeEdited.fakturaInfo.rate2.sum}" bind:value={updatedValues.rate2.sum} placeholder={contractToBeEdited.fakturaInfo.rate2.sum} /> -->
                                                                <Select label="Endre faktureringsår fra: {contractToBeEdited.fakturaInfo.rate2.faktureringsår}" bind:value={updatedValues.rate2.faktureringsår}>
                                                                    <option value={getCorrectYear(0)}>{getCorrectYear(0)}</option>
                                                                    <option value={getCorrectYear(1)}>{getCorrectYear(1)}</option>
                                                                    <option value={getCorrectYear(2)}>{getCorrectYear(2)}</option>
                                                                </Select>
                                                            {/if}
                                                            <Select label="Endre status fra: {contractToBeEdited.fakturaInfo.rate2.status}" bind:value={updatedValues.rate2.status}>
                                                                {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                                                                    <option value="Ikke Fakturert">Ikke Fakturert</option>
                                                                    <option value="Fakturert">Fakturert</option>
                                                                    <option value="Betalt">Betalt</option>
                                                                    <option value="Skal ikke betale">Skal ikke betale</option>
                                                                {:else}
                                                                    <option value="Skal ikke betale">Skal ikke betale</option>
                                                                {/if}
                                                            </Select>
                                                            <Select label="Grunn til redigering" bind:value={updatedValues.rate2.editReason}>
                                                                <option value="">Velg grunn</option>
                                                                <option value="Feil faktureringsår">Feil faktureringsår</option>
                                                                <option value="Feil status">Feil status</option>
                                                                <option value="Elev slutter">Elev slutter</option>
                                                                <option value="Utkjøp av PC">Utkjøp av PC</option>
                                                                <option value="Privat PC">Privat PC</option>
                                                            </Select>
                                                        {:else}
                                                            <p>Faktura 2 er allerede håndtert, kan ikke endre sum, status eller faktureringsår</p>
                                                        {/if}   
                                                    </div>
                                                    <h4>Faktura 3</h4>
                                                    <div>
                                                        {#if contractToBeEdited.fakturaInfo.rate3.status.toLowerCase() === "ikke fakturert" || contractToBeEdited.fakturaInfo.rate3.status.toLowerCase() === "skal ikke betale" || contractToBeEdited.fakturaInfo.rate3.status.toLowerCase() === "fakturert"}
                                                            {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                                                                <!-- <Input type="text" label="Endre sum fra: {contractToBeEdited.fakturaInfo.rate3.sum}" bind:value={updatedValues.rate3.sum} placeholder={contractToBeEdited.fakturaInfo.rate3.sum} /> -->
                                                                <Select label="Endre faktureringsår fra: {contractToBeEdited.fakturaInfo.rate3.faktureringsår}" bind:value={updatedValues.rate3.faktureringsår}>
                                                                    <option value={getCorrectYear(0)}>{getCorrectYear(0)}</option>
                                                                    <option value={getCorrectYear(1)}>{getCorrectYear(1)}</option>
                                                                    <option value={getCorrectYear(2)}>{getCorrectYear(2)}</option>
                                                                </Select>
                                                            {/if}
                                                            <Select label="Endre status fra: {contractToBeEdited.fakturaInfo.rate3.status}" bind:value={updatedValues.rate3.status}>
                                                                {#if token.roles.some((r) => ['elevkontrakt.administrator-readwrite'].includes(r))}
                                                                    <option value="Ikke Fakturert">Ikke Fakturert</option>
                                                                    <option value="Fakturert">Fakturert</option>
                                                                    <option value="Betalt">Betalt</option>
                                                                    <option value="Skal ikke betale">Skal ikke betale</option>
                                                                {:else}
                                                                    <option value="Skal ikke betale">Skal ikke betale</option>
                                                                {/if}
                                                            </Select>
                                                            <Select label="Grunn til redigering" bind:value={updatedValues.rate3.editReason}>
                                                                <option value="">Velg grunn</option>
                                                                <option value="Feil faktureringsår">Feil faktureringsår</option>
                                                                <option value="Feil status">Feil status</option>
                                                                <option value="Elev slutter">Elev slutter</option>
                                                                <option value="Utkjøp av PC">Utkjøp av PC</option>
                                                                <option value="Privat PC">Privat PC</option>
                                                                <option value="Privat PC">Omvalg</option>
                                                            </Select>
                                                        {:else}
                                                            <p>Faktura 3 er allerede håndtert, kan ikke endre sum, status eller faktureringsår</p>
                                                        {/if}   
                                                    </div>
                                                {/if}
                                            {/if}
                                        {/if}
                                        <br>
                                        {#if saveErrorMessage.length > 0}
                                            <p style="color: red;"> <strong>{saveErrorMessage} ❗</strong></p>
                                        {/if}
                                    </div>
                                    <div slot="saveButton">
                                        {#if unLockPCFields === true && contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "false" || (unLockPCFields === true && contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false" && contractToBeEdited.pcInfo.boughtOut === "false")}
                                            {#if contractToBeEdited.isSigned === "true" && contractToBeEdited.pcInfo.released === "false"}
                                                <button on:click={() => handleModalButtonClicks('Lagre', 'utlever', token)}>Lagre</button>
                                            {:else if contractToBeEdited.pcInfo.released === "true" && contractToBeEdited.pcInfo.returned === "false"}
                                                <button on:click={() => handleModalButtonClicks('Lagre', 'innlever/utkjop', token)}>Lagre Innlevering</button>
                                            {/if}
                                        {:else if unLockUpdateFields === true}
                                            <button on:click={() => handleModalButtonClicks('Lagre', 'oppdater', token)}>Lagre</button>
                                        {:else}
                                            <button disabled on:click={() => handleModalButtonClicks('Lagre')}>Lagre</button>
                                        {/if}
                                        <button on:click={() => handleModalButtonClicks('Avbryt')}>Avbryt</button>
                                    </div>
                                </Modal>
                            {/if}
                        {/if}
                        {#if actionClicked === 'Slett'}
                            <Modal bind:showModal={showModal} disableClickOutSide={true} disableStandardButton={true}>
                                <div slot="header">
                                    <h2>Slett avtale</h2>
                                </div>
                                <div slot="mainContent">
                                    <p>Er du sikker på at du vil slette avtalen for: <strong>{contractToBeEdited.elevInfo.navn}</strong>?</p>
                                    <p>Dette kan ikke angres(joda :P)!</p>
                                    {#if saveErrorMessage.length > 0}
                                        <p style="color: red;"> <strong>{saveErrorMessage}❗</strong></p>
                                    {/if}
                                    {#if isProcessing === true}
                                        <IconSpinner width="50px" />
                                        <p>Lagrer endring...</p>
                                    {/if}
                                </div>
                                <div slot="saveButton">
                                    <button disabled={isProcessing} on:click={() => handleModalButtonClicks('Lagre', 'slett')}>Slett</button>
                                    <button disabled={isProcessing} on:click={() => handleModalButtonClicks('Avbryt')}>Avbryt</button>
                                </div>
                            </Modal>
                        {/if}
                    {/key}
                </div>
                <div>
                    <p>Antall leieavtaler: {countContracts().leieavtale || 0}</p>
                    <p>Antall låneavtaler: {countContracts().låneavtale || 0}</p>
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
        flex-direction: column;
        align-items: flex-start;
        margin: 0rem 0rem 1rem 0rem;
    }
    .checkbox-item {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
    }
    .delivery-button {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0rem 0rem 1rem 0rem;
    }
    .hidden-buttons {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        width: 100%;
        max-width: 50rem;
    }
</style>