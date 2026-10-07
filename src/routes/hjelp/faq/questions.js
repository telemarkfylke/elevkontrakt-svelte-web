// FAQ content. roles: who sees the question (null = everyone). answer is trusted HTML written here.
import { CONTRACT_ROLES, HISTORY_ROLES, BILLING_ROLES, DELIVERY_ROLES, ELEVKONTRAKT_ADMIN } from '$lib/helpers/roles.js'

const BILLING_WRITE_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.billing-readwrite']
const BARCODE_ROLES = [ELEVKONTRAKT_ADMIN, 'elevkontrakt.itservicedesk-readwrite', 'elevkontrakt.skoleadministrator-read']

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
        q: 'Hvordan søker jeg i oversikten?',
        roles: null,
        answer: `
          <p class="ds-paragraph">Du kan søke på navnet til eleven eller den ansvarlige, elevnummer, e-post, skole, klasse, trinn og hvem som har signert.</p>
          <ul class="ds-list"><li>Skill flere søkeord med semikolon. <code>Bamble;2ABC</code> viser elever som treffer begge.</li>
            <li>Skriv <code>signert:ja</code> eller <code>signert:nei</code> for å se avtaler som er eller ikke er signert. Det kan kombineres med andre søkeord: <code>Bamble;signert:nei</code>.</li></ul>
          <p class="ds-paragraph">Søk og filtre kan ikke brukes samtidig. Tøm søket for å bruke filtrene, eller nullstill filtrene for å søke.</p>`
      },
      {
        q: 'Hvordan ser jeg alle detaljene om en avtale?',
        roles: null,
        answer: `
          <p class="ds-paragraph">Klikk på raden i oversikten. Da åpnes et panel til høyre med elev, ansvarlig, PC-status og betalinger.</p>
          <p class="ds-paragraph">Har du tilgang til å endre avtalen, finner du <strong>Rediger</strong> øverst i panelet. Du kan også bruke <strong>Rediger</strong> direkte på raden.</p>
          <p class="ds-paragraph">Har du en rolle for fakturering, har panelet også fanen <strong>Fakturaer</strong>. Der ser du fakturaene til eleven, delt i rater og tilleggstjenester. Klikk på en faktura for å åpne den. Administratorer ser den samme fanen på hver avtale i <strong>Historikk</strong>.</p>`
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
        q: 'Hvorfor får jeg ikke flyttet en avtale til Historikk?',
        roles: [ELEVKONTRAKT_ADMIN],
        who: 'Administrator',
        answer: `
          <p class="ds-paragraph">En avtale kan bare flyttes til Historikk når alt er gjort opp. Har avtalen en faktura eller rate som ikke er ${tag('Betalt', 'success')} eller ${tag('Kreditert', 'plomme')}, blir flyttingen stoppet. Meldingen viser hvilke fakturaer det gjelder.</p>
          <p class="ds-paragraph">Vent til fakturaen er betalt, eller få den kreditert i Xledger. Statusen hentes fra Xledger hver morgen, så du kan flytte avtalen dagen etter.</p>
          <p class="ds-paragraph">Historikk er et endelig arkiv. Koblingen til Pureservice fjernes når avtalen flyttes dit.</p>`
      },
      {
        q: 'Kan jeg angre en sletting?',
        roles: [ELEVKONTRAKT_ADMIN],
        who: 'Administrator',
        answer: `
          <p class="ds-paragraph">Ikke i Elevavtaler. En slettet avtale vises ingen steder i løsningen. Er en avtale slettet ved en feil, ta kontakt med den som forvalter Elevavtaler.</p>
          <p class="ds-paragraph">Gjelder det en elev som har sluttet, er det som regel bedre å flytte avtalen til <strong>Har sluttet</strong> eller <strong>Historikk</strong>.</p>`
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
          <p class="ds-paragraph">Du registrerer PC-status med <strong>Rediger</strong> på avtalen. Har du registrert feil, kan du ikke angre det selv.</p>
          <p class="ds-paragraph">Ta kontakt med en administrator. En administrator kan angre en utlevering, en innlevering eller et utkjøp.</p>`
      },
      {
        q: 'Hvordan kopierer jeg brukernavnet til eleven?',
        roles: BARCODE_ROLES,
        answer: `
          <p class="ds-paragraph">Klikk på strekkoden i oversikten. Brukernavnet kopieres, og strekkoden vises i stort format, så den er enkel å skanne.</p>`
      },
      {
        q: 'Kan jeg hente ut oversikten til Excel?',
        roles: DELIVERY_ROLES,
        who: 'IT-servicedesk',
        answer: `
          <p class="ds-paragraph">Ja. Klikk <strong>Eksporter CSV</strong> øverst i Oversikt. Filen åpnes i Excel.</p>
          <p class="ds-paragraph">Den har med alle avtalene i fanen du står i, uansett søk og filtre: navn, e-post, skole, trinn, klasse, signering, PC-status med dato og hvem som registrerte, status på de tre ratene, ansvarlig og avtaletype.</p>`
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
        q: 'Jeg får beskjed om at eleven allerede har en faktura som ikke er sendt.',
        roles: BILLING_WRITE_ROLES,
        who: 'Fakturering',
        answer: `
          <p class="ds-paragraph">En elev kan bare ha én faktura for tilleggstjenester som ikke er sendt til Xledger. Det hindrer at samme produkt blir fakturert to ganger.</p>
          <ul class="ds-list"><li>Skal noe legges til, slett den ventende fakturaen under <strong>Fakturaer</strong> og lag en ny med alt som skal med.</li>
            <li>Ellers kan du vente til fakturaen er sendt kl. 01.00, og lage den nye i morgen.</li></ul>`
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
          <p class="ds-paragraph">Hva du ser i menyen, styres av rollen din i Elevavtaler. Har du en rolle for fakturering, ser du <strong>Fakturaer</strong>. Med skrivetilgang ser du også <strong>Fakturering</strong>, der fakturaene lages. Ta kontakt med din nærmeste servicedesk hvis du trenger tilgang. Oppgi at henvendelsen gjelder rollen din i Elevavtaler.</p>`
      },
      {
        q: 'Hvordan ser jeg løsningen slik en annen rolle ser den?',
        roles: [ELEVKONTRAKT_ADMIN],
        who: 'Administrator',
        answer: `
          <p class="ds-paragraph">Klikk på navnet ditt øverst til høyre. Da åpnes <strong>Vis som rolle</strong>. Velg rollen, og for skoleadministrator og fakturering også skolen. De rollene ser bare sin egen skole.</p>
          <p class="ds-paragraph">Menyen, knappene og listene blir som for den rollen. En gul linje øverst viser hvilken rolle og skole du ser som. Klikk <strong>Tilbake til administrator</strong> når du er ferdig. Valget varer til du lukker fanen.</p>
          <p class="ds-paragraph">Det endrer bare hva du ser. Alt du gjør, bruker fortsatt administratortilgangen din. Du ser derfor ikke om løsningen ville stoppet rollen. For å teste det trenger du en testbruker med rollen.</p>`
      },
      {
        q: 'Hvordan gir jeg noen tilgang til Elevavtaler?',
        roles: [ELEVKONTRAKT_ADMIN],
        who: 'Administrator',
        answer: `
          <p class="ds-paragraph">Gå til <strong>Innstillinger → Tilganger</strong>. Hver rolle har sin egen liste. Søk opp den ansatte på navn eller brukernavn under rollen, og klikk <strong>Legg til</strong>. Med <strong>Fjern</strong> tar du rollen bort igjen.</p>
          <p class="ds-paragraph">Endringen lagres i Entra ID med en gang, men tilgangen gjelder først neste gang personen logger inn i Elevavtaler.</p>
          <p class="ds-paragraph">Rollene for skoleadministrator og fakturering ser bare sin egen skole. Jobber personen ikke på en skole, får du en advarsel, for da ser personen ingen elever. IT-servicedesk er for ansatte i Digitale tjenester. Du kan legge til personen likevel ved å krysse av for at du bekrefter det. Personer som har en rolle uten å oppfylle kravet, er merket ${tag('Avvik', 'warning')}.</p>
          <p class="ds-paragraph">Bare administratorer i Teknologi og utvikling kan legge til eller fjerne administratorer. Du kan ikke fjerne deg selv fra Administrator, og den siste administratoren kan ikke fjernes.</p>`
      }
    ]
  }
]
