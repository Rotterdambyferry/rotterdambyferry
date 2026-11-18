# Plan sessie 2 "Even langs": homepage en kaartpagina

Goedgekeurd door Ferry op 17 november 2026, na een onafhankelijke review van het plan (13 bevindingen, alle verwerkt; 13.2 naar sessie 3). Basis: `CLAUDE.md` en `docs/even-langs/OVERDRACHT-SESSIE-2.md` (verder "de overdracht"). Alle ontwerpbesluiten uit paragraaf 2 van de overdracht worden precies zo gebouwd.

Ferry heeft ook de vier voorstellen uit paragraaf 4 van de overdracht goedgekeurd (1 tip naast voorbereid verhaal, 2 escaping in de kaartpopup, 3 afkorting in de teaser, 4 dubbel veld melden).

## 1. Besluiten van Ferry bij dit plan

1. Byte-gelijk: alles buiten het inline `<style>`-blok exact gelijk; in `style.css` alleen regels erbij (`git diff -U0` toont geen verwijderde regels); screenshots per onderdeel pixelgelijk.
2. De kaartpagina leest `?categorie=`, `?gebied=` en `?formaat=` uit het adres, zonder nagebootste klik.
3. Teksten:
   1. Sectielabel: "Filter verhalen en tips".
   2. Voorgelezen uitkomst met kloppend enkelvoud en meervoud: "1 verhaal", "3 verhalen", "1 tip", "2 tips", "0 tips"; bij niets: "Niets gevonden in deze combinatie."
   3. Lege melding homepage: "Nog niets in deze combinatie. Volg @rotterdambyferry op Instagram, dan zie je als eerste wat erbij komt."
   4. Introtekst kaart: "Bij elke pin hoort een verhaal of een korte tip". De lege melding op de kaart blijft.
   5. Naam van de kaart voor screenreaders: "Kaart van Rotterdam met alle plekken uit de verhalen en tips".
4. Is de eerste homepagekaart een tip, dan laden het fotootje (zonder `fetchpriority="high"`) en de foto van het eerste verhaal allebei meteen.
5. De rij "Soort" is verborgen zolang er geen tip live staat (homepage en kaart). Dan doet `?formaat=` ook niets.
6. In "Alle plekken op een rij" staat bij een tip "Even langs" in de grijze regel, bijvoorbeeld "Kidsproof · Even langs".
7. Bij `?plek=` in een cluster is de korte zoomanimatie (ongeveer een kwart seconde) geaccepteerd.
8. Reviews gebundeld: na commit 1 tot en met 3, na commit 6, na commit 9 en 10 samen, en vóór de PR. De reviewer leest de diff en voert de vaste controles uit.

## 2. Voorbereiding en testopstelling (geen commit)

