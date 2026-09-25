# Audit rotterdambyferry.nl

*Datum: 25 september 2026. Onderzocht: de code in deze repo (versie `4b2c9f7`) en de live site.*

## Samenvatting

1. De basis is sterk: snelle pagina's, goede contrasten, overal alt-teksten, en SEO 100 in Lighthouse op elke gemeten pagina.
2. **Grootste risico:** `build.js` gaat stilletjes mis met Windows-regeleinden. Dan verdwijnen broodkruimels, Leestips en bij nieuwe posts de deel-tags en canonical (getest). Live gaat het nu nog goed.
3. **Tweede risico:** wordt `places.json` anders opgemaakt (door een editor of een CMS), dan staat er live een lege kaart, zonder foutmelding.
4. **Mobiel:** menulinks zijn te kleine tikdoelen, het eerste verhaal staat pas onderaan het scherm, en de kaart opent op Den Haag.
5. **Snelheid:** de TikTok-video op de Simit-pagina laadt 6,8 MB, Google Analytics is overal het grootste bestand, en de kaartpagina is traag.
6. **Privacy:** Google Analytics en TikTok zetten cookies zonder toestemming, en er is geen privacyverklaring. Eerst regelen vóór "Best gelezen" en reacties.
7. **Toekomst:** alle vier de plannen vragen om hetzelfde fundament: één bestand per post met vaste velden, in plaats van losse HTML plus gegevens op drie plekken.
8. Onderaan staat een actielijst: eerst 12 snelle klussen, daarna de grote ombouw in een logische volgorde.

---

## Hoe ik dit onderzocht heb

- **Code gelezen:** `CLAUDE.md`, `NIEUWE-POST.md`, `build.js`, alle bronbestanden in `src/`, de partials, `style.css`, de scripts en de workflow (die laatste alleen gelezen, niet aangeraakt).
- **Build getest in een kopie** in een tijdelijke map, niet in je projectmap. Twee kopieën gemaakt: één met Linux-regeleinden (zoals GitHub hem bouwt) en één zoals een verse Windows-checkout eruitziet. Daarna de uitkomsten vergeleken.
- **Lighthouse** gedraaid op de live site: zes pagina's, mobiele instelling. Google PageSpeed Insights zat aan zijn dagquotum, daarom heb ik Lighthouse zelf gedraaid met Chrome.
- **Telefoon nagebootst** op 375 pixels breed in een browser: homepage, een artikel en de kaart. Daarbij tikdoelen en lettergroottes gemeten. Let op: dit is een nabootsing in Chrome, geen echte iPhone met Safari.
- **Wijken nagekeken** door de coördinaten uit `places.json` op te zoeken bij OpenStreetMap.
- **Niets veranderd:** er is geen bestaande code aangepast, er is niets gecommit en de workflow is niet aangeraakt. Het enige nieuwe bestand is dit rapport.

### Lighthouse-uitslagen (live site, mobiel)

Lighthouse bootst een middelmatige telefoon met trage 4G na. De uitslag schommelt per meting, daarom staan er bij twee pagina's twee metingen.

| Pagina | Prestaties | LCP (hoofdbeeld zichtbaar) | Toegankelijkheid | Praktische tips | SEO |
|---|---|---|---|---|---|
| Homepage | 91 en 98 | 3,4 s en 1,5 s | 95 | 100 | 100 |
| Warung Melatie | 77 en 93 | 4,0 s en 3,2 s | 95 | 100 | 100 |
| Station Bergweg | 90 | 3,5 s | 95 | 96 | 100 |
| Simit and Cheese | 99 | 1,8 s (maar 6,8 MB totaal) | 91 | 79 | 100 |
| Kaart | 71 | 7,2 s | 96 | 100 | 100 |

Vuistregel: een score van 90 of hoger is goed, en een LCP onder de 2,5 seconden is goed.

### Begrippen (kort uitgelegd)

- **LCP** (Largest Contentful Paint): het moment waarop het grootste beeld of blok tekst op het scherm staat. Google gebruikt dit als maat voor "voelt de pagina snel".
- **Tikdoel:** het vlak waar je met je vinger op moet tikken. Advies: minimaal 44×44 pixels, en in elk geval 24 pixels.
- **og-tags / Twitter Cards:** onzichtbare regels in de pagina die bepalen welke titel, tekst en foto verschijnen als iemand de link deelt (WhatsApp, Facebook, LinkedIn).
- **Canonical:** een regel die tegen Google zegt: "dit is het officiële adres van deze pagina".
- **JSON-LD / structured data:** een onzichtbaar blokje gegevens voor Google, bijvoorbeeld "dit is een blogpost van Ferry over een plek op deze coördinaten".
- **Regex:** een zoekpatroon waarmee `build.js` stukjes tekst in de HTML opzoekt en vervangt.
- **Regeleinden (LF en CRLF):** het onzichtbare teken aan het eind van elke regel. Linux en Mac gebruiken LF, Windows gebruikt CRLF. Voor jou ziet een bestand er precies hetzelfde uit, maar een zoekpatroon dat op LF rekent, vindt bij CRLF niets.
- **Preload:** een hint in de `<head>` van de pagina: "begin alvast met downloaden van dit bestand".
- **Facade:** een stilstaand plaatje met een afspeelknop, dat de echte video (TikTok, YouTube) pas laadt als iemand erop klikt.
- **WebP / AVIF:** moderne fotoformaten die bij dezelfde kwaliteit 25 tot 50% kleiner zijn dan JPG.
- **Frontmatter:** een blokje gegevens bovenaan een tekstbestand (titel, datum, categorie), gevolgd door de gewone tekst. Zo werken bijna alle CMS'en.

### Hoe je de labels leest

- **Ernst:** *hoog* = kan de site stilletjes kapotmaken of schaadt veel bezoekers. *Middel* = merkbaar voor bezoekers of Google. *Laag* = netheid of een klein ongemak.
- **Werk:** *klein* = ongeveer een uurtje werk met Claude Code. *Middel* = een sessie of twee. *Groot* = meerdere sessies en een ombouw.

---

## 1. Mobiel (telefoon van 375 pixels breed)

**Wat goed gaat:** geen horizontaal scrollen op de homepage, artikelen of kaart. De lopende tekst is 18 pixels met ruime regelafstand, prima leesbaar. Filterknoppen en deelknoppen zijn 44 pixels hoog. Foto's schalen netjes mee, en telefoons krijgen de lichtere `-mobiel`-variant.

### M1. Menulinks bovenaan zijn te kleine tikdoelen
- **Probleem:** "Verhalen", "Kaart", "Over Ferry" en "Instagram" zijn op een telefoon maar 14 pixels hoog (gemeten: "Kaart" is 31×14 pixels). Lighthouse keurt dit af op elke gemeten pagina. Hetzelfde geldt voor de broodkruimellinks boven een artikel (14 pixels hoog).
- **Waar:** `assets/style.css:125-134` (lettergrootte 0.8rem, geen ruimte eromheen) en `.broodkruimel` op `assets/style.css:350-358`.
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** de links op mobiel wat ruimte boven en onder geven, zodat ze 44 pixels hoog worden. De tekst zelf mag even klein blijven.

### M2. Het eerste verhaal staat pas onderaan het scherm
- **Probleem:** eerst komt de hero (300 pixels hoog), daarna twee rijen filterknoppen. Het eerste verhaal begint pas rond 720 pixels. Op een scherm van 812 pixels hoog zie je van het eerste verhaal alleen de bovenkant van de foto.
- **Waar:** `src/index.html:35-118`, en `.hero` en `.filters` in `assets/style.css`.
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** de hero op mobiel lager maken (bijvoorbeeld 200 tot 220 pixels) en de filters inklapbaar maken achter één knop "Filter", of samenvoegen tot één rij.

### M3. De kaartpagina opent te ver uitgezoomd
- **Probleem:** de kaart past zich aan álle pins aan, dus ook aan de pin op de Maasvlakte. Daardoor zie je op een telefoon vooral Den Haag en Delft, en staan alle negen Rotterdamse plekken samen in één bolletje met "9" erin. De kaart zelf begint bovendien pas op 516 pixels, dus je ziet er bij binnenkomst weinig van.
- **Waar:** `src/kaart.html:185` (`fitBounds` over alle zichtbare pins).
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** standaard inzoomen op de stad Rotterdam. De Maasvlakte alleen meenemen als je dat filter kiest (of via een knopje "toon alles"). Kop en filters op mobiel compacter maken.

