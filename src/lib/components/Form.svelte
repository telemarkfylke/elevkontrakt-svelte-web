<script>
    import Form from './Form.svelte'
	import Input from './Input.svelte'
	import Select from './Select.svelte'

	export let data = {}
	export let onSubmit = () => {}
    export let needAnsvarlig = false
    export let isLoading = false

    let name = data.studentData.student.fulltnavn ?? ''
	let type = data.type ?? ''
    let attachment = data.attachment ?? null
    let schoolName = data.schoolName ?? ''
    let schoolOrgNumber = data.schoolOrgNumber ?? ''
    let fnr = data.studentData?.fnr ?? ''
    let foresatt = data.foresatt ?? ''
    let foresattValg = data.foresattValg ?? ''
    let foresattNavn = data.foresattNavn ?? ''
    let foresattFnr = data.foresattFnr ?? ''
	let errors = {}
	let touchedFields = {}
    let dataSubmitted = false
	
	$: result = {
		name:data?.studentData?.student?.fulltnavn, 
        type, 
        attachment, 
        schoolName: data.studentData?.schoolInfo?.navn, 
        schoolOrgNumber:data.studentData?.schoolInfo?.orgnr, 
        fnr, 
        foresatt, 
        foresattValg: result?.foresatt?.fulltnavn, 
        foresattNavn: result?.foresatt?.fulltnavn || foresattNavn, 
        foresattFnr: result?.foresatt?.foedselsEllerDNummer || foresattFnr
	}
	
	$: errors = validate(touchedFields, result)

	const validate = () => {
		const errors = {};
		if (touchedFields.name && data.studentData.student.fulltnavn === '') {
			errors.name = 'Navn er obligatorisk'
		}
		if (touchedFields.type && type === '') {
			errors.type = 'Avtale type er obligatorisk'
		}
        if (touchedFields.attachment && !attachment) {
            errors.attachment = 'Avtale er obligatorisk'
        }
        if (touchedFields.fnr && data.studentData?.fnr === '') {
            if(data.studentData?.fnr.length < 11) {
                errors.fnr = 'Fødselsnummer er for kort'
            } else {
                errors.fnr = 'Fødselsnummer er for langt'
            }
            errors.fnr = 'Fødselsnummer er obligatorisk'
        }
        if (touchedFields.schoolName && data.studentData?.schoolInfo?.navn === '') {
            errors.schoolName = 'Skolenavn er obligatorisk'
        }

        if (touchedFields.schoolOrgNumber && data.studentData?.schoolInfo?.orgnr === '') {
            if(data.studentData?.schoolInfo?.orgnr.length < 9) {
                errors.schoolOrgNumber = 'Skole organisasjonsnummer er for kort'
            } else {
                errors.schoolOrgNumber = 'Skole organisasjonsnummer er for langt'
            }
            errors.schoolOrgNumber = 'Skole organisasjonsnummer er obligatorisk'
        }

        if(touchedFields.foresattFnr && result?.foresattFnr === '' && data?.studentData?.isUnder18) {
            errors.foresattFnr = 'Fødselsnummer er obligatorisk'
        }
        if(touchedFields.foresattFnr && result?.foresattFnr.toString().length < 11 && data?.studentData?.isUnder18) {
            errors.foresattFnr = 'Fødselsnummer er for kort'
        }
        if(touchedFields.foresattFnr && result?.foresattFnr.toString().length > 11 && data?.studentData?.isUnder18) {
            errors.foresattFnr = 'Fødselsnummer er for langt'
        }
        if(touchedFields.foresattNavn && result?.foresattNavn === '') {
            errors.foresattNavn = 'Navn er obligatorisk'
        }

        if (touchedFields.foresatt && foresatt === '' && (data?.studentData?.ansvarligSomIkkeKanVarsles?.length !== 0 || data?.studentData?.ansvarlig?.length !== 0) && data?.studentData?.isUnder18) {
			errors.foresattValg = 'Å velge en foresatt er obligatorisk'
		}
		return errors;
	};
	
	const validateAndSubmit = () => {
		touchedFields = { 
            name: true, 
            type: true, 
            attachment: true,  
            schoolOrgNumber: true, 
            schoolName: true, 
            fnr: true, 
            foresattValg: data?.studentData?.isUnder18 === true ? true : false, 
            foresatt: data?.studentData?.isUnder18 === true ? true : false,
            foresattFnr: data?.studentData?.isUnder18 === true ? true : false,
            foresattNavn: data?.studentData?.isUnder18 === true ? true : false 
        }
		if (Object.keys(errors).length === 0) {
            // If there are no errors, and the fields are not empty, we can submit the data
            if(result.name === '' || 
                result.type === '' || 
                result.attachment === null || 
                result.schoolName === '' || 
                result.schoolOrgNumber === '' || 
                result.fnr === '' || 
                (result.foresattValg === '' && result.foresattNavn === '' && data?.studentData?.isUnder18)  || 
                (result.foresatt ===  '' && result.foresattFnr === '' && data?.studentData?.isUnder18)) {

                errors = {
                    name: 'Navn er obligatorisk',
                    type: 'Type avtale er obligatorisk',
                    attachment: 'Avtale er obligatorisk',
                    schoolName: 'Skolenavn er obligatorisk',
                    schoolOrgNumber: 'Skole organisasjonsnummer er obligatorisk',
                    fnr: 'Fødselsnummer er obligatorisk',
                    foresattValg: 'Å velge en foresatt er obligatorisk',
                    foresatt: 'Å velge en foresatt er obligatorisk',
                    foresattFnr: 'Fødselsnummer til foresatt er obligatorisk',
                    foresattNavn: 'Navn på foresatt er obligatorisk'
                }
            } else {
                dataSubmitted = true;
                result.foresattFnr = result.foresattFnr.toString()
			    onSubmit(result);
            }
            
		}
	};

    
