# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Over dit project

Statische Nederlandstalige blog "Rotterdam by Ferry" (https://rotterdambyferry.nl) over Rotterdam: lunchplekken, bruine kroegen, kidsproof plekken en fotografie. Pure HTML + CSS + een klein stukje vanilla JavaScript — geen framework, geen dependencies, geen tests. Wel één kleine buildstap (`node build.js`, zie "Buildstap" hieronder) die de gedeelde header en footer in de pagina's plakt.

De eigenaar (Ferry) is geen programmeur: leg stappen uit in gewone taal, doe kleine stappen, en communiceer in het Nederlands.

## Structuur

**Let op:** de HTML-bestanden in de repo-root en in `posts/` worden gegenereerd uit `src/` — bewerk altijd de versie in `src/` en draai daarna `npm run build` (zie "Buildstap" hieronder). De overige bestanden (CSS, JS, JSON, afbeeldingen) bewerk je gewoon direct.

- `src/` — de bewerkbare bronbestanden van alle pagina's, met dezelfde mappenstructuur als de root (`src/index.html`, `src/posts/*.html`, enz.). In plaats van een uitgeschreven header/footer staat er `<!-- INCLUDE:header -->` en `<!-- INCLUDE:footer -->`.
- `partials/header.html` en `partials/footer.html` — de gedeelde header en footer. In een partial wordt `{{root}}` door de build vervangen door het juiste padvoorvoegsel (`""` voor root-pagina's, `"../"` voor posts) en `{{deel-url}}` door het URL-gecodeerde webadres van de pagina zelf. De footer bevat sinds juli 2026 ook de deelknoppen (WhatsApp + link kopiëren, gedrag in `assets/deel.js` dat via de footer-partial geladen wordt) en een "← Alle verhalen"-link; losse pagina's hebben dus geen eigen deelblok of deel.js-script meer.
- `build.js` + `package.json` — de buildstap: `npm run build` (of `node build.js`).
- `index.html` — homepage met postkaarten en werkende filters (categorie + gebied). Het filterscript staat onderaan inline in dit bestand (in `src/index.html` dus).
- `posts/*.html` — één los HTML-bestand per blogpost; `src/posts/_template.html` is het kopieersjabloon met [BLOKHAKEN]-placeholders.
- `over.html` — over-pagina.
- `kaart.html` — filterbare kaart van Rotterdam (Leaflet.js + Leaflet.markercluster + CARTO dark tiles via CDN); de plekken komen uit `places.json`, de filterchips werken zoals op de homepage. Overlappende pins clusteren tot een groene stip met aantal (klik = direct inzoomen, zonder animatie — geanimeerde zoom werd eerder afgebroken door invalidateSize).
- `places.json` — alle plekken voor de kaartpagina, per plek: naam, lat/lon, categorie (array van slugs), gebied, wijk en link naar de post, plus optioneel `image` (pad naar de bestaande hero-foto van de post, voor in de popup) en `teaser` (één zin van max ± 80 tekens uit het begin van het verhaal). Bij elke nieuwe post hier ook een plek toevoegen (coördinaten opzoeken via OpenStreetMap/Nominatim).
- `assets/style.css` — de volledige huisstijl (er is geen andere CSS; ook de kaartpagina-stijlen staan hierin).
- `assets/header.js` — zet bij scrollen de klasse `is-gescrold` op de sticky header (subtiele schaduw); wordt op elke pagina geladen vlak voor `</body>` en zit al in het postsjabloon. De header zelf is sticky via `position: sticky` in `style.css` (z-index 1200, boven de Leaflet-knoppen; op mobiel een compacte variant in de media query).
- `assets/img/` — verkleinde foto's die mee gepubliceerd worden.
- `sitemap.xml`, `robots.txt`, `CNAME` (custom domein) — voor GitHub Pages/SEO.
- `NIEUWE-POST.md` — Ferry's eigen stappenplan voor een nieuwe post; houd CLAUDE.md en dit bestand consistent bij wijzigingen aan de postworkflow.

## Buildstap (gedeelde header/footer)

Sinds juli 2026 staan header en footer één keer in `partials/` in plaats van gekopieerd in elke pagina. Bewust géén Jekyll (geen Ruby-afhankelijkheid, geen permalink-risico voor de Google-indexering): de gepubliceerde bestanden in de repo-root blijven gewone, complete HTML die GitHub Pages ongewijzigd serveert.

- Werkwijze: bewerk `src/...`, draai daarna `npm run build` (of `node build.js`) in de projectmap. Het script vervangt elke `<!-- INCLUDE:naam -->`-marker door `partials/naam.html` (met daarin `{{root}}` → padvoorvoegsel en `{{deel-url}}` → URL-gecodeerd webadres van de pagina) en schrijft het resultaat naar dezelfde padnamen in de repo-root.
- Bewerk de root-HTML nooit direct: de volgende build overschrijft die wijzigingen. Wijzigingen aan header of footer doe je in `partials/`.
- Node.js (v24 LTS) is in juli 2026 op deze machine geïnstalleerd voor deze buildstap; het script gebruikt alleen de ingebouwde `fs`/`path`-modules, er zijn geen npm-packages.
- Controle na een refactor aan de build zelf: na `npm run build` moet `git status` geen onverwachte wijzigingen aan de root-HTML tonen.

## Huisstijl (exact behouden)

Alle kleuren staan als CSS-variabelen in `assets/style.css`:

- `--papier: #FAF9F5` (licht beton, achtergrond), `--ink: #15191B` (havenstaal-zwart), `--staal: #5C666B` (grijs voor bijtekst), `--groen: #1D7A46` (Rotterdams groen, accent/links), `--groen-licht: #E7F2EB`, `--lijn: #E3E1D9`.
- Fonts via Google Fonts: **Archivo** (600–900) voor koppen, labels, knoppen en meta; **Source Serif 4** voor lopende tekst.
- Kenmerkend: harde 2–3px zwarte randen (geen schaduw/afronding behalve de pill-filterknoppen), uppercase labels met letter-spacing (`.tag`), donkere footer.
- Layoutbreedtes: `--breedte: 1080px` (site), `--leesbreedte: 680px` (artikel).

## Opbouw van een blogpost

Elke post is een kopie van `src/posts/_template.html` (nieuwe posts dus in `src/posts/` maken en daarna `npm run build` draaien):

1. `<head>`: titel, meta description, en (zie `posts/rif010.html` als voorbeeld) og-tags + canonical met absolute URL `https://rotterdambyferry.nl/posts/BESTAND.html`. Het template bevat de og-tags nog niet — voeg ze toe zoals in bestaande posts.
2. `<main class="artikel">`: terug-link, tags (`.tag` = categorie, `.tag.gebied` = gebied), `<h1>`, `.meta` ("Door Ferry · maand jaar"), optioneel `<figure class="foto">`, eerste alinea als `.intro`, gewone `<p>`-alinea's, en afsluitend blok `.praktisch` met adres/tips. Bij een food- of restaurantplek sluit het praktisch-blok altijd af met een link naar de website van de zaak (`target="_blank" rel="noopener"`).
3. Deelknoppen: die staan centraal in de footer-partial (WhatsApp + "Kopieer de link" met "Link gekopieerd ✓"-bevestiging, plus "← Alle verhalen") en verschijnen dus vanzelf onder elke post — in de post zelf hoeft er niets voor te gebeuren. Het gedrag zit in `assets/deel.js` (mobiel → WhatsApp-app via wa.me, desktop → WhatsApp Web; leest de canonical-URL — daarom is de canonical in de `<head>` belangrijk), geladen via de footer-partial. De no-JS-fallback-href van de WhatsApp-knop vult de build zelf in via `{{deel-url}}`.
4. Kaart op de homepage: `<article class="kaart">`-blok in `src/index.html` onder `<main class="grid" id="verhalen">`, met `data-categorie` en `data-gebied` in kleine letters met streepjes (meerdere waarden gescheiden door spatie). Geldige waarden — categorie: `restaurant`, `lunchplek`, `bruine-kroeg`, `kidsproof`, `delicatessen`, `foodhal`, `borrelplek`, `dagje-uit`; gebied: `centrum`, `noord`, `oost`, `zuid`, `west`, `maasvlakte` (bepaal het gebied met de wijkindeling hieronder). De filters werken puur op deze data-attributen; verborgen kaarten krijgen het `hidden`-attribuut (niet `display` via inline style).
5. Nieuwe post ook toevoegen aan `sitemap.xml` én als plek aan `places.json` (naam, lat/lon, categorie, gebied, wijk, link naar de post) zodat hij op de kaartpagina verschijnt.
6. "Binnenkort"-kaarten hebben `class="kaart binnenkort"` en een `<span class="status">`; bij publicatie die status en de klasse `binnenkort` verwijderen en links toevoegen.

### Wijkindeling → hoofdgebied

Bij elke nieuwe post het gebied bepalen aan de hand van de wijk waar de plek ligt:

- **Centrum**: Stadsdriehoek, Cool, Oude Westen, Scheepvaartkwartier, Nieuwe Werk, Dijkzigt, Katendrecht en Kop van Zuid (horen gevoelsmatig bij het centrum, ook al liggen ze onder de Maas).
- **Noord**: Blijdorp, Bergpolder, Liskwartier, Oude Noorden, Agniesebuurt, Provenierswijk, Hillegersberg, Schiebroek, Overschie.
- **Oost**: Kralingen, Crooswijk, De Esch, Prins Alexander (Ommoord, Zevenkamp, Nesselande, Oosterflank, Lage Land).
- **Zuid**: alles onder de Maas behalve Katendrecht en Kop van Zuid — dus Charlois, Feijenoord, Afrikaanderwijk, Bloemhof, Hillesluis, Tarwewijk, Carnisse, Zuidwijk, Pendrecht, Zuidplein, Lombardijen, IJsselmonde, Vreewijk, Beverwaard, Hoogvliet, Pernis.
- **West**: Delfshaven, Spangen, Bospolder-Tussendijken, Middelland, Nieuwe Westen, Oud-Mathenesse, Schiemond.
- **Maasvlakte**: het havengebied helemaal in het westen (Maasvlakte 1 en 2, Europoort) — geen woonwijk, wel een eigen gebied op de site.

Foto's: originelen heten `*-origineel.jpg` en blijven lokaal (staan in `.gitignore`). In `assets/img/` komen twee verkleinde versies: `naam.jpg` (groot, in het artikel) en `naam-kaart.jpg` (16:10-thumbnail voor de homepagekaart). Er is geen Python op deze machine (Node.js wél, maar zonder image-packages) — verklein foto's met een PowerShell/.NET-oplossing (System.Drawing) of vraag anders.

## Hero-foto's op de homepage

De homepage heeft een hero met een roterende achtergrondfoto. Zonder JavaScript (en bij het allereerste bezoek) toont hij altijd `hero-skyline-euromast.jpg` (die staat hard in de HTML en is ook de og:image); bij herhaalbezoek kiest een klein inline script in `index.html` willekeurig een andere foto dan de vorige (onthouden via localStorage-sleutel `heroFoto`).

Een foto toevoegen aan de rotatie:

1. Zet het bestand in `assets/img/`, bijgesneden naar 16:9, ± 1600px breed, 300–400 KB, naam `hero-*.jpg`.
2. Voeg in `src/index.html` één regel toe aan de array `heroFotos` in het script direct onder de hero-sectie: `{ bestand: "hero-naam.jpg", label: "Korte omschrijving van de foto" }`. Het label wisselt mee als aria-label van de hero (voor screenreaders).

## Lokaal bekijken en deployen

- Lokaal bekijken: dubbelklik op `start-preview.bat` — die draait eerst de build, start `preview-server.js` (mini Node-server, poort 8000) en opent de browser op http://localhost:8000/. Stoppen = het terminalvenster sluiten. Let op: sinds de home-links naar `/` wijzen (juli 2026) werkt doorklikken naar de homepage niet meer bij direct dubbelklikken op een HTML-bestand; via de preview-server werkt alles wél zoals op de echte site.
- Deployen = pushen naar `main` (vergeet niet eerst te builden zodat de root-HTML actueel is): GitHub Pages (repo `Rotterdambyferry/rotterdambyferry`, "Deploy from a branch") publiceert automatisch, live na ± een minuut op rotterdambyferry.nl.
- Let op (Windows): `git push` via PowerShell draaien, niet via de Bash-tool — credentials werken daar niet betrouwbaar.
- Verwijder nooit het `CNAME`-bestand; dat koppelt het custom domein.

## Kaartpagina

De filterbare kaart (`kaart.html`, gebouwd juli 2026) gebruikt dezelfde categorieën en gebieden als de homepage — de `data-categorie`/`data-gebied`-waarden op de homepagekaarten blijven de bron van waarheid voor classificatie, en `places.json` volgt die waarden. Bij een nieuwe categorie of gebied: chips op zowel `src/index.html` als `src/kaart.html` bijwerken (en daarna builden).