### M4. De kaart houdt het scrollen vast op een telefoon
- **Probleem:** de kaart is 62% van de schermhoogte (503 pixels). Wie met één vinger over de kaart veegt om verder naar beneden te scrollen, verschuift de kaart in plaats van de pagina.
- **Waar:** `assets/style.css:690-695`, `src/kaart.html:99`.
- **Ernst:** laag. **Werk:** klein.
- **Oplossing:** op touchscreens pas verschuiven met twee vingers (zoals Google Maps in een webpagina doet), of de kaart op mobiel wat lager maken.

### M5. Zoomknoppen van de kaart zijn klein
- **Probleem:** de plus- en minknop zijn 30×30 pixels.
- **Waar:** de standaardknoppen van Leaflet (de kaartsoftware). Aan te passen in `assets/style.css`.
- **Ernst:** laag. **Werk:** klein.

### M6. Dubbele terug-navigatie duwt de foto omlaag
- **Probleem:** boven elk artikel staat eerst het broodkruimelpad ("Home › West › …") en direct daaronder "← Alle verhalen". Beide gaan naar de homepage. Samen duwen ze de hoofdfoto op een telefoon naar 451 pixels.
- **Waar:** `class="terug"` in elke post (bijvoorbeeld `src/posts/_template.html:40`) plus het broodkruimelpad uit `build.js:607-610`.
- **Ernst:** laag. **Werk:** klein.
- **Oplossing:** de losse terug-link weghalen. Het broodkruimelpad doet hetzelfde, en onderaan in de footer staat ook al "← Alle verhalen".

---

## 2. Snelheid

**Wat goed gaat:** de lettertypen staan op je eigen server en worden vooraf geladen, de CSS zit in de pagina zelf (geen extra download), alle foto's hebben breedte en hoogte (er verspringt niets, CLS is 0), foto's verderop laden pas als je ernaartoe scrolt, en telefoons krijgen kleinere foto's. De homepage en de meeste posts scoren tussen de 90 en 99.

### S1. De TikTok-video op de Simit-pagina laadt 6,8 MB
- **Probleem:** zodra iemand de pagina opent, haalt de TikTok-embed 6,8 MB binnen, waarvan 3,3 MB videobestand. Dat gebeurt ook als niemand op play drukt. Er komen ook cookies van TikTok mee (Lighthouse: 2 cookies van derden, score Praktische tips 79). Voor iemand met een beperkte databundel is dit duur.
- **Waar:** `src/posts/simit-and-cheese.html:85-91`.
- **Ernst:** hoog (voor deze pagina). **Werk:** klein.
- **Oplossing:** een facade: een stilstaand plaatje met afspeelknop dat TikTok pas laadt na een klik. Of simpelweg een screenshot met een link naar de video op TikTok.

### S2. De YouTube-video op de Station Bergweg-pagina laadt 1,1 MB vooraf
- **Probleem:** het filmpje van de Broodjestester laadt meteen 1,1 MB aan YouTube-scripts. `loading="lazy"` helpt hier niet, omdat de video maar één scherm onder de bovenkant staat. Positief: er wordt al `youtube-nocookie.com` gebruikt.
- **Waar:** `src/posts/station-bergweg.html:65`.
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** dezelfde facade als bij S1: het stilstaande YouTube-plaatje met een afspeelknop.

### S3. De voorlaad-hint voor de hoofdfoto mist "hoge prioriteit"
- **Probleem:** `build.js` zet bovenin elke pagina een preload voor de hoofdfoto, maar zonder `fetchpriority="high"`. Daardoor start de browser die download met normale prioriteit, terwijl de foto zelf wél hoge prioriteit vraagt. Lighthouse meldt dit op de homepage en op de posts ("fetchpriority=high moet worden toegepast").
- **Waar:** `build.js:223`.
- **Ernst:** middel. **Werk:** klein (één woordje erbij).

### S4. Posts die met een gewone artikelfoto beginnen, krijgen helemaal geen preload
- **Probleem:** de build zoekt voor de preload alleen naar `<figure class="foto">`. De posts over DÂK Rotterdam en Station Bergweg beginnen met `<figure class="post-foto">` en krijgen dus geen preload. Op de live site nagekeken: Station Bergweg heeft alleen de lettertype-preloads. Lighthouse meet daar ruim een seconde wachttijd voordat de foto begint te laden.
- **Waar:** `build.js:218`. Op `build.js:364` en `build.js:388` kent de build beide varianten wél.
- **Ernst:** middel. **Werk:** klein.

### S5. De foto's op de homepagekaarten zijn te groot voor telefoons
- **Probleem:** de thumbnails zijn 800×500 pixels en 50 tot 130 KB per stuk, terwijl ze op een telefoon ongeveer 335 pixels breed getoond worden. Er is geen kleinere variant. Lighthouse schat 218 KB besparing op de homepage.
- **Waar:** de kaartblokken in `src/index.html` (bijvoorbeeld regel 124). `maak-mobiele-fotos.ps1` slaat `-kaart`-bestanden bewust over.
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** een extra variant van ongeveer 400 pixels breed maken, plus `srcset` op de thumbnails, net zoals bij de artikelfoto's.

### S6. Geen moderne fotoformaten (WebP of AVIF)
- **Probleem:** alle foto's zijn JPG. Lighthouse schat 120 tot 250 KB besparing per pagina.
- **Waar:** de hele fotostraat. Het huidige PowerShell-script (System.Drawing) kan geen WebP maken.
- **Ernst:** laag. **Werk:** middel.
- **Oplossing:** meenemen in de fotoverwerking op GitHub die voor Decap CMS toch nodig is (zie 8a, punt 4). Dan krijg je WebP er gratis bij.

### S7. Google Analytics is het grootste bestand op elke pagina
- **Probleem:** het Google-script (`gtag.js`) is 173 KB en houdt de telefoon 120 tot 300 milliseconden bezig. Dat is groter dan elke foto op de homepage.
- **Waar:** in de `<head>` van alle 14 bronbestanden (bijvoorbeeld `src/index.html:22-29`).
- **Ernst:** middel. **Werk:** klein tot middel.
- **Oplossing:** hangt samen met de privacykeuze (zie P1): óf pas laden na toestemming, óf overstappen op een licht statistiekpakket zonder cookies.

### S8. De kaartpagina is traag (LCP 7,2 seconden)
- **Probleem:** vier dingen stapelen zich op. (1) Drie CSS-bestanden van een extern domein (unpkg.com) moeten binnen zijn voordat er iets op het scherm komt. (2) Daarna moet de kaartsoftware laden. (3) Pas dan wordt `places.json` opgehaald. (4) De kaarttegels worden twee keer geladen: eerst op zoomniveau 12, en na het passend maken opnieuw op een ander zoomniveau.
- **Waar:** `src/kaart.html:21-23`, `99`, `185` en `189`.
- **Ernst:** middel. **Werk:** middel.
- **Oplossing:** Leaflet zelf hosten (net als de lettertypen), de plekken door de build direct in de pagina laten zetten (dan hoeft `places.json` niet apart opgehaald te worden), de kaart meteen op de goede grenzen starten, en een preconnect-hint toevoegen naar de server met kaarttegels.

### S9. Terugkerende bezoekers downloaden twee hero-foto's
- **Probleem:** de preload haalt altijd de Euromast-foto op. Bij een tweede bezoek kiest het script daarna een andere foto. Dan wordt de Euromast-foto voor niets gedownload, en begint de echte hero later.
- **Waar:** `build.js:215-216` en `src/index.html:57-86`.
- **Ernst:** laag. **Werk:** klein.
- **Oplossing:** de foto laten wisselen via de dagelijkse build (elke dag een andere hero, die gewoon in de HTML staat) in plaats van via een script in de browser.

