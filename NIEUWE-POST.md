# Nieuwe blogpost toevoegen — spiekbriefje

Een nieuwe post kost drie stappen: (1) post schrijven, (2) kaart op de
homepage zetten, (3) publiceren.

## Stap 1 — De post zelf

1. Ga naar de map `posts` en kopieer het bestand `_template.html`.
2. Geef de kopie een korte naam zonder spaties of hoofdletters,
   bijvoorbeeld `rif010.html` of `bruine-kroegen-delfshaven.html`.
3. Open het bestand en vervang alles wat tussen [BLOKHAKEN] staat door
   je eigen tekst. Voor een extra alinea kopieer je een regel die met
   `<p>` begint en eindigt op `</p>`.

## Stap 2 — Kaart op de homepage

Open `index.html` en zoek de regel `<main class="grid" id="verhalen">`.
Plak daaronder dit blokje en vul het in:

```html
<article class="kaart" data-categorie="CATEGORIE" data-gebied="GEBIED">
  <div class="tags">
    <span class="tag">Categorie</span>
    <span class="tag gebied">Gebied</span>
  </div>
  <h2><a href="posts/BESTANDSNAAM.html">TITEL VAN JE POST</a></h2>
  <p>KORTE TEASER VAN TWEE ZINNEN.</p>
  <a class="lees" href="posts/BESTANDSNAAM.html">Lees het verhaal &rarr;</a>
</article>
```

Let op bij `data-categorie` en `data-gebied`: gebruik kleine letters en
een streepje in plaats van een spatie. De keuzes die de filters kennen:

- Categorie: `lunchplek`, `bruine-kroeg`, `kidsproof`, `delicatessen`
  (meerdere mag, met een spatie ertussen: `"lunchplek delicatessen"`)
- Gebied: `centrum`, `zuid`, `noord`, `delfshaven`

De zichtbare labels in `<span class="tag">` mogen wél gewoon met
hoofdletter en spatie: "Bruine kroeg", "Delfshaven".

Stond je post al als "binnenkort"-kaart op de homepage? Verwijder dan
uit dat blokje de regel `<span class="status">Binnenkort</span>` en het
woord ` binnenkort` uit `class="kaart binnenkort"`, en voeg de
titel-link en "Lees het verhaal"-regel toe zoals hierboven.

## Stap 3 — Publiceren

Open Claude Code in deze map en zeg simpelweg:

> "Ik heb een nieuwe post geschreven, controleer 'm even en publiceer."

Claude controleert dan of alles klopt en zet het online. (Voor wie het
zelf wil: `git add -A`, dan `git commit -m "Nieuwe post: titel"`, dan
`git push`. Na een minuutje staat het live.)

## Tips

- Bekijk je post eerst lokaal: dubbelklik op het html-bestand, dan
  opent hij in je browser.
- Een nieuwe categorie of gebied toevoegen aan de filters? Vraag het
  aan Claude Code, dat is een kleine aanpassing in `index.html`.
