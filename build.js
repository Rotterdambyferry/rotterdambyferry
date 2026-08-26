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

// Datum van de vróégste git-commit die dit bronbestand raakte — voor
// datePublished in de JSON-LD, als de post zelf geen publicatiedatum-meta
// heeft. Gememoized, zelfde principe als laatsteWijziging hierboven.
// Let op: --follow (nodig om ook de commit van vóór een hernoem/verplaats-
// actie te vinden, zoals de verhuizing naar src/) en --reverse samen geven
// bij git een bekende bug (--follow stopt dan bij de eerste hernoeming) —
// daarom hier de gewone (nieuw-naar-oud) volgorde en de láátste regel pakken
// in plaats van --reverse plus de eerste regel.
const eersteWijzigingCache = new Map();
function eersteWijziging(bronbestand) {
  if (eersteWijzigingCache.has(bronbestand)) return eersteWijzigingCache.get(bronbestand);
  let datum;
  try {
    const regels = execFileSync(
      "git",
      ["log", "--format=%cd", "--date=format:%Y-%m-%d", "--follow", "--", bronbestand],
      { cwd: __dirname, encoding: "utf8" }
    ).trim();
    const lijst = regels ? regels.split("\n") : [];
    datum = lijst.length ? lijst[lijst.length - 1] : vandaag;
  } catch {
    datum = vandaag;
  }
  eersteWijzigingCache.set(bronbestand, datum);
  return datum;
}

// Plekken uit places.json, voor de "Misschien vind je dit ook leuk"-sectie
// onderaan elke post. Alleen al gepubliceerde plekken meetellen (dezelfde
// verborgen-postscheck als hierboven), op postpad ("posts/naam.html") omdat
// dat exact overeenkomt met het al berekende relatiefUrl van elke post.
const livePlekken = JSON.parse(fs.readFileSync(path.join(bronmap, "places.json"), "utf8")).filter(
  (plek) => !hoortBijVerborgenPost(plek.post)
);
const plekPerPost = new Map(livePlekken.filter((plek) => plek.post).map((plek) => [plek.post, plek]));

// Smalle post-foto's herkennen: op desktop wordt een post-foto begrensd tot
// 75vh hoogte (zie ".post-foto img" in style.css), waardoor een staande of
// vierkante foto smaller uitvalt dan de leeskolom (640px, dezelfde breedte
// als het "sizes"-attribuut van elke foto). Zonder extra opmaak oogt die
// overgebleven witruimte als een gat. MAX_HOOGTE is een vaste inschatting
// van 75vh op een gebruikelijk bureaubladscherm (~800px hoog); dat hoeft niet
// exact te kloppen met elk beeldscherm, het is alleen om vooraf te bepalen
// welke foto's de "smal"-klasse (met een rustig kadertje) verdienen.
const MAX_HOOGTE = 600;
const KOLOM_BREEDTE = 640;
function markeerSmallePostFotos(inhoud) {
  return inhoud.replace(/<figure class="post-foto">\s*<img\b[^>]*>/g, (heel) => {
    const breedteMatch = heel.match(/\bwidth="(\d+)"/);
    const hoogteMatch = heel.match(/\bheight="(\d+)"/);
    if (!breedteMatch || !hoogteMatch) return heel;
    const voorspeldeBreedte = (Number(breedteMatch[1]) / Number(hoogteMatch[1])) * MAX_HOOGTE;
    if (voorspeldeBreedte >= KOLOM_BREEDTE) return heel;
    return heel.replace('<figure class="post-foto">', '<figure class="post-foto smal">');
  });
}

