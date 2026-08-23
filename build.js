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
const { execFileSync } = require("child_process");

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

// Datum van de laatste git-commit die dit bronbestand raakte (voor
// <lastmod> in de sitemap en om "meest recent" te bepalen bij gerelateerde
// posts) — valt terug op vandaag als het bestand nog niet gecommit is, of
// als git om wat voor reden dan ook niet beschikbaar is. Gememoized omdat
// hetzelfde bestand voor meerdere posts als kandidaat langskomt.
const laatsteWijzigingCache = new Map();
function laatsteWijziging(bronbestand) {
  if (laatsteWijzigingCache.has(bronbestand)) return laatsteWijzigingCache.get(bronbestand);
  let datum;
  try {
    datum =
      execFileSync(
        "git",
        ["log", "-1", "--date=format:%Y-%m-%d", "--format=%cd", "--", bronbestand],
        { cwd: __dirname, encoding: "utf8" }
      ).trim() || vandaag;
  } catch {
    datum = vandaag;
  }
  laatsteWijzigingCache.set(bronbestand, datum);
  return datum;
}

// Plekken uit places.json, voor de "Misschien vind je dit ook leuk"-sectie
// onderaan elke post. Alleen al gepubliceerde plekken meetellen (dezelfde
// verborgen-postscheck als hierboven), op postpad ("posts/naam.html") omdat
// dat exact overeenkomt met het al berekende relatiefUrl van elke post.
const livePlekken = JSON.parse(fs.readFileSync(path.join(bronmap, "places.json"), "utf8")).filter(
  (plek) => !hoortBijVerborgenPost(plek.post)
);
const plekPerPost = new Map(livePlekken.map((plek) => [plek.post, plek]));

// Bouwt het HTML-blok met 2-3 gerelateerde posts voor de post op
// `relatiefUrl`, of "" als er geen eigen plek of geen kandidaten zijn.
function verwanteHtml(relatiefUrl, root) {
  const eigenPlek = plekPerPost.get(relatiefUrl);
  if (!eigenPlek) return "";

  const kandidaten = livePlekken
    .filter((plek) => plek.post !== relatiefUrl)
    .map((plek) => {
      const gedeeldeGebied = plek.gebied === eigenPlek.gebied ? 2 : 0;
      const gedeeldeCategorie = plek.categorie.some((c) => eigenPlek.categorie.includes(c)) ? 1 : 0;
      return { plek, score: gedeeldeGebied + gedeeldeCategorie, datum: laatsteWijziging(path.join(bronmap, plek.post)) };
    })
    .sort((a, b) => b.score - a.score || (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0))
    .slice(0, 3);
  if (kandidaten.length === 0) return "";

  const items = kandidaten
    .map(({ plek }) => {
      const thumb = plek.image
        ? `\n        <span class="thumb"><img src="${root}${plek.image}" alt="" loading="lazy"></span>`
        : "";
      return `      <a class="verwant-item" href="${root}${plek.post}">${thumb}
        <span class="titel">${plek.naam}</span>
        <span class="teaser">${plek.teaser}</span>
      </a>\n`;
    })
    .join("");

  return `\n  <section class="verwant">
    <p class="kop">Misschien vind je dit ook leuk</p>
    <div class="verwant-grid">
${items}    </div>
  </section>\n`;
}

// Leest de echte pixelafmetingen van een JPEG-bestand, puur door de
// SOF-marker in de header op te zoeken (geen npm-package nodig). Geeft
// null terug als het bestand ontbreekt of niet als JPEG te lezen is.
function jpegAfmetingen(bestand) {
  try {
    const buf = fs.readFileSync(bestand);
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const lengte = buf.readUInt16BE(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { hoogte: buf.readUInt16BE(i + 5), breedte: buf.readUInt16BE(i + 7) };
      }
      i += 2 + lengte;
    }
  } catch {
    // bestand ontbreekt of is geen leesbare JPEG
  }
  return null;
}

const standaardOgAfbeelding = SITE + "assets/img/hero-skyline-euromast.jpg";

// Zet de HTML-entities om die in deze repo weleens in een <title> gebruikt
// worden (de meeste posts typen speciale tekens al gewoon letterlijk, maar
// niet allemaal) naar het echte teken, zodat og:title/twitter:title er
// hetzelfde uitzien als de rest van de pagina in plaats van met &mdash;
// erin. Puur cosmetisch: entities decoderen ook prima in een meta-attribuut.
const entiteiten = {
  mdash: "—", ndash: "–", eacute: "é", egrave: "è", ecirc: "ê",
  euml: "ë", uuml: "ü", ouml: "ö", iuml: "ï", agrave: "à", ccedil: "ç",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  hellip: "…", amp: "&", nbsp: " ",
};
function ontleedEntiteiten(tekst) {
  return tekst.replace(/&([a-z]+);/g, (heel, naam) => entiteiten[naam] ?? heel);
}

