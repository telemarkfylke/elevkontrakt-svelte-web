<script>
    import AdminOnly from '$lib/components/AdminOnly.svelte'
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
</script>

    <AdminOnly>
        <main>
            <h1 class="ds-heading" data-size="lg">Veiledning for fakturering fra fil</h1>
            <p class="ds-paragraph">
                Ved å fakturere fra fil kan du fakturere mange elever samtidig. Du laster opp en fil med
                fødselsnummer, og systemet finner avtalene som skal faktureres.
            </p>
            <p class="ds-paragraph">
                Du finner funksjonen under <a class="ds-link" href="/fakturer-fra-fil">Fakturer fra fil</a>.
            </p>

            <h2 class="ds-heading" data-size="sm">1. Forbered fila</h2>
            <p class="ds-paragraph">
                Fila må være i CSV-format og inneholde én kolonne med elevens fødselsnummer.
                Systemet kjenner automatisk igjen disse kolonnenavnene:
            </p>
            <ul class="token-list">
                <li><code>fnr</code></li>
                <li><code>fødselsnummer</code></li>
                <li><code>fodselsnummer</code></li>
                <li><code>personnr</code></li>
                <li><code>personnummer</code></li>
                <li><code>ssn</code></li>
                <li><code>elevFnr</code></li>
            </ul>
            <p class="ds-paragraph">
                Hvis kolonnen har et annet navn, skriver du navnet i feltet <strong>Kolonnenavn for
                fødselsnummer</strong>.
            </p>
            <p class="ds-paragraph">
                Andre kolonner i fila blir ignorert. Du kan derfor laste opp en fil direkte fra et regneark.
            </p>

            <DsAlert color="warning" heading="Excel kan ødelegge fødselsnumre">
                <p class="ds-paragraph">
                    Excel kan gjøre fødselsnummer om til et tall, for eksempel <code>1,01011E+10</code>.
                    Da forsvinner noen av sifrene, og systemet finner ikke eleven.
                </p>
                <p class="ds-paragraph">Du får da denne meldingen:</p>
                <p class="ds-paragraph">
                    <em>... rader er skrevet på formen «1,01011E+10» – formater kolonnen som Tekst i Excel
                    og lagre CSV-fila på nytt.</em>
                </p>
                <p class="ds-paragraph">Slik retter du feilen:</p>
                <ol class="ds-list">
                    <li>Merk kolonnen med fødselsnummer i Excel.</li>
                    <li>Velg <strong>Formater celler</strong> og deretter <strong>Tekst</strong>.</li>
                    <li>Lim inn fødselsnumrene på nytt.</li>
                    <li>Lagre fila som CSV på nytt.</li>
                </ol>
            </DsAlert>

            <h2 class="ds-heading" data-size="sm">2. Velg type fakturering</h2>
            <p class="ds-paragraph">Velg typen som passer for avtalen.</p>

            <p class="ds-heading" data-size="2xs">Utkjøp</p>
            <p class="ds-paragraph">
                Eleven kjøper PC-en. Systemet fakturerer alle ubetalte terminer samtidig, og avtalen blir
                merket som utkjøpt. Eleven skal ikke levere PC-en tilbake.
            </p>

            <p class="ds-heading" data-size="2xs">Engangsfaktura</p>
            <p class="ds-paragraph">
                Systemet fakturerer bare den første ubetalte terminen. Avtalen fortsetter som før, og eleven
                skal fortsatt levere PC-en tilbake.
            </p>
            <p class="ds-paragraph">
                Bruk engangsfaktura når du bare skal kreve inn én termin som ikke er betalt.
            </p>

            <h2 class="ds-heading" data-size="sm">3. Kjør dry-run først</h2>
            <p class="ds-paragraph">Kjør alltid en dry-run før du fakturerer.</p>
            <p class="ds-paragraph">
                En dry-run gjør de samme oppslagene og beregningene som en vanlig kjøring, men den oppretter
                ikke fakturaer og endrer ikke avtaler.
            </p>
            <p class="ds-paragraph">
                Se særlig på tallet for <strong>Ikke funnet</strong>. Hvis tallet er høyt, skyldes det ofte at:
            </p>
            <ul class="ds-list">
                <li>systemet leser feil kolonne</li>
                <li>Excel har endret fødselsnumrene</li>
            </ul>
            <p class="ds-paragraph">Rett opp fila og kjør en ny dry-run før du fakturerer.</p>

            <h2 class="ds-heading" data-size="sm">4. Les rapporten</h2>
            <p class="ds-paragraph">Hver elev havner i én kategori:</p>
            <ul class="ds-list">
                <li><strong>Fakturert:</strong> Fakturaen er opprettet og sendes til Xledger i den nattlige jobben.</li>
                <li><strong>Ikke funnet:</strong> Systemet fant ingen avtale på fødselsnummeret. Kontroller nummeret.</li>
                <li><strong>Flere treff:</strong> Eleven har mer enn én avtale. Systemet velger ikke avtale automatisk. Fakturer eleven manuelt.</li>
                <li><strong>Hoppet over:</strong> Se årsaken i rapporten.</li>
                <li><strong>Feil:</strong> Noe gikk galt for denne eleven. Resten av kjøringen fortsetter.</li>
            </ul>

            <p class="ds-heading" data-size="2xs">Årsaker til at en elev blir hoppet over</p>
            <table class="ds-table" data-size="sm">
                <thead>
                    <tr>
                        <th scope="col">Årsak</th>
                        <th scope="col">Hva det betyr</th>
                        <th scope="col">Hva du gjør</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>no-unpaid-rates</code></td>
                        <td>Det er ingenting å fakturere.</td>
                        <td>Du trenger ikke gjøre noe. Dette er normalt hvis du kjører samme fil på nytt.</td>
                    </tr>
                    <tr>
                        <td><code>unmatchable-rates</code></td>
                        <td>Avtalen har ubetalte beløp, men systemet kan ikke koble terminene trygt.</td>
                        <td>Følg opp avtalen.</td>
                    </tr>
                    <tr>
                        <td><code>pending-invoice-exists</code></td>
                        <td>Avtalen har allerede en faktura som ikke er sendt.</td>
                        <td>Sjekk fakturaoversikten før du gjør noe mer.</td>
                    </tr>
                    <tr>
                        <td><code>ansvarlig-unresolved</code></td>
                        <td>Avtalen mangler en betaler.</td>
                        <td>Rett opp avtalen og kjør eleven på nytt.</td>
                    </tr>
                    <tr>
                        <td><code>not-leieavtale</code></td>
                        <td>Avtalen er en låneavtale.</td>
                        <td>Du trenger ikke gjøre noe. Låneavtaler skal ikke faktureres.</td>
                    </tr>
                    <tr>
                        <td><code>invoice-flow-exception</code></td>
                        <td>Eleven er unntatt fra fakturering i innstillingene.</td>
                        <td>Du trenger ikke gjøre noe, med mindre unntaket er feil.</td>
                    </tr>
                </tbody>
            </table>

            <DsAlert color="info" heading="Viktig forskjell">
                <p class="ds-paragraph">
                    <code>no-unpaid-rates</code> betyr at det ikke var noe å fakturere.
                </p>
                <p class="ds-paragraph">
                    <code>unmatchable-rates</code> betyr at avtalen har ubetalte beløp som systemet ikke ville
                    fakturere automatisk. Dette må følges opp.
                </p>
            </DsAlert>

            <h2 class="ds-heading" data-size="sm">5. Følg med på kjøringen</h2>
            <p class="ds-paragraph">En stor fil kan bruke flere minutter.</p>
            <p class="ds-paragraph">Mens kjøringen pågår, ser du:</p>
            <ul class="ds-list">
                <li>hvor langt systemet har kommet</li>
                <li>hva som er fakturert så langt</li>
                <li>de siste elevene som er fakturert</li>
            </ul>
            <p class="ds-paragraph">
                Du kan lukke fanen mens kjøringen pågår. Kjøringen fortsetter, og rapporten blir lagret. Du
                finner den igjen under <strong>Tidligere kjøringer</strong> når den er ferdig.
            </p>

            <h2 class="ds-heading" data-size="sm">6. Finn en tidligere kjøring</h2>
            <p class="ds-paragraph">Nederst på siden kan du:</p>
            <ul class="ds-list">
                <li>velge blant de siste kjøringene i tabellen</li>
                <li>hente en kjøring ved å skrive inn kjøre-id, under <strong>Har du fått en kjøre-id?</strong></li>
            </ul>
            <p class="ds-paragraph">Du kan se hele rapporten og laste den ned som CSV-fil.</p>

            <DsAlert color="info" heading="Rapporter slettes etter 90 dager">
                <p class="ds-paragraph">
                    Rapportene inneholder fødselsnummer og blir derfor slettet automatisk etter 90 dager.
                </p>
                <p class="ds-paragraph">
                    Fakturaene blir ikke slettet. Du finner dem fortsatt i fakturaoversikten.
                </p>
                <p class="ds-paragraph">
                    Hvis du får meldingen «Fant ingen kjøring» på en gammel kjøre-id, betyr det vanligvis at
                    rapporten er slettet. Det betyr ikke at kjøringen ikke ble gjennomført.
                </p>
            </DsAlert>

            <h2 class="ds-heading" data-size="sm">7. Når noe går galt</h2>

            <p class="ds-heading" data-size="2xs">Fant ingen fødselsnummerkolonne</p>
            <p class="ds-paragraph">
                Fila mangler en kolonne systemet kjenner igjen. Skriv kolonnenavnet i feltet
                <strong>Kolonnenavn for fødselsnummer</strong>, eller gi kolonnen et kjent navn.
            </p>

            <p class="ds-heading" data-size="2xs">Ingen brukbare fødselsnumre</p>
            <p class="ds-paragraph">
                Dette skyldes som regel at Excel har endret fødselsnumrene. Se veiledningen under
                «Excel kan ødelegge fødselsnumre».
            </p>

            <p class="ds-heading" data-size="2xs">Prislisten mangler eller har feil form</p>
            <p class="ds-paragraph">
                Prisene under Innstillinger er ikke satt opp riktig for året. En administrator må rette dette
                før dere kan fakturere.
            </p>

            <p class="ds-heading" data-size="2xs">Kjøringen stoppet underveis</p>
            <p class="ds-paragraph">
                Det som allerede er fakturert, er fortsatt fakturert og står i rapporten. Ta kontakt med IT før
                du kjører fila på nytt.
            </p>

            <p class="ds-paragraph">
                Du kan trygt kjøre samme fil på nytt. Elever som allerede er fakturert, blir hoppet over med
                årsaken <code>no-unpaid-rates</code>.
            </p>
        </main>
    </AdminOnly>