// Zoekt binnen `inhoud` de eerste <img> die matcht op `containerRegex` (bijv.
// de hero-foto of de bovenste artikelfoto) en geeft de src/srcset/sizes-
// attributen terug zoals ze daar al staan — die paden zijn al relatief aan
// dezelfde pagina, dus hoeven niet aangepast te worden voor de preload-link
// die verderop in dezelfde <head> komt. Geeft null als er geen match is.
function eersteAfbeelding(inhoud, containerRegex) {
  const match = inhoud.match(containerRegex);
  if (!match) return null;
  const attrs = match[1];
  const src = (attrs.match(/\bsrc="([^"]+)"/) || [])[1];
  if (!src) return null;
  const srcset = (attrs.match(/\bsrcset="([^"]+)"/) || [])[1];
  const sizes = (attrs.match(/\bsizes="([^"]+)"/) || [])[1];
  return { src, srcset, sizes };
}

// Bouwt de preload-hints voor de <head>: de twee kritieke lettertypen (op
// elke pagina, ze worden overal gebruikt voor tekst boven de vouw) en de
// bovenste/grootste afbeelding van de pagina (LCP-kandidaat: de hero-foto op
// de homepage, de hoofdfoto bij een post). Zonder preload ontdekt de browser
// deze bronnen pas nadat hij door het hele inline stijlblok heen is — met
// preload al meteen bij het parsen van de <head>. Geen afbeelding-preload op
// pagina's zonder duidelijke hero-foto (over.html, kaart.html).
function preloadHtml(root, relatief, inhoud) {
  const regels = [
    `  <link rel="preload" as="font" type="font/woff2" href="${root}assets/fonts/archivo-latin.woff2" crossorigin>`,
    `  <link rel="preload" as="font" type="font/woff2" href="${root}assets/fonts/source-serif-4-latin.woff2" crossorigin>`,
  ];

  let afbeelding = null;
  if (relatief === "index.html") {
    afbeelding = eersteAfbeelding(inhoud, /<img class="hero-foto"[^>]*\bid="hero-foto"([^>]*)>/);
  } else if (relatief.startsWith("posts" + path.sep) && relatief !== path.join("posts", "_template.html")) {
    afbeelding = eersteAfbeelding(inhoud, /<figure class="foto">\s*<img\b([^>]*)>/);
  }
  if (afbeelding) {
    const srcsetAttr = afbeelding.srcset ? ` imagesrcset="${afbeelding.srcset}"` : "";
    const sizesAttr = afbeelding.sizes ? ` imagesizes="${afbeelding.sizes}"` : "";
    regels.push(`  <link rel="preload" as="image" href="${afbeelding.src}"${srcsetAttr}${sizesAttr}>`);
  }

  return regels.join("\n");
}

// Bouwt het HTML-blok met 2-3 gerelateerde posts voor de post op
// `relatiefUrl`, of "" als er geen eigen plek of geen kandidaten zijn.
function verwanteHtml(relatiefUrl, root) {
  const eigenPlek = plekPerPost.get(relatiefUrl);
  if (!eigenPlek) return "";

  const kandidaten = livePlekken
    .filter((plek) => plek.post && plek.post !== relatiefUrl)
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

// Bouwt het HTML-blok met de 3 meest recente gepubliceerde posts, voor de
// "Leestips"-sectie op over.html (dezelfde .verwant-component als hierboven,
// dus geen aparte styling nodig). Sorteert op publicatiedatum (de eigen
// publicatiedatum-meta, of anders de vroegste git-commit als een post die
// niet heeft) en respecteert daarmee vanzelf verborgenPosts/livePlekken: een
// post met een datum in de toekomst staat er nooit tussen. Geeft "" terug
// als er (nog) geen enkele post is.
function leestipsHtml(root) {
  const kandidaten = livePlekken
    .filter((plek) => plek.post)
    .map((plek) => {
      const naam = path.basename(plek.post, ".html");
      const datum = publicatiedatums[naam] || eersteWijziging(path.join(bronmap, plek.post));
      return { plek, datum };
    })
    .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0))
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

  return `  <section class="verwant">
    <p class="kop">Leestips</p>
    <div class="verwant-grid">
${items}    </div>
  </section>\n\n`;
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