### S10. Bestanden worden maar 10 minuten bewaard in de browser
- **Probleem:** GitHub Pages stuurt voor alles mee dat de browser het maar 10 minuten mag bewaren. Wie morgen terugkomt, moet lettertypen en foto's opnieuw controleren.
- **Waar:** een instelling van GitHub Pages zelf. Die kun je vanuit de repo niet aanpassen (was al bekend).
- **Ernst:** laag. **Werk:** middel (alleen op te lossen door er bijvoorbeeld Cloudflare voor te zetten).

### S11. Het header-script dwingt de browser tot een extra rekenronde
- **Probleem:** `header.js` leest bij het laden direct de scrollpositie uit. Daardoor moet de browser de hele opmaak voortijdig uitrekenen: 80 tot 180 milliseconden op een trage telefoon.
- **Waar:** `assets/header.js:10`.
- **Ernst:** laag. **Werk:** klein (de eerste controle een fractie uitstellen).

---

## 3. Toegankelijkheid

**Wat goed gaat:** alle kleurcombinaties halen de WCAG-norm (zie tabel). Elke foto heeft een beschrijvende alt-tekst, de pagina's zijn als Nederlands gemarkeerd, de filterknoppen vertellen screenreaders of ze aan of uit staan, er is een duidelijke groene focusrand voor toetsenbordgebruikers, en wie "minder beweging" heeft ingesteld, krijgt geen hover-animaties en geen bewegende video.

| Kleurcombinatie | Contrast | Norm |
|---|---|---|
| Grijze bijtekst (`--staal`) op papier | 5,6 : 1 | 4,5 nodig: goed |
| Groene links op papier | 5,1 : 1 | goed |
| Groen label op lichtgroen (gebied-tag) | 4,7 : 1 | goed, net aan |
| Wit op groene WhatsApp-knop | 5,4 : 1 | goed |
| Wit op roze Instagram-knop | 5,0 : 1 | goed |
| Footertekst op donker | 16,8 : 1 | ruim goed |
| Groene focusrand op donkere footer | 3,3 : 1 | 3 nodig: goed, net aan |

### T1. De video in Warung Melatie speelt automatisch af zonder pauzeknop
- **Probleem:** de soep-video start vanzelf en blijft herhalen, zonder knop om te stoppen. De WCAG-regel (2.2.2) zegt: bewegende inhoud die langer dan 5 seconden duurt, moet te pauzeren zijn. Dat de video stil blijft bij "minder beweging" is goed, maar niet genoeg: veel mensen die afgeleid raken door beweging, hebben die instelling niet aan.
- **Waar:** `src/posts/warung-melatie.html:67` en `assets/video.js`.
- **Ernst:** middel. **Werk:** klein (een pauzeknop, of de standaard videoknoppen tonen).

### T2. De kaartpins zijn niet te bereiken met toetsenbord of screenreader
- **Probleem:** de pins zijn getekende rondjes (`circleMarker`). Die kun je niet met de Tab-toets bereiken, en een screenreader weet niet dat ze er zijn. Er is ook geen lijst met plekken als alternatief.
- **Waar:** `src/kaart.html:196`.
- **Ernst:** middel. **Werk:** middel.
- **Oplossing:** onder de kaart een gewone lijst met alle plekken (naam, gebied, link naar het verhaal). Dat helpt ook mensen die de kaart onhandig vinden, en Google.

### T3. Geen "Ga naar inhoud"-link
- **Probleem:** wie met het toetsenbord navigeert, moet op elke pagina eerst door het logo en alle menulinks tabben.
- **Waar:** `partials/header.html`.
- **Ernst:** laag. **Werk:** klein (een link die pas verschijnt als hij focus krijgt).

### T4. Belangrijke kopjes zijn geen echte kopjes
- **Probleem:** "Praktisch", "Misschien vind je dit ook leuk", "Leestips" en "Iemand die dit moet weten?" zien eruit als kopjes, maar het zijn gewone alinea's. Screenreadergebruikers springen vaak van kopje naar kopje, en vinden deze onderdelen zo niet. Daarnaast hebben de artikelen verder geen tussenkopjes (alleen Warung Melatie heeft er één).
- **Waar:** `class="kop"` in de posts, `build.js:259` en `build.js:297`, `partials/footer.html:3`.
- **Ernst:** laag. **Werk:** klein. De alinea's worden `<h2>`-kopjes met dezelfde klasse, dus ze zien er precies hetzelfde uit.

### T5. Het resultaat van filteren wordt niet voorgelezen
- **Probleem:** na een klik op een filter hoort een screenreadergebruiker niet hoeveel verhalen er overblijven. Ook de melding "Nog geen verhalen in deze combinatie" verschijnt zonder dat die wordt voorgelezen.
- **Waar:** `src/index.html:254` en `260-286`, `src/kaart.html:76`.
- **Ernst:** laag. **Werk:** klein.

### T6. Links openen in een nieuw tabblad zonder dat te zeggen
- **Probleem:** volgens de afspraak in `NIEUWE-POST.md` openen tekstlinks naar andere posts in een nieuw tabblad. Voor screenreadergebruikers en minder ervaren internetters is dat verwarrend: de terugknop werkt dan ineens niet meer.
- **Waar:** de afspraak in `NIEUWE-POST.md` (Tips-kopje), en de links zelf in de posts.
- **Ernst:** laag. **Werk:** klein.
- **Oplossing:** een onzichtbaar "(opent in nieuw tabblad)" voor screenreaders toevoegen, of de afspraak heroverwegen voor links binnen je eigen site.

### T7. Kleine punten
- De TikTok-embed heeft geen titel voor screenreaders (Lighthouse). Dit verdwijnt vanzelf met de facade uit S1.
- In het menu is niet aangegeven op welke pagina je bent (`aria-current`).
- De alt-teksten van de homepagethumbnails zijn wisselend: acht hebben een beschrijving, twee zijn leeg. Omdat de link om die foto's heen bewust verborgen is voor screenreaders, wordt de tekst toch nooit voorgelezen. Netter is ze allemaal leeg te laten.
- **Ernst:** laag. **Werk:** klein.

---

## 4. SEO (vindbaarheid in Google)

**Wat goed gaat:** elke pagina heeft een eigen titel en omschrijving, og-tags, Twitter Cards en canonical worden automatisch gemaakt, elke post heeft BlogPosting- en broodkruimelgegevens voor Google, de sitemap bouwt zichzelf, en `http://` en `www.` sturen netjes door naar `https://rotterdambyferry.nl`. Lighthouse: SEO 100 op alle zes gemeten pagina's.

### SEO1. De og-tags en canonical zijn kwetsbaar
- **Probleem:** de twee nieuwste posts (Warung Melatie en Simit and Cheese) hebben in hun bronbestand geen eigen og-blok. De build voegt dat blok toe met een zoekpatroon dat op Linux-regeleinden rekent. Met Windows-regeleinden missen deze posts álle deel-tags én de canonical (getest, zie B1). Elke nieuwe post volgens het sjabloon heeft hetzelfde probleem. Live is het nu goed.
- **Waar:** `build.js:546`.
- **Ernst:** hoog. **Werk:** klein. Dit wordt opgelost met B1.

### SEO2. Een aantal titels is te lang voor Google
- **Probleem:** Google toont ongeveer 55 tot 60 tekens van een titel, en het achtervoegsel " | Rotterdam by Ferry" kost er al 21. Vijf van de tien posts zijn langer dan 70 tekens: Simit and Cheese (98), Balkon van Europa (92), Due Tonino (92), Little Italy (82) en Pleinbios (76). Het einde valt dan weg in de zoekresultaten.
- **Waar:** de `<title>` in die posts in `src/posts/`.
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** een kortere `<title>` voor Google, en de lange, beeldende kop gewoon in de `<h1>` laten staan. Of het achtervoegsel weglaten bij lange titels. (Je hebt vandaag al twee titels aangepast voor Search Console. Neem dit mee als je daar verder mee gaat.)

