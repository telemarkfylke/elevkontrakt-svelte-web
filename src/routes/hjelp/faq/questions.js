// FAQ content. roles: who sees the question (null = everyone). answer is trusted HTML written here.
import { CONTRACT_ROLES, HISTORY_ROLES, BILLING_ROLES, DELIVERY_ROLES, ELEVKONTRAKT_ADMIN } from '$lib/helpers/roles.js'

const tag = (text, color) => `<span class="ds-tag" data-color="${color}" data-size="sm">${text}</span>`

export const TOPICS = [
  {
    id: 'avtaler',
    title: 'Avtaler',
    icon: 'contract',
    questions: [
      {
        q: 'Hva er forskjellen på en leieavtale og en låneavtale?',
        roles: null,
        answer: `
          <p class="ds-paragraph">En <strong>leieavtale</strong> betales i tre rater, én for hvert skoleår: Faktura 1, 2 og 3.</p>
          <p class="ds-paragraph">En <strong>låneavtale</strong> faktureres ikke. Ratene står som ${tag('Utlån faktureres ikke', 'brand1')}.</p>`
      },
      {
        q: 'Hvem får fakturaen?',
        roles: null,
        answer: `
          <p class="ds-paragraph">Den som står som <strong>ansvarlig</strong> på avtalen:</p>
          <ul class="ds-list"><li>Er eleven 18 år eller eldre, er eleven selv ansvarlig.</li><li>Er eleven under 18 år, er det foresatt som signerte avtalen.</li></ul>
          <p class="ds-paragraph">Det gjelder både ratene og tilleggstjenester som lader eller egenandel.</p>`
      },
      {
        q: 'Hvorfor ser jeg bare elever fra min skole?',
        roles: null,
        answer: `
          <p class="ds-paragraph">Du ser avtalene for skolen du jobber ved. Det er bare administratorer og IT-servicedesk som ser avtalene i hele fylket.</p>
          <p class="ds-paragraph">Står du på feil skole, må arbeidsstedet ditt rettes. Ta kontakt med din nærmeste servicedesk.</p>`
      },
      {
        q: 'Hva betyr det når en rad i oversikten er gul?',
        roles: null,
        answer: `
          <p class="ds-paragraph">Eleven er ikke funnet i FINT, eller har ikke et aktivt elevforhold. Det betyr ofte at eleven har sluttet eller byttet skole.</p>
          <p class="ds-paragraph">Elevopplysningene sjekkes mot FINT hver morgen kl. 06.00. Blir eleven funnet med et aktivt elevforhold, forsvinner markeringen av seg selv. Er eleven fortsatt ikke funnet etter 5 dager, flyttes avtalen automatisk til <strong>Har sluttet</strong> eller <strong>Historikk</strong>.</p>
          <p class="ds-paragraph">Mener du at eleven fortsatt går på skolen, sjekk elevforholdet i VIS.</p>`
      },
      {
        q: 'Hva betyr «DigiTroll» på en avtale?',
        roles: null,
        answer: `
          <p class="ds-paragraph">Avtalen er hentet fra det gamle systemet DigiTroll. Avtaler som er laget i Elevavtaler, er merket ${tag('Elevavtaler', 'accent')}.</p>
          <p class="ds-paragraph">Mangler skole eller klasse på en DigiTroll-avtale, viser vi det DigiTroll sist hadde registrert. Det kan være utdatert. Du ser alle opplysningene fra DigiTroll i fanen <strong>DigiTroll-data</strong> på avtalen.</p>`
      },
      {
        q: 'Eleven har sluttet. Hvor finner jeg avtalen?',
        roles: HISTORY_ROLES,
        who: 'Skoleadministrator',
        answer: `
          <p class="ds-paragraph">Det kommer an på om noe gjenstår:</p>
          <ul class="ds-list"><li><strong>PC-en er ikke levert inn, eller ratene er ikke betalt:</strong> administratorer finner avtalen under fanen <strong>Har sluttet</strong> i Oversikt.</li>
            <li><strong>Alt er gjort opp:</strong> avtalen ligger i <strong>Historikk</strong>. Søk på elevens navn.</li></ul>`
      },
      {
        q: 'Eleven har signert på papir. Hvordan registrerer jeg avtalen?',
        roles: CONTRACT_ROLES,
        who: 'Skole og IT-servicedesk',
        answer: `
          <p class="ds-paragraph">Bruk <strong>Opprett avtale</strong> og last opp den signerte avtalen som én PDF. Se veiledningen <a class="ds-link" href="/hjelp/opprett-elevavtale">Opprett elevavtale</a> for alle stegene.</p>`
      }
    ]
  },
  {
    id: 'pc',
    title: 'PC-en',
    icon: 'laptop_chromebook',
    questions: [
      {
        q: 'Hvordan blir PC-en registrert som levert ut, levert inn eller kjøpt ut?',
        roles: CONTRACT_ROLES,
        who: 'Skole og IT-servicedesk',
        answer: `
          <p class="ds-paragraph">Det skjer på to måter:</p>
          <ul class="ds-list"><li><strong>Automatisk fra Pureservice.</strong> Når PC-en registreres som utlevert, innlevert eller kjøpt ut i Pureservice, oppdateres avtalen. En kontroll hver kveld kl. 21.00 fanger opp det som eventuelt ikke kom med.</li>
            <li><strong>Manuelt i Elevavtaler.</strong> Finn eleven i <strong>Oversikt</strong>, åpne avtalen, trykk <strong>Rediger</strong> og velg fanen <strong>PC-status</strong>.</li></ul>
          <p class="ds-paragraph">Du kan bare levere ut PC-en når avtalen er signert. Utkjøp kan bare registreres manuelt når ingen av ratene har status ${tag('Ikke fakturert', 'danger')}.</p>
          <p class="ds-paragraph">Blir PC-en kjøpt ut i Pureservice, lages det automatisk en faktura for ratene som ikke er fakturert.</p>`
      },
      {
        q: 'Jeg har registrert feil PC-status. Hva gjør jeg?',
        roles: CONTRACT_ROLES,
        who: 'Skole og IT-servicedesk',
        answer: `
          <p class="ds-paragraph">Ta kontakt med en administrator. En administrator kan angre en utlevering, en innlevering eller et utkjøp.</p>`
      },
      {
        q: 'Hva er utleveringsmodus?',
        roles: DELIVERY_ROLES,
        who: 'IT-servicedesk',
        answer: `
          <p class="ds-paragraph">En visning for når mange elever skal få PC samtidig. Tabellen viser bare det du trenger ved utlevering, og strekkodene blir større, så de er enklere å skanne.</p>
          <p class="ds-paragraph">Grønne rader er nye elever i år. Røde rader er elever fra tidligere år. Klikker du på en strekkode, kopieres elevens brukernavn.</p>`
      }
    ]
  },
  {
    id: 'faktura',
    title: 'Fakturering',
    icon: 'receipt_long',
    questions: [
      {
        q: 'Når blir fakturaen sendt?',
        roles: BILLING_ROLES,
        who: 'Fakturering',
        answer: `
          <p class="ds-paragraph">Fakturaen sendes til Xledger <strong>natten etter at du har laget den, kl. 01.00</strong>.</p>
          <p class="ds-paragraph">I Xledger blir den synlig når økonomiavdelingen har godkjent den. Under <strong>Fakturaer</strong> ser du hvor lang tid det er til neste sending.</p>`
      },
      {
        q: 'Jeg har laget en faktura med feil. Hva gjør jeg?',
        roles: BILLING_ROLES,
        who: 'Fakturering',
        answer: `
          <ul class="ds-list"><li><strong>Før kl. 01.00:</strong> slett fakturaen under <strong>Fakturaer</strong> og lag en ny under <strong>Fakturering</strong>.</li>
            <li><strong>Etter kl. 01.00:</strong> fakturaen er sendt og kan ikke slettes. Ta kontakt med en administrator og få fakturaen kreditert i Xledger.</li></ul>
          <p class="ds-paragraph">En faktura kan ikke endres etter at den er laget.</p>`
      },
      {
        q: 'Hvorfor ble prisen på ratene en annen enn jeg så da jeg lagde fakturaen?',
        roles: BILLING_ROLES,
        who: 'Fakturering',
        answer: `
          <p class="ds-paragraph">Prisen på en rate settes når fakturaen <strong>sendes</strong> kl. 01.00, ikke når du lager den. Endres prisene under Innstillinger før det, eller blir eleven lagt til listen for redusert pris, følger raten med.</p>
          <p class="ds-paragraph">Priser på tilleggstjenester endres ikke. De låses når du lager fakturaen.</p>`
      },
      {
        q: 'Hvorfor har noen elever redusert pris?',
        roles: BILLING_ROLES,
        who: 'Fakturering',
        answer: `
          <p class="ds-paragraph">Elever som står på listen <strong>Redusert pris</strong> under Innstillinger, faktureres med redusert pris i stedet for ordinær pris. Det er bare administratorer som kan endre listen.</p>`
      },
      {
        q: 'Hvorfor er fakturaen fortsatt «Ikke fakturert» etter kl. 01.00?',
        roles: BILLING_ROLES,
        who: 'Fakturering',
        answer: `
          <p class="ds-paragraph">Det kan være to grunner:</p>
          <ul class="ds-list"><li><strong>Mottakeren er ikke klar i Xledger ennå.</strong> Mottakeren må være lagt inn i Xledger og ha vært der i minst 7 dager før fakturaen sendes. Fakturaen blir liggende og sendes automatisk første natt etter det.</li>
            <li><strong>Eleven står på listen «Unntatt fra fakturaflyten»</strong> under Innstillinger. Da sendes ingenting automatisk, og eleven må faktureres manuelt.</li></ul>
          <p class="ds-paragraph">Står fakturaen fortsatt etter mer enn en uke, ta kontakt med en administrator.</p>`
      },
      {
        q: 'Hvorfor kan jeg ikke legge til et produkt på fakturaen?',
        roles: BILLING_ROLES,
        who: 'Fakturering',
        answer: `
          <ul class="ds-list"><li><strong>Prisen blir kr 0.</strong> Det skjer for eksempel ved utkjøp når elevens trinn er ukjent.</li>
            <li><strong>Prisen er over kr 5 000.</strong> Sjekk beløpet, eller kontakt support hvis det skal være høyere.</li>
            <li><strong>Produktet er inaktivt,</strong> eller bare administratorer kan fakturere det. Det gjelder utkjøp av PC, egenandel og restverdi.</li></ul>`
      },
      {
        q: 'Kan jeg lage et produkt med beregnet pris, for eksempel restverdi etter trinn?',
        roles: [ELEVKONTRAKT_ADMIN],
        who: 'Administrator',
        answer: `
          <p class="ds-paragraph">Nei, ikke selv. Produkter der prisen regnes ut, som utkjøp av PC, egenandel, restverdi og årlig leie, må settes opp av utviklerne. De er merket ${tag('Beregnet pris', 'brand1')} under Innstillinger.</p>
          <p class="ds-paragraph">Du kan lage vanlige produkter med fast pris og ekstrafelt under <strong>Innstillinger → Produkter og tjenester</strong>. Trenger du et nytt produkt med beregnet pris, ta kontakt med den som forvalter Elevavtaler.</p>`
      },
      {
        q: 'Hva betyr statusene på ratene og fakturaene?',
        roles: null,
        answer: `
          <div class="status-table"><table class="ds-table" data-size="sm"><thead><tr><th>Status</th><th>Betyr</th></tr></thead><tbody>
            <tr><td>${tag('Ikke fakturert', 'danger')}</td><td>Raten er ikke fakturert ennå. En faktura med denne statusen er ikke sendt til Xledger.</td></tr>
            <tr><td>${tag('Fakturert', 'korn')}</td><td>Fakturaen er sendt til Xledger og venter på betaling.</td></tr>
            <tr><td>${tag('Betalt', 'success')}</td><td>Fakturaen er betalt. Statusen oppdateres automatisk fra Xledger hver morgen.</td></tr>
            <tr><td>${tag('Kreditert', 'plomme')}</td><td>Fakturaen er kreditert i Xledger og skal ikke betales. Statusen oppdateres automatisk fra Xledger hver morgen.</td></tr>
            <tr><td>${tag('Overført inkasso', 'danger')}</td><td>Raten ble overført til inkasso i DigiTroll. Gjelder bare avtaler som er hentet fra DigiTroll.</td></tr>
            <tr><td>${tag('Skal ikke betale', 'korn')}</td><td>Raten skal ikke faktureres.</td></tr>
            <tr><td>${tag('Utlån faktureres ikke', 'brand1')}</td><td>Raten hører til en låneavtale, som ikke faktureres.</td></tr>
          </tbody></table></div>`
      }
    ]
  },
  {
    id: 'tilgang',
    title: 'Tilgang',
    icon: 'key',
    questions: [
      {
        q: 'Jeg ser ikke en side jeg trenger, eller får beskjed om at jeg ikke har tilgang.',
        roles: null,
        answer: `
          <p class="ds-paragraph">Hva du ser i menyen, styres av rollen din i Elevavtaler. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang. Oppgi at henvendelsen gjelder rollen din i Elevavtaler.</p>`
      }
    ]
  }
]
