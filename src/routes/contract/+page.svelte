<script>
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import Input from '$lib/components/Input.svelte';
	import Form from '../../lib/components/Form.svelte';
    import { checkStudent, getElevkontraktToken } from '../../lib/useApi.js';
	
	let data = {};
	let submittedData;
    let studentSSN = ''
    let isLoadingStudentData = false
    let isLoading = false

    const checkStudentSSN = async (ssn) => {
        isLoadingStudentData = true
        const student = await checkStudent(ssn);
        data.studentData = student
        data.studentData.fnr = ssn
        isLoadingStudentData = false
    }

    const postManualContract = async (data) => {
        // TODO: Jobb for å opprette kontrakt
        // console.log('postManualContract', data)
    }

</script>

{#await getElevkontraktToken(true)}
<div class="loading">
    <IconSpinner width={"32px"} />
</div>
{:then token}
    {#if !token.roles.some((r) => ['elevkontrakt.administrator-readwrite', 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-write'].includes(r))}
        <div class="error">
            <h2>Du har ikke tilgang til å opprette kontrakt</h2>
            <p>Vennligst ta kontakt med din administrator for å få tilgang.</p>
        </div>
    {:else}
        <main>
            <div class="getStudent">
                <p>NB: Eleven må finnes i VIS</p>
                <div class="searchField">
                    <Input disabled="{isLoadingStudentData}" type="text" bind:value={studentSSN} placeholder="Fødselsnummer/D-Nummer" />
                    <button disabled="{studentSSN.length !== 11 || isLoadingStudentData}" on:click={() => checkStudentSSN(studentSSN)}>Hent elev</button>
                </div>
            </div>
            <div>
                <!-- {#if data?.studentData?.isUnder18 === false}
                    <p>Eleven er over 18 år og behøver ikke en ansvarlig, ønsker du å legge til en?</p>
                    <button on:click={() => data.needAnsvarlig = !data.needAnsvarlig}>{data.needAnsvarlig === true ? 'Fjern ansvarlig' : 'Legg til Ansvarlig'}</button>
                {/if} -->
            </div>
            <br>
            {#if isLoadingStudentData}
                <div class="loading">
                    <IconSpinner width={"32px"} />
                </div>
            {:else if data?.studentData?.isError || data?.studentData?.isNonFixAbleError}
                <div class="error">
                    <h2>Noe gikk galt, fant ikke elev eller annen viktig informasjon!</h2>
                    <p>Vennligst sjekk at fødselsnummeret er korrekt, at eleven er opprettet i <strong>VIS</strong> og at eleven har et gyldig skoleforhold.</p>
                    <p>Er eleven under 18 er det viktig at de foresatte kan kontaktes digitalt.</p>
                </div>
            {:else if data?.studentData}
                <Form data={data} onSubmit={(data) => submittedData = data} />
                {#if submittedData}
                    <div>
                        <h3>Er du sikker på at du vil opprette kontrakten?</h3>
                        <pre>
                            {JSON.stringify(submittedData, null, 2)}
                        </pre>
                        <button on:click={() => postManualContract(submittedData)}>Opprett kontrakt</button>
                    </div>
                {/if}
                <!-- <div>
                    <span>Submitted Data</span>
                    <pre>
                        {JSON.stringify(submittedData, null, 2)}
                    </pre>
                </div> -->
            {/if}
        </main>
    {/if}
{/await}


<style>
    .getStudent {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .searchField {
        display: flex;
        gap: 1rem;
        align-items: center;
    }
</style>