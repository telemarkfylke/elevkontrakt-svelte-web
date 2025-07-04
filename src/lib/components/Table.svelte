<script>
    import { get } from "svelte/store";
    import IconSpinner from "./IconSpinner.svelte";
    import JsBarcode from "jsbarcode";
    import { clickToCopy } from "$lib/helpers/clickToCopy";
    import { getStudentShortName } from "$lib/helpers/studentShortName";

    export let columns = []
    export let data = []
    export let loading = false
    export let error = false
    export let errorMessage = ''
    export let noDataMessage = 'Ingen data'
    export let actions = {
        enabled: false,
        actions: []
    }
    export let contractToBeEdited = null
    export let clickedAction = null
    export let buttonClicked = false
    export let highLightCells = true
    export let isFilterApplied = false
    export let isSearchActive = false

    $: isLaanOnlyChecked = false
    $: isLeieOnlyChecked = false
    $: schoolSelected = ''
    $: classSelected = ''

    const dataCopy = data

    const formatValue = (obj, value, overrideHighlightCells) => {
        let formattedValue = value
        if (value === "true") formattedValue = "Ja"
        if (value === "false") formattedValue = "Nei"
        if (value === null || value === undefined) formattedValue = "Ingen data"
        if (typeof value === 'object' && Object.keys(value).length === 0) formattedValue = "Ingen data"
        if (typeof value === 'object' && Object.keys(value).length > 0) formattedValue = JSON.stringify(value)
        if (typeof value === 'string' && value !== "true" && value !== "false") formattedValue = value.charAt(0).toUpperCase() + value.slice(1)
        // 2025-03-29T08:48:46.485Z -> 29.03.2025 Kl: 8:48
        if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
            const date = new Date(value)
            formattedValue = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} Kl: ${date.getHours() - 1}:${date.getMinutes()}`
        }
        if(highLightCells) {
            // Override highlight cells for specific columns. This is done to get the correct format for values that needs to be checked in if statements.
            // If this is not done, the values returned will be <div>...</div> and not Ja or Nei.
            if(overrideHighlightCells !== true) {
                if(formattedValue === "Ja" || formattedValue === 'Betalt') {
                    return `<div style="border: 1px solid var(--gress-50);;
                                        padding: 0.25rem;
                                        background-color: var(--gress-30);;
                                        font-weight: bold;
                                        border-radius: 0.25rem;">
                                        ${formattedValue}
                            </div>`
                } else if (formattedValue === "Nei" || formattedValue === "Ikke Fakturert") {
                    return `<div style="border: 1px solid var(--nype-50);;
                                        padding: 0.25rem;
                                        background-color: var(--nype-30);;
                                        font-weight: bold;
                                        border-radius: 0.25rem;">
                                        ${formattedValue}
                            </div>`
                } else if(formattedValue === "Fakturert") {
                    return `<div style="border: 1px solid var(--korn-50);;
                                        padding: 0.25rem;
                                        background-color: var(--korn-30);;
                                        font-weight: bold;
                                        border-radius: 0.25rem;">
                                        ${formattedValue}
                            </div>`
                }
            }
        }
        
        return formattedValue
    }

    const getNestedValue = (obj, key, overrideHighlightCells) => {
        return formatValue(obj, key.split('.').reduce((o, i) => (o ? o[i] : null), obj), overrideHighlightCells || false);
    }

    if(actions.enabled === true) {
        // Check if columns already has an actions column
        const hasActionsColumn = columns.some(column => column.key === 'actions')
        // If not, add the actions column
        if(!hasActionsColumn) {
            columns.push({
                label: 'Handlinger',
                key: 'actions',
                extra: []
            })
        }
    }

    const handleButtonClick = (action, itemClicked) => {
        clickedAction = action
        contractToBeEdited = itemClicked
        buttonClicked = true
    }

    const applyFilter = (laanOnly, leieOnly, schoolSelected, classSelected) => {
        // Reset data to original data if no filters are selected
        if(laanOnly === false || !schoolSelected === true || !classSelected === true || leieOnly === false) {
            isFilterApplied = false
            resetFilter()
        }
        // Filter data based on selected filters
        if(laanOnly) {
            isFilterApplied = true
            data = data.filter(item => item.unSignedskjemaInfo.kontraktType === "låneavtale")
        }
        if(leieOnly) {
            isFilterApplied = true
            data = data.filter(item => item.unSignedskjemaInfo.kontraktType === "leieavtale")
        }
        if(schoolSelected) {
            isFilterApplied = true
            data = data.filter(item => item.elevInfo.skole === schoolSelected)
        }
        if(classSelected) {
            isFilterApplied = true
            // Reset class filter if school is not selected
            if(!schoolSelected) {
                isFilterApplied = false
                classSelected = ''
            } else {
                data = data.filter(item => item.elevInfo.klasse === classSelected)
            }
        }
    }

    const resetFilter = () => {
        data = dataCopy
    }

    const resetFilterButton = () => {
        isLaanOnlyChecked = false
        isLeieOnlyChecked = false
        schoolSelected = ''
        classSelected = ''
    }

    const getUniqueValue = (value) => {
        const uniqueValue = []

        // Loop through the array and check if the value is already in the uniqueValue array
        for(const item of value) {
            if(!uniqueValue.includes(item)) {
                uniqueValue.push(item)
            }
        }
        return uniqueValue
        
    }
    
    const getSchools = (data) => {
        const uniqueSchools = getUniqueValue(data.map(item => item.elevInfo.skole))
        return uniqueSchools
    }

    const getClasses = () => {
        const uniqueClasses = getUniqueValue(data.map(item => item.elevInfo.klasse))
        return uniqueClasses
    }
    
    const createBarCode = (upn) => {
        const studentShortName = getStudentShortName(upn)
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, studentShortName, {format: "CODE39"});
        return canvas.toDataURL("image/png");
    }

</script>

<div class="table-container">
    {#if loading === true}
        <IconSpinner width="50px" />
    {:else if error}
        <p>{errorMessage}</p>
    {:else if data.length === 0 && columns.length === 0}
        <p><strong>{noDataMessage}</strong></p>
    {:else}
        <!-- Filters. You're only able to use filters when search filed is empty (not in use) -->
        {#if !isSearchActive}
            <div class="filters">
                <div class="checkBoxFilter">
                    <input type="checkbox" id="signed" name="signed" value="signed" bind:checked={isLaanOnlyChecked} disabled={false}>
                    <label for="signed">Kun låneavtaler</label>
                </div>
                <div class="checkBoxFilter">
                    <input type="checkbox" id="unSigned" name="unSigned" value="unSigned" bind:checked={isLeieOnlyChecked} disabled={false}>
                    <label for="unSigned">Kun leieavtaler</label>
                </div>
                <div class="schoolFilter">
                    <label for="school">Velg Skole: </label>
                    <select bind:value={schoolSelected} on:change={() => { schoolSelected = schoolSelected }}>
                        <option value="">Alle skoler</option>
                        {#each getSchools(data) as school}
                            <option value={school}>{school}</option>
                        {/each}
                    </select>
                </div>
                <!-- Show disabled if school is not selected -->
                <div class="classFilter">
                    <label for="class">Velg Klasse: </label>
                    <select bind:value={classSelected} on:change={() => { classSelected = classSelected }} disabled={!schoolSelected ? true : false}>
                        <option value="">Alle klasser</option>
                        {#each getClasses(data) as classes}
                            <option value={classes}>{classes}</option>
                        {/each}
                    </select>
                </div>
                <button class="buttonFilter" on:click={() => { resetFilterButton() }}>
                    <span class="material-symbols-outlined">
                        refresh
                    </span> 
                    <div class="resetFilterText">
                        Nullstill
                    </div>
                </button>
            </div>
        {:else if isSearchActive}
            <div class="filters">
                <p>Du kan ikke bruke filter når søkefeltet er aktivt</p>
            </div>
        {/if}
        {#if isLaanOnlyChecked || isLeieOnlyChecked || schoolSelected || classSelected}
            {applyFilter(isLaanOnlyChecked, isLeieOnlyChecked, schoolSelected, classSelected)}
        {:else if !isLaanOnlyChecked || !isLeieOnlyChecked || !schoolSelected || !classSelected}
            {applyFilter(isLaanOnlyChecked, isLeieOnlyChecked, schoolSelected, classSelected)}
        {/if}
        <div class="table">
            <div class="table-header">
            {#each columns as column}
               <div class="table-header-cell">
                {#if column.label === 'QrKode'}
                    {column.label}
                    <div class="tooltip">
                        <span class="material-symbols-outlined">help</span>
                        <span class="tooltiptext">Klikk på strekkoden for å kopiere verdien</span>
                    </div>
                {:else}
                    {column.label} 
                {/if}
               </div> 
            {/each}
            </div>
            {#if data.length === 0}
                <div class="no-data-message">
                    <p><strong>{noDataMessage}</strong></p>
                </div>
            {:else}
                {#each data as row}
                    <div class="table-row">
                        {#each columns as column, colIndex}
                            <div class="table-cell">
                                <div class="cell-content">
                                    <div class="cell-text-value">
                                        {#if column.label === 'QrKode'}
                                            <div class="qr-code">
                                                <img use:clickToCopy={'img'} alt={`barcode ${row.elevInfo.upn}`} src={createBarCode(row.elevInfo.upn)} width="100%" height="80%" />
                                            </div>
                                        {/if}
                                        {#if column.key !== 'actions' && column.label !== 'QrKode'}
                                            {@html getNestedValue(row, column.key)}
                                        {/if}
                                    </div>
                                    {#if column.extra?.length > 0 && getNestedValue(row, column.key, true) !== "Nei" && getNestedValue(row, column.key, true) !== "Ingen data" && getNestedValue(row, column.key, true) !== "Ukjent"}
                                        <button class="cell-expand" on:click="{() => row.expandedIndex = row.expandedIndex === colIndex ? null : colIndex}">
                                            {#if (row.expandedIndex === colIndex)} 
                                                <span class="material-symbols-outlined">keyboard_arrow_up</span>
                                            {:else} 
                                                <span class="material-symbols-outlined">keyboard_arrow_down</span>
                                            {/if}
                                        </button>
                                    {/if}
                                </div>
                                {#if row.expandedIndex === colIndex}
                                    <div class="expanded-content">
                                        {#each column.extra as extra}
                                            <div class="expanded-content-value">
                                                <strong>{extra.label}:</strong>
                                                {getNestedValue(row, extra.key)}
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                                <!-- Show the actions button only in the "Handlinger column" -->
                                {#if actions.enabled === true && colIndex === columns.length - 1}
                                    <div class="cell-content">
                                        {#each actions.actions as action}
                                            <div class="action-button">
                                                <button on:click={() => handleButtonClick(action, row)}>{action}</button>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style>
    .table-container {
        display: flex;
        justify-content: flex-start;
        align-items: flex-start;
        position: sticky;
        flex-direction: column;
        width: 80vw;
        height: 70vh;
    }
    .table {
        display: flex;
        overflow: scroll;
        border-collapse: collapse;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: center;
        border: 1px solid #ccc;
        max-height: 70vh;
        width: inherit
    }
    .table-header {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: space-around;
        position: sticky;
        top: 0;
        z-index: 1;
        width: 100%;
    }
    .table-header-cell {
        display: table-cell;
        padding: 1rem 1.5rem;
        min-width: 150px;
        background-color: var(--gress-30);
        border-bottom: 1.5px solid #ccc;
        font-weight: bold;
        width: 100%;
    }
    .cell-content {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        position: relative;
    }
    .table-row {
        display: flex; 
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: space-around;   
        width: 100%;
    }
    .table-cell {
        display: table-cell;
        min-width: 150px;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #ccc;
        width: 100%;
    }
    .expanded-content {
        display: flex;
        flex-direction: column;
        margin: 1rem 0rem;
        margin-top: 2.5rem; 
        width: max-content;
        height: max-content;
        border: 1px solid #ddd;
        background-color: #f9f9f9;
    }
    .expanded-content strong {
        font-size: 1rem; 
        font-weight: 600;
        margin-right: 0.5rem; 
    }
    .expanded-content-value {
        display: flex;
        flex-direction: row;
        margin: 0.5rem;
        justify-content: space-between;
    }
    .cell-expand {
        all: unset;
        cursor: pointer;
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        position: absolute;
        right: 0;
    }
    .cell-expand:focus {
        outline: revert;
    }
    .cell-text-value {
        display: flex;
        flex-direction: row;
        padding-right: 1.5rem;
    }
    .no-data-message {
        padding: 1rem;
    }
    .action-button {
        display: flex;
        flex-direction: row;
        padding: 0.1rem;
    }

    .yes{
        border: 1px solid var(--gress-30);
        padding: 0.5rem;
        background-color: #d4edda;
        color: #155724;
        font-weight: bold;
        border-radius: 0.25rem;
    }

    .filters {
        display: flex;
        flex-direction: row;
        margin-bottom: 1rem;
        align-items: center;
        justify-content: space-evenly;
        width: 100%;
    }

    .buttonFilter {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
    } 

    .qr-code {
        position: relative;
    }
    .qr-code:hover {
        cursor: pointer;
        z-index: 1000;
        position: static;
        transition: transform 0.3s ease;
        transform: scale(3);
        box-shadow: 0 0 0 100vmax rgba(0,0,0,0.8);
        backdrop-filter: blur(100px);
    }
    /* .qr-code:hover::after {
        content: 'Kopiert ✅';
        display: block;
        position: absolute;
        top: 110%;
        left: 50%;
        transform: translateX(-50%);
        background: #222;
        color: #fff;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 1rem;
        z-index: 2000;
        white-space: nowrap;
        pointer-events: none;
    } */
    .qr-code:active {
        cursor: pointer;
        z-index: 1000;
        position: static;
        transition: transform 0.1s ease;
        transform: scale(3.2);
        box-shadow: 0 0 0 100vmax rgba(0,0,0,0.85);
        backdrop-filter: blur(100px);
        outline: 2px solid var(--gress-50);
    }

    .tooltip {
        cursor: pointer;
        position: relative;
        display: inline-block;
        border-bottom: 1px dotted black;
        }

    .tooltip .tooltiptext {
        visibility: hidden;
        width: 120px;
        background-color: black;
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 5px 0;
        position: absolute;
        z-index: 1;
        top: 150%;
        left: 50%;
        margin-left: -60px;
    }

    .tooltip .tooltiptext::after {
        content: " ";
        position: absolute;
        bottom: 100%;  /* At the top of the tooltip */
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent black transparent;
    }
    .tooltip:hover .tooltiptext {
        visibility: visible;
    }
</style>