// Bouwt de publiceerbare HTML-bestanden in de repo-root op uit de
// bronbestanden in /src en de gedeelde stukken in /partials.
//
// Gebruik:  node build.js            (bouwt alleen posts die al gepubliceerd
//                                      mogen zijn, zie hieronder)
//           node build.js --alles    (bouwt ook toekomstige posts, handig
//                                      om ze lokaal te kunnen bekijken)
//
// Werking: elk bestand in /src wordt gekopieerd naar dezelfde plek in de
// repo-root, waarbij elke marker <!-- INCLUDE:naam --> wordt vervangen door
// de inhoud van /partials/naam.html. In een partial wordt {{root}} vervangen
// door het juiste padvoorvoegsel ("" in de root, "../" in posts/), zodat
// links als {{root}}index.html overal kloppen. Daarnaast wordt {{deel-url}}
// vervangen door het URL-gecodeerde webadres van de pagina zelf (voor de
// WhatsApp-deelknop in de footer, als reserve zonder JavaScript).
//
// Voorbereide posts: een post in src/posts kan in de <head> een regel
// <meta name="publicatiedatum" content="JJJJ-MM-DD"> krijgen. Staat die
// datum in de toekomst, dan bestaat de post gewoon in de repo maar bouwt
// dit script 'm (nog) niet: geen pagina in /posts, geen kaart op de
// homepage, geen regel in sitemap.xml, geen pin in places.json. Zodra de
// datum is aangebroken, neemt de eerstvolgende build de post vanzelf mee.
// Geen publicatiedatum-regel? Dan wordt de post gewoon meteen gebouwd,
// zoals voorheen.

const fs = require("fs");
const path = require("path");

const bronmap = path.join(__dirname, "src");
const partialsmap = path.join(__dirname, "partials");
const alles = process.argv.includes("--alles");

// "Vandaag" in Nederlandse tijd, als JJJJ-MM-DD — zodat de vergelijking
// klopt ongeacht in welke tijdzone dit script draait (bijv. GitHub Actions
// draait in UTC). Het gaat hier om publicatiedagen, niet -tijdstippen.
function vandaagISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}
const vandaag = vandaagISO();

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

// Eerste ronde: welke posts hebben een publicatiedatum in de toekomst?
// Die basenamen (zonder .html, bv. "pleinbios") komen in verborgenPosts en
// worden verderop overal geweerd: eigen pagina, homepagekaart, sitemap en
// places.json.
const verborgenPosts = new Set();
const publicatiedatums = {};
for (const bronbestand of verzamelHtml(bronmap)) {
  const relatief = path.relative(bronmap, bronbestand);
  const delen = relatief.split(path.sep);
  if (delen[0] !== "posts" || delen[1] === "_template.html") continue;
  const naam = delen[1].slice(0, -".html".length);
  const inhoud = fs.readFileSync(bronbestand, "utf8");
  const match = inhoud.match(/<meta name="publicatiedatum" content="(\d{4}-\d{2}-\d{2})">/);
  if (!match) continue;
  publicatiedatums[naam] = match[1];
  if (!alles && match[1] > vandaag) {
    verborgenPosts.add(naam);
  }
}

// Herkent of een stuk tekst (een kaartje op de homepage, een <url>-blok in
// de sitemap) bij een verborgen post hoort, puur op bestandsnaam — zo maakt
// het niet uit of een link met een schuine streep of backslash geschreven is.
function hoortBijVerborgenPost(stuk) {
  for (const naam of verborgenPosts) {
    if (stuk.includes(`${naam}.html`)) return true;
  }
  return false;
}

let aantal = 0;
for (const bronbestand of verzamelHtml(bronmap)) {
  const relatief = path.relative(bronmap, bronbestand);
  const delen = relatief.split(path.sep);
  const doel = path.join(__dirname, relatief);

  // Voorbereide post met een datum in de toekomst: geen pagina bouwen. Stond
  // er van een eerdere build nog een (bijvoorbeeld na het per ongeluk
  // vervroegen van de datum), ruim die dan op.
  if (delen[0] === "posts" && delen[1] !== "_template.html") {
    const naam = delen[1].slice(0, -".html".length);
    if (verborgenPosts.has(naam)) {
      if (fs.existsSync(doel)) fs.unlinkSync(doel);
      console.log(`○ ${relatief}  (nog niet gepubliceerd: ${publicatiedatums[naam]})`);
      continue;
    }
  }

  // Hoe dieper het bestand zit, hoe meer "../" er in de links moet.
  const diepte = delen.length - 1;
  const root = "../".repeat(diepte);

  // Het echte webadres van deze pagina (de homepage is gewoon de site-root).
  const relatiefUrl = delen.join("/");
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

  // Op de homepage: kaartjes van nog niet gepubliceerde posts eruit filteren.
  if (relatief === "index.html" && verborgenPosts.size > 0) {
    resultaat = resultaat.replace(/<article class="kaart"[\s\S]*?<\/article>\n*/g, (blok) =>
      hoortBijVerborgenPost(blok) ? "" : blok
    );
  }

  fs.mkdirSync(path.dirname(doel), { recursive: true });
  fs.writeFileSync(doel, resultaat);
  console.log(`✓ ${relatief}`);
  aantal++;
}

// sitemap.xml: regels van nog niet gepubliceerde posts eruit filteren.
{
  const bron = fs.readFileSync(path.join(bronmap, "sitemap.xml"), "utf8");
  const resultaat = bron.replace(/  <url>[\s\S]*?<\/url>\n/g, (blok) =>
    hoortBijVerborgenPost(blok) ? "" : blok
  );
  fs.writeFileSync(path.join(__dirname, "sitemap.xml"), resultaat);
  console.log(`✓ sitemap.xml`);
  aantal++;
}

// places.json: pins van nog niet gepubliceerde posts eruit filteren. Werkt
// op de platte tekst (net als sitemap.xml hierboven) in plaats van via
// JSON.parse + stringify, zodat de handgeschreven opmaak (bijvoorbeeld
// "categorie": ["a", "b"] op één regel) intact blijft.
{
  const bron = fs.readFileSync(path.join(bronmap, "places.json"), "utf8");
  const blokken = bron.match(/ {2}\{[\s\S]*?\n {2}\}/g) || [];
  const overgebleven = blokken.filter((blok) => !hoortBijVerborgenPost(blok));
  const resultaat = "[\n" + overgebleven.join(",\n") + "\n]\n";
  JSON.parse(resultaat); // bouwfout meteen laten crashen i.p.v. kapotte JSON publiceren
  fs.writeFileSync(path.join(__dirname, "places.json"), resultaat);
  console.log(`✓ places.json`);
  aantal++;
}

console.log(`Klaar: ${aantal} bestanden opgebouwd.`);