// Camera-icoontje voor de Instagram-knoppen (zowel de post-specifieke
// "Reageer op Instagram" hieronder als de vaste "Volg op Instagram" die al
// hardcoded in partials/footer.html staat) — hier als constante zodat beide
// plekken exact hetzelfde icoon gebruiken.
const instagramSvg =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9Zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>';

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
  quot: '"',
};
function ontleedEntiteiten(tekst) {
  return tekst.replace(/&([a-z]+);/g, (heel, naam) => entiteiten[naam] ?? heel);
}

// Alt-tekst voor de kaart-popup (kaart.html) hergebruiken uit de eigen
// hero-foto van de post zelf — dat is precies dezelfde foto als het
// image-veld in places.json (de -mobiel-variant), dus hier hoeft niets
// extra's voor bijgehouden te worden. Geeft null als de post niet bestaat
// of geen foto met alt-tekst heeft; kaart.html valt dan terug op de naam.
function popupAltTekst(postPad) {
  try {
    const inhoud = fs.readFileSync(path.join(bronmap, postPad), "utf8");
    const match = inhoud.match(/<figure class="(?:foto|post-foto)">\s*<img[^>]*\salt="([^"]+)"/);
    return match ? ontleedEntiteiten(match[1]) : null;
  } catch {
    return null;
  }
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

  const blok = `  <meta property="og:type" content="${ogType}">
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

  return { blok, ogTitel, beschrijving, ogAfbeelding };
}

// Herkent het (eventueel al aanwezige) og/twitter/canonical-blok in een
// pagina, zodat het vervangen kan worden in plaats van verdubbeld.
const bestaandMetaBlok = /  <meta property="og:type"[\s\S]*?<link rel="canonical" href="[^"]*">/;

const standaardLogo = SITE + "assets/img/favicon-192x192.png";

// "centrum" -> "Centrum". Alle gebieden zijn nu één woord, dus een simpele
// hoofdletter volstaat (voor het broodkruimelpad en het BreadcrumbList-schema).
function gebiedLabel(gebied) {
  return gebied.charAt(0).toUpperCase() + gebied.slice(1);
}

// Zet een schema-object om naar een <script>-tag, met "<" geëscaped zodat
// een toevallige "</script>"-achtige tekenreeks de tag niet kan afbreken.
function jsonLdScript(schema) {
  const json = JSON.stringify(schema, null, 2).replace(/\n/g, "\n  ").replace(/</g, "\\u003c");
  return `  <script type="application/ld+json">\n  ${json}\n  </script>`;
}

// Bouwt het JSON-LD (BlogPosting + BreadcrumbList) voor één post, met de
// og-waarden die metaBlok() toch al berekent (geen dubbel werk) en de
// publicatie-/wijzigingsdatum uit git-geschiedenis. Heeft de post een eigen
// plek in places.json, dan wordt die zowel als contentLocation (de
// schema.org-manier om een artikel aan een locatie te koppelen) als als
// tussenliggende kruimel in het BreadcrumbList meegenomen.
function jsonLdBlok({ bronbestand, naam, relatiefUrl, paginaUrl, ogTitel, beschrijving, ogAfbeelding }) {
  const plek = plekPerPost.get(relatiefUrl);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": paginaUrl },
    headline: ogTitel,
    description: beschrijving,
    image: [ogAfbeelding],
    datePublished: publicatiedatums[naam] || eersteWijziging(bronbestand),
    dateModified: laatsteWijziging(bronbestand),
    author: { "@type": "Person", name: "Ferry", url: SITE + "over.html" },
    publisher: {
      "@type": "Organization",
      name: "Rotterdam by Ferry",
      logo: { "@type": "ImageObject", url: standaardLogo },
    },
  };

  if (plek) {
    schema.contentLocation = {
      "@type": "Place",
      name: plek.naam,
      geo: { "@type": "GeoCoordinates", latitude: plek.lat, longitude: plek.lon },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Rotterdam",
        addressRegion: plek.wijk,
        addressCountry: "NL",
      },
    };
  }

  const kruimels = [{ "@type": "ListItem", position: 1, name: "Home", item: SITE }];
  if (plek) {
    kruimels.push({
      "@type": "ListItem",
      position: 2,
      name: gebiedLabel(plek.gebied),
      item: `${SITE}?gebied=${plek.gebied}`,
    });
  }
  kruimels.push({ "@type": "ListItem", position: kruimels.length + 1, name: ogTitel, item: paginaUrl });
  const broodkruimelSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: kruimels };

  return jsonLdScript(schema) + "\n" + jsonLdScript(broodkruimelSchema);
}

// Bouwt het zichtbare broodkruimelpad boven een artikel: Home, eventueel het
// gebied (als de post een eigen plek in places.json heeft — anders gewoon
// overgeslagen), en de huidige paginatitel. Het gebied linkt naar de
// homepage, alvast gefilterd via ?gebied=... (zie het filterscript in
// src/index.html).
function broodkruimelHtml(relatiefUrl, ogTitel) {
  const plek = plekPerPost.get(relatiefUrl);
  const kruimels = ['<a href="/">Home</a>'];
  if (plek) {
    kruimels.push(`<a href="/?gebied=${plek.gebied}">${gebiedLabel(plek.gebied)}</a>`);
  }
  kruimels.push(`<span aria-current="page">${ogTitel}</span>`);
  return `  <nav class="broodkruimel" aria-label="Kruimelpad">
    ${kruimels.join(' <span aria-hidden="true">&rsaquo;</span> ')}
  </nav>\n`;
}

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
  const { blok: nieuwMetaBlok, ogTitel, beschrijving, ogAfbeelding } = metaBlok({
    inhoud,
    paginaUrl,
    ogType: delen[0] === "posts" ? "article" : "website",
  });
  let resultaat = bestaandMetaBlok.test(inhoud)
    ? inhoud.replace(bestaandMetaBlok, nieuwMetaBlok)
    : inhoud.replace(/(<meta name="description" content="[^"]*">\n)/, `$1${nieuwMetaBlok}\n`);

  // Preload-hints (fonts + eventueel de hero-/hoofdfoto) meteen na de
  // viewport-meta plakken — dus vóór de andere og/twitter-meta's en vóór de
  // (verderop pas ingevoegde) volledige inline <style>. Stonden deze vlak
  // voor </head>, dan ontdekt de browser ze pas nadat hij toch al door de
  // hele stylesheet heen moest parsen, en verliezen ze hun hele nut (heeft
  // op 26 augustus 2026 de LCP juist trager gemaakt i.p.v. sneller).
  resultaat = resultaat.replace(
    /(<meta name="viewport" content="[^"]*">\r?\n)/,
    `$1${preloadHtml(root, relatief, inhoud)}\n`
  );

  // Instagram-knop in de knoppenrij van het deelblok: alleen aanwezig als
  // deze post een eigen <meta name="instagram_url"> heeft (zie
  // NIEUWE-POST.md/_template.html). Geen comments-sectie op de site zelf,
  // dus dit kanaliseert reacties naar de bijbehorende Instagram-post.
  // Ontbreekt de meta, dan wordt de {{instagram-knop}}-marker in de
  // footer-partial gewoon leeg vervangen — geen extra knop, geen lege ruimte.
  // Zelfde .deelknop.instagram-stijl en icoon als de vaste "Volg op
  // Instagram"-knop onderaan de footer.
  const instagramMatch =
    relatief === path.join("posts", "_template.html")
      ? null // anders matcht de uitgecommentte voorbeeldregel in het sjabloon ook
      : inhoud.match(/<meta name="instagram_url" content="([^"]*)">/);
  const instagramKnop = instagramMatch
    ? `\n      <a class="deelknop instagram" href="${instagramMatch[1]}" target="_blank" rel="noopener">${instagramSvg}Reageer op Instagram</a>`
    : "";

  resultaat = resultaat.replace(/<!-- INCLUDE:([a-z-]+) -->/g, (marker, naam) => {
    if (!(naam in partials)) {
      throw new Error(`Onbekende partial "${naam}" in ${relatief} — bestaat partials/${naam}.html wel?`);
    }
    return partials[naam]
      .replace(/\{\{root\}\}/g, root)
      .replace(/\{\{deel-url\}\}/g, encodeURIComponent(paginaUrl))
      .replace(/\{\{instagram-knop\}\}/g, instagramKnop);
  });

  // Vervang de stylesheet-link door de volledige stijl, inline in de pagina.
  resultaat = resultaat.replace(stijlLink, "<style>\n" + stijl + "\n  </style>");

  // Post-foto's die smaller uitvallen dan de leeskolom een "smal"-klasse
  // geven (zie markeerSmallePostFotos hierboven) — geen effect op pagina's
  // zonder post-foto's.
  resultaat = markeerSmallePostFotos(resultaat);

  // Op elke echte post: BlogPosting-schema (JSON-LD) vlak voor </head>.
  if (delen[0] === "posts" && delen[1] !== "_template.html") {
    const postNaam = delen[1].slice(0, -".html".length);
    const jsonLd = jsonLdBlok({
      bronbestand,
      naam: postNaam,
      relatiefUrl,
      paginaUrl,
      ogTitel,
      beschrijving,
      ogAfbeelding,
    });
    resultaat = resultaat.replace("</head>", jsonLd + "\n</head>");

    // Broodkruimelpad vlak na de openende <main class="artikel">, boven de
    // bestaande "← Alle verhalen"-link (die blijft gewoon staan).
    const broodkruimel = broodkruimelHtml(relatiefUrl, ogTitel);
    resultaat = resultaat.replace('<main class="artikel">\n', `<main class="artikel">\n${broodkruimel}`);
  }

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

  // Op over.html (of elke andere pagina met de marker): "Leestips" met de
  // 3 meest recente posts op de aangegeven plek plakken.
  if (resultaat.includes("<!-- LEESTIPS -->")) {
    resultaat = resultaat.replace(/[ \t]*<!-- LEESTIPS -->\n\n?/, leestipsHtml(root));
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
// "categorie": ["a", "b"] op één regel) intact blijft. Heeft een plek een
// eigen post mét foto, dan wordt de alt-tekst van die foto als extra "alt"-
// veld toegevoegd (voor de kaart-popup) — hier hoeft niets voor bijgehouden
// te worden in src/places.json zelf.
{
  const bron = fs.readFileSync(path.join(bronmap, "places.json"), "utf8");
  const blokken = bron.match(/ {2}\{[\s\S]*?\n {2}\}/g) || [];
  const overgebleven = blokken
    .filter((blok) => !hoortBijVerborgenPost(blok))
    .map((blok) => {
      const postMatch = blok.match(/"post": "([^"]+)"/);
      if (!postMatch || !/"image": "[^"]*"/.test(blok)) return blok;
      const alt = popupAltTekst(postMatch[1]);
      if (!alt) return blok;
      // places.json staat (in tegenstelling tot de HTML-bronbestanden) met
      // CRLF-regeleinden in de repo — \r?\n dus, niet zomaar \n.
      return blok.replace(/("image": "[^"]*",\r?\n)/, `$1    "alt": ${JSON.stringify(alt)},\r\n`);
    });
  const resultaat = "[\n" + overgebleven.join(",\n") + "\n]\n";
  JSON.parse(resultaat); // bouwfout meteen laten crashen i.p.v. kapotte JSON publiceren
  fs.writeFileSync(path.join(__dirname, "places.json"), resultaat);
  console.log(`✓ places.json`);
  aantal++;
}

console.log(`Klaar: ${aantal} bestanden opgebouwd.`);
