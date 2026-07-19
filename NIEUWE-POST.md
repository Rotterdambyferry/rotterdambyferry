# Nieuwe blogpost toevoegen — spiekbriefje

Een nieuwe post kost drie stappen: (1) post schrijven, (2) kaart op de
homepage zetten, (3) publiceren. Een foto erbij? Zie het kopje "Foto's"
onderaan.

> **Goed om te weten:** je werkt altijd in de map `src`. De html-bestanden
> daarbuiten (in de hoofdmap en in `posts`) worden automatisch opgebouwd —
> daar hoef (en mag) je niets in te veranderen.

## Stap 1 — De post zelf

1. Ga naar de map `src\posts` en kopieer het bestand `_template.html`.
2. Geef de kopie een korte naam zonder spaties of hoofdletters,
   bijvoorbeeld `rif010.html` of `bruine-kroegen-delfshaven.html`.
3. Open het bestand en vervang alles wat tussen [BLOKHAKEN] staat door
   je eigen tekst. Voor een extra alinea kopieer je een regel die met
   `<p>` begint en eindigt op `</p>`.
4. Deelknoppen (WhatsApp + link kopiëren) hoef je niets meer aan te
   doen: die staan automatisch in de footer van elke pagina.

## Stap 2 — Kaart op de homepage

Open `src\index.html` en zoek de regel `<main class="grid" id="verhalen">`.
Plak daaronder dit blokje en vul het in:

```html
<article class="kaart" data-categorie="CATEGORIE" data-gebied="GEBIED">
  <a class="thumb" href="posts/BESTANDSNAAM.html" aria-hidden="true" tabindex="-1">
    <img src="assets/img/BESTANDSNAAM-kaart.jpg" alt="">
  </a>
  <div class="tags">
    <span class="tag">Categorie</span>
    <span class="tag gebied">Gebied</span>
  </div>
  <h2><a href="posts/BESTANDSNAAM.html">TITEL VAN JE POST</a></h2>
  <p>KORTE TEASER VAN TWEE ZINNEN.</p>
  <a class="lees" href="posts/BESTANDSNAAM.html">Lees het verhaal &rarr;</a>
</article>
```

Geen foto voor deze post? Laat dan het hele blokje met
`<a class="thumb" ...>` tot en met `</a>` gewoon weg — de kaart werkt
ook prima zonder.

Let op bij `data-categorie` en `data-gebied`: gebruik kleine letters en
een streepje in plaats van een spatie. De keuzes die de filters kennen:

- Categorie: `restaurant`, `lunchplek`, `bruine-kroeg`, `kidsproof`, `delicatessen`,
  `foodhal`, `borrelplek`, `dagje-uit`
  (meerdere mag, met een spatie ertussen: `"lunchplek delicatessen"`)
- Gebied: `centrum`, `noord`, `oost`, `zuid`, `west`, `maasvlakte`

Twijfel je welk gebied het is? In CLAUDE.md staat onder "Wijkindeling"
precies welke wijk bij welk gebied hoort (Delfshaven is bijvoorbeeld
West, en Katendrecht en Kop van Zuid tellen als Centrum).

De zichtbare labels in `<span class="tag">` mogen wél gewoon met
hoofdletter en spatie: "Bruine kroeg", "West".

Stond je post al als "binnenkort"-kaart op de homepage? Verwijder dan
uit dat blokje de regel `<span class="status">Binnenkort</span>` en het
woord ` binnenkort` uit `class="kaart binnenkort"`, en voeg de
titel-link en "Lees het verhaal"-regel toe zoals hierboven.

### De plek op de kaartpagina

De site heeft ook een kaart van Rotterdam (`kaart.html`) met een pin
voor elke plek. Die pins staan in het bestand `places.json`. Vraag
Claude Code gewoon: "Zet deze plek ook op de kaart" — de coördinaten
worden dan opgezocht en toegevoegd. (Publiceer je via stap 3 hieronder,
dan gebeurt dit automatisch mee.)

## Stap 3 — Publiceren

Open Claude Code in deze map en zeg simpelweg:

> "Ik heb een nieuwe post geschreven, controleer 'm even en publiceer."

Claude controleert dan of alles klopt en zet het online. (Voor wie het
zelf wil: eerst `npm run build` — dat plakt de header en footer in je
nieuwe post en zet hem klaar in de map `posts` — dan `git add -A`, dan
`git commit -m "Nieuwe post: titel"`, dan `git push`. Na een minuutje
staat het live.)

## Foto's

Elke post kan een grote foto bovenaan hebben, en de kaart op de
homepage een kleine versie. Zo werkt het:

1. Zet je originele foto in de projectmap (naam zonder spaties).
2. Vraag Claude Code: "Verklein deze foto voor de post BESTANDSNAAM."
   Er komen dan twee verkleinde versies in `assets/img`:
   `naam.jpg` (groot, voor het artikel) en `naam-kaart.jpg`
   (klein, voor de homepagekaart). Originelen worden niet mee
   gepubliceerd — die blijven alleen op je eigen computer.
3. In je post: haal in het foto-blok uit het template de
   commentaarregels weg en vul de bestandsnaam en alt-tekst in
   (de alt-tekst beschrijft in één zin wat er op de foto staat —
   voor bezoekers die slecht zien en voor Google).
4. Op de homepagekaart: gebruik het blokje met `class="thumb"` uit
   stap 2 hierboven.

## Tips

- Bekijk je post eerst lokaal: dubbelklik op `start-preview.bat` in de
  projectmap. Die bouwt de site, start een mini-webservertje en opent je
  browser vanzelf op de homepage — klik daar je nieuwe post aan. Klaar
  met kijken? Sluit gewoon het zwarte venster.
- Een nieuwe categorie of gebied toevoegen aan de filters? Vraag het
  aan Claude Code, dat is een kleine aanpassing in `src\index.html`.