// Bouwt het og/twitter/canonical-blok voor één pagina, op basis van de
// <title> en <meta name="description"> die toch al met de hand op elke
// pagina staan — daar hoeft dus niets nieuws voor bijgehouden te worden.
function metaBlok({ inhoud, paginaUrl, ogType }) {
  const titelMatch = inhoud.match(/<title>([\s\S]*?)<\/title>/);
  const titel = ontleedEntiteiten(titelMatch ? titelMatch[1] : "");
  const ogTitel = titel.replace(/ \| Rotterdam by Ferry$/, "");

  const beschrijvingMatch = inhoud.match(/<meta name="description" content="([^"]*)">/);
  const beschrijving = ontleedEntiteiten(beschrijvingMatch ? beschrijvingMatch[1] : "");

  // Bij een post: de eerste artikelfoto proberen als og:image (zowel de
  // bovenste hero-foto met class="foto" als een post-foto verderop in
  // oudere posts die daarmee beginnen), maar alleen als die ook echt groot
  // genoeg is (Facebook/LinkedIn adviseren minimaal 1200x630) — anders
  // terugvallen op de site-brede standaardfoto.
  let ogAfbeelding = standaardOgAfbeelding;
  const fotoMatch = inhoud.match(/<figure class="(?:foto|post-foto)">\s*<img[^>]*\ssrc="([^"]+)"/);
  if (fotoMatch) {
    const relatiefPad = fotoMatch[1].replace(/^(\.\.\/)+/, "");
    const afmeting = jpegAfmetingen(path.join(__dirname, relatiefPad));
    if (afmeting && afmeting.breedte >= 1200 && afmeting.hoogte >= 630) {
      ogAfbeelding = SITE + relatiefPad.replace(/\\/g, "/");
    }
  }

  return `  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Rotterdam by Ferry">
  <meta property="og:title" content="${ogTitel}">
  <meta property="og:description" content="${beschrijving}">
  <meta property="og:url" content="${paginaUrl}">
  <meta property="og:image" content="${ogAfbeelding}">
  <meta property="og:locale" content="nl_NL">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitel}">
  <meta name="twitter:description" content="${beschrijving}">
  <meta name="twitter:image" content="${ogAfbeelding}">
  <link rel="canonical" href="${paginaUrl}">`;
}

// Herkent het (eventueel al aanwezige) og/twitter/canonical-blok in een
// pagina, zodat het vervangen kan worden in plaats van verdubbeld.
const bestaandMetaBlok = /  <meta property="og:type"[\s\S]*?<link rel="canonical" href="[^"]*">/;

// Verzamelt de pagina's die in sitemap.xml moeten komen: alle echt gebouwde
// pagina's, behalve het kopieersjabloon (dat robots.txt ook al weert).
const sitemapPaginas = [];

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

  // og/twitter/canonical genereren uit de eigen <title>/meta description en
  // vervangen (of, bij _template.html, voor het eerst invoegen na de
  // meta-description-regel).
  const nieuwMetaBlok = metaBlok({
    inhoud,
    paginaUrl,
    ogType: delen[0] === "posts" ? "article" : "website",
  });
  let resultaat = bestaandMetaBlok.test(inhoud)
    ? inhoud.replace(bestaandMetaBlok, nieuwMetaBlok)
    : inhoud.replace(/(<meta name="description" content="[^"]*">\n)/, `$1${nieuwMetaBlok}\n`);

  resultaat = resultaat.replace(/<!-- INCLUDE:([a-z-]+) -->/g, (marker, naam) => {
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

  // Op elke post: "Misschien vind je dit ook leuk" vlak voor </main> plakken.
  if (delen[0] === "posts" && delen[1] !== "_template.html") {
    const verwant = verwanteHtml(relatiefUrl, root);
    if (verwant) {
      resultaat = resultaat.replace(/<\/main>/, verwant + "</main>");
    }
  }

  fs.mkdirSync(path.dirname(doel), { recursive: true });
  fs.writeFileSync(doel, resultaat);
  console.log(`✓ ${relatief}`);
  aantal++;

  if (relatief !== path.join("posts", "_template.html")) {
    sitemapPaginas.push({ url: paginaUrl, bronbestand });
  }
}

// sitemap.xml: automatisch opgebouwd uit de pagina's die hierboven écht
// gebouwd zijn (voorbereide posts met een toekomstige datum zijn dus al
// vanzelf geen onderdeel van sitemapPaginas). Geen handmatig bij te houden
// bestand meer.
{
  const urls = sitemapPaginas
    .map(
      ({ url, bronbestand }) =>
        `  <url>\n    <loc>${url}</loc>\n    <lastmod>${laatsteWijziging(bronbestand)}</lastmod>\n  </url>\n`
    )
    .join("");
  const resultaat =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls +
    `</urlset>\n`;
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