### SEO3. Er zijn geen pagina's per categorie of gebied
- **Probleem:** de filters werken alleen met JavaScript op de homepage. Een adres als `/?gebied=west` heeft als canonical gewoon de homepage. Voor Google bestaat er dus geen pagina "Lunchplekken in Rotterdam" of "Rotterdam-West by Ferry", terwijl mensen daar wel op zoeken. De labels in een artikel (bijvoorbeeld "LUNCHPLEK") zijn niet klikbaar.
- **Waar:** de filters in `src/index.html`, en `build.js:478` (broodkruimel naar `?gebied=`).
- **Ernst:** middel. **Werk:** middel.
- **Oplossing:** de build maakt per categorie en per gebied een eigen pagina (bijvoorbeeld `/gebied/west.html`), met een eigen titel en een korte inleiding. De labels en het broodkruimelpad linken daarnaar. Dit is ook meteen het overzicht voor de interviewrubriek (8b).

### SEO4. De homepage en de Over-pagina vertellen Google niet wie je bent
- **Probleem:** alleen posts hebben structured data. Er is geen "dit is de website Rotterdam by Ferry" en geen "dit is Ferry". De Over-pagina heeft geen foto van jou. Google weegt bij recensies en tips mee wie er achter de tekst zit.
- **Waar:** `src/index.html`, `src/over.html`.
- **Ernst:** laag. **Werk:** klein.

### SEO5. Het kopieersjabloon staat online
- **Probleem:** https://rotterdambyferry.nl/posts/_template.html werkt gewoon, met [BLOKHAKEN]-tekst en een canonical naar zichzelf. `robots.txt` vraagt Google de pagina niet te bekijken, maar als iemand ernaar linkt, kan het adres toch in Google verschijnen.
- **Waar:** de build bouwt het sjabloon mee (`build.js:509-642`), en de workflow kopieert de hele map `posts/` (`.github/workflows/publiceer.yml:61`).
- **Ernst:** laag. **Werk:** klein (het sjabloon niet meer bouwen, of er een `noindex` in zetten).

### SEO6. Geen eigen "pagina niet gevonden"
- **Probleem:** een verkeerd adres geeft de Engelstalige standaardpagina van GitHub, zonder menu of link terug.
- **Ernst:** laag. **Werk:** klein. Een eigen `404.html` moet wel in de lijst van de workflow worden toegevoegd.

### SEO7. Geen RSS-feed
- **Probleem:** vaste lezers en nieuwsdiensten kunnen je niet volgen via een feedlezer.
- **Ernst:** laag. **Werk:** klein. De build kan net zo makkelijk een `feed.xml` maken als de sitemap.

### SEO8. De zichtbare datum staat los van de datum voor Google
- **Probleem:** "Door Ferry · september 2026" typ je met de hand. De datum voor Google komt uit git of uit `publicatiedatum`. Die twee kunnen uit elkaar gaan lopen. Er is ook geen "laatst bijgewerkt", terwijl openingstijden en prijzen veranderen.
- **Waar:** `<p class="meta">` in elke post, en `build.js:448-449`.
- **Ernst:** laag. **Werk:** klein.

### SEO9. Kleine punten
- `/posts/rif010` en `/posts/rif010.html` werken allebei. Voor Google is dat geen probleem (de canonical wijst naar de `.html`-versie), maar in statistieken tellen ze apart (zie 8c).
- Er wordt weinig naar elkaar gelinkt in de lopende tekst. Dit was al bekend en staat als tip in `NIEUWE-POST.md`. Het blok "Misschien vind je dit ook leuk" vangt het deels op.

---

## 5. Codekwaliteit van build.js

**Wat goed gaat:** `build.js` is overzichtelijk, heeft duidelijk Nederlands commentaar en gebruikt geen enkele externe package. Dat is een sterk punt: er kan niets verouderen of stukgaan door updates van anderen. De zwakte zit in de aanpak: de build knipt en plakt in HTML-tekst met zoekpatronen, en als een patroon niets vindt, gaat hij zonder melding door.

### B1. Windows-regeleinden laten stukken van de site stilletjes verdwijnen
- **Probleem:** getest met twee schone kopieën van de repo. De ene heeft Linux-regeleinden (zo bouwt GitHub), de andere heeft Windows-regeleinden. Dat laatste krijg je bij een verse checkout op deze computer, want git staat hier op `core.autocrlf=true`. In de Windows-kopie ontbreken na de build:
  - **het broodkruimelpad op alle tien de posts.** De build zoekt letterlijk naar `<main class="artikel">` gevolgd door een Linux-regeleinde (`build.js:610`);
  - **de Leestips op de Over-pagina.** De onzichtbare markering `<!-- LEESTIPS -->` blijft gewoon in de HTML staan (`build.js:631`);
  - **alle og-tags, Twitter-tags en de canonical op Warung Melatie en Simit and Cheese**, en straks op elke nieuwe post volgens het sjabloon (`build.js:546`).
  
  Andersom gaat het ook mis. `build.js:683` voegt in `places.json` altijd een Windows-regeleinde toe, ook op GitHub. Daardoor heeft de gepubliceerde `places.json` nu gemengde regeleinden (live nagekeken). Browsers hebben daar geen last van, maar het is hetzelfde soort fout.
- **Waarom live nu alles klopt:** git slaat alles op met Linux-regeleinden, en GitHub bouwt met Linux-regeleinden. In je eigen projectmap staat het nu door elkaar: `src/index.html` en `src/places.json` hebben Windows-regeleinden, de rest Linux (gecontroleerd met `git ls-files --eol`). Er is geen `.gitattributes`-bestand dat dit vastlegt.
- **Waarom dit toch hoog is:** als er ooit een bestand met Windows-regeleinden in de repo belandt, gaat het mis op de live site, zonder foutmelding. Dat kan bijvoorbeeld via "Upload files" op de GitHub-website (zoals `BOUWPLAN.md` nog aanraadt), vanaf een andere computer, of door een tool. En je lokale preview kan er nu al anders uitzien dan de live site.
- **Waar:** `build.js:546`, `610`, `615`, `631`, `683` en `685`. Het `.gitattributes`-bestand ontbreekt.
- **Ernst:** hoog. **Werk:** klein.
- **Oplossing:** (1) in `build.js` meteen na het inlezen van elk bestand alle Windows-regeleinden omzetten naar Linux-regeleinden (bronbestanden, partials, `style.css`, `places.json`); dan werken alle patronen altijd. (2) Een `.gitattributes` met `* text=auto eol=lf`, zodat git overal dezelfde regeleinden gebruikt. (3) De build laten stoppen met een duidelijke melding als een verwachte vervanging niet gelukt is (zie B3).

### B2. places.json wordt geknipt op spaties in plaats van gelezen als gegevens
- **Probleem:** om de pins van toekomstige posts weg te filteren, knipt de build `places.json` in stukken met een patroon dat precies twee spaties vóór `{` en `}` verwacht. Wordt het bestand anders opgemaakt, dan vindt het patroon niets. Dat gebeurt bijvoorbeeld als een editor het "netjes maakt" met tabs of vier spaties, of als een CMS het wegschrijft. Dan wordt er een lege lijst gepubliceerd: **de kaart is leeg, zonder foutmelding**. De controle `JSON.parse` keurt een lege lijst gewoon goed. Tegelijk leest de build hetzelfde bestand op een andere plek wél netjes als gegevens in (`build.js:159`). Er zijn dus twee manieren om hetzelfde bestand te lezen.
- **Waar:** `build.js:671-690`, vooral regel 673.
- **Ernst:** hoog (vooral met het oog op Decap CMS). **Werk:** klein.
- **Oplossing:** het bestand inlezen als gegevens, filteren, het `alt`-veld toevoegen en het weer netjes wegschrijven. Plus een controle: "er staan minder pins in het resultaat dan verwacht? Stop."

### B3. Fouten blijven in het algemeen stil
- **Probleem:** bijna elke vervanging in `build.js` doet stilletjes niets als het zoekpatroon niet gevonden wordt. Dat geldt voor het og-blok, de preload-hints, de stylesheet, het broodkruimelpad, de Leestips en het JSON-LD vóór `</head>`. Ook de `publicatiedatum`-regel moet precies goed getypt zijn (`build.js:87`). Wie `content="2026-9-5"` schrijft (zonder voorloopnullen) of enkele aanhalingstekens gebruikt, ziet zijn post **meteen** online verschijnen in plaats van op de gekozen datum.
- **Waar:** door heel `build.js`, bijvoorbeeld regels 87, 544-557, 586, 605, 610 en 631.
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** een kleine hulpfunctie "vervang, en stop met een duidelijke Nederlandse foutmelding als het niet lukt". Plus een waarschuwing als er iets op een `publicatiedatum`-regel lijkt maar niet goed geschreven is.

