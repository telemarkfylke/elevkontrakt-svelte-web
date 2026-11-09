<script>
    // Shown while the invoice job is paused. Set to false when the job is running again.
    import DsAlert from '$lib/components/ds/DsAlert.svelte'

    const BILLING_PAUSED = true
</script>

{#if BILLING_PAUSED}
    <DsAlert color="info" heading="Fakturaer sendes ikke ut for øyeblikket">
        <p class="ds-paragraph" data-size="sm">Utsendingen av fakturaer er midlertidig stoppet. Du kan fortsatt opprette fakturaer som vanlig, de blir sendt ut når utsendingen starter igjen.</p>
        <p class="ds-paragraph" data-size="sm">Når denne meldingen er borte, er alt tilbake til normalt.</p>
    </DsAlert>
{/if}
