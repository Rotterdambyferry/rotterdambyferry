# Overdracht: korte tips "Even langs", sessie 3

Geschreven op 18 november 2026, aan het eind van sessie 2. Lees eerst `CLAUDE.md` (kopje "Korte tips: Even langs") en `docs/even-langs/PLAN-SESSIE-2.md`. De ontwerpbesluiten uit `OVERDRACHT-SESSIE-2.md` gelden nog steeds.

## 1. Wat sessie 2 gebouwd heeft

1. Homepage: tipkaarten tussen de verhalen op publicatiedatum, het formaatfilter Alles / Verhalen / Tips (rij Soort, verborgen zolang er geen tip live is), `?formaat=`.
2. Kaartpagina: vierkante tip-pin, popup van een tip, escaping, popup onder de zoomknoppen, formaatfilter, filters uit het adres, `?plek=<naam>` (ook in een cluster en ondanks filters), tips in "Alle plekken op een rij".
3. build.js: een tip blijft online naast een voorbereid verhaal met dezelfde naam; zinnen en afkortingen in de teaser; melding bij een dubbel veld.

## 2. Sessie 3, licht (18 november 2026)

Ferry ging op vakantie en had weinig gebruikslimiet over, dus sessie 3 is verkleind tot:

1. `max.` uit `ALTIJD_DOOR` in `build.js`: een zin die op de naam Max eindigt loopt niet meer door; "max. 4 personen" blijft heel.
2. **De eerste echte tip, De Kleine Kapitein**, live: bestand `src/tips/de-kleine-kapitein.md`, foto's in `assets/img/`. De tekst is van Ferry en is niet herschreven. Ferry heeft de coördinaten zelf in Google Maps gecontroleerd. De tip heeft geen publicatiedatum en sorteert dus op de dag van toevoegen (18 november 2026); hij staat bovenaan de homepage. Geen `noindex`: hij staat in Google en in de sitemap. De rij Soort is vanaf nu zichtbaar.

## 2b. Nog te doen, na de vakantie van Ferry (de volgende sessie)

1. **Het blok "Even verderop":** 2 of 3 tips in hetzelfde gebied of dezelfde categorie, onder elk verhaal en elke tip; geen tips, dan geen blok. "Misschien vind je dit ook leuk" en de verdeling onder de verhalen (`verdeelVerwantePosts`) blijven ongewijzigd. Nu is er maar één tip, dus het blok krijgt pas zin als er meer tips zijn.
2. **Het hulpje** om in ongeveer 5 minuten een tip te maken: `npm run nieuwe-tip` plus de fotostap. Geen npm-pakketten.
3. **Een klein fotootje voor de tipkaart** (bijvoorbeeld 176x176) in plaats van de `-kaart`-variant van 800x500 (review van het plan van sessie 2, bevinding 13.2).
4. **Kleine punten uit de review van sessie 3** (bewust blijven liggen):
   1. `assets/img/de-kleine-kapitein-spellenhoek-kaart.jpg` wordt nergens gebruikt (alleen foto 1 heeft een `-kaart`-variant nodig); weghalen of laten staan.
   2. In `docs/even-langs/eerste-tip/` staat nog een kopie van de tip en de foto's; opruimen, of er "archief" bij zetten, zodat de .md niet uit de pas loopt met `src/tips/`.
   3. Op de tippagina laadt foto 2 meteen (`loading="eager"`), ook op de telefoon waar die onder de tekst staat (ongeveer 195 KB); op `lazy` zetten (ontwerpbesluit uit sessie 2).
   4. Ferry koos bewust geen eigen `omschrijving` en geen vaste `publicatiedatum` voor De Kleine Kapitein: de meta description is de eerste zin van de tekst. Na ongeveer 4 weken in Search Console kijken (zie paragraaf 5). De tip sorteert op de datum van de commit die hem toevoegde (18 november 2026), dus alleen met een gewone merge-commit mergen, nooit squash of rebase.

5. **Homepage: te veel filters boven de verhalen.** Op de computer staan nu drie filterrijen (Soort, Categorie, Gebied) onder de hero, waardoor je pas na een scroll een verhaal ziet. Slimmer ontwerpen, zowel op mobiel als op de computer: bijvoorbeeld de filters achter een uitvouwknop ("Filters") met alleen de gekozen filters zichtbaar, zodat de eerste verhaalkaarten direct in beeld staan. Eerst een voorstel (schets) aan Ferry, dan pas bouwen; de bestaande besluiten (rij Soort, filters uit het adres, mobiele filterrij) moeten blijven werken.
6. **Kaart op mobiel (opgelost op 18 november 2026, ter info):** een open popup verdween op een telefoon als je tikte voordat de kaarttegels binnen waren, doordat het load-event de kaart opnieuw inpaste. Opgelost met de vlag `bezoekerBezig` in `src/kaart.html` (zie CLAUDE.md, kopje `kaart.html`). Controleer bij elke wijziging aan het kaartscript met aanraking op 390px en trage tegels (de proef van die dag: tik op een pin terwijl `document.readyState` nog `interactive` is).

## 3. Open punten uit de reviews van sessie 2

Er staan geen open punten meer. Alles wat de reviews van sessie 2 vonden en wat Ferry goedkeurde, is verwerkt; de rest is bewust zo gelaten. Het overzicht staat in `PLAN-SESSIE-2.md`, paragraaf 7. Bekende punten die bewust zo blijven:

1. Het vergrote tikvlak van een tip-pin kan bij een heel dichtbij liggende verhaalpin een tik afvangen (ontwerpbesluit, overdracht sessie 2 paragraaf 2.3.2).
2. Met `?plek=` plus een gebiedfilter telt de keuzelijst de gekozen pin niet mee.
3. Escape sluit een popup niet als de focus op een tip-pin staat (standaardgedrag van Leaflet).

## 4. Werkwijze

Ongewijzigd: eerst een plan, dan een review door een aparte reviewer (Opus 5.5 op Hoog), de bevindingen eerst naar Ferry, één taak per commit, en een review bij elke commit die `build.js` raakt en vóór de PR. De hulpscripts van sessie 2 (bouwen in een git worktree, vergelijken, screenshots per onderdeel, testopstelling met testtips) stonden buiten de repo; maak ze opnieuw als dat nodig is. De aanpak staat in `PLAN-SESSIE-2.md`, paragraaf 2 en 4.

## 5. Herinnering

Ongeveer 4 weken nadat de eerste tip live staat (eenmalige herinnering ingepland voor woensdag 16 december 2026): in Search Console kijken of de tips geïndexeerd worden. Zo niet, dan kan per tip `noindex: ja`.