### B4. Geen controle of de drie plekken van een post met elkaar kloppen
- **Probleem:** een post staat op drie plekken: het bericht zelf, de kaart op de homepage en `places.json`. Vergeet je `places.json`, dan krijgt de post zonder melding geen gebied in het broodkruimelpad, geen "Misschien vind je dit ook leuk", geen plek in de Leestips en geen pin op de kaart. De build controleert ook niet of categorie- en gebiedswaarden geldig zijn, of de labels in de post overeenkomen met de homepagekaart, of de `-mobiel`-foto bestaat, of elke foto breedte en hoogte heeft, en of er gedachtestreepjes in zichtbare tekst staan (jouw huisregel).
- **Waar:** ontbreekt in `build.js`.
- **Ernst:** middel. **Werk:** middel.
- **Oplossing:** een controleronde aan het begin van de build, met begrijpelijke meldingen zoals "Let op: posts/xyz.html staat niet in places.json". Voor iemand die geen programmeur is, is dit waarschijnlijk de nuttigste toevoeging aan de build.

### B5. Een verborgen post kan een andere post meenemen
- **Probleem:** de build herkent stukken tekst van een toekomstige post door te kijken of de bestandsnaam erin voorkomt (`build.js:98-103`). Een toekomstige post `tonino.html` zou daardoor ook `due-tonino.html` verbergen: de kaart op de homepage, de regel in de sitemap én de pin. En een homepagekaart waarvan de tekst toevallig naar een verborgen post linkt, verdwijnt ook.
- **Ernst:** laag (de kans is klein). **Werk:** klein. De oplossing is exact vergelijken op het volledige pad.

### B6. Dubbele code
- **Probleem:** "Misschien vind je dit ook leuk" en "Leestips" maken hun blokjes met identieke code (`build.js:246-256` en `284-294`). De controle "is dit een echte post en niet het sjabloon?" staat er op zes plekken, op drie verschillende manieren geschreven (`build.js:84`, `217`, `517`, `568`, `594`, `621` en `639`). En de sorteerfunctie voor datums staat er twee keer in.
- **Ernst:** laag. **Werk:** klein. Dit samenvoegen in kleine hulpfuncties maakt latere uitbreidingen (interviews, CMS) veiliger.

### B7. Tekst wordt niet beveiligd voordat hij in de HTML gaat
- **Probleem:** de titel en de omschrijving gaan rechtstreeks in `content="…"` (`build.js:397-408`). De functie op `build.js:345-354` zet `&quot;` zelfs om in een echt aanhalingsteken. Een omschrijving met aanhalingstekens erin maakt de og-tags dan kapot. Hetzelfde geldt voor naam en teaser uit `places.json` in de gerelateerde posts (`build.js:252-253`) en in de kaart-popup (`src/kaart.html:146-157`).
- **Ernst:** laag (er staan nu geen aanhalingstekens in titels). **Werk:** klein.

### B8. "Meest recent" betekent eigenlijk "laatst gewijzigd"
- **Probleem:** bij "Misschien vind je dit ook leuk" wint bij gelijke score de post die het laatst gewijzigd is (`build.js:240`). Verbeter je een typfout in een oude post, dan telt die ineens als "nieuwste". Dit zag ik ook in de test: de volgorde van de gerelateerde posts verschoof tussen de gecommitte versie en een verse build.
- **Ernst:** laag. **Werk:** klein. De Leestips gebruiken wél de publicatiedatum. Dezelfde aanpak hier gebruiken.

### B9. De gebouwde bestanden staan ook in git, maar lopen altijd achter
- **Probleem:** je commit zowel de bronbestanden (`src/`) als de gebouwde bestanden (de HTML in de hoofdmap en `posts/`, plus `sitemap.xml` en `places.json`). Maar GitHub bouwt bij elke publicatie toch alles opnieuw. De gecommitte versie loopt daardoor altijd één stap achter. Voorbeeld: in de gecommitte sitemap staat bij RiF010 `2026-08-10`, live staat er `2026-09-25`. Elke wijziging aan de CSS geeft een wijziging van ruim duizend regels in élke post (de CSS zit erin geplakt). Dat maakt de geschiedenis rommelig, en straks commit een CMS alleen de bronbestanden.
- **Waar:** `.gitignore`.
- **Ernst:** middel (onderhoud en verwarring). **Werk:** klein.
- **Oplossing:** de gebouwde bestanden uit git halen en in `.gitignore` zetten. De publicatie gaat al via de workflow, en `start-preview.bat` bouwt lokaal toch eerst.

### B10. Dezelfde kopregels staan in elk bronbestand
- **Probleem:** het Google Analytics-script (7 regels), de favicon-regels (5 regels) en de stylesheet-regel staan los in alle 14 bronbestanden. Wil je bijvoorbeeld een cookiemelding of een andere statistiektool, dan moet je 14 bestanden aanpassen, plus elke toekomstige post.
- **Waar:** de `<head>` van alle bestanden in `src/` (bijvoorbeeld `src/index.html:16-29`).
- **Ernst:** middel. **Werk:** klein.
- **Oplossing:** een derde partial `partials/head.html` met `<!-- INCLUDE:head -->`, net als de header en de footer. Dit is een voorwaarde voor 8a en 8c.

### B11. Geplande publicatie en "Best gelezen" kunnen vanzelf stoppen
- **Probleem:** je repo is openbaar. GitHub zet geplande workflows (de dagelijkse build van 06.00 uur) in openbare repo's **automatisch uit als er 60 dagen niets gecommit is**. Een voorbereide post verschijnt dan niet meer op zijn datum, en straks wordt "Best gelezen" niet meer bijgewerkt.
- **Waar:** `.github/workflows/publiceer.yml:21` (werking van GitHub zelf).
- **Ernst:** middel. **Werk:** klein (bijvoorbeeld een herinnering, of een klein stapje dat de workflow actief houdt).

### B12. Kleine punten
- De CSS (21 KB) zit in elke pagina geplakt. Dat is nu een prima keuze, maar ook de kaartpagina-stijlen gaan zo mee naar elk artikel. Als de site groeit met interviews, reacties en CMS-onderdelen, wordt dat zwaarder. Later eens herzien.
- `preview-server.js` kent `.woff2` en `.mp4` niet. Lokaal kan de video daardoor in sommige browsers niet afspelen. Live is dit geen probleem.
- `BOUWPLAN.md` beschrijft de oude werkwijze ("Deploy from a branch", "kopieer posts/little-italy.html"). Weghalen of bijwerken voorkomt verwarring.
- **Ernst:** laag. **Werk:** klein.

---

## 6. Datakwaliteit

**Eerst even de woorden:** wat jij "wijk (Centrum, Noord, …)" noemt, heet in de code **gebied**. Het veld **wijk** in `places.json` is de buurt, zoals "Cool" of "Bergpolder".

**Goed nieuws:** alle tien posts hebben op alle drie de plekken (het label in de post, de homepagekaart en `places.json`) een gebied en minstens één categorie, en het gebied is overal hetzelfde.

| Post | Gebied | Categorie (post / homepage / places) | Wijk in places.json | Klopt de wijk? (OpenStreetMap) |
|---|---|---|---|---|
| Warung Melatie | West | lunchplek, overal gelijk | Nieuwe Westen | ja |
| Simit and Cheese | Zuid | 3 categorieën, maar de homepagekaart toont er 1 | Afrikaanderwijk | **nee: Hillesluis** |
| Little Italy | Centrum | lunchplek + delicatessen | Stadsdriehoek | ja |
| RiF010 | Centrum | kidsproof | Stadsdriehoek | ja |
| Due Tonino | Centrum | restaurant | Goudsesingel | **dit is een straat; OpenStreetMap: Rubroek, wijk Crooswijk** |
| Station Bergweg | Noord | foodhal + borrelplek | Bergpolder | ja |
| Balkon van Europa | Maasvlakte | dagje uit | Maasvlakte | ja |
| Pleinbios | Centrum | dagje uit | Kop van Zuid | ja (OpenStreetMap zegt Katendrecht; beide vallen onder Centrum) |
| De Vijgeboom | Centrum | bruine kroeg | Cool | ja |
| DÂK Rotterdam | Centrum | borrelplek | Cool (Westblaak) | ja, maar met straatnaam erbij |

