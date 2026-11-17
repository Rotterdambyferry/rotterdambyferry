# Overdracht: korte tips "Even langs", sessie 3

Geschreven op 18 november 2026, aan het eind van sessie 2. Lees eerst `CLAUDE.md` (kopje "Korte tips: Even langs") en `docs/even-langs/PLAN-SESSIE-2.md`. De ontwerpbesluiten uit `OVERDRACHT-SESSIE-2.md` gelden nog steeds.

## 1. Wat sessie 2 gebouwd heeft

1. Homepage: tipkaarten tussen de verhalen op publicatiedatum, het formaatfilter Alles / Verhalen / Tips (rij Soort, verborgen zolang er geen tip live is), `?formaat=`.
2. Kaartpagina: vierkante tip-pin, popup van een tip, escaping, popup onder de zoomknoppen, formaatfilter, filters uit het adres, `?plek=<naam>` (ook in een cluster en ondanks filters), tips in "Alle plekken op een rij".
3. build.js: een tip blijft online naast een voorbereid verhaal met dezelfde naam; zinnen en afkortingen in de teaser; melding bij een dubbel veld.

## 2. Wat sessie 3 doet

1. **Het blok "Even verderop":** 2 of 3 tips in hetzelfde gebied of dezelfde categorie, onder elk verhaal en elke tip; geen tips, dan geen blok. "Misschien vind je dit ook leuk" en de verdeling onder de verhalen (`verdeelVerwantePosts`) blijven ongewijzigd.
2. **Het hulpje** om in ongeveer 5 minuten een tip te maken: `npm run nieuwe-tip` plus de fotostap. Geen npm-pakketten.
3. **Een klein fotootje voor de tipkaart** (bijvoorbeeld 176x176) in plaats van de `-kaart`-variant van 800x500 (review van het plan van sessie 2, bevinding 13.2).
4. **De eerste echte tip, De Kleine Kapitein:** bestand en foto's staan klaar in `docs/even-langs/eerste-tip/`. De tekst is van Ferry en mag niet herschreven worden. Ferry controleert de coördinaten zelf nog in Google Maps. Pas als hij live staat:
   1. verschijnt de rij Soort;
   2. kan `/?formaat=tip` live gecontroleerd worden;
   3. kan `kaart.html?plek=de-kleine-kapitein` live gecontroleerd worden.

## 3. Open punten uit de reviews van sessie 2

Zie het gesprek van sessie 2 en de status onderaan `PLAN-SESSIE-2.md`. Wat Ferry daar nog niet heeft goedgekeurd, is niet gebouwd. Vraag het aan het begin van sessie 3 opnieuw als het daar nog openstaat.

## 4. Werkwijze

Ongewijzigd: eerst een plan, dan een review door een aparte reviewer (Opus 5.5 op Hoog), de bevindingen eerst naar Ferry, één taak per commit, en een review bij elke commit die `build.js` raakt en vóór de PR. De hulpscripts van sessie 2 (bouwen in een git worktree, vergelijken, screenshots per onderdeel, testopstelling met testtips) stonden buiten de repo; maak ze opnieuw als dat nodig is. De aanpak staat in `PLAN-SESSIE-2.md`, paragraaf 2 en 4.

## 5. Herinnering

Ongeveer 4 weken nadat de eerste tip live staat: in Search Console kijken of de tips geïndexeerd worden. Zo niet, dan kan per tip `noindex: ja`.
