<script>
    import IconSpinner from '$lib/components/IconSpinner.svelte';
    import Input from '$lib/components/Input.svelte';
	import Form from '../../lib/components/Form.svelte';
    import { checkStudent, getElevkontraktToken, postManualContract } from '../../lib/useApi.js';
	
	let data = {}
	let submittedData = null
    let studentSSN = ''
    let isLoadingStudentData = false
    let isLoading = false
    let result
    let showRawData = false

    const checkStudentSSN = async (ssn) => {
        result = undefined
        isLoadingStudentData = true
        const student = await checkStudent(ssn);
        data.studentData = student
        data.studentData.fnr = ssn
        isLoadingStudentData = false
    }

    const postToManualContract = async (data) => {
        isLoading = true
        result = await postManualContract(data);
        submittedData = null; // Reset submitted data after posting
        isLoading = false
    }

</script>

{#await getElevkontraktToken(true)}
<div class="loading">
    <IconSpinner width={"32px"} />
</div>
{:then token}
    {#if !token.roles.some((r) =>
        [
            'elevkontrakt.administrator-readwrite',
            'elevkontrakt.itservicedesk-readwrite',
            'elevkontrakt.skoleadministrator-write'
        ].includes(r)
    )}
        <div class="error">
            <h2>Du har ikke tilgang til å opprette en avtale</h2>
            <p>Vennligst ta kontakt med din administrator for å få tilgang.</p>
        </div>
    {:else}
        <main>
            <div>
                <h1>Opprett elevavtaler</h1>
                <p>Her kan du opprette en elevavtale for en elev som ikke har en digital avtale.</p>
                <p>Fyll inn elevens fødselsnummer/D-nummer og trykk på "Hent elev" for å hente informasjon om eleven.</p>
                <br>
                <p>Lenker til papirversjon av skjemaene:</p>
                <ul style="list-style-type: none; padding: 0;">
                    <li><a href="https://telemarkfylke.no/globalassets/tfk/dokumenter/opplaring-og-folkehelse/elev-pc/leieavtale/avtale-leie-elev-pc-og-utlansmidler---revidert-juni-26.pdf" target="_blank">Lenke til leieavtale for utskrift</a></li>
                    <li><a href="https://telemarkfylke.no/globalassets/tfk/dokumenter/opplaring-og-folkehelse/elev-pc/laneavtale/avtale-utlan-elev-pc-og-gratis-laremidler---revidert-juni-26.pdf" target="_blank">Lenke til låneavtale for utskrift</a></li>
                    <li><a href="https://telemarkfylke.no/no/meny/tjenester/opplaring-og-folkehelse/opplaring-i-skole/praktisk-informasjon/laneavtale-pc-og-lan-av-lareboker/Loan-PC-and-textbooks/" target="_blank">Leie- og utlånsavtale på andre språk</a></li>
                </ul>
                <br>
                <div class="getStudent">
                    <p>NB: Eleven må finnes i VIS</p>
                    <div class="searchField">
                        <Input disabled="{isLoadingStudentData}" type="text" bind:value={studentSSN} placeholder="Fødselsnummer/D-Nummer" />
                        <button disabled="{studentSSN.length !== 11 || isLoadingStudentData}" on:click={() => checkStudentSSN(studentSSN)}>Hent elev</button>
                    </div>
                </div>
                <div class="links">
                    
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
            {:else if (data?.studentData?.isError || data?.studentData?.isNonFixAbleError) && (data?.studentData?.error !== "No foreldre/ansvarlig that can be contacted digitally") && data?.studentData?.gotSchoolOrgNr === false}
                <div class="error">
                    <h2>Noe gikk galt, fant ikke elev eller annen viktig informasjon!</h2>
                    <p>Vennligst sjekk at fødselsnummeret er korrekt, at eleven er opprettet i <strong>VIS</strong> og at eleven har et gyldig skoleforhold.</p>
                </div>
                {#if token.roles.includes('elevkontrakt.administrator-readwrite')}
                    <div class="header-with-buttons">
                        <div class="header-title">Rådata (Debug)</div>
                        <div class="button-group">
                            <button class="toggle-button" on:click={() => showRawData = !showRawData}>
                                <span class="material-symbols-outlined">
                                    {showRawData ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>
                    {#if showRawData}
                        <div class="info-section">
                            <pre>{JSON.stringify(data, null, 2)}</pre>
                        </div>
                    {/if}
                {/if}
            {:else if data?.studentData}
                <Form data={data} onSubmit={(data) => submittedData = data} token={token} />
                {#if submittedData}
                    {#if isLoading}
                        <div class="loading">
                            <IconSpinner width={"32px"} />
                        </div>
                    {:else}
                        <div>
                            <h3>Er du sikker på at du vil opprette avtalen?</h3>
                            <button on:click={() => postToManualContract(submittedData)}>Opprett avtale</button>
                        </div>
                    {/if}
                {:else if result?.data?.result?.acknowledged === true && result !== undefined}
                    <div class="success">
                        <h2>Avtalen er opprettet og arkivert ✅</h2>
                        <p>Avtalen er arikvert med dette dokumentnummeret: <strong>{result.data.document.signedSkjemaInfo.archiveDocumentNumber}</strong></p>
                        <br>
                        <p>Ønsker du å opprette en ny avtale kan du skrive inn et nytt fødselsnummer og hente en ny elev.</p>
                    </div>
                {:else if result?.data?.isDuplicate === true && result !== undefined}
                    <div class="error">
                        <h2>Eleven har allerede en aktiv avtale av denne typen</h2>
                        <p>Avtalen ble ikke opprettet som ny, men lagret for gjennomgang. Ta kontakt med en administrator hvis dette ikke stemmer.</p>
                    </div>
                {:else if result !== undefined && result?.data?.result?.acknowledged !== true}
                    <div class="error">
                        <h2>Noe gikk galt under oppretting av avtalen!</h2>
                        <p>Vennligst prøv igjen senere.</p>
                    </div>
                {/if}
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

    .links {
        display: flex;
        flex-direction: column;
        gap: 1rem;
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

    .info-section {
        border-bottom: 1px solid var(--gress-10);
        padding: 2rem;
    }

    .info-section:last-child {
        border-bottom: none;
    }
</style>