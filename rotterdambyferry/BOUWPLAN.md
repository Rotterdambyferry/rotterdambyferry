# Rotterdam by Ferry — bouwplan

## Wat zit er in deze map?

- `index.html` — homepage met werkende filters op categorie en gebied
- `posts/little-italy.html` — je eerste blogpost
- `over.html` — over-pagina (op basis van je Instagram-intro)
- `assets/style.css` — de huisstijl (kleuren, letters, labels)

Nieuwe post toevoegen = `posts/little-italy.html` kopiëren, tekst vervangen,
en op de homepage een kaart bijzetten met de juiste `data-categorie` en
`data-gebied`. De filters werken dan automatisch.

## Bekijken op je eigen computer

Pak de zip uit en dubbelklik op `index.html`. De site opent in je browser.

## Live zetten (gratis, via GitHub Pages)

Je hoeft GEEN webhostingpakket bij TransIP te kopen. Zo werkt het:

1. Maak een gratis account op github.com (als je die nog niet hebt).
2. Maak een nieuwe repository, bijvoorbeeld `rotterdambyferry`.
3. Upload alle bestanden uit deze map (kan via de website: "Add file > Upload files").
4. Ga naar Settings > Pages en zet Source op "Deploy from a branch", branch `main`.
   Je site staat dan op `jouwnaam.github.io/rotterdambyferry`.
5. Eigen domein koppelen: vul bij Settings > Pages > Custom domain
   `rotterdambyferry.nl` in en zet "Enforce HTTPS" aan zodra dat kan.
6. In het TransIP-controlepaneel: ga naar je domein > DNS en zet:
   - 4 A-records voor `@` naar: 185.199.108.153, 185.199.109.153,
     185.199.110.153 en 185.199.111.153
   - 1 CNAME-record voor `www` naar `jouwnaam.github.io`
   (Controleer deze IP-adressen even in de actuele GitHub Pages-documentatie
   voor je ze invult.)
7. DNS-wijzigingen kunnen een paar uur duren. Daarna draait
   rotterdambyferry.nl gratis.

Stap 2 t/m 4 kun je ook helemaal door Claude Code laten doen.

## Kant-en-klare opdracht voor Claude Code

Kopieer dit als eerste bericht in Claude Code, in de map met deze bestanden:

---
Dit is de statische website van mijn blog "Rotterdam by Ferry"
(rotterdambyferry.nl): een Nederlandstalige blog over Rotterdam met
lunchplekken, bruine kroegen, kidsproof plekken en fotografie. De huisstijl
staat in assets/style.css (licht beton, zwart, Rotterdams groen, Archivo +
Source Serif 4) — behoud die exact. Elke post heeft een categorie en een
gebied (wijk); op de homepage staan werkende filters. Ik ben geen
programmeur, dus leg elke stap in gewone taal uit en doe kleine stappen.

Help me met het volgende, in deze volgorde:
1. Zet dit project in een git-repository en publiceer het via GitHub Pages.
2. Loop met me door hoe ik mijn domein rotterdambyferry.nl (bij TransIP)
   koppel aan GitHub Pages.
3. Maak het toevoegen van een nieuwe blogpost makkelijker voor me
   (bijvoorbeeld met een template-bestand dat ik kan kopiëren).
Later wil ik nog: een filterbare kaart van Rotterdam waarop alle plekken
staan, te filteren op categorie en gebied. Houd daar in de structuur
rekening mee, maar bouw het nog niet.
---

## Nog te doen (contentkant)

- Foto's toevoegen aan de posts (eigen foto's, zoals op Instagram)
- Blogposts schrijven voor Rif010 en het rondje bruine kroegen Delfshaven
  (staan al als "binnenkort" op de homepage)
- Instagram-bio linken naar rotterdambyferry.nl zodra de site live is