1. Volledige git-geschiedenis (`git fetch --unshallow`), anders kloppen de datums in `sitemap.xml` niet.
2. Nulmeting van `main`: gebouwde uitvoer en screenshots.
3. Feature branch `even-langs-sessie-2`.
4. Testopstelling als script buiten de repo, zodat de reviewer hem per commit kan nadoen: een `git worktree` (met geschiedenis) van een gekozen commit, met daarin tijdelijke testgegevens, en daarna `node build.js`:
   1. De Kleine Kapitein (bestand en foto's uit `docs/even-langs/eerste-tip/`).
   2. Een testtip naast de pin van RiF010 (valt in een cluster), met een publicatiedatum tussen twee verhalen in, tijden als "11.45 tot 12.00", afkortingen, een aanhalingsteken en een `<` in de titel, een dubbel veld en Windows-regeleinden.
   3. Een testtip met een publicatiedatum in de toekomst.
   4. Een testverhaal met publicatiedatum in de toekomst, met homepagekaart en pin, plus een tip met dezelfde naam (voorstel 1).
5. In de echte branch komen geen tips en geen foto's van De Kleine Kapitein.

## 3. Taken, één per commit

### Commit 1: build.js, tip naast een voorbereid verhaal (voorstel 1)

1. `leesTips`: het verhaal wint alleen als het al live is. Is het nog verborgen, dan wordt de tip gebouwd, met een ⚠ dat het verhaal op <datum> de plek overneemt.
2. Tips krijgen een eigen lijst publicatiedatums; `publicatiedatum()` kijkt voor een `.md` alleen daarin. Zo toont de ○-melding van het verhaal weer de datum van het verhaal.
3. Hoofdlus: de controle "verborgen verhaal, niet bouwen" geldt niet voor de tip; het opruimen van een verborgen verhaal slaat de pagina over als er een live tip met die naam is (met commentaar, onafhankelijk van de volgorde).
4. Commentaar in build.js en de regel in CLAUDE.md bijwerken.

### Commit 2: build.js, zinnen en afkortingen (voorstel 3)

1. `tipSamenvatting` splitst alleen op een punt, uitroepteken of vraagteken gevolgd door witruimte, en voegt een zin die eindigt op een afkorting (bv., bijv., o.a., ca., m.n., d.w.z., enz., incl., excl., nr., vs., st., dhr., mevr., t.o.v.) samen met de volgende. Tijden als "11.45" blijven heel.

### Commit 3: build.js, dubbel veld (voorstel 4)

1. Staat een ingevuld veld twee keer in een tipbestand: ⚠ "de onderste ingevulde telt".

**Review A na commit 3.**

### Commit 4: style.css

1. Tipkaart: fotootje van 88px met de kop ernaast, daaronder over de volle breedte de labels, de tekst en "Lees de tip →"; groen randje van 2px, papierkleur, `align-self: start`, kop 1,2rem, tekst 0,95rem, uitgerekte kop-link, "Lees de tip →" daarboven los klikbaar. Plus `.kaart.kaart-tip[hidden] { display: none; }`.
2. Formaatfilter `.formaatkeuze` / `.formaatknop`, focus zonder `overflow: hidden`; op de telefoon een eigen volle rij van drie gelijke delen van minimaal 44px, zonder overloopvervaging.
3. `.tip-pin` met tikvlak en papierkleurige focusring, `.popup-formaat`.
4. Alleen regels erbij.

### Commit 5: homepage (src/index.html, NIEUWE-POST.md)

1. Verhaalkaarten `data-formaat="verhaal"` (ook het kopieerblokje); het script ziet een kaart zonder `data-formaat` als verhaal.
2. Rij "Soort" bovenaan de filterbalk, in de bron met `hidden` (de build zet hem aan zodra er een tip live is, commit 6).
3. Filterscript: formaat in filteren, lege melding, `data-aantal` en uitkomst; `?formaat=` alleen als de rij zichtbaar is; teksten volgens 1.3.

### Commit 6: build.js, tipkaarten op de homepage

1. Per live tip een kaart (alles via `htmlTekst`): fotootje (de `-kaart`-variant), kop, labels (zwart "Even langs", geen link), 2 tot 3 zinnen, "Lees de tip →".
2. Volgorde: verhaalkaarten in hun volgorde uit de bron; een tip komt vóór het eerste verhaal met een oudere publicatiedatum (bij gelijke datum eerst het verhaal); meerdere tips onderling op datum (nieuwste eerst), dan naam. Dit sorteert alleen goed zolang de verhaalkaarten zelf op datum staan, zoals nu.
3. Eerst de kaarten van verborgen verhalen wegfilteren, dan pas de tipkaarten invoegen.
4. De eerste kaart laadt meteen, ook als het een tip is (dan ook de eerste verhaalfoto).
5. Staat er een tip live, dan haalt de build `hidden` van de rij "Soort" (homepage en, vanaf commit 7, kaart).

**Review B na commit 6.**

### Commit 7: kaartpagina, formaatfilter en teksten

1. Rij "Soort" (in de bron `hidden`), formaat in `toonPlekken`, `data-aantal` en de uitkomst.
2. `?categorie=`, `?gebied=`, `?formaat=` rechtstreeks ingelezen vóór de eerste `toonPlekken`, zonder klik.
3. Introtekst en naam van de kaart volgens 1.3.

### Commit 8: kaartpagina, tip-pin, popup en escaping (voorstel 2)

1. Tip: `L.marker` met `L.divIcon` (`tip-pin`, 20 bij 20), `title` "<naam> (tip)"; verhalen houden de ronde pin.
2. Popup van een tip: "Even langs" boven de naam, categorie en gebied, teaser, foto, "Lees de tip →".
3. Escape-functie in `popupHtml`.
4. `autoPanPaddingTopLeft: [10, 110]` en `autoPanPaddingBottomRight: [10, 10]`; getest op 390 en 1280, ook vlak bij de linkerbovenhoek.

### Commit 9: kaartpagina, `?plek=<naam>`

1. `<naam>` = bestandsnaam zonder `.html`, ook voor verhalen. Onbekend: gewone kaart.
2. Vlag `gekozen`: de pin blijft zichtbaar ondanks filters; de eerste uitsnede gaat direct naar de pin (`setView` op zoom 16, zonder animatie, tegels maar één keer); daarna `toonGekozen` (zie de afwijking onderaan); bij `load` en een andere afmeting alleen `invalidateSize`, niet opnieuw inpassen of de clustergroep leegmaken.
3. De vlag gaat uit bij een klik op een filterknop of formaatknop.

### Commit 10: build.js, tips in "Alle plekken op een rij"

1. Live tips als gewone links tussen de verhalen, per gebied op alfabet, met "Even langs" in de grijze regel.

**Review C na commit 10** (ook expliciet `?plek=`: pin los, in een cluster, met een filter uit het adres, venster verkleinen).

### Commit 11: documentatie

1. `CLAUDE.md` en `NIEUWE-POST.md` bijwerken; korte `docs/even-langs/OVERDRACHT-SESSIE-3.md` (inclusief: kleiner fotootje voor de tipkaart, Search Console na ongeveer 4 weken); dit plan.

**Review D vóór de PR.**

## 4. Vaste controles (paragraaf 6.5 van de overdracht)

1. `main` en branch bouwen en alles vergelijken. Verwacht: verhalen en `over.html` alleen verschil in het `<style>`-blok; `index.html` en `kaart.html` de verwachte wijzigingen; `places.json` gelijk; `sitemap.xml` alleen de `lastmod` van `kaart.html` (echte inhoudswijziging, niet in `.lastmod-negeer`).
2. Screenshots vóór en na per onderdeel (raster, filterbalk, kaart, plekkenlijst, verhalen, over) op 1280 en 390 (dpr 2), reduced motion, externe verzoeken geblokkeerd, lazy foto's eager, animaties uit.
3. Verdeling "Misschien vind je dit ook leuk" ongewijzigd.
4. `\r\n`, geen npm-pakketten, foutmeldingen, JSON-LD en sitemap van een testtip, filters op 390, contrast, CLAUDE.md, geen gedachtestreepjes, commitberichten zonder dubbele aanhalingstekens.

## 5. PR, merge en live

1. PR, bestandenlijst controleren, `MERGEABLE` en `CLEAN`, zelf mergen, `gh run watch`.
2. Live: rij "Soort" onzichtbaar (geen tips), `kaart.html?plek=pleinbios` opent de pin van Pleinbios, ook `?plek=rif010` (cluster) en met `&categorie=restaurant`.
3. Sessie 2 is af als `?plek=<naam>` de pin opent (ook in een cluster en zonder dat filters hem verbergen) en `?formaat=tip` het filter op de homepage aanzet. Dat tweede is live pas te zien zodra er een tip online staat (sessie 3); in sessie 2 bewezen in de testopstelling.

## 6. Bekend, buiten deze sessie

1. `hoortBijVerborgenPost` herkent een verborgen post aan een stukje bestandsnaam (een verborgen `kapitein.html` filtert ook `de-kleine-kapitein.html`). Bestond al; alleen gemeld.
2. Tip-pins zijn met Tab te bereiken, verhaalpins niet (zoals nu); "Alle plekken op een rij" is de route voor toetsenbordgebruikers.
3. De koppeling van een tip met `instagram_url` op "Snapshots uit 010" blijft geparkeerd.

## 7. Status en afwijkingen tijdens het bouwen

1. Commit 9: in plaats van `cluster.zoomToShowLayer` een eigen functie `toonGekozen`: zonder animatie inzoomen tot de pin los staat (tot zoom 17), en anders het cluster openklappen, net als bij een klik op een cluster. `zoomToShowLayer` bleef met `animate: false` in het cluster hangen bij twee plekken op vrijwel hetzelfde adres. Gevolg: geen zoomanimatie meer nodig. Gemeld aan Ferry.
2. Commit 6: de zoekregel voor de verhaalkaarten is ongevoelig gemaakt voor inspringing, omdat na het wegfilteren van de kaart van een voorbereid verhaal de volgende kaart dieper ingesprongen staat (gevonden met de testopstelling).
3. Pixelvergelijking: in de screenshot van de filterbalk van de homepage (1280) komt soms ruis voor van 1 op 255 in één pixelrij, ook bij herhaalde metingen van dezelfde build. Het meetscript meldt dat apart als ruis.
4. De bevindingen uit review A (afkortingen Mr., Dr., Ds. en meer; samenvoegen na een afkorting alleen als de volgende zin met een kleine letter of cijfer begint, behalve na titels; de melding bij een voorbereid verhaal alleen als de tip zelf live is) en de verwijzing in `OVERDRACHT-SESSIE-3.md` (review D) zijn op 18 november 2026 door Ferry goedgekeurd en verwerkt in een aparte kleine PR na PR #23.
5. Uit review B en C bewust zo gelaten (geen actie, Ferry geïnformeerd): het fotootje van 88px laadt de `-kaart`-variant (wordt in sessie 3 een kleine variant); het vergrote tikvlak van een tip-pin; de aantallen in de keuzelijst tellen de pin van `?plek=` niet mee; Escape sluit een popup niet als de focus op een tip-pin staat.
6. Live gecontroleerd op 18 november 2026 na PR #23: `kaart.html?plek=pleinbios` en `?plek=rif010` op 1280 en 390 (popup open, vrij van de zoomknoppen, binnen de kaart), de nieuwe teksten op de kaart en de homepage, de rij Soort verborgen.
