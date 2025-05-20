<script>
    import { get } from "svelte/store";
    import IconSpinner from "./IconSpinner.svelte";
    import JsBarcode from "jsbarcode";

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

    $: isSignedOnlyChecked = false
    $: isUnSignedOnlyChecked = false
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

    const applyFilter = (signedOnly, unSignedOnly, schoolSelected, classSelected) => {
        // Reset data to original data if no filters are selected
        if(signedOnly === false || !schoolSelected === true || !classSelected === true || unSignedOnly === false) {
            isFilterApplied = false
            resetFilter()
        }
        // Filter data based on selected filters
        if(signedOnly) {
            isFilterApplied = true
            data = data.filter(item => item.isSigned === "true")
        }
        if(unSignedOnly) {
            isFilterApplied = true
            data = data.filter(item => item.isSigned === "false")
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
        isSignedOnlyChecked = false
        isUnSignedOnlyChecked = false
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

    const getStudentShortName = (upn) => {
        const studentShortName = upn.split('@')[0].split('.').pop()
        return studentShortName
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
                    <input type="checkbox" id="signed" name="signed" value="signed" bind:checked={isSignedOnlyChecked} disabled={false}>
                    <label for="signed">Kun signerte kontrakter</label>
                </div>
                <div class="checkBoxFilter">
                    <input type="checkbox" id="unSigned" name="unSigned" value="unSigned" bind:checked={isUnSignedOnlyChecked} disabled={false}>
                    <label for="unSigned">Kun usignerte kontrakter</label>
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
        {#if isSignedOnlyChecked || isUnSignedOnlyChecked || schoolSelected || classSelected}
            {applyFilter(isSignedOnlyChecked, isUnSignedOnlyChecked, schoolSelected, classSelected)}
        {:else if !isSignedOnlyChecked || !isUnSignedOnlyChecked || !schoolSelected || !classSelected}
            {applyFilter(isSignedOnlyChecked, isUnSignedOnlyChecked, schoolSelected, classSelected)}
        {/if}
        <div class="table">
            <div class="table-header">
            {#each columns as column}
               <div class="table-header-cell">
                    {column.label}
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
                                            <img alt="barcode" src={createBarCode(row.elevInfo.upn)} width="100%" height="80%" />
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
</style>