</script>
{#if data.studentData && !dataSubmitted}
    <!-- <h2>Student Data</h2>
    <pre>{JSON.stringify(data.studentData, null, 2)}</pre> -->
    <div class="form">
        <fieldset class="fieldset">
            <Input
                type="text"
                label="Navn på elev"
                value={data.studentData.student.fulltnavn}
                disabled
                on:blur={() => touchedFields.name = true}
                error={errors.name}
            />
            <Input
                type="text"
                label="Fødselsnummer/D-nummer til elev" 
                value={data.studentData?.fnr}
                disabled
                on:blur={() => touchedFields.fnr = true}
                error={errors.fnr}
            />
            {#if data?.studentData?.isUnder18 === true || data?.needAnsvarlig === true}
                {#if data?.studentData?.isUnder18 === true}
                    <p>Eleven er under 18 år og må ha en ansvarlig</p>
                    <strong><h3>❗Viktig at den foresatte har signert avtalen som lastes opp❗</h3></strong>
                    {#if data?.studentData?.ansvarlig?.length > 0}
                        <Select 
                            label="Velg foresatt"
                            bind:value={foresatt}
                            on:blur={() => touchedFields.foresattValg = true}
                            error={errors.foresattValg}
                            >
                            {#each data?.studentData?.ansvarlig as foresatt}
                                <option value={foresatt}>{foresatt.fulltnavn}</option>
                            {/each}
                        </Select>
                    {:else if data?.studentData?.ansvarligSomIkkeKanVarsles?.length > 0 && data?.studentData?.ansvarlig?.length === 0}
                        <Select 
                            label="Velg foresatt"
                            bind:value={foresatt}
                            on:blur={() => touchedFields.foresattValg = true}
                            error={errors.foresattValg}
                            >
                            {#each data?.studentData?.ansvarligSomIkkeKanVarsles as foresatt}
                                <option value={foresatt}>{foresatt.fulltnavn}</option>
                            {/each}
                        </Select>
                    {:else if data?.studentData?.ansvarligSomIkkeKanVarsles?.length === 0 && data?.studentData?.ansvarlig?.length === 0}
                        <strong> ❗ Ingen foresatte funnet for denne eleven. Vennligst legg til en foresatt. ❗</strong>
                    {/if}             
                {/if}
                {#if data?.studentData?.ansvarligSomIkkeKanVarsles?.length === 0 && data?.studentData?.ansvarlig?.length === 0}
                    <Input
                        type="text"
                        label="Navn på foresatt"
                        disabled={false}
                        bind:value={foresattNavn}
                        foresattNavn={foresattNavn}
                        on:blur={() => touchedFields.foresattNavn = true}
                        error={errors.foresattNavn}
                    />
                    <Input
                        type="number"
                        label="Fødselsnummer/D-nummer til foresatt" 
                        disabled={false}
                        bind:value={foresattFnr}
                        foresattFnr={foresattFnr}
                        on:blur={() => touchedFields.foresattFnr = true}
                        error={errors.foresattFnr}
                    />
                {:else}
                    <Input
                        type="text"
                        label="Navn på foresatt"
                        disabled={data?.studentData?.isUnder18 === true && (data?.studentData?.ansvarligSomIkkeKanVarsles?.length !== 0 || data?.studentData?.ansvarlig?.length !== 0)}
                        value={result?.foresatt?.fulltnavn ?? ''}
                        on:blur={() => touchedFields.foresattNavn = true}
                        error={errors.foresattNavn}
                    />
                    <Input
                        type="text"
                        label="Fødselsnummer/D-nummer til foresatt" 
                        disabled={data?.studentData?.isUnder18 === true && (data?.studentData?.ansvarligSomIkkeKanVarsles?.length !== 0 || data?.studentData?.ansvarlig?.length !== 0)}
                        value={result?.foresatt?.foedselsEllerDNummer ?? ''}
                        on:blur={() => touchedFields.foresattFnr = true}
                        error={errors.foresattFnr}
                    />
                {/if}
            {/if}
            <Input
                type="text"
                label="Skolenavn" 
                disabled
                value={data.studentData?.schoolInfo?.navn}
                placeholder={data.studentData?.schoolInfo?.navn}
                on:blur={() => touchedFields.schoolName = true}
                error={errors.schoolName}
            />
            <Input
                type="text"
                label="Skole organisasjonsnummer" 
                value={data.studentData?.schoolInfo?.orgnr}
                disabled
                placeholder={data.studentData?.schoolInfo?.orgnr}
                on:blur={() => touchedFields.schoolOrgNumber = true}
                error={errors.schoolOrgNumber}
            />
            <Select
                label="Type avtale"
                bind:value={type}
                on:blur={() => touchedFields.type = true}
                error={errors.type}
            >
                <option value="Leieavtale">Leieavtale</option>
                <option value="Låneavtale">Låneavtale</option>
            </Select>
            <Input
                type="file"
                label="Signert avtale"
                bind:value={attachment}
                attachment={attachment}
                on:blur={() => touchedFields.attachment = true}
                error={errors.attachment}
            />
            <button on:click={validateAndSubmit}>Opprett avtale</button>
            <!-- <div>
                <pre>
                    {JSON.stringify(result, null, 2)}
                </pre>
            </div> -->
        </fieldset>
    </div>
{/if}




<style>
	.fieldset > * {
		display: block;
	}
	
	.fieldset > :global(:not(legend) + *) {
		margin-top: 16px;
	}
	
	.fieldset {
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 20px;
	}
</style>