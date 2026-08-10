// Bouwt de publiceerbare HTML-bestanden in de repo-root op uit de
// bronbestanden in /src en de gedeelde stukken in /partials.
//
// Gebruik:  node build.js   (of: npm run build)
//
// Werking: elk bestand in /src wordt gekopieerd naar dezelfde plek in de
// repo-root, waarbij elke marker <!-- INCLUDE:naam --> wordt vervangen door
// de inhoud van /partials/naam.html. In een partial wordt {{root}} vervangen
// door het juiste padvoorvoegsel ("" in de root, "../" in posts/), zodat
// links als {{root}}index.html overal kloppen. Daarnaast wordt {{deel-url}}
// vervangen door het URL-gecodeerde webadres van de pagina zelf (voor de
// WhatsApp-deelknop in de footer, als reserve zonder JavaScript).

const fs = require("fs");
const path = require("path");

const bronmap = path.join(__dirname, "src");
const partialsmap = path.join(__dirname, "partials");

// De volledige huisstijl wordt in elke pagina geplakt (in plaats van een
// los te downloaden css-bestand): dat scheelt een blokkerende download
// vóór de eerste weergave. assets/style.css blijft de enige bron — na een
// wijziging daarin dus wel opnieuw builden.
const stijl = fs.readFileSync(path.join(__dirname, "assets", "style.css"), "utf8").trimEnd();
const stijlLink = /<link rel="stylesheet" href="(?:\.\.\/)*assets\/style\.css">/;

// Lees alle partials één keer in; haal witruimte aan het einde weg zodat de
// marker (die op zijn eigen regel staat) netjes vervangen wordt.
const partials = {};
for (const bestand of fs.readdirSync(partialsmap)) {
  if (bestand.endsWith(".html")) {
    const naam = bestand.slice(0, -".html".length);
    partials[naam] = fs.readFileSync(path.join(partialsmap, bestand), "utf8").trimEnd();
  }
}

// Verzamel alle HTML-bestanden in /src (ook in submappen zoals src/posts).
function verzamelHtml(map) {
  let lijst = [];
  for (const item of fs.readdirSync(map, { withFileTypes: true })) {
    const volledig = path.join(map, item.name);
    if (item.isDirectory()) {
      lijst = lijst.concat(verzamelHtml(volledig));
    } else if (item.name.endsWith(".html")) {
      lijst.push(volledig);
    }
  }
  return lijst;
}

const SITE = "https://rotterdambyferry.nl/";

let aantal = 0;
for (const bronbestand of verzamelHtml(bronmap)) {
  const relatief = path.relative(bronmap, bronbestand);
  // Hoe dieper het bestand zit, hoe meer "../" er in de links moet.
  const diepte = relatief.split(path.sep).length - 1;
  const root = "../".repeat(diepte);

  // Het echte webadres van deze pagina (de homepage is gewoon de site-root).
  const relatiefUrl = relatief.split(path.sep).join("/");
  const paginaUrl = SITE + (relatiefUrl === "index.html" ? "" : relatiefUrl);

  const inhoud = fs.readFileSync(bronbestand, "utf8");
  let resultaat = inhoud.replace(/<!-- INCLUDE:([a-z-]+) -->/g, (marker, naam) => {
    if (!(naam in partials)) {
      throw new Error(`Onbekende partial "${naam}" in ${relatief} — bestaat partials/${naam}.html wel?`);
    }
    return partials[naam]
      .replace(/\{\{root\}\}/g, root)
      .replace(/\{\{deel-url\}\}/g, encodeURIComponent(paginaUrl));
  });

  // Vervang de stylesheet-link door de volledige stijl, inline in de pagina.
  resultaat = resultaat.replace(stijlLink, "<style>\n" + stijl + "\n  </style>");

  const doel = path.join(__dirname, relatief);
  fs.mkdirSync(path.dirname(doel), { recursive: true });
  fs.writeFileSync(doel, resultaat);
  console.log(`✓ ${relatief}`);
  aantal++;
}

console.log(`Klaar: ${aantal} bestanden opgebouwd.`);
