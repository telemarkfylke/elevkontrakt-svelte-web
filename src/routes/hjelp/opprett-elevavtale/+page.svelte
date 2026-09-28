<script>
    import DsAlert from '$lib/components/ds/DsAlert.svelte'
    import DsScope from '$lib/components/ds/DsScope.svelte'
</script>

<DsScope>
    <main>
        <p class="ds-paragraph" data-size="sm"><a class="ds-link" href="/hjelp">← Tilbake til hjelp</a></p>

        <h1 class="ds-heading" data-size="lg">Veiledning for å opprette elevavtale</h1>
        <p class="ds-paragraph">
            Bruk <a class="ds-link" href="/contract">Opprett elevavtale</a> når eleven har signert avtalen
            på papir i stedet for digitalt. Du registrerer avtalen og laster opp den signerte avtalen som PDF.
        </p>

        <h2 class="ds-heading" data-size="sm">1. Få avtalen signert</h2>
        <p class="ds-paragraph">Skriv ut riktig avtale. Øverst på siden <strong>Opprett elevavtale</strong> finner du lenker til:</p>
        <ul class="ds-list">
            <li>leieavtale</li>
            <li>låneavtale</li>
            <li>avtaler på andre språk</li>
        </ul>
        <p class="ds-paragraph">Er eleven <strong>18 år eller eldre</strong>, signerer eleven avtalen selv.</p>
        <p class="ds-paragraph">
            Er eleven <strong>under 18 år</strong>, må en foresatt også signere. Den foresatte blir ansvarlig
            for avtalen og får fakturaen.
        </p>
        <p class="ds-paragraph">Skann den signerte avtalen til én PDF-fil.</p>

        <h2 class="ds-heading" data-size="sm">2. Hent eleven</h2>
        <p class="ds-paragraph">Skriv inn elevens fødselsnummer eller D-nummer. Nummeret må ha 11 siffer.</p>
        <p class="ds-paragraph">
            Trykk <strong>Hent elev</strong>. Systemet henter elevens navn og skole fra VIS og Folkeregisteret.
        </p>
        <p class="ds-paragraph">
            Når du har hentet eleven, kan du ikke endre opplysningene. Hvis du skal velge en annen elev,
            trykker du <strong>Bytt elev</strong>. Da blir alt du har fylt inn slettet, også den opplastede PDF-fila.
        </p>

        <DsAlert color="info" heading="Dette må en administrator gjøre">
            <p class="ds-paragraph">Du trenger hjelp fra en administrator hvis du skal:</p>
            <ul class="ds-list">
                <li>opprette avtale for en elev med <strong>fiktivt fødselsnummer</strong></li>
                <li>velge skole manuelt når eleven <strong>ikke har et aktivt elevforhold i VIS</strong></li>
                <li>velge en <strong>virksomhet</strong> som ansvarlig</li>
            </ul>
            <p class="ds-paragraph">
                Du får meldingen «Krever administrator» hvis dette gjelder eleven. Ta kontakt med en
                administrator og oppgi elevens fødselsnummer eller D-nummer.
            </p>
        </DsAlert>

        <h2 class="ds-heading" data-size="sm">3. Kontroller elev og skole</h2>
        <p class="ds-paragraph">Under <strong>Eleven</strong> ser du elevens navn, fødselsnummer og skole.</p>
        <p class="ds-paragraph">
            Du kan ikke endre disse opplysningene. Hvis noe er feil, må det rettes i VIS før du oppretter avtalen.
        </p>

        <h2 class="ds-heading" data-size="sm">4. Velg ansvarlig</h2>
        <p class="ds-paragraph">Den ansvarlige er personen som får fakturaen.</p>

        <h3 class="ds-heading" data-size="2xs">Når eleven er 18 år eller eldre</h3>
        <p class="ds-paragraph">Eleven står som ansvarlig. Du trenger ikke gjøre noe.</p>

        <h3 class="ds-heading" data-size="2xs">Når eleven er under 18 år</h3>
        <p class="ds-paragraph">Velg den foresatte som har signert avtalen, i lista <strong>Velg foresatt</strong>.</p>
        <p class="ds-paragraph">Hvis eleven bare har én registrert foresatt, er denne personen valgt på forhånd.</p>
        <p class="ds-paragraph">
            Du kan velge en foresatt som er merket med «kan ikke varsles digitalt». Avtalen er signert på
            papir, og systemet sender ikke avtalen til digital signering.
        </p>

        <h3 class="ds-heading" data-size="2xs">Når den som har signert, ikke står i lista</h3>
        <p class="ds-paragraph">Trykk <strong>Bruk en annen ansvarlig</strong>.</p>
        <p class="ds-paragraph">
            Skriv inn fødselsnummeret til den som har signert, og trykk <strong>Slå opp</strong>. Systemet
            henter navnet fra Folkeregisteret.
        </p>
        <p class="ds-paragraph">Som skoleadministrator eller ansatt i IT-servicedesk ser du denne knappen når:</p>
        <ul class="ds-list">
            <li>eleven er under 18 år</li>
            <li>ingen av de foresatte kan varsles digitalt</li>
        </ul>
        <p class="ds-paragraph">I andre tilfeller må en administrator gjøre endringen.</p>
        <p class="ds-paragraph">Hvis eleven ikke har registrerte foresatte, får du feltet for fødselsnummer med en gang.</p>

        <h2 class="ds-heading" data-size="sm">5. Fyll inn avtalen</h2>
        <p class="ds-paragraph">Velg avtaletype:</p>
        <ul class="ds-list">
            <li>Leieavtale</li>
            <li>Låneavtale</li>
        </ul>
        <p class="ds-paragraph">Velg samme type avtale som eleven har signert.</p>
        <p class="ds-paragraph">
            Last opp avtalen under <strong>Signert avtale (PDF)</strong>. Du kan dra fila inn i feltet eller
            klikke for å velge fila.
        </p>

        <h2 class="ds-heading" data-size="sm">6. Opprett avtalen</h2>
        <p class="ds-paragraph">Trykk <strong>Opprett avtale</strong>.</p>
        <p class="ds-paragraph">
            Hvis noe mangler, får du beskjed ved feltet det gjelder. Rett opp feilen, og trykk deretter
            <strong>Opprett avtale</strong> på nytt.
        </p>
        <p class="ds-paragraph">
            Du får spørsmål om du er sikker på at du vil opprette avtalen. Trykk <strong>Opprett avtale</strong>
            for å bekrefte.
        </p>
        <p class="ds-paragraph">
            Når avtalen er opprettet, får du et dokumentnummer fra arkivet. Meldingen forsvinner etter ti
            sekunder. Noter nummeret hvis du trenger det senere.
        </p>

        <h2 class="ds-heading" data-size="sm">7. Når noe går galt</h2>
        <p class="ds-paragraph">Finn meldingen du fikk. Meldingene er delt etter når de kan dukke opp.</p>

        <h3 class="ds-heading" data-size="2xs">Når du henter eleven</h3>
        <!-- Scrolls sideways on a narrow screen instead of squeezing three text columns. It must be
             focusable so keyboard users can scroll it (WCAG 2.1.1), which Svelte's check does not know. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="table-scroll" role="region" aria-label="Meldinger når du henter eleven" tabindex="0">
            <table class="ds-table" data-size="sm">
                <thead>
                    <tr>
                        <th scope="col">Melding</th>
                        <th scope="col">Hva det betyr</th>
                        <th scope="col">Hva du gjør</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">Fant ikke personen</th>
                        <td>Nummeret finnes ikke i Folkeregisteret eller arkivet.</td>
                        <td>Kontroller at du har skrevet inn riktig nummer.</td>
                    </tr>
                    <tr>
                        <th scope="row">Elevmappen mangler saksnummer</th>
                        <td>Elevmappen i arkivet mangler saksnummer. Du kan ikke rette dette selv.</td>
                        <td>Ta kontakt med arkivet.</td>
                    </tr>
                    <tr>
                        <th scope="row">Oppslaget kunne ikke gjennomføres</th>
                        <td>Et av systemene svarte ikke. Det betyr ikke nødvendigvis at nummeret er feil.</td>
                        <td>Vent litt og prøv igjen.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3 class="ds-heading" data-size="2xs">Når du oppretter avtalen</h3>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="table-scroll" role="region" aria-label="Meldinger når du oppretter avtalen" tabindex="0">
            <table class="ds-table" data-size="sm">
                <thead>
                    <tr>
                        <th scope="col">Melding</th>
                        <th scope="col">Hva det betyr</th>
                        <th scope="col">Hva du gjør</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">Eleven har allerede en aktiv avtale av denne typen</th>
                        <td>Systemet oppretter ikke en ny avtale. Avtalen blir lagret slik at en administrator kan kontrollere den.</td>
                        <td>Du trenger ikke registrere avtalen på nytt.</td>
                    </tr>
                    <tr>
                        <th scope="row">Avvik i fakturainformasjonen</th>
                        <td>Systemet oppretter ikke avtalen, men lagrer den for manuell gjennomgang hos en administrator.</td>
                        <td>Du trenger ikke registrere avtalen på nytt.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </main>
</DsScope>

<style>
    /* Tighter than Designsystemet's default, which spaces list items for prose. */
    .ds-list {
        --dsc-list-margin-top: var(--ds-size-2, 0.5rem);
    }

    /* Same padding as the fakturer-fra-fil guide, so the two tables read alike. */
    .ds-table {
        --dsc-table-padding: var(--ds-size-4, 1rem) var(--ds-size-3, 0.75rem);
        min-width: 36rem;
    }

    /* Message names are labels, not bold prose. */
    .ds-table tbody th {
        font-weight: 600;
        vertical-align: top;
    }

    .ds-table td {
        vertical-align: top;
    }

    .table-scroll {
        overflow-x: auto;
    }

    .table-scroll:focus-visible {
        outline: 3px solid var(--ds-color-focus-outer, #000);
        outline-offset: 2px;
    }

    main {
        padding: var(--ds-size-4, 1rem);
        max-width: 48rem;
        display: flex;
        flex-direction: column;
        gap: var(--ds-size-4, 1rem);
    }
</style>