### D1. De wijk van Simit and Cheese klopt niet
- **Probleem:** Beijerlandselaan 44A ligt volgens OpenStreetMap in Hillesluis, niet in de Afrikaanderwijk. Het gebied (Zuid) klopt wel.
- **Waar:** `src/places.json:19`.
- **Ernst:** laag. **Werk:** klein.

### D2. Due Tonino: de eigen regel zegt Oost, de site zegt Centrum
- **Probleem:** als wijk staat er "Goudsesingel", en dat is een straat. Goudsesingel 67 (postcode 3031) ligt volgens OpenStreetMap in de buurt Rubroek, wijk Crooswijk. Volgens de wijkindeling in `CLAUDE.md` hoort Crooswijk bij **Oost**. De site noemt het overal Centrum (label, kaart, `places.json` en "(centrum)" in het Praktisch-blok). Veel Rotterdammers zullen het ook centrum noemen.
- **Waar:** `src/places.json:52`, het label in `src/posts/due-tonino.html`, en de homepagekaart.
- **Ernst:** laag. **Werk:** klein.
- **Jouw keuze:** óf Centrum houden en Rubroek als uitzondering in de wijkindeling zetten, óf omzetten naar Oost (dan heeft het filter Oost meteen zijn eerste post, zie V4). Vul hoe dan ook een echte wijknaam in.

### D3. DÂK: dubbele haakjes in de kaart-popup
- **Probleem:** de wijk is "Cool (Westblaak)". De popup zet de wijk zelf al tussen haakjes, dus bezoekers zien "Borrelplek · Centrum (Cool (Westblaak))".
- **Waar:** `src/places.json:107`, en `src/kaart.html:145`.
- **Ernst:** laag. **Werk:** klein.

### D4. De homepagekaart van Simit toont maar één van de drie categorieën
- **Probleem:** de kaart staat onder Restaurant, Lunchplek én Kidsproof, maar toont alleen het label "Restaurant". Filter je op Kidsproof, dan verschijnt een kaart met alleen "Restaurant" erop. Dat is verwarrend. In de post zelf staan wel alle drie de labels.
- **Waar:** `src/index.html:139-142`.
- **Ernst:** laag. **Werk:** klein.

### D5. Hetzelfde verhaal staat op drie plekken, in drie versies
- **Probleem:** titel, categorie, gebied en een korte samenvatting staan in de post, op de homepagekaart en in `places.json`. De samenvatting staat er zelfs drie keer, in drie versies (meta description, teaser op de homepage en teaser in `places.json`). Nu klopt alles nog, maar elke nieuwe post is drie keer overtypen, en uiteindelijk gaat er iets uit elkaar lopen.
- **Ernst:** middel (voor de toekomst). **Werk:** groot. Dit is precies de ombouw uit hoofdstuk 8. Tot die tijd vangt de controleronde uit B4 fouten op.

---

## 7. Vormgeving

**Wat goed gaat:** de site heeft een eigen, herkenbaar gezicht: harde zwarte randen, labels in hoofdletters, Rotterdams groen, en een rustige combinatie van Archivo en Source Serif. Dat is niet gedateerd. Deze "rauwe" redactionele stijl is juist nu in de mode, en past bij Rotterdam. De leesbreedte en regelafstand van de artikelen zijn goed. Hieronder staan dus vooral dingen die ontbreken of niet consequent zijn, geen smaakkwesties.

### V1. Nergens een datum bij de verhalen
- **Probleem:** de homepagekaarten hebben geen datum, en in de post staat alleen "maand jaar". Bij eet- en uitgaanstips is versheid belangrijk: DÂK slaat bijvoorbeeld twee zomers over, en openingstijden veranderen. Moderne stadsblogs tonen een datum en vaak ook "bijgewerkt op".
- **Ernst:** middel. **Werk:** klein.

### V2. De homepage heeft geen rangorde
- **Probleem:** het nieuwste verhaal is net zo groot als het oudste. Er is geen "nieuw" of uitgelicht verhaal. Met tien posts gaat dat nog. Met veertig wordt het een lange, gelijkvormige lijst zonder "meer laden", archief of zoekfunctie.
- **Ernst:** middel. **Werk:** middel.
- **Oplossing:** bijvoorbeeld het nieuwste verhaal breed bovenaan, daaronder de rest, en na een stuk of twaalf een knop "Meer verhalen".

### V3. Filters die altijd leeg uitkomen
- **Probleem:** Oost heeft nul posts, dus die knop geeft altijd "Nog geen verhalen". Ook veel combinaties (bijvoorbeeld Bruine kroeg + Zuid) komen leeg uit. Bij een bezoeker komt dat over als "hier is weinig te vinden".
- **Waar:** `src/index.html:111` en `src/kaart.html:65`.
- **Ernst:** laag. **Werk:** klein.
- **Oplossing:** aantallen tonen ("Oost (0)") en lege knoppen grijs maken, of lege filters verbergen.

### V4. Er staat geen gezicht bij "by Ferry"
- **Probleem:** de Over-pagina heeft geen foto van jou, en onder de artikelen staat geen auteursblokje. Bij een persoonlijk merk ben jij het merk. Moderne persoonlijke blogs zetten onder elk artikel een klein rondje met foto en twee zinnen ("Ferry is geboren in Charlois en …"). Dat helpt ook bij Google (zie SEO4).
- **Ernst:** middel. **Werk:** klein.

### V5. Drie keer "terug naar home" per artikel
- **Probleem:** het broodkruimelpad, "← Alle verhalen" bovenaan en "← Alle verhalen" in de footer gaan alle drie naar de homepage. Op de homepage zelf linkt die footerlink naar de pagina waar je al bent.
- **Waar:** `partials/footer.html:10`, en `class="terug"` in de posts.
- **Ernst:** laag. **Werk:** klein.

### V6. Twee verschillende hartjes
- **Probleem:** in het logo staat een tekenhartje ❤ dat groen gekleurd wordt. In de grote kop op de homepage, op de kaartpagina en in de paginatitel staat de emoji 💚. Die ziet er op elke telefoon anders uit (Apple, Android en Windows tekenen emoji elk op hun eigen manier) en is niet precies jouw groen.
- **Ernst:** laag. **Werk:** klein.

### V7. De footer is erg summier
- **Probleem:** geen privacyverklaring (zie P1), geen contactmogelijkheid behalve Instagram, geen jaartal, geen herhaling van het menu.
- **Ernst:** laag. **Werk:** klein.

### V8. Delen kan alleen via WhatsApp of link kopiëren
- **Probleem:** op telefoons gebruiken moderne sites de standaard deelknop van de telefoon zelf. Daarmee kun je delen naar Signal, een Instagram-DM, e-mail, en alles wat de bezoeker verder gebruikt. `deel.js` raadt nu aan de browsernaam of iemand op een telefoon zit (`assets/deel.js:13`). Dat is een onbetrouwbare methode.
- **Ernst:** laag. **Werk:** klein. WhatsApp kan gewoon blijven staan, met daarnaast één knop "Delen…".

### V9. Lange artikelen zonder houvast
- **Probleem:** op Warung Melatie na hebben de artikelen geen tussenkopjes. De praktische informatie (adres, prijs, beste tijd, kidsproof ja of nee) staat helemaal onderaan. Moderne stadsblogs zetten bovenaan vaak een klein "In het kort"-blok en gebruiken elke drie à vier alinea's een tussenkop.
- **Ernst:** middel. **Werk:** klein per post. Als vaste velden ("adres", "prijsklasse", "website") past dit bovendien mooi in het CMS-ontwerp uit 8a.

