# Opdracht: compactere filterbalk voor rotterdambyferry.nl

Dit is een volledige opdracht van Ferry. Hij heeft het plan goedgekeurd en wil dat jij alles zelf uitvoert, inclusief git pull, bouwen, testen, pushen, de Pull Request en het mergen volgens de afspraken in CLAUDE.md. Hij hoeft niets zelf te zoeken. Stel alleen een vraag als een controle faalt of er iets onverwachts gebeurt (zie CLAUDE.md, onderdeel Lokaal bekijken en deployen).

Lees eerst CLAUDE.md helemaal, en daarna NIEUWE-POST.md, build.js, assets/style.css, assets/filterrij.js, src/index.html en src/kaart.html. Kijk in docs/even-langs/OVERDRACHT-SESSIE-3.md hoe eerdere sessies screenshots en tests hebben gedaan en gebruik dezelfde aanpak.

## Waarom

Op desktop en mobiel staan drie lange filterrijen (Soort, Categorie, Gebied) voor de verhalen, en op desktop staat er een hoge hero boven. Je ziet daardoor eerst filters en pas laat de verhalen, terwijl de verhalen de kracht van de site zijn. Een onafhankelijke UX-agent, een benchmark van vergelijkbare sites en eigen metingen komen op hetzelfde uit. Metingen op de actuele code (main, PR #31):

Desktop 1536x790: header 75 px, hero 440 px, filterblok 250 px, eerste kaart op 797 px (niet in het eerste scherm).
Mobiel 375x812: hero 200 px, filterblok 124 px, eerste kaart op 420 px.
Inhoud: 12 items, 19 filterknoppen, 1 tip. Oost heeft 0 items.

Doel na de wijziging (zo gemeten in een prototype): desktop hero 300 px, filterblok 57 px (93 px als Soort zichtbaar is), eerste kaart op 455 px. Mobiel filterblok 62 px, eerste kaart op 358 px, 2,4 categoriechips zichtbaar in plaats van 1,5.

## Besluiten die vaststaan

1. Soort (Verhalen of Tips) verschijnt pas vanaf 5 live tips. Onder die drempel is het label Even langs op een tip-pagina gewone tekst, geen link.
2. Hero op desktop lager: clamp(260px, 24vw, 300px) vanaf 641 px breed. Mobiel (eigen regel tot 600 px) blijft ongewijzigd.
3. Gebied wordt op desktop dezelfde keuzelijst als nu op mobiel, rechts in dezelfde rij als de categorieën. De Gebied-chips blijven in de HTML bestaan (verborgen op desktop), want beide filterscripts werken erop.
4. Mobiel: Gebied en categorieën in één rij, het gebiedsknopje heet Gebied in plaats van Heel Rotterdam.
5. Geen inklapmenu, geen bottom sheet, geen sticky balk. Opnieuw bekijken bij 30 of meer verhalen.
6. Alles wat nu goed werkt blijft: aria-pressed, aria-expanded, zichtbare focusrand, het voorgelezen resultaat (#filter-uitkomst) en tikvlakken van 44 px op mobiel. Nieuwe elementen krijgen nooit de klasse filterknop.

## Werkwijze

Taak 0 (geen aparte taak voor Ferry): Controleer met git status dat er geen onafgemaakte wijzigingen in bestanden staan die git volgt (stop en vraag het Ferry als die er zijn). Losse mappen en bestanden die git niet volgt, zoals de mappen met originele foto's (Dak Rotterdam, Pleinbios, Vijgeboom, warung-melatie-fotos, Simit restaurant Zuid, blogbalkon-van-europa) en de losse -origineel.jpg bestanden, zijn van Ferry: laat ze staan en commit ze nooit. Het bestand PROMPT-FILTERBALK.md is deze opdracht zelf. De lokale map staat op PR #19 van 14 november en loopt 12 PR's achter op GitHub. Doe git checkout main en git pull, controleer dat HEAD op PR #31 (c662982) of nieuwer staat en dat src/tips bestaat, draai npm run build en controleer dat die schoon is. Maak daarna een feature branch (naam: filterbalk-compact). Verplaats deze opdracht (PROMPT-FILTERBALK.md in de hoofdmap) naar docs/filterbalk/PLAN.md en commit hem als eerste commit, zoals eerdere plannen in docs/even-langs.

Elke taak hieronder is één commit, in deze volgorde, met in de commit alleen de bestanden van die taak. Commitberichten zonder dubbele aanhalingstekens. Draai npm run build na elke wijziging aan CSS of src (style.css wordt in elke pagina ingebouwd) en let op de \r\n regex-bug in build.js. Commit ook de gebouwde pagina's die daardoor veranderen. Bepaal per commit volgens de sweep-regel in CLAUDE.md of de hash in .lastmod-negeer hoort. Dat geldt voor zuiver technische of opmaakwijzigingen aan src/kaart.html. Lastmod komt uit commits op bronbestanden in src/, dus controleer dit voor elke taak die src/index.html of src/kaart.html raakt. Werk CLAUDE.md en NIEUWE-POST.md bij zodra hun beschrijving van de filters niet meer klopt.

Controle vóór elke commit: screenshots op 1920x1080, 1536x790, 1280x720, 768x1024, 390x844, 375x812 en 360x740 (bij taken C en D ook de breekpunten, zie daar), en een controle van de verhoudingen van alle afbeeldingen (hero, kaartfoto's, tip-fotootje, popupfoto). Meet CLS echt en meld het getal, ga er niet van uit dat het 0 is.

### Taak A: hero lager op desktop

Bestanden: assets/style.css (regel .hero met min-height clamp), src/index.html (array heroFotos en het wisselscript).
Probleem uit de review: bij 300 px hoog vallen sommige rotatiefoto's slecht uit. Bij Due Tonino valt de neontekst bovenaan af, bij Hotel New York de letters, bij Pleinbios de gevel, en bij Erasmusbrug winter zie je nu al alleen kabels. Meet alle 12 foto's op 1920, 1536, 1250, 1024 en 768 breed en geef waar nodig een eigen object-position per foto. Die waarde moet in de array heroFotos staan en in beide lagen van het wisselscript worden toegepast, anders klopt hij alleen bij de eerste foto. Pauzeknop, label en tekst in de hero moeten overal goed zichtbaar blijven.

### Taak B: Soort pas vanaf 5 tips

Bestanden: build.js, src/index.html, src/kaart.html als daar iets mee moet, CLAUDE.md.
In build.js staat de voorwaarde rond regel 1683 (liveTips.length > 0) en het label Even langs rond regel 981 (nu een link naar /?formaat=tip). Geef de drempel een eigen constante bovenin (waarde 5). Het label wordt onder de drempel gewone tekst met dezelfde opmaak, zonder dode link, en let op dat de functie klikbareLabels er geen waarschuwing voor geeft. Zoek in de hele repo naar andere verwijzingen naar ?formaat=tip of naar de zichtbaarheid van Soort, ook op de kaartpagina, en pas ze aan.
Belangrijk uit de review: het filterscript in src/index.html telt nu alleen verhalen zolang de rij Soort niet zichtbaar is (de vlag metTips). Staat er dan een tip live terwijl Soort verborgen is, dan zegt de tekst bijvoorbeeld 3 verhalen gevonden terwijl er 4 kaarten zichtbaar zijn. Laat het telwerk en de voorgelezen tekst gelijk lopen met wat er echt zichtbaar is, los van of Soort getoond wordt, en test dat voor elke categorie, elk gebied en de combinaties. De dagelijkse build zet Soort vanzelf aan bij de vijfde live tip, zonder commit.
Deze taak raakt build.js, dus de reviewer kijkt hier verplicht mee (zie onderaan).

### Taak C: compacte desktopbalk

Bestanden: assets/style.css, assets/filterrij.js (alleen commentaar), eventueel src/index.html en src/kaart.html.
Verplaats de regels van .gebiedkeuze, .gebiedkeuze-knop, .gebiedkeuze-lijst en de optie-regels uit het mobiele mediablok naar alle breedtes. Vanaf 641 px: filterbalk met flex, de categorieën in één rij, de keuzelijst rechts in dezelfde rij, het label Categorie alleen nog voor screenreaders, .groep-gebied verborgen, minder padding. Startpunt (prototype, niet blind overnemen):

@media (min-width:641px){
  .filters{padding:.75rem 0;margin-bottom:1.5rem}
  .filters .inner{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem}
  .filters .groep{margin-bottom:0}
  .filters .groep-formaat{flex:0 0 100%;display:flex;align-items:center;gap:.75rem}
  .filters .groep-categorie .label{ visueel verborgen }
  .filters .groep-gebied{display:none}
  .filters .groep-categorie{order:1}
  .gebiedkeuze{display:block;position:relative;margin-left:auto;order:2}
  .gebiedkeuze-knop{min-height:0;padding:.35rem .9rem;font-weight:600}
}

Punten uit de review die je moet meenemen:
De lijst staat in de mobiele regels op left:0 (style.css rond regel 543). Op desktop loopt de geopende lijst dan 84 tot 94 px buiten beeld op 1100, 1040 en 900 px en geeft dat horizontaal scrollen. Gebruik right:0. De hoverregel staat nu ook alleen in het mobiele blok en moet mee.
De algemene regel op .filters .label verbergt anders ook het label Soort. Beperk dat tot het label Categorie.
Breekpunten gemeten met de tekst Gebied: één rij tot 1016 px, daaronder 92 px hoog van 1014 tot 914 px, en 128 px vanaf 912 px. Controleer 1536, 1280, 1250, 1080, 1024, 1016, 1014, 914, 912, 900 en 768 en beslis op basis van metingen of de veegbare enkele rij van mobiel doorgetrokken moet worden tot ongeveer 900 px. Meld je beslissing en de cijfers.
Zonder JavaScript staat er op desktop een Gebied-knop die niets doet. Kijk hoe de mobiele versie dit nu oplost en doe hetzelfde, zonder layoutverspringen.
Toetsenbord testen in de keuzelijst: Tab, pijltjes, Enter, Escape.

### Taak D: label Gebied en de mobiele rij

Bestanden: src/index.html (rond regel 254), src/kaart.html (rond regel 61), assets/filterrij.js (rond regel 95), assets/style.css, NIEUWE-POST.md (rond regel 291), CLAUDE.md, commentaar in style.css.
De tekst Heel Rotterdam staat hard in de HTML. Alleen het script aanpassen geeft een zichtbare tekstwissel na het laden (een layoutverschuiving, gemeten) en een toegankelijke naam Gebied: Gebied omdat het knopje een verborgen voorvoegsel Gebied: heeft. Pas de HTML zelf aan zodat de tekst direct goed staat, en laat het voorvoegsel alleen meekomen als er een specifiek gebied gekozen is. Mobiel: iets minder padding, blok van 124 naar ongeveer 62 px. Controle op 360, 375, 390 en 414 breed. Deze taak raakt src/kaart.html: kijk naar de sweep-regel.

### Taak E: aantal en Wis filters

Bestanden: assets/filterrij.js, src/kaart.html, assets/style.css.
Toon, alleen zolang er een filter actief is, het aantal gevonden items en een knop Wis filters. Bron van de tekst is het bestaande voorleesvak #filter-uitkomst. Een MutationObserver op aria-pressed (van .filterknop en .formaatknop) en op de tekst van #filter-uitkomst volgt de wijzigingen. Prototype ter oriëntatie: een div.filter-status met een tekstspan en een knop met de klasse wisknop (nooit filterknop), die op de verborgen Alles-knoppen drukt.
Punten uit de review die je moet oplossen:
Op de kaartpagina wordt #filter-uitkomst alleen in naFilteren gevuld (src/kaart.html rond regel 450). Bij kaart.html?gebied=centrum zie je dus Wis filters zonder getal. Vul de tekst ook bij het laden.
Op de homepage gebeuren de klikken uit de URL in het inline script, vóór het uitgestelde filterrij.js. Een MutationObserver mist die. Doe dus ook een eerste synchronisatie bij het laden.
Na Enter op Wis filters verbergt de knop zichzelf en dan staat de focus op BODY. Zet de focus daarna bewust op een logische plek (bijvoorbeeld de eerste categorie-knop Alles) en test dat met het toetsenbord.
In het prototype stond de statusregel boven de chips, waardoor de chip waarop je klikt 52 px omlaag sprong (389 naar 441). Zet de status in dezelfde rij of eronder, nooit erboven.
Maak alleen het aantal aria-hidden, niet de houder waar de knop in zit. Druk alleen op Alles-knoppen die nog niet aan staan, anders draait toonPlekken drie keer.
Meet CLS: bij kaart.html?gebied=centrum gaf het prototype 0,0147 doordat de statusregel de kaart 52 px omlaag duwde. Streef naar zo goed als geen verschuiving, bijvoorbeeld door de status in de bestaande rij te zetten.
De tekst op de kaartpagina gaat over plekken, op de homepage over verhalen en tips.

### Taak F: filterkeuze in het adres

Bestanden: assets/filterrij.js, src/index.html, src/kaart.html.
Schrijf categorie, gebied en formaat met history.replaceState naar het adres (dus geen extra stappen in de terugknop). Alleen die drie parameters worden aangepast, andere blijven staan. De canonical blijft statisch de homepage, dat is goed. deel.js deelt de canonical, dus de deelknoppen nemen het filter niet mee, dat is bewust zo.
Uit de review: laat ?plek= op de kaartpagina niet staan na een filterkeuze. Het script zet bij een filterkeuze gekozen = null (src/kaart.html rond regel 467 en 479). Zonder plek weghalen krijg je na herladen weer de pin met popup en geen herpas. Haal plek dus weg bij de eerste filterkeuze van de bezoeker.
Op de homepage springt de pagina nu naar de filterbalk zodra er parameters in het adres staan. Dat zou bij herladen en met de terugknop de bezoeker uit zijn leespositie halen. Sla die sprong over bij navigatietype reload en back_forward (performance.getEntriesByType navigation). Test: de broodkruimel- en labellinks op artikelen, de terugknop vanaf een artikel, en herladen met filters.

### Taak G: kaartpagina

Bestanden: alleen assets/style.css, en src/kaart.html alleen als er iets technisch moet.
De kaart begint nu op 653 px op desktop en 618 px op mobiel. Met de compacte balk uit taak C schuift de kaart vanzelf omhoog. Test het popupscript (op mobiel schuift het de pagina zodat de kaart onder de kop in beeld staat) met ?plek=pleinbios en ?plek=rif010 op 1280 en 390 breed: popup open en vrij van de zoomknoppen. De introtekst boven de kaart is van Ferry: pas die niet aan. Doe in je eindrapport een voorstel voor een kortere versie, dan beslist hij.

Taak H (Bekijk op de kaart bij verhalen) laat je achterwege.

## Afronden

1. Laat een aparte reviewer-agent (Opus 5.5, High, die het werk niet gemaakt heeft) de commit van taak B beoordelen voordat je doorgaat, en daarna de hele Pull Request. Loop de bevindingen langs. Los blokkerende bevindingen op en test opnieuw. Neem alle bevindingen, ook de kleine en wat je ermee deed, apart op in je eindrapport aan Ferry.
2. Push de branch via PowerShell (niet via de Bash-tool, credentials werken daar niet), maak de Pull Request en controleer de voorwaarden uit CLAUDE.md: bestandenlijst met gh pr diff alleen de bedoelde bestanden, geen conflicten (MERGEABLE en CLEAN). Alleen dan mergen met een gewone merge-commit. Staat er iets onverwachts in de bestandenlijst of faalt een controle, dan stop je en vraag je het aan Ferry.
3. Na het mergen: gh run watch tot de publicatie klaar is, op rotterdambyferry.nl controleren (verse versie met een extra parameter zoals ?vers=tijd en no-cache) dat de wijziging live staat op 1536x790 en 375x812 en dat de gemeten getallen kloppen, en daarna git checkout main en git pull.
4. Eindrapport aan Ferry in het Nederlands, kort en informeel, zonder gedachtestreepjes: wat er live staat, de voor en na cijfers (hero, filterblok, eerste kaart, op 1536x790 en 375x812), gemeten CLS, welke beslissingen je nam bij de breekpunten en bij de foto-uitsnedes, de bevindingen van de reviewer apart, en het voorstel voor de kortere introtekst van de kaartpagina.
