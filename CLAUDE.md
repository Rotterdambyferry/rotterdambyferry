# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Over dit project

Statische Nederlandstalige blog "Rotterdam by Ferry" (https://rotterdambyferry.nl) over Rotterdam: lunchplekken, bruine kroegen, kidsproof plekken en fotografie. Pure HTML + CSS + een klein stukje vanilla JavaScript — geen build, geen framework, geen packages, geen tests.

De eigenaar (Ferry) is geen programmeur: leg stappen uit in gewone taal, doe kleine stappen, en communiceer in het Nederlands.

## Structuur

- `index.html` — homepage met postkaarten en werkende filters (categorie + gebied). Het filterscript staat onderaan inline in dit bestand.
- `posts/*.html` — één los HTML-bestand per blogpost; `posts/_template.html` is het kopieersjabloon met [BLOKHAKEN]-placeholders.
- `over.html` — over-pagina.
- `assets/style.css` — de volledige huisstijl (er is geen andere CSS).
- `assets/img/` — verkleinde foto's die mee gepubliceerd worden.
- `sitemap.xml`, `robots.txt`, `CNAME` (custom domein) — voor GitHub Pages/SEO.
- `NIEUWE-POST.md` — Ferry's eigen stappenplan voor een nieuwe post; houd CLAUDE.md en dit bestand consistent bij wijzigingen aan de postworkflow.

## Huisstijl (exact behouden)

Alle kleuren staan als CSS-variabelen in `assets/style.css`:

- `--papier: #FAF9F5` (licht beton, achtergrond), `--ink: #15191B` (havenstaal-zwart), `--staal: #5C666B` (grijs voor bijtekst), `--groen: #1D7A46` (Rotterdams groen, accent/links), `--groen-licht: #E7F2EB`, `--lijn: #E3E1D9`.
- Fonts via Google Fonts: **Archivo** (600–900) voor koppen, labels, knoppen en meta; **Source Serif 4** voor lopende tekst.
- Kenmerkend: harde 2–3px zwarte randen (geen schaduw/afronding behalve de pill-filterknoppen), uppercase labels met letter-spacing (`.tag`), donkere footer.
- Layoutbreedtes: `--breedte: 1080px` (site), `--leesbreedte: 680px` (artikel).

## Opbouw van een blogpost

Elke post is een kopie van `posts/_template.html`:

1. `<head>`: titel, meta description, en (zie `posts/rif010.html` als voorbeeld) og-tags + canonical met absolute URL `https://rotterdambyferry.nl/posts/BESTAND.html`. Het template bevat de og-tags nog niet — voeg ze toe zoals in bestaande posts.
2. `<main class="artikel">`: terug-link, tags (`.tag` = categorie, `.tag.gebied` = gebied), `<h1>`, `.meta` ("Door Ferry · maand jaar"), optioneel `<figure class="foto">`, eerste alinea als `.intro`, gewone `<p>`-alinea's, en afsluitend blok `.praktisch` met adres/tips. Bij een food- of restaurantplek sluit het praktisch-blok altijd af met een link naar de website van de zaak (`target="_blank" rel="noopener"`).
3. Deelknoppen: elke nieuwe post krijgt onderaan (na `.praktisch`) het `.delen`-blok uit het template — "Iemand die dit moet weten?" met een WhatsApp-deelknop ("Deel het via WhatsApp") en een "Kopieer de link"-knop. In de fallback-`href` van de WhatsApp-knop de URL-gecodeerde postlink invullen (`https%3A%2F%2Frotterdambyferry.nl%2Fposts%2FBESTAND.html`). Het gedrag zit in `assets/deel.js` (mobiel → WhatsApp-app via wa.me, desktop → WhatsApp Web; leest de canonical-URL), geladen vlak voor `</body>` met `<script src="../assets/deel.js" defer></script>` — beide zitten al in het template.
4. Kaart op de homepage: `<article class="kaart">`-blok in `index.html` onder `<main class="grid" id="verhalen">`, met `data-categorie` en `data-gebied` in kleine letters met streepjes (meerdere waarden gescheiden door spatie). Geldige waarden — categorie: `restaurant`, `lunchplek`, `bruine-kroeg`, `kidsproof`, `delicatessen`, `foodhal`, `borrelplek`; gebied: `centrum`, `noord`, `oost`, `zuid`, `west` (bepaal het gebied met de wijkindeling hieronder). De filters werken puur op deze data-attributen; verborgen kaarten krijgen het `hidden`-attribuut (niet `display` via inline style).
5. Nieuwe post ook toevoegen aan `sitemap.xml`.
6. "Binnenkort"-kaarten hebben `class="kaart binnenkort"` en een `<span class="status">`; bij publicatie die status en de klasse `binnenkort` verwijderen en links toevoegen.

### Wijkindeling → hoofdgebied

Bij elke nieuwe post het gebied bepalen aan de hand van de wijk waar de plek ligt:

- **Centrum**: Stadsdriehoek, Cool, Oude Westen, Scheepvaartkwartier, Nieuwe Werk, Dijkzigt, Katendrecht en Kop van Zuid (horen gevoelsmatig bij het centrum, ook al liggen ze onder de Maas).
- **Noord**: Blijdorp, Bergpolder, Liskwartier, Oude Noorden, Agniesebuurt, Provenierswijk, Hillegersberg, Schiebroek, Overschie.
- **Oost**: Kralingen, Crooswijk, De Esch, Prins Alexander (Ommoord, Zevenkamp, Nesselande, Oosterflank, Lage Land).
- **Zuid**: alles onder de Maas behalve Katendrecht en Kop van Zuid — dus Charlois, Feijenoord, Afrikaanderwijk, Bloemhof, Hillesluis, Tarwewijk, Carnisse, Zuidwijk, Pendrecht, Zuidplein, Lombardijen, IJsselmonde, Vreewijk, Beverwaard, Hoogvliet, Pernis.
- **West**: Delfshaven, Spangen, Bospolder-Tussendijken, Middelland, Nieuwe Westen, Oud-Mathenesse, Schiemond.

Foto's: originelen heten `*-origineel.jpg` en blijven lokaal (staan in `.gitignore`). In `assets/img/` komen twee verkleinde versies: `naam.jpg` (groot, in het artikel) en `naam-kaart.jpg` (16:10-thumbnail voor de homepagekaart). Er is geen Python of Node op deze machine — verklein foto's met een PowerShell/.NET-oplossing (System.Drawing) of vraag anders.

## Hero-foto's op de homepage

De homepage heeft een hero met een roterende achtergrondfoto. Zonder JavaScript (en bij het allereerste bezoek) toont hij altijd `hero-skyline-euromast.jpg` (die staat hard in de HTML en is ook de og:image); bij herhaalbezoek kiest een klein inline script in `index.html` willekeurig een andere foto dan de vorige (onthouden via localStorage-sleutel `heroFoto`).

Een foto toevoegen aan de rotatie:

1. Zet het bestand in `assets/img/`, bijgesneden naar 16:9, ± 1600px breed, 300–400 KB, naam `hero-*.jpg`.
2. Voeg in `index.html` één regel toe aan de array `heroFotos` in het script direct onder de hero-sectie: `{ bestand: "hero-naam.jpg", label: "Korte omschrijving van de foto" }`. Het label wisselt mee als aria-label van de hero (voor screenreaders).

## Lokaal bekijken en deployen

- Lokaal bekijken: het HTML-bestand direct in de browser openen (dubbelklikken); er is geen dev-server nodig.
- Deployen = pushen naar `main`: GitHub Pages (repo `Rotterdambyferry/rotterdambyferry`, "Deploy from a branch") publiceert automatisch, live na ± een minuut op rotterdambyferry.nl.
- Let op (Windows): `git push` via PowerShell draaien, niet via de Bash-tool — credentials werken daar niet betrouwbaar.
- Verwijder nooit het `CNAME`-bestand; dat koppelt het custom domein.

## Toekomstplannen (structuur op voorbereiden, nog niet bouwen)

Een filterbare kaart van Rotterdam met alle plekken, filterbaar op dezelfde categorieën en gebieden als de homepage — daarom zijn `data-categorie`/`data-gebied` de bron van waarheid voor classificatie.