---

## Extra: privacy en cookies

Dit stond niet in je lijst, maar het hangt direct samen met Best gelezen (8c) en reacties (8d).

### P1. Statistiek en embeds zonder toestemming of privacyverklaring
- **Probleem:** Google Analytics 4 staat op elke pagina en zet cookies. De TikTok-embed zet ook cookies van derden. Er is geen cookiemelding en geen privacyverklaring. Volgens de Nederlandse regels is voor Google Analytics in de meeste gevallen toestemming nodig (er is alleen een uitzondering bij een heel strikte, privacyvriendelijke instelling, en die is voor Google Analytics omstreden). Voor TikTok-embeds is eigenlijk altijd toestemming nodig. Ik ben geen jurist: laat dit even checken, bijvoorbeeld via de website van de Autoriteit Persoonsgegevens.
- **Waar:** de Google-regels in alle bronbestanden, en de TikTok-embed in `src/posts/simit-and-cheese.html:91`.
- **Ernst:** hoog (juridisch risico, en het blokkeert 8c en 8d). **Werk:** middel.
- **Twee routes:**
  1. **Overstappen op lichte statistiek zonder cookies**, zoals Plausible, GoatCounter of Cloudflare Web Analytics. Daarvoor is in de regel geen cookiemelding nodig, het is sneller (zie S7), en deze pakketten hebben ook een koppeling waarmee je "Best gelezen" kunt bouwen. (Dit stond in juli al op je lijstje.)
  2. **Google Analytics houden, met een cookiemelding erbij.** Dat is meer werk, en veel bezoekers klikken "weigeren". Dan heb je minder gegevens voor Best gelezen.
  
  In beide gevallen hoort er een korte privacyverklaring bij, met een link in de footer.

### P2. Goed om te weten: wat in de repo staat, is openbaar
- De repo is openbaar. Voorbereide posts in `src/posts/` zijn dus al vóór hun publicatiedatum te lezen op GitHub. Het commentaar in de workflow ("blijft buiten bereik") geldt alleen voor de website zelf. Is een verhaal echt geheim tot de publicatiedag, zet het dan nog niet in de repo.
- De CARTO-sleutel voor de kaarttegels staat zichtbaar in de pagina. Dat is onvermijdelijk bij kaarten in de browser. Controleer wel of de sleutel in je CARTO-account beperkt is tot rotterdambyferry.nl, zodat anderen hem niet kunnen gebruiken.
- **Ernst:** laag. **Werk:** klein.

---

## 8. Klaar voor de toekomst

**De rode draad:** alle vier de plannen lopen tegen hetzelfde fundament aan. Een post is nu een complete, handgeschreven HTML-pagina (met `<head>`, Google-script, `srcset` en al). De gegevens van die post (titel, datum, categorie, gebied, plek, teaser, foto) staan verspreid over drie bestanden. Alles wat je hierna wilt bouwen, werkt het best met **één bestand per post, met de gegevens netjes in vaste velden**, waaruit de build zelf de pagina, de homepagekaart, de pin, de sitemap en straks de interviewpagina en de Best gelezen-lijst maakt.

Mijn advies: eerst dat fundament leggen, en dan pas Decap CMS. Dan is de rest een uitbreiding en geen verbouwing.

### 8a. Decap CMS (zelf artikelen toevoegen zonder code)

Wat er nu in de weg zit, van groot naar klein:

1. **Posts zijn complete HTML-pagina's.** Decap bewerkt tekstbestanden met vaste velden (frontmatter) en gewone tekst, geen volledige HTML-pagina's. Elke post moet dus worden omgezet naar bijvoorbeeld `src/content/posts/warung-melatie.md`, met velden als titel, omschrijving, datum, categorieën, gebied, wijk, coördinaten, teaser, hoofdfoto met alt-tekst, `instagram_url`, website en de verhaaltekst. De build maakt daar met één sjabloon de HTML van. Eenmalig tien posts omzetten. **Werk: groot.**
2. **Eén post staat nu op drie plekken.** Decap bewerkt één bestand per post. De homepagekaart en de pin in `places.json` moeten dus automatisch uit de velden van de post komen, anders moet je na elk CMS-artikel alsnog met de hand `index.html` en `places.json` bijwerken. Decap heeft een kaartveld waarmee je de coördinaten aanklikt. **Werk: middel.**
3. **`places.json` wordt geknipt op spaties (B2).** Als het CMS dat bestand wegschrijft, kan de kaart leeg raken. Dit eerst oplossen. **Werk: klein.**
4. **Foto's.** Decap uploadt één origineel, vaak een telefoonfoto van 3 tot 8 MB. De `-mobiel`- en `-kaart`-varianten, en de breedte en hoogte in de HTML, maak je nu met PowerShell op je eigen computer. Dat moet dan op GitHub gebeuren, tijdens de build. Daarvoor is de eerste externe package nodig (bijvoorbeeld `sharp`). Die maakt meteen ook WebP (S6). Ook goed om te weten: de map met foto's is nu al 20 MB, en ongeschaalde originelen laten de repo snel groeien. **Werk: middel.**
5. **Tekst omzetten naar HTML, en je huisregels bewaken.** Voor de verhaaltekst is een omzetter nodig (een kleine package, of zelf geschreven). De regels die nu met de hand worden bewaakt, moeten dan in de build: `srcset` en `eager`/`lazy` op foto's, links in de tekst naar een nieuw tabblad, geen gedachtestreepjes, een websitelink in het Praktisch-blok. **Werk: middel.**
6. **Inloggen.** Decap op GitHub Pages heeft geen ingebouwde inlogdienst (die van Netlify werkt alleen op Netlify). Je hebt een kleine hulpdienst nodig die het inloggen met GitHub regelt, bijvoorbeeld een gratis Cloudflare Worker, plus een "OAuth App" in je GitHub-account. Controleer bij het bouwen de actuele Decap-documentatie, want dit verandert weleens. **Werk: middel.**
7. **De workflow kopieert alleen bestanden die bij naam genoemd worden** (`publiceer.yml:59-61`). De beheerpagina `/admin/` van Decap moet daaraan worden toegevoegd. **Werk: klein** (later, want de workflow blijft nu onaangeroerd).
8. **Concepten zijn openbaar.** Decap kan concepten als aparte "takken" in git bewaren, zodat je ze eerst kunt nakijken. Dat past bij je afspraak "pas pushen na akkoord". Maar in een openbare repo zijn die concepten zichtbaar op GitHub (zie P2).
9. **Adressen niet veranderen.** Houd de adressen `/posts/naam.html` precies zoals ze zijn. Anders verlies je je plek in Google en werken gedeelde links niet meer. Ook de statistieken (8c) en eventuele reacties (8d) hangen aan die adressen.
10. **Regeleinden (B1) en de kopregels in elk bestand (B10)** eerst opruimen. Dat scheelt verrassingen tijdens de ombouw.

### 8b. Vaste interviewrubriek "Rotterdam van …"

1. **De build kent maar één soort post, en die hangt aan een plek.** Alles in `build.js` gaat ervan uit dat een post in `posts/` staat en precies één plek in `places.json` heeft. Een interview heeft geen vaste plek. Het gevolg: geen gebied in het broodkruimelpad, **helemaal geen "Misschien vind je dit ook leuk"** (`build.js:232-233` stopt als er geen eigen plek is), en **nooit een plek in de Leestips** (`build.js:272-275` telt alleen posts met een plek). Nodig: een veld "soort: interview", en gerelateerde posts en Leestips baseren op de lijst met posts in plaats van op `places.json`. **Werk: middel.**
2. **Vaste vragen.** Sla de vragen één keer op, bijvoorbeeld in `src/rubrieken/rotterdam-van.json`, en per interview alleen de antwoorden. Een ontwerpkeuze: als je later een vraag anders formuleert, wil je dan dat oude interviews meeveranderen? Zo niet, dan moet elk interview de vraag bewaren zoals hij toen gesteld is. **Werk: klein tot middel.**
3. **Eigen sjabloon.** De rubriek krijgt een eigen opmaak: foto en naam van de geïnterviewde, een intro, en de vragen als tussenkoppen. Na de ombouw uit 8a is dat gewoon een tweede sjabloon naast dat van de posts. Zonder die ombouw is het een tweede handmatig kopieerbestand, met alle nadelen van nu. **Werk: klein** (na 8a).
4. **Filters.** De filterknoppen staan twee keer met de hand in de code (`src/index.html:94-114` en `src/kaart.html:48-68`). Een nieuwe categorie "Interview" betekent op beide plekken bijwerken. Beter: de build maakt de knoppen uit één lijst. **Werk: klein.**
5. **Meerdere favoriete plekken op de kaart.** Als een geïnterviewde vijf favoriete plekken noemt, wil je die misschien op de kaart. `places.json` gaat nu uit van één plek per post (`build.js:162` overschrijft de rest). **Werk: middel.**
6. **Overzichtspagina** `/rotterdam-van/` met alle interviews: die komt vrijwel vanzelf mee als je de categoriepagina's uit SEO3 bouwt.
7. **Toestemming.** Laat de geïnterviewde schriftelijk akkoord geven voor tekst en foto (portretrecht).

