<script>
    import { formatFnr } from "$lib/helpers/formatFnr";
    import IconSpinner from "./IconSpinner.svelte";
    import SearchStudentData from "./searchStudentData.svelte";

    export let userData = []
    export let studentDataFromSettings = []

    export let addExceptionFlag = false
    export let removeExceptionFlag = false
    export let editException = false

    export let exceptionsToAdd = []
    export let exceptionsToRemove = []

    let errorMessage = ''
    let isLoadingSearchData = false

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

    
</script>

<main>
    {#if removeExceptionFlag === true}
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
                                {#if editException}
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
                                {#if editException}
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
    {/if}

    {#if addExceptionFlag === true}
        {#if editException === true}
            <div class="info-section">
                <div class="info-grid">
                    <div class="info-item">
                        <SearchStudentData bind:data={userData} bind:errorMessage={errorMessage} bind:isLoadingSearchData={isLoadingSearchData} />
                    </div>
                </div>
            </div>
        {/if}
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
                                        {#if editException}
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
                                        {#if editException}
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
    {/if}
</main>

<style>
     h3 {
        padding: 1.5rem;
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
    }

    .header-title {
        font-size: 1.5rem;
        font-weight: 600;
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

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
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