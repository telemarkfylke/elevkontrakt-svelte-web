<script>
    import { get } from "svelte/store";
    import IconSpinner from "./IconSpinner.svelte";
    import JsBarcode from "jsbarcode";
    import { clickToCopy } from "$lib/helpers/clickToCopy";
    import { getStudentShortName } from "$lib/helpers/studentShortName";
    import { schools, classesForEachSchool } from "$lib/store";

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
    export let deliveryModeActive = false
    export let itemsPerPage = 30

    let currentPage = 1
    let totalPages = 1

    let sortColumn = null
    let sortDirection = 'asc'
    let sortedData = []
    let paginatedData = []

    $: isLaanOnlyChecked = false
    $: isLeieOnlyChecked = false
    $: schoolSelected = ''
    $: classSelected = ''

    const dataCopy = data

    const formatValue = (obj, value, overrideHighlightCells) => {
        let formattedValue = value
        if (value === "true") formattedValue = "Ja"
        if (value === "false") formattedValue = "Nei"
        if (value === null || value === undefined || value.toLowerCase() === "ukjent") formattedValue = "Ingen data"
        if (value === "") formattedValue = "Ingen data"
        if (value === null) formattedValue = "Ingen data"
        if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) formattedValue = "Ingen data"
        if (value !== null && typeof value === 'object' && Object.keys(value).length > 0) formattedValue = JSON.stringify(value)
        if (value !== null && typeof value === 'string' && value !== "true" && value !== "false") formattedValue = value.charAt(0).toUpperCase() + value.slice(1)
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
                } else if (formattedValue === "Utlån faktureres ikke") {
                    return `<div style="border: 1px solid var(--himmel-50);;
                                        padding: 0.25rem;
                                        background-color: var(--himmel-30);;
                                        font-weight: bold;
                                        border-radius: 0.25rem;">
                                        ${formattedValue}
                            </div>`
                } else if (formattedValue === "Overført inkasso") {
                    return `<div style="border: 1px solid var(--nype);;
                                        padding: 0.25rem;
                                        background-color: var(--nype);;
                                        font-weight: bold;
                                        border-radius: 0.25rem;">
                                        ${formattedValue}
                            </div>`
                } else if (formattedValue === "Skal ikke betale") {
                    return `<div style="border: 1px solid var(--korn-50);;
                                        padding: 0.25rem;
                                        background-color: var(--korn-30);;
                                        font-weight: bold;
                                        border-radius: 0.25rem;">
                                        ${formattedValue}
                            </div>`
                } else if (formattedValue === "Kreditert") {
                    return `<div style="border: 1px solid var(--plomme-50);;
                                        padding: 0.25rem;
                                        background-color: var(--plomme-30);;
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

    // Sort data
    $: {
        if (sortColumn && data.length > 0) {
            sortedData = [...data].sort((a, b) => {
                const aValue = getNestedValue(a, sortColumn, true)
                const bValue = getNestedValue(b, sortColumn, true)
                
                let comparison = 0
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue)
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue
                } else {
                    comparison = String(aValue).localeCompare(String(bValue))
                }
                
                return sortDirection === 'desc' ? -comparison : comparison
            })
        } else {
            sortedData = data
        }
    }

    // Calculate pagination
    $: {
        totalPages = Math.ceil(sortedData.length / itemsPerPage)
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        paginatedData = sortedData.slice(startIndex, endIndex)
    }
    
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            currentPage = page
        }
    }
    
    const previousPage = () => {
        if (currentPage > 1) {
            currentPage--
        }
    }
    
    const nextPage = () => {
        if (currentPage < totalPages) {
            currentPage++
        }
    }
    
    // Reset to first page when data changes
    $: if (data) {
        currentPage = 1
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
            data = data.filter(item => item.unSignedskjemaInfo.kontraktType.toLowerCase() === "låneavtale")
        }
        if(leieOnly) {
            isFilterApplied = true
            data = data.filter(item => item.unSignedskjemaInfo.kontraktType.toLowerCase() === "leieavtale")
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

    const getUniqueValue = (value, uniqueClassesForSchool) => {
        for(const item of value) {
            const school = get(schools)
            if(uniqueClassesForSchool === true) {
                const classesStore = get(classesForEachSchool)
                if(school.includes(item?.skole)) {
                    if(!classesStore[item.skole]) {
                        classesStore[item.skole] = []
                    }
                    classesStore[item.skole].push(item.klasse)
                }
            } else {
                if(!school.includes(item)) {
                    school.push(item)
                }
            }
        }

        // Sort the schools
        const schoolStore = get(schools)
        schoolStore.sort()
        // Sort the classes for each school
        const classesStore = get(classesForEachSchool)
        for(const school in classesStore) {
            classesStore[school] = [...new Set(classesStore[school])].sort()
        }
    }
    
    const getSchools = () => {
        const uniqueClasses = getUniqueValue(data.map(item => item.elevInfo), true)
        const uniqueSchools = getUniqueValue(data.map(item => item.elevInfo.skole), false)
    }

    const getClasses = () => {
        const uniqueClasses = getUniqueValue(data.map(item => item.elevInfo.klasse), true)
    }
    
    const createBarCode = (upn) => {
        const studentShortName = getStudentShortName(upn)
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, studentShortName, {format: "CODE39"});
        return canvas.toDataURL("image/png");
    }

    const isNewStudent = (row) => {
        // Get the todays year
        const today = new Date();
        const currentYear = today.getFullYear().toString().slice(-2); // 2025 === 25
        // Check if the student is new by checking the elevInfo object
        if(row.signedSkjemaInfo.archiveDocumentNumber.split('/')[0] === currentYear) {
            return true
        } else {
            return false
        }
    }

    const isStudentNotFoundInFINT = (row) => {
        if(row.notFoundInFINT?.message === "Student not found in FINT") {
            return true
        } else {
            return false
        }
    }

    const sortData = (columnKey) => {
        if (sortColumn === columnKey) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
        } else {
            sortColumn = columnKey
            sortDirection = 'asc'
        }
        currentPage = 1 // Reset to first page when sorting
    }

</script>

<main>
    {#if loading === true}
        <IconSpinner width="50px" />
    {:else if error}
        <p>{errorMessage}</p>
    {:else if data.length === 0 && columns.length === 0}
        <p><strong>{noDataMessage}</strong></p>
    {:else}
        <div class="table-container">
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
                            {#await getSchools()}
                                <option value="Henter skoler...">"Henter skoler..."</option>
                            {:then}
                                {#each $schools as school}
                                    <option value={school}>{school}</option>
                                {/each}
                            {:catch error}
                                <option value="">Feil ved henting av skoler</option>
                            {/await}
                        </select>
                    </div>
                    <!-- Show disabled if school is not selected -->
                    <div class="classFilter">
                        <label for="class">Velg Klasse: </label>
                        <select bind:value={classSelected} on:change={() => { classSelected = classSelected }} disabled={!schoolSelected ? true : false}>
                            <option value="">Alle klasser</option>
                            {#each $classesForEachSchool[schoolSelected] as classes}
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
            <!-- Table -->
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
                                {#if column.label !== 'QrKode' && column.label !== 'Status signering' && column.label !== 'Handlinger'}
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->                               
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div class="header-text-sortable" on:click={() => {sortData(column.key)}}>
                                        {column.label}
                                        {#if sortColumn === column.key}
                                            <span class="sort-indicator">
                                                {sortDirection === 'asc' ? '⬆' : '⬇'}
                                            </span>
                                        {/if}
                                    </div>
                                {:else}
                                    <div class="header-text-non-sortable">
                                        {column.label}
                                    </div>
                                {/if}
                            {/if}
                        </div> 
                    {/each}
                </div>
                {#if data.length === 0}
                    <div class="no-data-message">
                        <p><strong>{noDataMessage}</strong></p>
                    </div>
                {:else}
                    {#each paginatedData as row}
                        <div class="table-row" style="background-color: {deliveryModeActive ? (isNewStudent(row) ? 'var(--gress-20)' : 'var(--nype-10)') : (isStudentNotFoundInFINT(row) ? 'var(--korn-30)' : 'white')};">
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
                                        {#if column.extra?.length > 0 && getNestedValue(row, column.key, true) !== "Nei" && getNestedValue(row, column.key, true) !== "Ingen data" && getNestedValue(row, column.key, true) !== "Ukjent" && getNestedValue(row, column.key, true) !== "Utlån faktureres ikke"} 
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
                                            <!-- If column.extra.length >= 3 split into two columns -->
                                            {#if column.extra.length >= 3}
                                                <div class="expanded-content-columns">
                                                    <div class="expanded-content-column">
                                                        {#each column.extra.slice(0, Math.ceil(column.extra.length / 2)) as extra}
                                                            <div class="expanded-content-value">
                                                                <strong>{extra.label}:</strong>
                                                                {getNestedValue(row, extra.key)}
                                                            </div>
                                                        {/each}
                                                    </div>
                                                    <div class="expanded-content-column">
                                                        {#each column.extra.slice(Math.ceil(column.extra.length / 2)) as extra}
                                                            <div class="expanded-content-value">
                                                                <strong>{extra.label}:</strong>
                                                                {getNestedValue(row, extra.key)}
                                                            </div>
                                                        {/each}
                                                    </div>
                                                </div>
                                            {:else}
                                                {#each column.extra as extra}
                                                    <div class="expanded-content-value">
                                                        <strong>{extra.label}:</strong>
                                                        {getNestedValue(row, extra.key)}
                                                    </div>
                                                {/each}
                                            {/if}
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
        </div>
        <!-- Pagination info -->
        <div class="pagination-info">
            <span>Viser {((currentPage - 1) * itemsPerPage) + 1} til {Math.min(currentPage * itemsPerPage, data.length)} av {data.length} rader</span>
        </div>
        <!-- Pagination controls -->
        <div class="pagination-controls">
            <button 
                class="pagination-btn" 
                on:click={previousPage} 
                disabled={currentPage === 1}
            >
                Forrige
            </button>
            
            <div class="pagination-numbers">
                {#each Array(totalPages) as _, i}
                    {@const pageNum = i + 1}
                    {#if pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)}
                        <button 
                            class="pagination-btn {pageNum === currentPage ? 'active' : ''}" 
                            on:click={() => goToPage(pageNum)}
                        >
                            {pageNum}
                        </button>
                    {:else if pageNum === currentPage - 3 || pageNum === currentPage + 3}
                        <span class="pagination-ellipsis">...</span>
                    {/if}
                {/each}
            </div>
            
            <button 
                class="pagination-btn" 
                on:click={nextPage} 
                disabled={currentPage === totalPages}
            >
                Neste
            </button>
        </div>
    {/if}
</main>

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
        position: sticky;
        top: 0;
        z-index: 1;
        width: 100%;
        align-items: stretch;
    }
    .table-header-cell {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        min-width: 150px;
        background-color: var(--gress-30);
        border-bottom: 1.5px solid #ccc;
        font-weight: bold;
        flex: 1;
        box-sizing: border-box;
    }
    .table-header-cell:last-child {
        display: flex;
        align-items: center;
        padding: 1rem 3rem 1rem 3rem;
        min-width: 250px;
        background-color: var(--gress-30);
        border-bottom: 1.5px solid #ccc;
        font-weight: bold;
        flex: 1;
        box-sizing: border-box;
    }
    .cell-content {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        position: relative;
        width: 100%;
    }
    .table-row {
        display: flex; 
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
        align-items: stretch;
    }
    .table-cell {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-width: 150px;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #ccc;
        flex: 1;
        position: relative;
        box-sizing: border-box;
    }

    .table-cell:last-child {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-width: 250px;
        padding: 1rem 3rem 1rem 1.5rem;
        background-color: white;
        border-bottom: 1px solid #ccc;
        flex: 1;
        position: relative;
        box-sizing: border-box;
    }
    .expanded-content {
        display: flex;
        flex-direction: column;
        padding: 1rem 1rem;
        margin-top: 1rem;
        background-color: white;
        border: 1px solid var(--gress-50);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        position: relative;
        z-index: 1;
        max-width: 30vw;
        min-width: 25vw;
        animation: slideDown 0.2s ease-out;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .expanded-content strong {
        font-size: 0.875rem; 
        font-weight: 600;
        color: var(--gress-70);
        margin-bottom: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .expanded-content-column {
        flex: 1;
        padding: 0.5rem 0.5rem 0rem 0rem;
    }
    
    .expanded-content-columns {
        display: flex;
        flex-direction: row;
    }
    .expanded-content-value {
        display: flex;
        flex-direction: column;
        margin-bottom: 1rem;
        padding: 0.75rem;
        background-color: var(--gress-5, #f8fffe);
        border-radius: 6px;
        border-left: 3px solid var(--gress-30);
        transition: all 0.2s ease;
    }
    
    .expanded-content-value:hover {
        background-color: var(--gress-10, #f0fffc);
        transform: translateX(2px);
    }
    
    .expanded-content-value:last-child {
        margin-bottom: 0;
    }
    
    .expanded-content-value > div {
        font-size: 0.95rem;
        color: var(--vann-70, #333);
        line-height: 1.4;
        margin-top: 0.25rem;
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
    .pagination-info {
        display: flex;
        justify-content: center;
                align-items: center;
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: var(--vann-50);
    }
    
    .pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: var(--vann-50);
    }

    .pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 0.5rem;
        gap: 0.5rem;
    }
    
    .pagination-numbers {
        display: flex;
        gap: 0.25rem;
        align-items: center;
    }
    
    .pagination-btn {
        padding: 0.5rem 0.75rem;
        border: 1px solid #ccc;
        background-color: white;
        cursor: pointer;
        border-radius: 0.25rem;
        font-size: 0.9rem;
        transition: background-color 0.2s;
    }
    
    .pagination-btn:hover:not(:disabled) {
        background-color: var(--gress-10);
    }
    
    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .pagination-btn.active {
        background-color: var(--gress-30);
        border-color: var(--gress-50);
        font-weight: bold;
    }
    
    .pagination-ellipsis {
        padding: 0.5rem 0.25rem;
        color: var(--vann-50);
    }

    .header-text-sortable {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
    }
    .header-text-sortable:hover {
        cursor: pointer;
        text-decoration: underline;
    }
    .header-text-non-sortable {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
    }
    .sort-indicator {
        margin-left: 0.5rem;
        font-weight: bold;
    }

</style>