### 8c. Blok "Best gelezen" op basis van Google Analytics 4

1. **Eerst de privacykeuze maken (P1).** Met een cookiemelding worden veel bezoekers niet geteld. Bij het huidige aantal bezoekers kan de lijst dan behoorlijk willekeurig worden. De lichte statistiekpakketten uit P1 hebben ook een koppeling waarmee dit blok gebouwd kan worden. Dit bepaalt dus welke kant je op gaat.
2. **Toegang tot Google Analytics.** Je maakt in Google Cloud een "serviceaccount" (een soort robotgebruiker) met leesrechten op je Analytics-property. De sleutel daarvan komt als geheim in de GitHub-instellingen. Dat doe je zelf, met uitleg. **Werk: klein tot middel.**
3. **Ophalen zonder extra packages kan.** Google biedt een package aan, maar het kan ook met ongeveer zestig regels eigen code en de ingebouwde onderdelen van Node. Dat past bij de huidige aanpak zonder packages. **Werk: middel.**
4. **Workflow.** Er komt een extra stap vóór "Site bouwen". De workflow hoeft niets terug te committen, dus de huidige rechten volstaan. Belangrijk: de build moet ook werken **zónder** die gegevens, bijvoorbeeld in je lokale preview of als Google even niet bereikbaar is. Dan toont het blok bijvoorbeeld de nieuwste posts. **Werk: klein.**
5. **Adressen samenvoegen.** Google telt `/posts/rif010` en `/posts/rif010.html` als twee pagina's (SEO9). Ook verwijderde of nog verborgen posts kunnen in de cijfers opduiken. Die moet de build samenvoegen en wegfilteren. **Werk: klein.**
6. **De 60-dagenregel (B11).** Als je twee maanden niets commit, zet GitHub de dagelijkse build uit, en dan wordt "Best gelezen" niet meer bijgewerkt. **Werk: klein.**
7. **Eerst de kopregels opruimen (B10).** Nu staat het Google-script in 14 bestanden. **Werk: klein.**

### 8d. Later misschien: reacties onder artikelen

1. **Dit was een bewuste keuze.** In augustus is besloten om geen reacties op de site te doen (spam en modereren) en lezers naar Instagram te sturen. Het afsluitblok met de Instagram-vraag doet dat nu goed. Reacties op de site kosten vooral tijd: reken op wekelijks modereren.
2. **Een statische site heeft een externe dienst nodig.** De opties:
   - **Giscus:** gratis, en reacties komen in GitHub Discussions. Maar je lezers hebben dan een GitHub-account nodig, en dat heeft bijna niemand in je doelgroep.
   - **Remark42 of Cusdis:** gratis, maar je moet ze zelf op een server draaien.
   - **Hyvor Talk of Commento:** betaald, met servers in de EU.
   - **Disqus:** gratis, maar met reclame, tracking en veel ballast. Niet aan te raden.
3. **Privacy (P1).** Reacties zijn persoonsgegevens. Een privacyverklaring is dan echt nodig, en de reactiedienst moet in je cookiekeuze passen.
4. **Snelheid.** Laad de reactiedienst pas als iemand naar beneden scrolt of op "Toon reacties" klikt, net als de facade bij S1.
5. **Eerst de adressen vastleggen (8a, punt 9).** Reacties worden gekoppeld aan het adres van de pagina. Verandert dat adres later door de CMS-ombouw, dan raak je de reacties kwijt.
6. **Een plek in het sjabloon.** De build plakt nu "Misschien vind je dit ook leuk" vóór `</main>`. Voor reacties is een eigen vaste plek in het postsjabloon nodig. Na de ombouw uit 8a is dat eenvoudig.

---

## Geprioriteerde actielijst

### Eerst: snelle klussen (klein werk, direct effect)

| # | Actie | Bevinding | Ernst |
|---|---|---|---|
| 1 | Regeleinden gelijktrekken in `build.js` en een `.gitattributes` toevoegen | B1, SEO1 | hoog |
| 2 | `places.json` echt als gegevens lezen en wegschrijven, met een controle op het aantal pins | B2 | hoog |
| 3 | TikTok- en YouTube-video pas laden na een klik (facade) | S1, S2, T7 | hoog / middel |
| 4 | Hoofdfoto-preload: `fetchpriority="high"` erbij, en ook posts die met een `post-foto` beginnen | S3, S4 | middel |
| 5 | Menulinks en broodkruimels op mobiel groter tikdoel | M1 | middel |
| 6 | Kaart: standaard inzoomen op Rotterdam en grotere zoomknoppen | M3, M5 | middel |
| 7 | Pauzeknop op de video van Warung Melatie | T1 | middel |
| 8 | Gegevens rechtzetten: wijk van Simit, wijk van DÂK, beslissing over Due Tonino, labels op de Simit-kaart | D1 t/m D4 | laag |
| 9 | Echte kopjes, een "Ga naar inhoud"-link, filterresultaat voorlezen | T3, T4, T5 | laag |
| 10 | Kopieersjabloon niet meer online zetten | SEO5 | laag |
| 11 | Losse terug-link boven artikelen weghalen | M6, V5 | laag |
| 12 | Te lange titels inkorten | SEO2 | middel |

### Daarna: middelgrote klussen

| # | Actie | Bevinding |
|---|---|---|
| 13 | Privacykeuze maken: statistiekpakket, privacyverklaring, eventueel een cookiemelding. **Voorwaarde voor 8c en 8d.** | P1, S7 |
| 14 | Kopregels (Google, favicons) naar één partial `head.html` | B10 |
| 15 | Controleronde in de build, met duidelijke Nederlandse foutmeldingen | B3, B4 |
| 16 | Gebouwde bestanden uit git halen | B9 |
| 17 | Kleinere homepagethumbnails met `srcset`, en een snellere kaartpagina | S5, S8 |
| 18 | Een oplossing voor de 60-dagenregel van GitHub | B11 |
| 19 | Pagina's per categorie en per gebied, en de filterknoppen uit één lijst laten maken | SEO3, 8b punt 4 |
| 20 | Vormgeving: datums tonen, een auteursblokje met foto, een "In het kort"-blok, lege filters grijs | V1, V3, V4, V9 |

### Tot slot: de grote klussen, in deze volgorde

| # | Actie | Waarom deze volgorde |
|---|---|---|
| 21 | **Fundament: posts als gegevens.** Eén bestand per post met vaste velden; de build maakt daaruit de pagina, de homepagekaart en de pin. De adressen blijven gelijk. | Hier bouwen 22 tot en met 25 allemaal op voort. |
| 22 | Fotoverwerking op GitHub, inclusief WebP | Nodig voor het CMS, en meteen sneller. |
| 23 | Decap CMS met inlogdienst | Kan pas als 21 en 22 staan. |
| 24 | Interviewrubriek "Rotterdam van …" | Wordt een tweede sjabloon op het fundament. |
| 25 | Best gelezen | Kan pas na de privacykeuze (13) en de head-partial (14). |
| 26 | Reacties, alleen als je dat dan nog wilt | Pas als de adressen definitief vastliggen. |
