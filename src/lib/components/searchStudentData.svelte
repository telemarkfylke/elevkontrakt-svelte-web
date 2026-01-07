<script>
    import { searchContracts } from "$lib/useApi";
    import Input from "./Input.svelte";

    export let data = null;
    export let errorMessage = ''

    let personSearchValue = ''
   
    export let isLoadingSearchData = false

    const getdata = async (searchValue) => {
        errorMessage = ''
        isLoadingSearchData = true;
        try {
            const userData = await searchContracts(searchValue, 'regular');
            if (Array.isArray(userData) && userData.length > 0) {
                data = userData
            } else if (userData.error && userData.error.length > 0) {
                data = null;
                errorMessage = userData.error
            }
            isLoadingSearchData = false;

        } catch (error) {
            errorMessage = 'Noe gikk veldig galt' + JSON.stringify(error)
            isLoadingSearchData = false;
        }
    }
</script>

<main>
    <div class="searchField">
        <Input disabled="{isLoadingSearchData}" type="text" bind:value={personSearchValue} placeholder="Eleven sitt navn" keypressEvent={(e) => e.key === 'Enter' && getdata(personSearchValue)}/>
        <button disabled="{personSearchValue.length === 0 || isLoadingSearchData}" on:click={() => getdata(personSearchValue)}>
            {#if isLoadingSearchData}
                <span class="spinner"></span>
                Henter elev...
            {:else}
                Hent elev
            {/if}
        </button>
    </div>
</main>

<style>
    .searchField {
        display: flex;
        gap: 1rem;
        margin: 2rem 0;
        align-items: center;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

</style>