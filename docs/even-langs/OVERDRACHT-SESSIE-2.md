# Overdracht: korte tips "Even langs", sessie 2 (homepage en kaart)

Geschreven op 17 november 2026, na het mergen van sessie 1 (PR #21, merge-commit c587551). Dit document is genoeg om sessie 2 op te pakken zonder het oorspronkelijke gesprek. Lees eerst `CLAUDE.md`, vooral het kopje "Korte tips: Even langs (src/tips/)".

## 1. Waar staan we

Naast de verhalen (`src/posts/*.html`) kent de site korte tips: ongeveer 4 zinnen, maximaal 150 woorden, 2 foto's, in de ik-vorm, en alleen plekken waar Ferry zelf is geweest. Een tip groeit later misschien uit tot een verhaal op dezelfde URL.

Het werk is in drie sessies verdeeld:

1. **Sessie 1, klaar en live (PR #21).**
   1. Een tip is één bestand `src/tips/<naam>.md`. De build maakt daaruit de tippagina op `/posts/<naam>.html`, de sitemapregel, og-tags, JSON-LD met straat en postcode, de broodkruimel, het blok "Misschien vind je dit ook leuk" en de pin in `places.json`.
   2. `places.json` heeft per plek een veld `formaat`: `verhaal` of `tip`.
   3. De build geeft foutmeldingen en waarschuwingen bij fouten in een tipbestand, en ruimt de pagina's van verwijderde tips op.
   4. De opmaak van de tippagina staat in `style.css`.
   5. Er staat nog **geen echte tip** live.
2. **Sessie 2, dit document.** De homepage en de kaartpagina leren tips kennen.
3. **Sessie 3, daarna.**
   1. Het blok "Even verderop" (2 of 3 tips in hetzelfde gebied of dezelfde categorie, onder elk verhaal en elke tip; geen tips, dan geen blok).
   2. Een hulpje om in ongeveer 5 minuten een tip te maken: `npm run nieuwe-tip` plus de fotostap.
   3. De eerste echte tip, De Kleine Kapitein.

## 2. Goedgekeurde ontwerpbesluiten (Ferry, 17 november 2026)

De visuele preview is goedgekeurd na twee reviewrondes, met de aanpassingen hieronder. Zie paragraaf 5 voor de bestanden. Bouw precies dit; wijk je ergens van af, vraag het Ferry eerst.

### 2.1 Tipkaart op de homepage

1. **Eén stroom.** Er komt geen aparte tippagina: tips staan tussen de verhalen in hetzelfde raster, gesorteerd op publicatiedatum (de nieuwste bovenaan). Een tipkaart wordt door `build.js` gemaakt uit het tipbestand. De verhaalkaarten blijven met de hand in `src/index.html` staan en krijgen `data-formaat="verhaal"`, de tipkaarten `data-formaat="tip"`.
2. **Compact op elke schermbreedte.** Links een klein vierkant fotootje van 88px (de `-kaart`-variant van foto 1, bijgesneden naar 1:1), rechts de kop. Tekst: de eerste 2 tot 3 zinnen van de tip.
3. **Labels onder het fotootje.** Besluit na de review: de labels (Even langs, categorie, gebied) staan onder het fotootje, over de volle breedte van de kaart, en niet in de smalle kolom ernaast. Zo wordt de kaart lager en stapelen de labels niet tot drie regels. De volgorde in de kaart is dus: fotootje met de kop ernaast, dan de labels, de tekst en "Lees de tip →".
4. **Niet meerekken.** Op de computer staat de kaart bovenaan in zijn rij (`align-self: start`) en rekt hij niet mee met de verhalen ernaast. Lege ruimte eronder is geaccepteerd. Tips samen in één vak bekijken we pas als er meer tips zijn.
5. **Randje.** Een groen randje van **2px** (`var(--groen)`), in lijn met de 2px zwarte randen van de andere kaarten. In de preview stond nog 1,5px; dat is afgekeurd.
6. **Achtergrond.** Papierkleur (`var(--papier)`) in plaats van wit.
7. **Label "Even langs".** Gevuld zwart: `.tag.formaat-tip` staat al in `style.css`. Het label op de kaart zelf is geen aparte link.
8. **Hele kaart klikbaar.** De link in de kop krijgt een uitgerekt vlak (`h2 a::after { inset: 0 }`, de kaart `position: relative`). "Lees de tip →" blijft daarnaast gewoon focusbaar.
9. **Lettergrootte.** Kop 1,2rem, tekst 0,95rem.
10. **Eerste kaart.** De bestaande regel in `build.js` die de foto van de eerste homepagekaart `loading="eager"` geeft, moet ook kloppen als de eerste kaart een tip is.

### 2.2 Formaatfilter Alles / Verhalen / Tips

1. **Waar.** Bovenaan de filterbalk, op de homepage én op de kaartpagina. Standaard staat "Alles" aan. De filters Gebied en Categorie blijven werken en combineren met het formaatfilter.
2. **Vorm.** Eén segmentknop met drie delen, met de klassen `.formaatkeuze` en `.formaatknop`. Gebruik **nooit** de klasse `filterknop`, want die pakken de filterscripts allemaal op. Waarden: `alles`, `verhaal`, `tip`.
3. **Focus.** Geen `overflow: hidden` op de segmentknop, anders valt de focusrand weg. De buitenste knoppen krijgen zelf de ronde hoeken, en een knop met focus krijgt `z-index: 1`.
4. **Toegankelijkheid.** `role="group"` met `aria-labelledby` naar het zichtbare label "Soort", dus geen `aria-label` ernaast (anders wordt het dubbel voorgelezen). Per knop `aria-pressed`.
5. **Op de telefoon.** Een eigen volle rij boven de bestaande filterrij, met drie gelijke delen van minimaal 44px hoog. Zet de bestaande overloopvervaging uit voor deze rij: `.filters .groep-formaat::after { display: none; }`.
6. **Adres.** `?formaat=tip` en `?formaat=verhaal` in het webadres zetten het filter aan, net als `?categorie=` en `?gebied=` nu doen. Het label "Even langs" op een tippagina linkt al naar `/?formaat=tip`.
7. **Teksten meenemen.** "X verhalen gevonden" in `#filter-uitkomst`, de lege melding ("Nog geen verhalen in deze combinatie"), de `data-aantal` per gebied en het label van de sectie ("Filter verhalen") moeten tips meetellen en neutraal of juist geformuleerd zijn, bijvoorbeeld "Filter verhalen en tips".

### 2.3 Kaartpagina

1. **Vierkante pin voor een tip.** Een `L.marker` met `L.divIcon` (klasse `tip-pin`, 20 bij 20px), groen met een papierkleurige rand van 2px en **harde hoeken**. Verhalen houden hun ronde `circleMarker`. Het onderscheid zit in de vorm, zodat het ook bij kleurenblindheid werkt. De pin is minstens even groot als de ronde verhaalpin.
2. **Tikvlak.** Een onzichtbaar groter tikvlak via `.tip-pin::before { inset: -12px }`.
3. **Focusring.** Papierkleurig, goed zichtbaar op de donkere kaart, bijvoorbeeld `.tip-pin:focus-visible { outline: 3px solid #FAF9F5; outline-offset: 3px; }`. De standaardring van de browser valt op de donkere kaart weg.
4. **Naam voor screenreaders.** `title` op de marker: "<naam> (tip)". `alt` doet niets bij een divIcon en kan weg.
5. **Popup van een tip.** Het label "Even langs" (`.popup-formaat`, gevuld zwart, **0,72rem**) staat boven de naam. Daaronder de categorie en het gebied, de teaser (de eerste zin) en de knop "Lees de tip →". De foto is de `-kaart`-variant uit `places.json`. Let op: Leaflet zet zelf marge op elke `p` in een popup, dus `.popup-formaat + .popup-naam { margin-top: 0; }`.
6. **Popup vrij van de zoomknoppen.** Nieuw besluit: op 390px viel de foto in de popup onder de zoomknoppen. Geef de popup bij het verschuiven van de kaart extra ruimte, bijvoorbeeld de Leaflet-opties `autoPanPaddingTopLeft` (rekening houdend met de zoomknoppen van 44px) en `autoPanPadding`. Controleer het op 390px en op de computer, ook met de popup van een pin vlak bij de linkerbovenhoek.
7. **Formaatfilter op de kaart.** Hetzelfde als op de homepage (2.2).
8. **Introtekst.** De tekst boven de kaart ("Bij elke pin hoort een verhaal") moet ook tips dekken.
9. **"Alle plekken op een rij".** Tips komen ook in die lijst onder de kaart (`plekkenlijstHtml` in `build.js`), als gewone links. Nu filtert die functie op een bestand in `src/posts`, waardoor tips wegvallen.

### 2.4 Tippagina en "Misschien vind je dit ook leuk"

1. **Tippagina.** Die is in sessie 1 gebouwd en goedgekeurd (`.tip-inhoud` in `style.css`).
2. **Geen tips onder andere tips.** In het blok "Misschien vind je dit ook leuk" staan onder een tip alleen verhalen, en tips krijgen daar zelf geen links. Zo is het in sessie 1 gebouwd en zo blijft het. De eerlijke verdeling onder de verhalen (`verdeelVerwantePosts`) mag niet verschuiven.
3. **Even verderop.** Tips onder een verhaal of tip komen pas in sessie 3, in het eigen blok "Even verderop".

## 3. Open punten: sessie 2 is pas af als deze werken

1. **`?plek=<naam>` op `kaart.html`** zoomt in op de pin en opent de popup. De link "Bekijk op de kaart" op elke tippagina gebruikt dit al.
   1. **Clusters.** Zit de pin in een cluster, zoom dan eerst in tot de pin los staat en open dan pas de popup: `cluster.zoomToShowLayer(marker, () => marker.openPopup())`. In de preview zat geen markercluster, dus dit is daar niet getest.
   2. **Timing.** De bestaande `toonPlekken()` past de kaart opnieuw in bij `load` en bij een verandering van afmeting (ResizeObserver). Daardoor werd in de preview de gekozen plek eerst weer overschreven. De keuze moet dus ook ná die momenten blijven staan, bijvoorbeeld via een vlag die `toonPlekken` respecteert, in plaats van een tweede aanroep achteraf zoals in de preview.
   3. **Filters.** De filters mogen de gevraagde plek niet verbergen. Komt iemand binnen met `?plek=`, dan blijft die pin zichtbaar, ook als er (bijvoorbeeld via `?categorie=`) een filter aan staat dat hem anders zou verbergen.
2. **`?formaat=tip` op de homepage** zet het formaatfilter aan en springt naar de filterbalk, net als `?categorie=`.
3. **De eerste echte tip** (De Kleine Kapitein) gaat pas live nadat sessie 2 gemerged is. Dat staat ook in `CLAUDE.md`.

## 4. Voorstellen uit de laatste review: wacht op akkoord van Ferry

De onafhankelijke review vóór PR #21 vond nog vier punten. Geen ervan hield de PR tegen. Volgens de werkwijze voer je ze **alleen** door als Ferry ze goedkeurt; vraag dat aan het begin van sessie 2. De reviewer adviseert 1 en 2 op te lossen vóór de eerste tip live gaat.

1. **Middel: tip verdwijnt naast een voorbereid verhaal.** Een live tip verdwijnt tijdelijk (pagina, sitemapregel en pin) zodra er een verhaal met dezelfde naam bijkomt dat nog een publicatiedatum in de toekomst heeft, want "verhaal wint" kijkt niet of het verhaal al live is. Voorstel: het verhaal alleen laten winnen als het niet in `verborgenPosts` staat. Let dan op `publicatiedatums[naam]`, die nu van het verhaal komt. Hoort bij `build.js` (`leesTips`).
2. **Middel: geen escaping in de kaartpopup.** `popupHtml` in `src/kaart.html` plakt `naam`, `teaser` en `alt` onbewerkt in de HTML. Een aanhalingsteken in een alt-tekst (Café "De Ster") breekt het plaatje, en een `<` in een titel wordt als HTML gelezen. Voorstel: een kleine escape-functie in `popupHtml`. Past in sessie 2, want die werkt toch aan de kaart.
3. **Laag: afkorting in de teaser.** "Neem bv. de pannenkoek." levert als teaser "Neem bv." op. Voorstel: een korte lijst met afkortingen, of zinnen van minder dan ongeveer 20 tekens samenvoegen met de volgende.
4. **Laag: dubbel veld zonder melding.** Een veld dat twee keer in een tipbestand staat, wordt zonder melding overschreven. Voorstel: dezelfde soort ⚠ als bij een onbekende veldnaam.

Geparkeerd, niet voor sessie 2: de koppeling van een tip met `instagram_url` op de pagina "Snapshots uit 010". Die hoort bij het Snapshots-werk.

## 5. Bestanden van de preview en de eerste tip

Alles staat in deze map (`docs/even-langs/`). Die wordt niet gepubliceerd, want de workflow kopieert alleen genoemde bestanden plus `posts/` en `assets/`.

1. **`preview/even-langs.css`:** de CSS van de goedgekeurde preview (versie 5), als voorstel voor `style.css`. Een deel staat al in `style.css`: `.tag.formaat-tip` en de tippagina. Let op de besluiten in paragraaf 2 die **na** deze versie zijn genomen en er dus nog niet in staan:
   1. de labels onder het fotootje over de volle breedte;
   2. het randje van 2px in plaats van 1,5px;
   3. de focusring op de tip-pin;
   4. de popup vrij van de zoomknoppen.
2. **`preview/maak_preview.py` en `preview/shots.py`:** het script dat de statische preview maakte uit een kopie van de gebouwde site, en het script voor de screenshots op desktop (1280x900) en 390px (dpr 2) met Python Playwright. Dit is alleen naslag. Sessie 2 bouwt het echt in `build.js`, `src/index.html`, `src/kaart.html` en `style.css`. Let op twee dingen in de preview die bij de echte bouw anders moeten: de markercluster is daar vervangen door een `featureGroup`, en de kaarttegels laadden niet (donkergrijze achtergrond).
3. **`schetsen/*.jpg`:** de goedgekeurde schetsen, op desktop en 390px.
   1. `1-homepage`: filterbalk en tipkaart.
   2. `1b-raster`: rijhoogtes op de computer.
   3. `2-tippagina`: de tippagina.
   4. `3a-pins`: vierkante en ronde pins.
   5. `3b`/`3c`: popup van een tip en van een verhaal.
   6. `3d`: link naar de pin.
   7. `4-filter-kaartpagina`: het formaatfilter op de kaartpagina.
4. **`eerste-tip/de-kleine-kapitein.md`:** het tipbestand voor sessie 3, klaar om naar `src/tips/` te kopiëren.
   1. De tekst is van Ferry en mag **niet** herschreven worden. Alleen spelling is gecontroleerd, en die was in orde.
   2. Adres Botersloot 173, 3011 HE (door Ferry bevestigd). De coördinaten 51.922104, 4.487699 controleert Ferry zelf nog in Google Maps.
   3. `bezocht: 2026-11`.
5. **`eerste-tip/fotos/`:** de verkleinde foto's, klaar voor `assets/img/`.
   1. Gevel en spellenhoek, elk 1200x1600 (ongeveer 430 KB), met een `-mobiel`-variant (800 breed, ongeveer 200 KB) en een `-kaart`-variant (800x500).
   2. Een liggende deelfoto `de-kleine-kapitein-deel.jpg` van 1200x630.
   3. De staande foto's zijn 1200 breed en niet 1400, omdat ze op 1400 boven de 450 KB uitkwamen. Station Bergweg is ook zo gedaan.

## 6. Werkwijze (afspraken met Ferry)

1. **Eerst een plan, dan bouwen.** Begin sessie 2 met een kort plan en laat Ferry dat goedkeuren voor je bouwt.
2. **Modellen.** De bouwer is Opus 5.5 op Hoog. De reviewer is een **aparte** agent die het werk niet zelf gemaakt heeft, ook Opus 5.5 op Hoog.
3. **Wanneer een review.** Bij elke commit die `build.js` raakt, vóór elke PR, en ook bij elk sessieplan en bij visuele schetsen voordat ze aan Ferry worden voorgelegd.
4. **Bevindingen eerst naar Ferry.** De bevindingen van de reviewer gaan eerst los naar Ferry, apart van wat de bouwer zegt. Voer alleen door wat hij goedkeurt, en meld daarna wat er is opgelost.
5. **Wat de reviewer altijd controleert.**
   1. Bestaande verhalen veranderen niet. Bouw `main` en de branch, vergelijk alle gegenereerde HTML, `sitemap.xml` en `places.json`, en verklaar elk verschil.
   2. Daarnaast een vergelijking van screenshots, vóór en na, van alle verhalen plus de homepage, de kaart en de over-pagina, op desktop (1280) en 390px (dpr 2), pixel voor pixel. Zet daarbij gelijk: reduced motion (vaste herofoto), externe verzoeken geblokkeerd, lazy foto's eager, animaties uit.
   3. De verdeling van "Misschien vind je dit ook leuk" verschuift niet.
   4. Het `\r\n`-probleem.
   5. Er komt geen npm-pakket bij.
   6. De foutmeldingen van de build.
   7. JSON-LD en sitemap.
   8. De filters op 390px.
   9. PageSpeed op mobiel en het contrast van de nieuwe kaart en pin.
   10. `CLAUDE.md`, de schrijfregels van Ferry (geen gedachtestreepjes) en de commitregels (geen dubbele aanhalingstekens).
6. **Screenshots.** Bij elk zichtbaar onderdeel op desktop en op 390px, en altijd vóór een push.
7. **Git.** Eén taak per commit. Werk op een feature branch, maak een PR en merge zelf, onder de voorwaarden in `CLAUDE.md` ("Lokaal bekijken en deployen"), en controleer daarna de live site.
8. **Tekst.** Ferry's teksten worden niet herschreven: alleen spelling. Geen gedachtestreepjes in zichtbare tekst.
9. **Search Console.** Herinner Ferry ongeveer 4 weken nadat de eerste tip live staat aan een controle in Search Console: worden de tips geïndexeerd? Zo niet, dan kan per tip `noindex: ja`.