<style>
    /* Designsystemet spaces list items for prose; --ds-size-3 between one-word items is too much. */
    /**
     * Designsystemet sets padding-inline from var(--ds-size-6) with no fallback. That token is built
     * through a space-toggle that does not resolve here, so the declaration is dropped and the
     * markers end up outside the text column. Set the component's own hook to a literal instead.
     */
    /* Tighter than Designsystemet's default, which spaces list items for prose. */
    .ds-list {
        --dsc-list-margin-top: var(--ds-size-2, 0.5rem);
    }

    /* No code styling in app.css, so <code> fell back to Courier New, which renders ø badly. */
    code {
        font-family: ui-monospace, Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
    }

    /* Designsystemet's default is --ds-size-2 vertical; these tables are scanned, not skimmed. */
    .ds-table {
        --dsc-table-padding: var(--ds-size-4, 1rem) var(--ds-size-3, 0.75rem);
    }

    /* Column names are labels, not prose - laid out inline rather than as a seven-item column. */
    .token-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--ds-size-2, 0.5rem);
    }

    .token-list code {
        background: var(--ds-color-neutral-surface-tinted, #f2f7f7);
        border: 1px solid var(--ds-color-neutral-border-subtle, #ccdcdf);
        border-radius: var(--ds-border-radius-md, 4px);
        padding: 0.15rem 0.4rem;
    }

    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 48rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4, 1rem);
    }
</style>
