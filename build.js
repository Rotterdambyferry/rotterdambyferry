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
// vervangen door het URL-gecodeerde webadres van de pagina zelf, en
// {{deel-tekst}} door titel plus webadres (voor de WhatsApp-deelknop in de
// footer, als reserve zonder JavaScript).
//
// Voorbereide posts: een post in src/posts kan in de <head> een regel
// <meta name="publicatiedatum" content="JJJJ-MM-DD"> krijgen. Staat die
// datum in de toekomst, dan bestaat de post gewoon in de repo maar bouwt
// dit script 'm (nog) niet: geen pagina in /posts, geen kaart op de
// homepage, geen regel in sitemap.xml, geen pin in places.json. Zodra de
// datum is aangebroken, neemt de eerstvolgende build de post vanzelf mee.
// Geen publicatiedatum-regel? Dan wordt de post gewoon meteen gebouwd,
// zoals voorheen.
//
// Het kopieersjabloon src/posts/_template.html wordt nooit gebouwd: het is
// alleen het startpunt voor een nieuwe post en hoort niet op de live site.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const bronmap = path.join(__dirname, "src");
const partialsmap = path.join(__dirname, "partials");
const alles = process.argv.includes("--alles");

// Leest een tekstbestand en zet Windows-regeleinden (CRLF) meteen om naar
// gewone regeleinden (LF). Alle zoekpatronen in dit script rekenen op LF;
// zonder deze stap vonden ze in een bestand met CRLF stilletjes niets, en
// verdwenen bijvoorbeeld het broodkruimelpad, de Leestips en de og-tags
// (zie AUDIT.md, B1). Zo maakt het niet uit hoe een bestand op schijf staat.
function leesTekst(bestand) {
  return fs.readFileSync(bestand, "utf8").replace(/\r\n/g, "\n");
}

// Schrijft een gebouwd bestand weg, gegarandeerd met LF-regeleinden: de build
// schrijft zelf nooit CRLF, ook niet als er ergens toch een doorheen glipt.
function schrijfTekst(bestand, inhoud) {
  fs.writeFileSync(bestand, inhoud.replace(/\r\n/g, "\n"));
}

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
const stijl = leesTekst(path.join(__dirname, "assets", "style.css")).trimEnd();
const stijlLink = /<link rel="stylesheet" href="(?:\.\.\/)*assets\/style\.css">/;

// Lees alle partials één keer in; haal witruimte aan het einde weg zodat de
// marker (die op zijn eigen regel staat) netjes vervangen wordt.
const partials = {};
for (const bestand of fs.readdirSync(partialsmap)) {
  if (bestand.endsWith(".html")) {
    const naam = bestand.slice(0, -".html".length);
    partials[naam] = leesTekst(path.join(partialsmap, bestand)).trimEnd();
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
// De publicatiedatums van korte tips (src/tips/*.md) staan apart, zodat een
// tip en een voorbereid verhaal met dezelfde naam elkaars datum niet
// overschrijven. Gevuld door leesTips() verderop.
const tipPublicatiedatums = {};
for (const bronbestand of verzamelHtml(bronmap)) {
  const relatief = path.relative(bronmap, bronbestand);
  const delen = relatief.split(path.sep);
  if (delen[0] !== "posts" || delen[1] === "_template.html") continue;
  const naam = delen[1].slice(0, -".html".length);
  const inhoud = leesTekst(bronbestand);
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

// Commits die de hele site tegelijk raakten zonder dat de inhoud van een
// pagina echt veranderde (opmaak, techniek, audit-sweeps). Die staan in
// .lastmod-negeer (één commit-hash per regel, # = toelichting) en tellen
// niet mee voor <lastmod> en dateModified: Google wil daar alleen de datum
// van een echte inhoudswijziging zien. Vergelijkbaar met git's eigen
// .git-blame-ignore-revs. Korte en lange hashes werken allebei.
const negeerCommits = (() => {
  const bestand = path.join(__dirname, ".lastmod-negeer");
  if (!fs.existsSync(bestand)) return [];
  return leesTekst(bestand)
    .split("\n")
    .map((regel) => regel.replace(/#.*/, "").trim().toLowerCase())
    .filter(Boolean);
})();
function isNegeerCommit(hash) {
  return negeerCommits.some((n) => hash.startsWith(n) || n.startsWith(hash));
}

// Datum van de laatste git-commit die dit bronbestand echt inhoudelijk
// raakte (voor <lastmod> in de sitemap en dateModified in de JSON-LD):
// commits uit .lastmod-negeer worden overgeslagen. Raakten alleen zulke
// commits het bestand, dan telt de oudste commit (het ontstaan van het
// bestand). --follow zodat ook commits van vóór een verhuizing (zoals naar
// src/) meetellen. Valt terug op vandaag als het bestand nog niet gecommit
// is, of als git om wat voor reden dan ook niet beschikbaar is. Regels
// splitsen op \r?\n, zodat een Windows-regeleinde (\r) nooit aan een datum
// blijft plakken. Gememoized zodat git per bestand maar één keer draait.
const laatsteWijzigingCache = new Map();
function laatsteGitWijziging(bronbestand) {
  if (laatsteWijzigingCache.has(bronbestand)) return laatsteWijzigingCache.get(bronbestand);
  let datum = vandaag;
  try {
    const regels = execFileSync(
      "git",
      ["log", "--follow", "--date=format:%Y-%m-%d", "--format=%H %cd", "--", bronbestand],
      { cwd: __dirname, encoding: "utf8" }
    )
      .split(/\r?\n/)
      .map((regel) => regel.trim())
      .filter(Boolean)
      .map((regel) => {
        const [hash, dag] = regel.split(" ");
        return { hash, dag };
      });
    if (regels.length) {
      const echt = regels.find(({ hash }) => !isNegeerCommit(hash));
      datum = (echt || regels[regels.length - 1]).dag;
    }
  } catch {
    datum = vandaag;
  }
  laatsteWijzigingCache.set(bronbestand, datum);
  return datum;
}

// Wijzigingsdatum van een pagina: de laatste echte git-wijziging, maar nooit
// eerder dan de publicatiedatum (de eigen publicatiedatum-meta, of anders
// de datum waarop de post aan git is toegevoegd). Een voorbereide post die
// op 1 oktober is gecommit en op 10 oktober verschijnt, krijgt dus 10
// oktober en niet een datum van vóór zijn eigen verschijning.
function laatsteWijziging(bronbestand) {
  const gitDatum = laatsteGitWijziging(bronbestand);
  if (!["posts", "tips"].includes(path.relative(bronmap, bronbestand).split(path.sep)[0])) return gitDatum;
  const publicatie = publicatiedatum(bronbestand);
  return publicatie > gitDatum ? publicatie : gitDatum;
}

// Publicatiedatum van een post: de eigen publicatiedatum-meta, of anders de
// vroegste git-commit (eersteWijziging hieronder). Zelfde regel als
// datePublished in de JSON-LD en de volgorde van de Leestips.
function publicatiedatum(bronbestand) {
  const naam = path.basename(bronbestand).replace(/\.(html|md)$/, "");
  const lijst = bronbestand.endsWith(".md") ? tipPublicatiedatums : publicatiedatums;
  return lijst[naam] || eersteWijziging(bronbestand);
}

// Datum waarop dit bronbestand voor het eerst aan git is toegevoegd: voor
// datePublished in de JSON-LD, de Leestips-volgorde en de lastmod van de
// homepage, als de post zelf geen publicatiedatum-meta heeft. Gememoized,
// zelfde principe als laatsteWijziging hierboven. git log geeft nieuw naar
// oud, dus de laatste regel is de oudste.
const eersteWijzigingCache = new Map();
function eersteWijziging(bronbestand) {
  if (eersteWijzigingCache.has(bronbestand)) return eersteWijzigingCache.get(bronbestand);
  let datum;
  try {
    // Niet met --follow: dat zoekt ook naar kopieën, en ziet een nieuwe post
    // (een kopie van _template.html of van een andere post) dan als
    // voortzetting van dat bestand, met diens oude datum. In plaats daarvan:
    // de commits die het bestand toevoegden (--diff-filter=A), zowel op de
    // plek in src/ als op de oude plek in de repo-root (van vóór de
    // verhuizing naar src/ in juli 2026), en daarvan de oudste.
    // Met schuine strepen, ook op Windows, zodat git het pad zeker herkent.
    const relatief = path.relative(bronmap, bronbestand).split(path.sep).join("/");
    const regels = execFileSync(
      "git",
      [
        "log",
        "--diff-filter=A",
        "--format=%cd",
        "--date=format:%Y-%m-%d",
        "--",
        "src/" + relatief,
        relatief,
      ],
      { cwd: __dirname, encoding: "utf8" }
    ).trim();
    const lijst = regels ? regels.split(/\r?\n/).map((regel) => regel.trim()) : [];
    datum = lijst.length ? lijst[lijst.length - 1] : vandaag;
  } catch {
    datum = vandaag;
  }
  eersteWijzigingCache.set(bronbestand, datum);
  return datum;
}

// Alle plekken uit src/places.json, één keer ingelezen als echte JSON. De
// opmaak van het bestand (spaties, tabs, alles op één regel) maakt dus niet
// uit. Is het bestand kapot, dan stopt de build met een duidelijke melding in
// plaats van een halve of lege kaart te publiceren.
function leesPlekken() {
  let data;
  try {
    data = JSON.parse(leesTekst(path.join(bronmap, "places.json")));
  } catch (fout) {
    throw new Error(
      `src/places.json is geen geldige JSON (${fout.message}). Controleer komma's, aanhalingstekens en haakjes.`
    );
  }
  if (!Array.isArray(data)) {
    throw new Error("src/places.json moet een lijst van plekken zijn: beginnen met [ en eindigen met ].");
  }
  return data;
}
const allePlekken = leesPlekken();

// Plekken die al gepubliceerd mogen worden (dezelfde verborgen-postscheck als
// hierboven), voor de "Misschien vind je dit ook leuk"-sectie onderaan elke
// post en voor de gepubliceerde places.json. Op postpad ("posts/naam.html")
// omdat dat exact overeenkomt met het al berekende relatiefUrl van elke post.
const livePlekken = allePlekken.filter((plek) => !(plek.post && hoortBijVerborgenPost(plek.post)));
const plekPerPost = new Map(livePlekken.filter((plek) => plek.post).map((plek) => [plek.post, plek]));

// "Misschien vind je dit ook leuk": welke posts onder welke post komen. Dit
// wordt één keer voor alle posts samen berekend, zodat de links eerlijk over
// alle posts verdeeld worden, in plaats van dat elke post los van de rest
// dezelfde paar favorieten kiest. Werking:
//  - Relevantie per paar: +2 zelfde gebied, +1 gedeelde categorie, +0,5
//    aangrenzend gebied (zie BUURGEBIEDEN).
//  - In AANTAL_VERWANT rondes kiest elke post (op alfabet van bestandsnaam)
//    er telkens één bij. Voorkeur, in deze volgorde: posts die het plafond
//    nog niet bereikt hebben, dan de hoogste relevantie, dan de minste
//    inkomende links tot nu toe, dan alfabetisch.
//  - Het plafond is het eerlijke aandeel: het totale aantal links gedeeld
//    door het aantal posts. Omdat elke post er evenveel geeft, komt dat op
//    AANTAL_VERWANT uit (alleen bij minder dan vier posts lager), ook bij
//    15 of 20 posts.
//  - Geen datums of git: dezelfde posts geven altijd dezelfde uitkomst, ook
//    als de volgorde in places.json verandert.
const AANTAL_VERWANT = 3;
const BUURGEBIEDEN = {
  centrum: ["noord", "oost", "zuid", "west"],
  noord: ["centrum", "oost", "west"],
  oost: ["centrum", "noord", "zuid"],
  zuid: ["centrum", "oost", "west", "maasvlakte"],
  west: ["centrum", "noord", "zuid", "maasvlakte"],
  maasvlakte: ["zuid", "west"],
};

function relevantie(bron, doel) {
  const zelfdeGebied = doel.gebied === bron.gebied;
  const buurgebied = !zelfdeGebied && (BUURGEBIEDEN[bron.gebied] || []).includes(doel.gebied);
  const gedeeldeCategorie = doel.categorie.some((c) => bron.categorie.includes(c));
  return (zelfdeGebied ? 2 : 0) + (gedeeldeCategorie ? 1 : 0) + (buurgebied ? 0.5 : 0);
}

// Gewone tekenvolgorde in plaats van localeCompare, zodat de uitkomst niet
// afhangt van de taalinstellingen van de computer (lokaal vs. GitHub).
const alfabetisch = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function verdeelVerwantePosts() {
  const posts = [...plekPerPost.values()].sort((a, b) => alfabetisch(a.post, b.post));
  const keuzes = new Map(posts.map((plek) => [plek.post, []]));
  if (posts.length < 2) return keuzes;

  const perPost = Math.min(AANTAL_VERWANT, posts.length - 1);
  const plafond = Math.ceil((posts.length * perPost) / posts.length);
  const inkomend = new Map(posts.map((plek) => [plek.post, 0]));

  for (let ronde = 0; ronde < perPost; ronde++) {
    for (const bron of posts) {
      const gekozen = keuzes.get(bron.post);
      const [beste] = posts
        .filter((doel) => doel !== bron && !gekozen.includes(doel))
        .map((doel) => ({
          doel,
          vol: inkomend.get(doel.post) >= plafond ? 1 : 0,
          score: relevantie(bron, doel),
          inkomend: inkomend.get(doel.post),
        }))
        .sort(
          (a, b) =>
            a.vol - b.vol || b.score - a.score || a.inkomend - b.inkomend || alfabetisch(a.doel.post, b.doel.post)
        );
      gekozen.push(beste.doel);
      inkomend.set(beste.doel.post, inkomend.get(beste.doel.post) + 1);
    }
  }
  return keuzes;
}
const verwantePerPost = verdeelVerwantePosts();

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
// De foto-preload krijgt fetchpriority="high": anders start de browser deze
// download met normale prioriteit, nog vóór hij bij de <img> (die zelf wél
// fetchpriority="high" heeft) aankomt. Bij een post telt de eerste foto,
// of die nu class="foto" heeft of (zoals bij DÂK en Station Bergweg)
// class="post-foto".
function preloadHtml(root, relatief, inhoud) {
  const regels = [
    `  <link rel="preload" as="font" type="font/woff2" href="${root}assets/fonts/archivo-latin.woff2" crossorigin>`,
    `  <link rel="preload" as="font" type="font/woff2" href="${root}assets/fonts/source-serif-4-latin.woff2" crossorigin>`,
  ];

  let afbeelding = null;
  if (relatief === "index.html") {
    afbeelding = eersteAfbeelding(inhoud, /<img class="hero-foto"[^>]*\bid="hero-foto"([^>]*)>/);
  } else if (relatief.startsWith("posts" + path.sep)) {
    afbeelding = eersteAfbeelding(inhoud, /<figure class="(?:foto|post-foto|tip-foto tip-foto-1)">\s*<img\b([^>]*)>/);
  }
  if (afbeelding) {
    const srcsetAttr = afbeelding.srcset ? ` imagesrcset="${afbeelding.srcset}"` : "";
    const sizesAttr = afbeelding.sizes ? ` imagesizes="${afbeelding.sizes}"` : "";
    regels.push(
      `  <link rel="preload" as="image" href="${afbeelding.src}"${srcsetAttr}${sizesAttr} fetchpriority="high">`
    );
  }

  return regels.join("\n");
}

// Bouwt het HTML-blok met de gerelateerde posts voor de post op
// `relatiefUrl` (gekozen door verdeelVerwantePosts hierboven), of "" als er
// geen eigen plek of geen kandidaten zijn.
function verwanteHtml(relatiefUrl, root) {
  const gekozen = verwantePerPost.get(relatiefUrl) || [];
  if (gekozen.length === 0) return "";

  const items = gekozen
    .map((plek) => {
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
    <h2 class="kop">Misschien vind je dit ook leuk</h2>
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
      const datum = publicatiedatum(path.join(bronmap, plek.post));
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
    <h2 class="kop">Leestips</h2>
    <div class="verwant-grid">
${items}    </div>
  </section>\n\n`;
}

// "Alle plekken op een rij" onder de kaart op kaart.html: elke plek met een
// echte post als gewone link, gegroepeerd per gebied. Staat gewoon in de
// HTML, dus ook zichtbaar zonder JavaScript en vindbaar voor Google (de pins
// en popups op de kaart zelf ontstaan pas via JavaScript). Gebieden zonder
// plekken worden overgeslagen; binnen een gebied op alfabet. Respecteert via
// livePlekken vanzelf de publicatiedatum, en een plek waarvan het
// postbestand niet bestaat (tikfout in "post") komt er niet in.
const CATEGORIE_LABELS = {
  restaurant: "Restaurant",
  lunchplek: "Lunchplek",
  "bruine-kroeg": "Bruine kroeg",
  kidsproof: "Kidsproof",
  delicatessen: "Delicatessen",
  foodhal: "Foodhal",
  borrelplek: "Borrelplek",
  "dagje-uit": "Dagje uit",
};
const GEBIED_VOLGORDE = ["centrum", "noord", "oost", "zuid", "west", "maasvlakte"];

// De labels boven een post (categorie en gebied) als link naar de homepage,
// alvast gefilterd: "Kidsproof" gaat naar /?categorie=kidsproof en het
// groene gebiedlabel naar /?gebied=maasvlakte (net als het broodkruimelpad).
// In src/ blijven het gewone <span class="tag">-labels; de build maakt er
// links van, zodat oude en nieuwe posts vanzelf meedoen. Een label dat niet
// als categorie of gebied bestaat (tikfout) blijft een gewoon label, met een
// waarschuwing; een niet-ingevulde [invulplek] uit het sjabloon wordt
// stilzwijgend overgeslagen.
const CATEGORIE_SLUGS = Object.fromEntries(
  Object.entries(CATEGORIE_LABELS).map(([slug, label]) => [label.toLowerCase(), slug])
);

function klikbareLabels(inhoud, relatief) {
  return inhoud.replace(/<div class="tags">[\s\S]*?<\/div>/, (blok) =>
    blok.replace(/<span class="tag( gebied)?">([^<]+)<\/span>/g, (label, isGebied, tekst) => {
      const sleutel = tekst.trim().toLowerCase();
      if (sleutel.startsWith("[")) return label;
      const soort = isGebied ? "gebied" : "categorie";
      const waarde = isGebied ? (GEBIED_VOLGORDE.includes(sleutel) ? sleutel : null) : CATEGORIE_SLUGS[sleutel];
      if (!waarde) {
        console.warn(`⚠ ${relatief}: label "${tekst.trim()}" is geen bekende ${soort}, blijft een gewoon label`);
        return label;
      }
      return `<a class="tag${isGebied || ""}" href="/?${soort}=${waarde}">${tekst}<span class="visueel-verborgen">, meer verhalen</span></a>`;
    })
  );
}

// Tekst veilig in HTML zetten: een & of aanhalingsteken in een plaatsnaam
// kan zo de pagina niet breken.
function htmlTekst(tekst) {
  return String(tekst).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Ook de live korte tips staan in de lijst, als gewone link tussen de
// verhalen, met "Even langs" achter de categorieën in de grijze regel.
function plekkenlijstHtml(root) {
  const plekken = [
    ...livePlekken.filter((plek) => plek.post && fs.existsSync(path.join(bronmap, plek.post))),
    ...liveTips.map((tip) => tipPlekPerPost.get(tip.post)),
  ];
  if (plekken.length === 0) return "";

  // Onbekende gebieden (nog niet in GEBIED_VOLGORDE) komen achteraan, zodat
  // een nieuwe plek nooit stilletjes uit de lijst valt.
  const gebiedVan = (plek) => plek.gebied || "overig";
  const extra = [...new Set(plekken.map(gebiedVan))].filter((g) => !GEBIED_VOLGORDE.includes(g)).sort(alfabetisch);
  const label = (categorie) => CATEGORIE_LABELS[categorie] || gebiedLabel(categorie.replace(/-/g, " "));

  const groepen = [...GEBIED_VOLGORDE, ...extra]
    .map((gebied) => {
      const inGebied = plekken
        .filter((plek) => gebiedVan(plek) === gebied)
        .sort((a, b) => a.naam.localeCompare(b.naam, "nl", { sensitivity: "base" }) || alfabetisch(a.post, b.post));
      if (inGebied.length === 0) return "";
      const items = inGebied
        .map(
          (plek) =>
            `          <li><a href="${root}${plek.post}"><span class="naam">${htmlTekst(plek.naam)}</span> <span class="soort">${[...plek.categorie.map(label), ...(plek.formaat === "tip" ? ["Even langs"] : [])].join(" &middot; ")}</span></a></li>\n`
        )
        .join("");
      return `      <div class="plekkenlijst-groep">
        <h3>${gebiedLabel(gebied)}</h3>
        <ul>
${items}        </ul>
      </div>\n`;
    })
    .join("");

  return `  <section class="plekkenlijst" aria-labelledby="plekkenlijst-kop">
    <h2 class="kop" id="plekkenlijst-kop">Alle plekken op een rij</h2>
    <div class="plekkenlijst-groepen">
${groepen}    </div>
  </section>\n`;
}

// ---------- Korte tips: "Even langs" (src/tips/*.md) ----------
// Naast de verhalen (src/posts/*.html) kent de site korte tips: een plek die
// het noemen waard is, maar geen volledig verhaal krijgt. Eén tip is één
// tekstbestand in src/tips/, met bovenaan vaste velden tussen twee regels
// "---" en daaronder de tekst (alinea's gescheiden door een lege regel).
// Kopieer src/tips/_sjabloon.md om te beginnen. Bestanden die met "_"
// beginnen worden nooit gebouwd.
//
// Uit dat ene bestand maakt de build: de tippagina op /posts/<naam>.html
// (zelfde adres als een verhaal, zodat een tip later op dezelfde URL kan
// uitgroeien tot een verhaal), de regel in sitemap.xml, de og-tags, het
// JSON-LD (met adres en coördinaten), het broodkruimelpad, het blok
// "Misschien vind je dit ook leuk" en de pin in places.json (met
// formaat "tip"). Er hoeft dus niets met de hand in src/places.json.
//
// Bestaat er ook een verhaal met dezelfde naam (src/posts/<naam>.html) dat
// al live is, dan wint het verhaal en wordt de tip overgeslagen, met een
// waarschuwing. Heeft dat verhaal nog een publicatiedatum in de toekomst,
// dan blijft de tip tot die dag gewoon online (ook met een waarschuwing);
// vanaf die dag neemt het verhaal de plek op hetzelfde adres over.
//
// Foutmeldingen die de build stoppen (anders komt er een kapotte pagina
// online): ontbrekende of ongeldige titel, gebied, categorie, bezocht,
// lat/lon, foto's of alt-teksten, een foto die niet in assets/img staat, een
// ongeldige publicatiedatum, een bezoekmaand in de toekomst. Waarschuwingen
// (de build gaat door): meer dan TIP_MAX_WOORDEN woorden, een
// gedachtestreepje, geen straat.
const tipsmap = path.join(bronmap, "tips");
const TIP_MAX_WOORDEN = 150;
const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];
const GEDACHTESTREEPJE = /[\u2013\u2014]|&[mn]dash;/;
const TIP_VELDEN = [
  "titel", "omschrijving", "gebied", "categorie", "bezocht", "straat", "postcode", "lat", "lon",
  "foto1", "alt1", "foto2", "alt2", "deelfoto", "publicatiedatum", "website", "instagram_url", "noindex",
];
// Een link in de tekst: [linktekst](https://...). Het adres mag zelf één
// paar haakjes bevatten (bv. Wikipedia-links).
const TIP_LINK = /\[([^\]]+)\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/;
const TIP_LINK_ALLE = new RegExp(TIP_LINK.source, "g");

// Leest de velden en de tekst uit een tipbestand. Geeft { velden, tekst }.
function leesTipBestand(bestand) {
  const inhoud = leesTekst(bestand);
  // Ruim: een lege regel bovenaan of spaties achter "---" (gebeurt snel in
  // Kladblok) mogen. Het BOM-teken (\uFEFF) dat sommige editors vooraan
  // zetten, wordt overgeslagen.
  const match = inhoud.match(/^\uFEFF?\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
  if (!match) {
    throw new Error(
      `${path.relative(__dirname, bestand)}: bovenaan ontbreken de velden tussen twee regels "---". Kopieer src/tips/_sjabloon.md en vul dat in.`
    );
  }
  const velden = {};
  const dubbel = new Set();
  for (const regel of match[1].split("\n")) {
    if (!regel.trim() || regel.trim().startsWith("#")) continue;
    const dubbelepunt = regel.indexOf(":");
    if (dubbelepunt === -1) continue;
    const sleutel = regel.slice(0, dubbelepunt).trim().toLowerCase();
    const waarde = regel.slice(dubbelepunt + 1).trim();
    if (waarde === "") continue;
    if (sleutel in velden) dubbel.add(sleutel);
    velden[sleutel] = waarde;
  }
  // Een veld dat twee keer ingevuld is, wordt niet stilletjes overschreven:
  // de onderste ingevulde waarde telt, met een melding. (Lege regels zoals
  // "omschrijving:" uit het sjabloon tellen niet mee.)
  for (const sleutel of dubbel) {
    console.warn(
      `⚠ ${path.relative(__dirname, bestand).split(path.sep).join("/")}: het veld "${sleutel}" is twee keer ingevuld; de onderste ingevulde waarde telt.`
    );
  }
  for (const sleutel of Object.keys(velden)) {
    if (!TIP_VELDEN.includes(sleutel)) {
      const bedoeld = TIP_VELDEN.find((v) => v === sleutel.replace(/[- ]/g, "_"));
      console.warn(
        `⚠ ${path.relative(__dirname, bestand).split(path.sep).join("/")}: onbekend veld "${sleutel}" wordt genegeerd${bedoeld ? ` (bedoel je "${bedoeld}"?)` : ""}.`
      );
    }
  }
  return { velden, tekst: match[2].trim() };
}

// Tekst van een tip naar HTML-alinea's. Ondersteunt alleen links in de vorm
// [linktekst](https://...), die (zoals alle links in lopende tekst op deze
// site) in een nieuw tabblad openen. Verder wordt alles veilig als tekst
// neergezet.
function tipAlineas(tekst) {
  return tekst
    .split(/\n\s*\n/)
    .map((alinea) => alinea.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((alinea) => {
      const delen = [];
      let rest = alinea;
      let m;
      while ((m = rest.match(TIP_LINK))) {
        delen.push(htmlTekst(rest.slice(0, m.index)));
        delen.push(`<a href="${htmlTekst(m[2])}" target="_blank" rel="noopener">${htmlTekst(m[1])}</a>`);
        rest = rest.slice(m.index + m[0].length);
      }
      delen.push(htmlTekst(rest));
      return delen.join("");
    });
}

// Gewone tekst zonder links (voor het tellen van woorden en de teaser).
function tipPlatteTekst(tekst) {
  return tekst.replace(TIP_LINK_ALLE, "$1").replace(/\s+/g, " ").trim();
}

// Afkortingen waarna een zin niet ophoudt ("Neem bv. de pannenkoek." is één
// zin). Kleine letters; hoofdletters in de tekst maken niet uit.
const AFKORTINGEN = [
  "bv.", "bijv.", "o.a.", "ca.", "m.n.", "d.w.z.", "enz.", "incl.", "excl.",
  "nr.", "vs.", "st.", "dhr.", "mevr.", "t.o.v.",
  // Ook in Rotterdamse straatnamen: Mr. Visserplein, Dr. Molewaterplein,
  // Ds. Jan Scharpstraat.
  "mr.", "dr.", "ds.", "prof.", "a.s.", "i.p.v.", "z.s.m.", "o.b.v.", "max.", "min.", "ong.",
];
// Afkortingen die in de praktijk nooit een zin afsluiten: titels (die staan
// altijd vóór een naam) en woorden als o.a., bv. en t.o.v., waar vaak een
// naam op volgt ("o.a. Kaapse Brouwers", "t.o.v. De Kuip"). Daarna loopt de
// zin altijd door. De overige afkortingen uit AFKORTINGEN (enz., a.s.,
// z.s.m., min.) kunnen wel een zin afsluiten; daarna loopt de zin alleen
// door als het volgende stuk met een kleine letter of een cijfer begint.
const ALTIJD_DOOR = [
  "st.", "dhr.", "mevr.", "nr.", "mr.", "dr.", "ds.", "prof.",
  "bv.", "bijv.", "o.a.", "m.n.", "d.w.z.", "t.o.v.", "i.p.v.", "o.b.v.", "vs.", "ca.", "ong.", "incl.", "excl.",
];
// Tekens die vóór een woord kunnen staan: haakje en aanhalingstekens, ook
// de typografische van een telefoon („ ‚ “ ‘ ’).
const AANLOOP = "(\"'\u201c\u2018\u2019\u201e\u201a";

// Tekst in zinnen knippen. Alleen een punt, uitroepteken of vraagteken met
// witruimte erachter sluit een zin af, dus tijden als "11.45 tot 12.00" en
// afkortingen als "o.a." blijven heel. Eindigt een stuk op een afkorting uit
// ALTIJD_DOOR, dan hoort het volgende stuk er altijd bij ("Je vindt er o.a.
// Kaapse Brouwers"). Eindigt het op een andere afkorting uit AFKORTINGEN,
// dan alleen als het volgende stuk met een kleine letter of een cijfer
// begint: "Poffertjes, wafels enz. Daarna naar huis" is twee zinnen.
function tipZinnen(tekst) {
  const zinnen = [];
  for (const stuk of tekst.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)) {
    const vorige = zinnen[zinnen.length - 1];
    const laatsteWoord = vorige ? vorige.split(/\s+/).pop().toLowerCase().replace(new RegExp(`^[${AANLOOP}]+`), "") : "";
    const looptDoor =
      ALTIJD_DOOR.includes(laatsteWoord) ||
      (AFKORTINGEN.includes(laatsteWoord) && new RegExp(`^[${AANLOOP}]*[a-z\u00e0-\u00ff0-9]`).test(stuk));
    if (vorige && looptDoor) zinnen[zinnen.length - 1] = `${vorige} ${stuk}`;
    else zinnen.push(stuk);
  }
  return zinnen;
}

// Automatische omschrijving of teaser: zoveel hele zinnen (hooguit
// `aantalZinnen`) als er binnen `max` tekens passen. Past zelfs de eerste
// zin niet, dan wordt die op een heel woord afgekapt met "…". Een
// gedachtestreepje wordt een komma (geen streepjes in zichtbare tekst).
function tipSamenvatting(platteTekst, aantalZinnen, max) {
  const schoon = platteTekst.replace(/\s*[\u2013\u2014]\s*/g, ", ");
  const zinnen = tipZinnen(schoon);
  if (zinnen.length === 0) return "";
  for (let aantal = Math.min(aantalZinnen, zinnen.length); aantal >= 1; aantal--) {
    const tekst = zinnen.slice(0, aantal).join(" ");
    if (tekst.length <= max) return tekst;
  }
  return zinnen[0].slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

// Een foto-veld (bv. "de-kleine-kapitein-gevel.jpg") controleren en de
// afmetingen erbij zoeken. Stopt de build als het bestand of een van de
// gevraagde varianten (-mobiel, -kaart) ontbreekt.
function tipFoto(bestandsnaam, bron, veld, varianten) {
  const naam = bestandsnaam.replace(/^assets\/img\//, "");
  if (!/^[a-z0-9_-]+\.jpg$/.test(naam)) {
    throw new Error(`${bron}: ${veld} "${bestandsnaam}" moet een .jpg in assets/img zijn, met alleen kleine letters, cijfers, streepjes en liggende streepjes.`);
  }
  const basis = naam.slice(0, -".jpg".length);
  const groot = path.join(__dirname, "assets", "img", naam);
  const afmeting = jpegAfmetingen(groot);
  if (!afmeting) throw new Error(`${bron}: ${veld}: assets/img/${naam} bestaat niet (of is geen JPEG).`);
  for (const variant of varianten) {
    if (!fs.existsSync(path.join(__dirname, "assets", "img", `${basis}-${variant}.jpg`))) {
      throw new Error(`${bron}: ${veld}: assets/img/${basis}-${variant}.jpg ontbreekt. Maak de verkleinde varianten eerst (zie NIEUWE-POST.md, "Een korte tip").`);
    }
  }
  return { naam, basis, ...afmeting };
}

// Een categorie of gebied mag als slug ("dagje-uit") of als label
// ("Dagje uit") ingevuld worden; hoofdletters maken niet uit.
function tipCategorie(waarde) {
  const sleutel = waarde.trim().toLowerCase();
  if (CATEGORIE_LABELS[sleutel]) return sleutel;
  return CATEGORIE_SLUGS[sleutel] || null;
}

// Alle tips inlezen en controleren. Geeft een lijst tips, inclusief de
// (nog) niet gepubliceerde, met per tip een vlag `verborgen`.
function leesTips() {
  if (!fs.existsSync(tipsmap)) return [];
  const tips = [];
  for (const bestandsnaam of fs.readdirSync(tipsmap).sort(alfabetisch)) {
    if (!bestandsnaam.endsWith(".md") || bestandsnaam.startsWith("_")) continue;
    const bestand = path.join(tipsmap, bestandsnaam);
    const bron = `src/tips/${bestandsnaam}`;
    const naam = bestandsnaam.slice(0, -".md".length);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(naam)) {
      throw new Error(`${bron}: de bestandsnaam wordt het webadres, gebruik alleen kleine letters, cijfers en streepjes (bv. de-kleine-kapitein.md).`);
    }
    // Een verhaal met dezelfde naam dat nog klaarstaat (publicatiedatum in
    // de toekomst): de melding daarover volgt verderop, alleen als de tip
    // zelf al live is.
    let voorbereidVerhaal = null;
    if (fs.existsSync(path.join(bronmap, "posts", `${naam}.html`))) {
      if (!verborgenPosts.has(naam)) {
        console.warn(`⚠ ${bron}: er bestaat ook een verhaal src/posts/${naam}.html. Het verhaal wint, de tip wordt overgeslagen.`);
        continue;
      }
      voorbereidVerhaal = publicatiedatums[naam];
    }
    const { velden, tekst } = leesTipBestand(bestand);
    const verplicht = (veld, uitleg) => {
      if (!velden[veld]) throw new Error(`${bron}: het veld "${veld}" ontbreekt of is leeg (${uitleg}).`);
      return velden[veld];
    };

    const titel = verplicht("titel", "de naam van de plek, bv. De Kleine Kapitein");
    const bezocht = verplicht("bezocht", "maand van je bezoek als JJJJ-MM, bv. 2026-11; alleen plekken waar je zelf bent geweest");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bezocht)) {
      throw new Error(`${bron}: bezocht "${bezocht}" moet de vorm JJJJ-MM hebben, bv. 2026-11.`);
    }
    // Alleen plekken waar Ferry al is geweest: een bezoekmaand in de toekomst
    // kan niet. (Een publicatiedatum in de toekomst mag wel.)
    if (bezocht > vandaag.slice(0, 7)) {
      throw new Error(`${bron}: bezocht ${bezocht} ligt in de toekomst. Vul de maand in waarin je er echt was (deze maand of eerder).`);
    }

    const gebied = verplicht("gebied", `één van: ${GEBIED_VOLGORDE.join(", ")}`).toLowerCase();
    if (!GEBIED_VOLGORDE.includes(gebied)) {
      throw new Error(`${bron}: gebied "${velden.gebied}" bestaat niet. Kies uit: ${GEBIED_VOLGORDE.join(", ")}.`);
    }
    const categorie = verplicht("categorie", "bv. kidsproof, of meerdere met een komma: lunchplek, kidsproof")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const slug = tipCategorie(c);
        if (!slug) {
          throw new Error(`${bron}: categorie "${c}" bestaat niet. Kies uit: ${Object.keys(CATEGORIE_LABELS).join(", ")}.`);
        }
        return slug;
      });

    const lat = Number(verplicht("lat", "breedtegraad, bv. 51.922104"));
    const lon = Number(verplicht("lon", "lengtegraad, bv. 4.487699"));
    // Ruim rond Rotterdam, inclusief de Maasvlakte: vangt omgedraaide of
    // verkeerd geplakte coördinaten op.
    if (!(lat > 51.8 && lat < 52.05 && lon > 3.9 && lon < 4.7)) {
      throw new Error(`${bron}: lat ${velden.lat} / lon ${velden.lon} liggen niet in Rotterdam. Controleer of ze niet omgedraaid zijn.`);
    }

    const foto1 = tipFoto(verplicht("foto1", "eerste foto, bv. naam-gevel.jpg"), bron, "foto1", ["mobiel", "kaart"]);
    const foto2 = tipFoto(verplicht("foto2", "tweede foto"), bron, "foto2", ["mobiel"]);
    const alt1 = verplicht("alt1", "wat er op foto 1 te zien is, in één zin");
    const alt2 = verplicht("alt2", "wat er op foto 2 te zien is, in één zin");
    const deelfoto = velden.deelfoto ? tipFoto(velden.deelfoto, bron, "deelfoto", []) : null;

    const publicatie = velden.publicatiedatum || null;
    if (publicatie && !/^\d{4}-\d{2}-\d{2}$/.test(publicatie)) {
      throw new Error(`${bron}: publicatiedatum "${publicatie}" moet de vorm JJJJ-MM-DD hebben.`);
    }

    if (!tekst) throw new Error(`${bron}: onder de velden staat nog geen tekst.`);
    if (/\]\(/.test(tekst.replace(TIP_LINK_ALLE, ""))) {
      console.warn(`⚠ ${bron}: een link in de tekst is niet herkend en staat er nu als gewone tekst. Schrijf hem als [linktekst](https://...).`);
    }
    const platteTekst = tipPlatteTekst(tekst);
    const woorden = platteTekst.split(/\s+/).filter(Boolean).length;
    if (woorden > TIP_MAX_WOORDEN) {
      console.warn(`⚠ ${bron}: ${woorden} woorden, een tip is maximaal ${TIP_MAX_WOORDEN}. Misschien wordt dit een verhaal?`);
    }
    for (const [veld, waarde] of [["titel", titel], ["omschrijving", velden.omschrijving || ""], ["tekst", tekst], ["alt1", alt1], ["alt2", alt2]]) {
      if (GEDACHTESTREEPJE.test(waarde)) console.warn(`⚠ ${bron}: gedachtestreepje in ${veld}. Gebruik een komma, dubbele punt of nieuwe zin.`);
    }
    if (!velden.straat) console.warn(`⚠ ${bron}: geen straat ingevuld; het adres ontbreekt dan op de pagina en in Google.`);
    if (velden.instagram_url && !velden.instagram_url.startsWith("https://www.instagram.com/")) {
      throw new Error(`${bron}: instagram_url moet beginnen met https://www.instagram.com/`);
    }
    if (velden.website && !/^https?:\/\//.test(velden.website)) {
      throw new Error(`${bron}: website moet beginnen met https:// (of http://).`);
    }

    const verborgen = Boolean(publicatie && !alles && publicatie > vandaag);
    if (voorbereidVerhaal && !verborgen) {
      console.warn(
        `⚠ ${bron}: er staat ook een verhaal src/posts/${naam}.html klaar (publicatiedatum ${voorbereidVerhaal}). Tot die dag staat de tip online, daarna neemt het verhaal zijn plek over.`
      );
    }
    if (publicatie) tipPublicatiedatums[naam] = publicatie;
    const [jaar, maand] = bezocht.split("-");
    tips.push({
      naam,
      bestand,
      bron,
      post: `posts/${naam}.html`,
      titel,
      omschrijving: velden.omschrijving || tipSamenvatting(platteTekst, 2, 155),
      gebied,
      categorie,
      bezochtTekst: `${MAANDEN[Number(maand) - 1]} ${jaar}`,
      straat: velden.straat || null,
      postcode: velden.postcode || null,
      lat,
      lon,
      foto1,
      foto2,
      alt1,
      alt2,
      deelfoto,
      website: velden.website || null,
      instagramUrl: velden.instagram_url || null,
      noindex: /^(ja|true|1)$/i.test(velden.noindex || ""),
      alineas: tipAlineas(tekst),
      teaser: tipSamenvatting(platteTekst, 1, 110),
      kaartTekst: tipSamenvatting(platteTekst, 3, 260),
      publicatie,
      verborgen,
    });
  }
  return tips;
}
// Een fout in een tipbestand stopt de build met alleen de melding zelf (geen
// lange technische foutregels), zodat direct duidelijk is wat er moet gebeuren.
const alleTips = (() => {
  try {
    return leesTips();
  } catch (fout) {
    console.error(`✗ ${fout.message}`);
    console.error("De build is gestopt; er is niets gepubliceerd. Pas het tipbestand aan en bouw opnieuw.");
    process.exit(1);
  }
})();
const liveTips = alleTips.filter((tip) => !tip.verborgen);

// De pin van een tip, zoals hij in places.json komt (en in de lookups voor
// broodkruimel en JSON-LD). image = de 16:10-kaartvariant van foto 1.
function tipPlek(tip) {
  return {
    naam: tip.titel,
    formaat: "tip",
    lat: tip.lat,
    lon: tip.lon,
    categorie: tip.categorie,
    gebied: tip.gebied,
    post: tip.post,
    image: `assets/img/${tip.foto1.basis}-kaart.jpg`,
    alt: tip.alt1,
    teaser: tip.teaser,
    ...(tip.straat ? { straat: tip.straat } : {}),
    ...(tip.postcode ? { postcode: tip.postcode } : {}),
  };
}
const tipPlekPerPost = new Map(liveTips.map((tip) => [tip.post, tipPlek(tip)]));

// De plek bij een pagina: eerst de verhalen (src/places.json), dan de tips.
function plekVoorPagina(relatiefUrl) {
  return plekPerPost.get(relatiefUrl) || tipPlekPerPost.get(relatiefUrl);
}

// "Misschien vind je dit ook leuk" onder een tip: 3 verhalen. Tips geven
// wel links, maar krijgen er zelf geen in dit blok, zodat de eerlijke
// verdeling onder de verhalen (verdeelVerwantePosts) niet verschuift.
// Volgorde: hoogste relevantie, dan het verhaal met de minste links tot nu
// toe (verhaalblokken plus eerdere tips), dan alfabetisch. Vast resultaat,
// geen datums.
{
  const verhalen = [...plekPerPost.values()].sort((a, b) => alfabetisch(a.post, b.post));
  const inkomend = new Map(verhalen.map((plek) => [plek.post, 0]));
  for (const keuzes of verwantePerPost.values()) {
    for (const plek of keuzes) inkomend.set(plek.post, (inkomend.get(plek.post) || 0) + 1);
  }
  for (const tip of liveTips) {
    const bron = tipPlekPerPost.get(tip.post);
    const gekozen = verhalen
      .map((doel) => ({ doel, score: relevantie(bron, doel) }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          inkomend.get(a.doel.post) - inkomend.get(b.doel.post) ||
          alfabetisch(a.doel.post, b.doel.post)
      )
      .slice(0, AANTAL_VERWANT)
      .map(({ doel }) => doel);
    for (const doel of gekozen) inkomend.set(doel.post, inkomend.get(doel.post) + 1);
    verwantePerPost.set(tip.post, gekozen);
  }
}

// Bouwt de bron-HTML van een tippagina. Daarna gaat die door precies
// dezelfde stappen als een verhaal (header/footer, og-tags, JSON-LD,
// broodkruimel, klikbare labels, inline stijl), zie de hoofdlus hieronder.
// De kop van de pagina volgt src/posts/_template.html.
function tipHtml(tip) {
  const labels = [
    `    <a class="tag formaat-tip" href="/?formaat=tip">Even langs<span class="visueel-verborgen">, meer tips</span></a>`,
    ...tip.categorie.map((c) => `    <span class="tag">${CATEGORIE_LABELS[c]}</span>`),
    `    <span class="tag gebied">${gebiedLabel(tip.gebied)}</span>`,
  ].join("\n");
  // Beide foto's liggend: op de computer naast elkaar in 4:3; anders 3:4.
  const liggend = tip.foto1.breedte > tip.foto1.hoogte && tip.foto2.breedte > tip.foto2.hoogte;
  const foto = (f, alt, nummer, eerste) =>
    `  <figure class="tip-foto tip-foto-${nummer}">
    <img src="../assets/img/${f.naam}" srcset="../assets/img/${f.basis}-mobiel.jpg 800w, ../assets/img/${f.naam} ${f.breedte}w" sizes="(max-width: 640px) 100vw, 312px" alt="${htmlTekst(alt)}" width="${f.breedte}" height="${f.hoogte}" loading="eager"${eerste ? ' fetchpriority="high"' : ""}>
  </figure>`;
  const adres = [
    tip.straat ? `${htmlTekst(tip.straat)}, Rotterdam` : null,
    `<a href="../kaart.html?plek=${tip.naam}">Bekijk op de kaart</a>`,
    tip.website ? `<a href="${htmlTekst(tip.website)}" target="_blank" rel="noopener">Website</a>` : null,
  ]
    .filter(Boolean)
    .join(" &middot; ");
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlTekst(tip.titel)} | Rotterdam by Ferry</title>
  <meta name="description" content="${htmlTekst(tip.omschrijving)}">${tip.instagramUrl ? `\n  <meta name="instagram_url" content="${htmlTekst(tip.instagramUrl)}">` : ""}
  <link rel="icon" href="../assets/img/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../assets/img/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="192x192" href="../assets/img/favicon-192x192.png">
  <link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/style.css">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZQS8RQWBE9"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ZQS8RQWBE9');
  </script>
</head>
<body>

<!-- INCLUDE:header -->

<main class="artikel">
  <div class="tags">
${labels}
  </div>

  <h1>${htmlTekst(tip.titel)}</h1>
  <p class="meta">Door Ferry &middot; Bezocht in ${tip.bezochtTekst}</p>

  <div class="tip-inhoud${liggend ? " liggend" : ""}">
${foto(tip.foto1, tip.alt1, 1, true)}
  <div class="tip-tekst">
${tip.alineas.map((a) => `    <p>${a}</p>`).join("\n")}
  </div>
${foto(tip.foto2, tip.alt2, 2, false)}
  <p class="tip-adres">${adres}</p>
  </div>
</main>

<!-- INCLUDE:footer -->

<script src="../assets/header.js" defer></script>

</body>
</html>
`;
}

// ---------- Tipkaarten op de homepage ----------
// Elke live tip krijgt op de homepage een compacte kaart tussen de
// verhalen (opmaak: .kaart-tip in style.css). De verhaalkaarten blijven met
// de hand in src/index.html staan, in hun eigen volgorde; een tip komt
// vóór het eerste verhaal met een oudere publicatiedatum (bij een gelijke
// datum eerst het verhaal), en anders achteraan. Dat sorteert alleen goed
// zolang de verhaalkaarten zelf op datum staan (nieuwste bovenaan), zoals
// NIEUWE-POST.md voorschrijft. Meerdere tips onderling: nieuwste eerst, dan
// op naam. Alles wat uit het tipbestand komt, gaat door htmlTekst.
function tipKaartHtml(tip) {
  const foto = `assets/img/${tip.foto1.basis}-kaart.jpg`;
  const maat = jpegAfmetingen(path.join(__dirname, foto)) || { breedte: 800, hoogte: 500 };
  const labels = [
    `      <span class="tag formaat-tip">Even langs</span>`,
    ...tip.categorie.map((c) => `      <span class="tag">${CATEGORIE_LABELS[c]}</span>`),
    `      <span class="tag gebied">${gebiedLabel(tip.gebied)}</span>`,
  ].join("\n");
  return `  <article class="kaart kaart-tip" data-formaat="tip" data-categorie="${tip.categorie.join(" ")}" data-gebied="${tip.gebied}">
    <a class="thumb" href="${tip.post}" aria-hidden="true" tabindex="-1">
      <img src="${foto}" alt="${htmlTekst(tip.alt1)}" width="${maat.breedte}" height="${maat.hoogte}" loading="lazy">
    </a>
    <h2><a href="${tip.post}">${htmlTekst(tip.titel)}</a></h2>
    <div class="tags">
${labels}
    </div>
    <p>${htmlTekst(tip.kaartTekst)}</p>
    <a class="lees" href="${tip.post}">Lees de tip &rarr;</a>
  </article>

`;
}

function metTipkaarten(html) {
  const datumVan = (post) => {
    const bestand = path.join(bronmap, post);
    return fs.existsSync(bestand) ? publicatiedatum(bestand) : null;
  };
  // [ \t]*: na het wegfilteren van de kaart van een voorbereid verhaal kan
  // de volgende kaart dieper ingesprongen staan.
  const verhaalkaarten = [...html.matchAll(/^[ \t]*<article class="kaart"[^>]*>[\s\S]*?<\/article>\n/gm)].map((m) => {
    const link = m[0].match(/href="(posts\/[^"]+\.html)"/);
    return { plek: m.index, datum: link ? datumVan(link[1]) : null };
  });
  const eind = html.search(/^  <p class="leeg"/m);
  const achteraan = eind === -1 ? html.indexOf("</main>") : eind;
  const tips = liveTips
    .map((tip) => ({ tip, datum: publicatiedatum(tip.bestand) }))
    .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : alfabetisch(a.tip.naam, b.tip.naam)));
  // Per invoegplek de tips in volgorde verzamelen, daarna van achter naar
  // voren invoegen, zodat de eerdere plekken niet verschuiven.
  const perPlek = new Map();
  for (const { tip, datum } of tips) {
    const ouder = verhaalkaarten.find((k) => k.datum && k.datum < datum);
    const plek = ouder ? ouder.plek : achteraan;
    if (!perPlek.has(plek)) perPlek.set(plek, []);
    perPlek.get(plek).push(tipKaartHtml(tip));
  }
  for (const plek of [...perPlek.keys()].sort((a, b) => b - a)) {
    html = html.slice(0, plek) + perPlek.get(plek).join("") + html.slice(plek);
  }
  return html;
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
  quot: '"', lt: "<", gt: ">",
};
function ontleedEntiteiten(tekst) {
  return tekst.replace(/&([a-z]+);/g, (heel, naam) => entiteiten[naam] ?? heel);
}

// Voor tekst in een HTML-attribuut (content="...") en in het broodkruimelpad:
// een aanhalingsteken of < > mag daar niet letterlijk staan, anders breekt de
// tag (bv. een tip met de titel Bram & Co "De Zaak"). Een & blijft bewust
// zoals hij is: zo blijven de bestaande pagina's precies gelijk.
function attribuutTekst(tekst) {
  return tekst.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Alt-tekst voor de kaart-popup (kaart.html) hergebruiken uit de eigen
// hero-foto van de post zelf — dat is precies dezelfde foto als het
// image-veld in places.json (de -mobiel-variant), dus hier hoeft niets
// extra's voor bijgehouden te worden. Geeft null als de post niet bestaat
// of geen foto met alt-tekst heeft; kaart.html valt dan terug op de naam.
function popupAltTekst(postPad) {
  try {
    const inhoud = leesTekst(path.join(bronmap, postPad));
    const match = inhoud.match(/<figure class="(?:foto|post-foto)">\s*<img[^>]*\salt="([^"]+)"/);
    return match ? ontleedEntiteiten(match[1]) : null;
  } catch {
    return null;
  }
}

// Bouwt het og/twitter/canonical-blok voor één pagina, op basis van de
// <title> en <meta name="description"> die toch al met de hand op elke
// pagina staan — daar hoeft dus niets nieuws voor bijgehouden te worden.
function metaBlok({ inhoud, paginaUrl, ogType, vasteOgAfbeelding }) {
  const titelMatch = inhoud.match(/<title>([\s\S]*?)<\/title>/);
  const titel = ontleedEntiteiten(titelMatch ? titelMatch[1] : "");
  const ogTitel = titel.replace(/ \| Rotterdam by Ferry$/, "");

  const beschrijvingMatch = inhoud.match(/<meta name="description" content="([^"]*)">/);
  const beschrijving = ontleedEntiteiten(beschrijvingMatch ? beschrijvingMatch[1] : "");

  // Bij een post: de eerste artikelfoto proberen als og:image (zowel de
  // bovenste hero-foto met class="foto" als een post-foto verderop in
  // oudere posts die daarmee beginnen), maar alleen als die ook echt groot
  // genoeg is: minimaal 1000 pixels breed en 630 hoog — anders terugvallen
  // op de site-brede standaardfoto. (Tot november 2026 was de grens 1200
  // breed, het advies van Facebook/LinkedIn. Daardoor deelden DÂK (1080
  // breed) en Simit and Cheese (1050 breed) met de algemene skylinefoto in
  // plaats van hun eigen foto, terwijl WhatsApp en Facebook zulke foto's
  // prima groot tonen.)
  // Een tip geeft zijn og-afbeelding zelf mee (vasteOgAfbeelding, zie de
  // hoofdlus): de eigen liggende deelfoto, of anders foto 1.
  let ogAfbeelding = standaardOgAfbeelding;
  const fotoMatch = vasteOgAfbeelding ? null : inhoud.match(/<figure class="(?:foto|post-foto)">\s*<img[^>]*\ssrc="([^"]+)"/);
  if (vasteOgAfbeelding) ogAfbeelding = vasteOgAfbeelding;
  if (fotoMatch) {
    const relatiefPad = fotoMatch[1].replace(/^(\.\.\/)+/, "");
    const afmeting = jpegAfmetingen(path.join(__dirname, relatiefPad));
    if (afmeting && afmeting.breedte >= 1000 && afmeting.hoogte >= 630) {
      ogAfbeelding = SITE + relatiefPad.replace(/\\/g, "/");
    }
  }

  const blok = `  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Rotterdam by Ferry">
  <meta property="og:title" content="${attribuutTekst(ogTitel)}">
  <meta property="og:description" content="${attribuutTekst(beschrijving)}">
  <meta property="og:url" content="${paginaUrl}">
  <meta property="og:image" content="${ogAfbeelding}">
  <meta property="og:locale" content="nl_NL">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attribuutTekst(ogTitel)}">
  <meta name="twitter:description" content="${attribuutTekst(beschrijving)}">
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
  const plek = plekVoorPagina(relatiefUrl);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": paginaUrl },
    headline: ogTitel,
    description: beschrijving,
    image: [ogAfbeelding],
    datePublished: publicatiedatum(bronbestand),
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
        ...(plek.straat ? { streetAddress: plek.straat } : {}),
        ...(plek.postcode ? { postalCode: plek.postcode } : {}),
        addressLocality: "Rotterdam",
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
  const plek = plekVoorPagina(relatiefUrl);
  const kruimels = ['<a href="/">Home</a>'];
  if (plek) {
    kruimels.push(`<a href="/?gebied=${plek.gebied}">${gebiedLabel(plek.gebied)}</a>`);
  }
  kruimels.push(`<span aria-current="page">${attribuutTekst(ogTitel)}</span>`);
  return `  <nav class="broodkruimel" aria-label="Kruimelpad">
    ${kruimels.join(' <span aria-hidden="true">&rsaquo;</span> ')}
  </nav>\n`;
}

// ---------- Snapshots uit 010 (instagram.html) ----------
// De pagina toont de laatste Instagram-posts. Die haalt haal-instagram.js
// vóór de build op (in de publicatie op GitHub) en zet ze in instagram.json
// in de repo-root, met een eigen kopie van elke foto in
// assets/img/instagram/. Beide worden niet gecommit (.gitignore): ze worden
// bij elke publicatie opnieuw gemaakt. Ontbreekt instagram.json (lokaal, of
// als Instagram niet reageerde), dan toont de pagina alleen de intro en de
// knoppen, met noindex en zonder regel in de sitemap.
//
// src/instagram-uitzonderingen.json: per post (de code uit de Instagram-
// link, bv. "DeLpySNuRcr") een eigen "onderschrift", "verbergen": true, of
// een "verhaal" (pad naar een post) als de koppeling niet vanzelf lukt.
const SNAPSHOTS_AANTAL = 6;

const instagramData = (() => {
  const bestand = path.join(__dirname, "instagram.json");
  if (!fs.existsSync(bestand)) return null;
  try {
    return JSON.parse(leesTekst(bestand));
  } catch (fout) {
    console.warn(`⚠ instagram.json is geen geldige JSON (${fout.message}): snapshots overgeslagen`);
    return null;
  }
})();

const instagramUitzonderingen = (() => {
  const bestand = path.join(bronmap, "instagram-uitzonderingen.json");
  if (!fs.existsSync(bestand)) return {};
  try {
    return JSON.parse(leesTekst(bestand));
  } catch (fout) {
    throw new Error(`src/instagram-uitzonderingen.json is geen geldige JSON: ${fout.message}`);
  }
})();

// De code van een Instagram-post uit een link: .../p/DeLpySNuRcr/ of
// .../reel/DeLpySNuRcr/ (met of zonder accountnaam ervoor).
function instagramCode(link) {
  const match = String(link || "").match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// Welke live post hoort bij welke Instagram-post? Via de
// <meta name="instagram_url"> die posts al hebben (voor de knop "Reageer op
// Instagram"). Posts met een publicatiedatum in de toekomst tellen niet mee.
const postPerInstagramCode = new Map();
for (const bestand of fs.readdirSync(path.join(bronmap, "posts"))) {
  if (!bestand.endsWith(".html") || bestand === "_template.html") continue;
  const naam = bestand.slice(0, -".html".length);
  if (verborgenPosts.has(naam)) continue;
  const match = leesTekst(path.join(bronmap, "posts", bestand)).match(/<meta name="instagram_url" content="([^"]*)">/);
  const code = match && instagramCode(match[1]);
  if (code) postPerInstagramCode.set(code, `posts/${bestand}`);
}

// Kort onderschrift uit een Instagram-caption: de eerste regel, daarvan de
// eerste zin, zonder de hashtags aan het eind (een hashtag midden in een
// zin blijft als gewoon woord staan), maximaal ± 130 tekens. Gedachtestreepjes
// worden komma's (huisstijl: geen streepjes in zichtbare tekst).
function snapshotOnderschrift(caption) {
  let tekst = String(caption || "")
    .split(/\r?\n/)
    .map((regel) =>
      regel
        .replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, "") // rij hashtags aan het eind: weg
        .replace(/#([^\s#]+)/g, "$1") // hashtag midden in een zin: woord blijft, # weg
        .replace(/\s+/g, " ")
        .trim()
    )
    .find((regel) => regel.replace(/[^\p{L}\p{N}]/gu, "").length > 0) || "";
  tekst = tekst.replace(/\s*[—–]\s*/g, ", ");
  const zin = tekst.match(/^.+?[.!?](?=\s|$)/);
  if (zin && zin[0].length >= 20) tekst = zin[0];
  if (tekst.length > 130) tekst = tekst.slice(0, 130).replace(/\s+\S*$/, "") + "…";
  return tekst || "Snapshot uit 010";
}

// Datum van een post in Nederlandse tijd: als tekst ("10 november 2026")
// en als JJJJ-MM-DD (voor <time datetime> en de lastmod). Zonder geldige
// tijd: leeg, dus geen datum op de tegel.
function snapshotDatum(iso) {
  const datum = iso ? new Date(iso) : null;
  if (!datum || isNaN(datum)) return "";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }).format(datum);
}
function snapshotDag(iso) {
  const datum = iso ? new Date(iso) : null;
  if (!datum || isNaN(datum)) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(datum);
}

// Een "verhaal" uit de uitzonderingen alleen gebruiken als die post bestaat
// en al gepubliceerd is; anders een melding in plaats van een dode link.
function geldigVerhaal(verhaal, code) {
  if (!verhaal) return null;
  const pad = String(verhaal).replace(/^\/+/, "");
  const naam = path.basename(pad, ".html");
  if (!/^posts\/[^/]+\.html$/.test(pad) || !fs.existsSync(path.join(bronmap, pad)) || verborgenPosts.has(naam)) {
    console.warn(`⚠ instagram-uitzonderingen.json: verhaal ${verhaal} bij ${code} bestaat (nog) niet: genegeerd`);
    return null;
  }
  return pad;
}

// De snapshots die echt getoond worden: verborgen posts eruit, foto moet
// bestaan, maximaal SNAPSHOTS_AANTAL.
const snapshots = (() => {
  if (!instagramData || !Array.isArray(instagramData.posts)) return [];
  return instagramData.posts
    .map((post) => ({ ...post, code: post.code || instagramCode(post.permalink) }))
    .filter((post) => /^https:\/\/www\.instagram\.com\//.test(String(post.permalink || "")))
    .filter((post) => post.code && !(instagramUitzonderingen[post.code] || {}).verbergen)
    .filter((post) => post.afbeelding && fs.existsSync(path.join(__dirname, post.afbeelding)))
    .slice(0, SNAPSHOTS_AANTAL)
    .map((post) => {
      const uitzondering = instagramUitzonderingen[post.code] || {};
      return {
        ...post,
        onderschrift: uitzondering.onderschrift || snapshotOnderschrift(post.caption),
        verhaal: geldigVerhaal(uitzondering.verhaal, post.code) || postPerInstagramCode.get(post.code) || null,
      };
    });
})();
// Alleen echte Instagram-gegevens maken de pagina vindbaar (sitemap, geen
// noindex). Voorbeeldgegevens (node haal-instagram.js --voorbeeld) zijn
// puur om lokaal te bekijken.
const snapshotsEcht = snapshots.length > 0 && instagramData && instagramData.bron === "instagram";
const nieuwsteSnapshotDatum = snapshotsEcht
  ? snapshots.map((post) => snapshotDag(post.datum)).filter(Boolean).sort().pop()
  : null;

function snapshotsHtml(root) {
  if (snapshots.length === 0) {
    return `<p class="snapshots-leeg">De nieuwste foto's staan hier binnenkort. Tot die tijd vind je ze direct op Instagram.</p>\n\n`;
  }
  const items = snapshots
    .map((post) => {
      const tekst = htmlTekst(post.onderschrift);
      const datum = snapshotDatum(post.datum);
      const verhaal = post.verhaal
        ? `\n      <a class="snapshot-verhaal" href="${root}${post.verhaal}">Lees het verhaal &rarr;</a>`
        : "";
      return `  <li class="snapshot">
    <a class="snapshot-foto" href="${htmlTekst(post.permalink)}" target="_blank" rel="noopener noreferrer">
      <img src="${root}${post.afbeelding}" alt="${tekst}" width="1080" height="1350" loading="lazy">
    </a>
    <div class="snapshot-tekst">${datum ? `\n      <time datetime="${snapshotDag(post.datum)}">${datum}</time>` : ""}
      <p>${tekst}</p>${verhaal}
    </div>
  </li>
`;
    })
    .join("");
  return `<p class="snapshots-uitleg">Hieronder alvast een kijkje op mijn Instagram: dit zijn de laatste ${snapshots.length} foto's uit Rotterdam.</p>\n<ul class="snapshots">\n${items}</ul>\n\n`;
}

// Verzamelt de pagina's die in sitemap.xml moeten komen: alle echt gebouwde
// pagina's (het kopieersjabloon wordt niet gebouwd, zie hieronder).
const sitemapPaginas = [];

// De pagina's die gebouwd worden: alle HTML in /src, plus een pagina per
// korte tip (src/tips/*.md). Een tip heeft geen HTML-bronbestand: tipHtml()
// maakt de bron-HTML, en bronbestand is dan het .md-bestand (voor de
// git-datums). Tips komen achteraan, zodat de volgorde van al het andere
// (en dus van sitemap.xml) gelijk blijft.
const bronnen = verzamelHtml(bronmap).map((bronbestand) => ({ bronbestand, relatief: path.relative(bronmap, bronbestand) }));
for (const tip of alleTips) {
  bronnen.push({ bronbestand: tip.bestand, relatief: path.join("posts", `${tip.naam}.html`), tip });
}

let aantal = 0;
for (const { bronbestand, relatief, tip } of bronnen) {
  const delen = relatief.split(path.sep);
  const doel = path.join(__dirname, relatief);

  // Korte tip met een publicatiedatum in de toekomst: net als bij een
  // verhaal geen pagina bouwen, en een eventuele oude versie opruimen.
  if (tip && tip.verborgen) {
    if (fs.existsSync(doel)) fs.unlinkSync(doel);
    console.log(`○ ${relatief}  (tip, nog niet gepubliceerd: ${tip.publicatie})`);
    continue;
  }

  // Het kopieersjabloon (src/posts/_template.html) is alleen het startpunt
  // voor een nieuwe post en hoort niet op de live site. Stond er van een
  // eerdere build nog een gebouwde versie in posts/, ruim die dan op.
  if (relatief === path.join("posts", "_template.html")) {
    if (fs.existsSync(doel)) fs.unlinkSync(doel);
    console.log(`○ ${relatief}  (sjabloon, wordt niet gepubliceerd)`);
    continue;
  }

  // Voorbereide post met een datum in de toekomst: geen pagina bouwen. Stond
  // er van een eerdere build nog een (bijvoorbeeld na het per ongeluk
  // vervroegen van de datum), ruim die dan op. Geldt alleen voor verhalen:
  // een tip met dezelfde naam wordt wel gebouwd (zie leesTips). Die tip
  // gebruikt hetzelfde adres in posts/, dus dan wordt die pagina niet
  // opgeruimd, ongeacht of de tip in deze lus vóór of na het verhaal komt.
  if (!tip && delen[0] === "posts") {
    const naam = delen[1].slice(0, -".html".length);
    if (verborgenPosts.has(naam)) {
      const tipOpZelfdeAdres = liveTips.some((t) => t.naam === naam);
      if (!tipOpZelfdeAdres && fs.existsSync(doel)) fs.unlinkSync(doel);
      console.log(`○ ${relatief}  (nog niet gepubliceerd: ${publicatiedatums[naam]})`);
      continue;
    }
  }

  // Hoe dieper het bestand zit, hoe meer "../" er in de links moet.
  // Uitzondering: 404.html. Die pagina toont GitHub Pages bij elk adres dat
  // niet bestaat, dus ook bij /posts/bestaat-niet.html of nog dieper. Een
  // relatief pad klopt daar niet; daarom beginnen alle paden op die pagina
  // met "/" (vanaf de hoofdmap van de site).
  const is404 = relatief === "404.html";
  const diepte = delen.length - 1;
  const root = is404 ? "/" : "../".repeat(diepte);

  // Het echte webadres van deze pagina (de homepage is gewoon de site-root).
  const relatiefUrl = delen.join("/");
  const paginaUrl = SITE + (relatiefUrl === "index.html" ? "" : relatiefUrl);

  const inhoud = tip ? tipHtml(tip) : leesTekst(bronbestand);

  // Waarschuwing (geen stop) voor foto's zonder alt-tekst in de bron: een
  // homepagekaart, postfoto of videoplaatje met alt="" of zonder alt. Zo
  // valt het meteen op in de terminal als een kopieerblokje niet is
  // ingevuld (zo ontstonden de lege alts bij Warung Melatie en Simit and
  // Cheese). De fotootjes van "Misschien vind je dit ook leuk" en de
  // Leestips maakt de build zelf pas verderop, met een bewust lege alt (de
  // naam staat er als linktekst naast): die vallen hier dus buiten.
  // Ook een niet-ingevulde invulplek telt als lege alt: tekst tussen
  // [blokhaken] (zoals in _template.html) of drie of meer woorden in
  // hoofdletters achter elkaar (zoals in de blokjes uit NIEUWE-POST.md).
  for (const img of inhoud.match(/<img\b[^>]*>/g) || []) {
    const alt = img.match(/\balt="([^"]*)"/);
    const tekst = alt ? alt[1].trim() : "";
    const invulplek = /\[|\b[A-Z]{2,}(?:[ ,]+[A-Z]{2,}){2,}/.test(tekst);
    if (!tekst || invulplek) {
      const bron = (img.match(/\bsrc="([^"]*)"/) || [, "(onbekend)"])[1];
      const wat = invulplek ? "alt-tekst nog niet ingevuld" : "foto zonder alt-tekst";
      console.warn(`⚠ ${relatief}: ${wat}: ${bron}`);
    }
  }

  // og/twitter/canonical genereren uit de eigen <title>/meta description en
  // vervangen (of, bij een post zonder eigen og-blok in de bron, voor het
  // eerst invoegen na de meta-description-regel).
  const { blok: nieuwMetaBlok, ogTitel, beschrijving, ogAfbeelding } = metaBlok({
    inhoud,
    paginaUrl,
    ogType: delen[0] === "posts" ? "article" : "website",
    // Tip: de eigen deelfoto, of foto 1 als die groot genoeg is (minimaal
    // 1000x630), anders de standaardfoto.
    vasteOgAfbeelding: tip
      ? tip.deelfoto
        ? `${SITE}assets/img/${tip.deelfoto.naam}`
        : tip.foto1.breedte >= 1000 && tip.foto1.hoogte >= 630
          ? `${SITE}assets/img/${tip.foto1.naam}`
          : standaardOgAfbeelding
      : undefined,
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
  const instagramMatch = inhoud.match(/<meta name="instagram_url" content="([^"]*)">/);
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
      // Zelfde bericht als assets/deel.js maakt (titel, nieuwe regel, URL),
      // zodat de WhatsApp-knop ook zonder JavaScript de titel meestuurt.
      .replace(/\{\{deel-tekst\}\}/g, encodeURIComponent(ogTitel + "\n" + paginaUrl))
      .replace(/\{\{instagram-knop\}\}/g, instagramKnop);
  });

  // Vervang de stylesheet-link door de volledige stijl, inline in de pagina.
  resultaat = resultaat.replace(stijlLink, "<style>\n" + stijl + "\n  </style>");

  // Post-foto's die smaller uitvallen dan de leeskolom een "smal"-klasse
  // geven (zie markeerSmallePostFotos hierboven) — geen effect op pagina's
  // zonder post-foto's.
  resultaat = markeerSmallePostFotos(resultaat);

  // Op elke post: BlogPosting-schema (JSON-LD) vlak voor </head>.
  if (delen[0] === "posts") {
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
    // labels. (De losse "← Alle verhalen"-link die hier vroeger stond, is in
    // september 2026 weggehaald: het broodkruimelpad en de footer doen hetzelfde.)
    const broodkruimel = broodkruimelHtml(relatiefUrl, ogTitel);
    resultaat = resultaat.replace('<main class="artikel">\n', `<main class="artikel">\n${broodkruimel}`);

    // Labels boven het artikel klikbaar maken (zie klikbareLabels hierboven).
    resultaat = klikbareLabels(resultaat, relatief);
  }

  // Op de homepage: kaartjes van nog niet gepubliceerde posts eruit filteren.
  if (relatief === "index.html" && verborgenPosts.size > 0) {
    resultaat = resultaat.replace(/<article class="kaart"[\s\S]*?<\/article>\n*/g, (blok) =>
      hoortBijVerborgenPost(blok) ? "" : blok
    );
  }

  // Op de homepage: de tipkaarten tussen de verhalen zetten. Pas ná het
  // wegfilteren hierboven, zodat een tip met dezelfde naam als een nog
  // verborgen verhaal niet mee weggefilterd wordt.
  if (relatief === "index.html" && liveTips.length > 0) {
    resultaat = metTipkaarten(resultaat);
  }

  // De rij Soort (Alles / Verhalen / Tips) op de homepage en de kaartpagina
  // staat in de bron verborgen; pas als er een tip live staat, komt hij
  // tevoorschijn. Zo ziet een bezoeker nooit een filter dat niets oplevert.
  if (liveTips.length > 0) {
    resultaat = resultaat.replace('<div class="groep groep-formaat" hidden>', '<div class="groep groep-formaat">');
  }

  // Op de homepage: de foto van de eerste kaart meteen laden in plaats van
  // "lui". Sinds de lagere hero op telefoons (audit M2) staat die kaart daar
  // direct in beeld en is die foto het grootste beeld (LCP); lui laden liet
  // hem onnodig wachten. Is die eerste kaart een tip (met een klein
  // fotootje), dan ook de foto van het eerste verhaal: dat staat op de
  // computer in dezelfde eerste rij en is daar het grote beeld. Bewust
  // zonder fetchpriority="high" (de herofoto gaat voor). Hier in de build
  // (ná het wegfilteren en het invoegen van tipkaarten), zodat het vanzelf
  // klopt als er een nieuwe kaart bovenaan komt. De andere foto's blijven
  // gewoon lui laden.
  if (relatief === "index.html") {
    const fotos = [
      ...resultaat.matchAll(/<article class="kaart[^"]*"[^>]*>\s*<a class="thumb"[^>]*>\s*<img\b[^>]*? loading="lazy"/g),
    ].map((m) => ({ einde: m.index + m[0].length, tip: m[0].includes('data-formaat="tip"') }));
    const eager = fotos.slice(0, 1);
    if (eager.length && eager[0].tip) {
      const verhaal = fotos.find((f) => !f.tip);
      if (verhaal) eager.push(verhaal);
    }
    for (const { einde } of eager.sort((a, b) => b.einde - a.einde)) {
      resultaat = resultaat.slice(0, einde - 'loading="lazy"'.length) + 'loading="eager"' + resultaat.slice(einde);
    }
  }

  // Op elke post: "Misschien vind je dit ook leuk" vlak voor </main> plakken.
  if (delen[0] === "posts") {
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

  // Op kaart.html: "Alle plekken op een rij" onder de kaart. Vervangen via
  // een functie, zodat een $-teken in een plaatsnaam niet als speciaal teken
  // van replace() gelezen wordt.
  if (resultaat.includes("<!-- PLEKKENLIJST -->")) {
    resultaat = resultaat.replace(/[ \t]*<!-- PLEKKENLIJST -->\n\n?/, () => plekkenlijstHtml(root));
  }

  // Op instagram.html: de snapshots (laatste Instagram-posts). Zonder echte
  // Instagram-gegevens: noindex, en verderop ook geen regel in de sitemap.
  const isSnapshotsPagina = resultaat.includes("<!-- SNAPSHOTS -->");
  if (isSnapshotsPagina) {
    resultaat = resultaat.replace(/[ \t]*<!-- SNAPSHOTS -->\n\n?/, () => snapshotsHtml(root));
    if (!snapshotsEcht) {
      resultaat = resultaat.replace("</head>", '  <meta name="robots" content="noindex">\n</head>');
    }
  }

  // Een tip met "noindex: ja": niet in Google, en ook niet in de sitemap.
  if (tip && tip.noindex) {
    resultaat = resultaat.replace("</head>", '  <meta name="robots" content="noindex">\n</head>');
  }

  // 404.html hoort niet in Google: noindex, en verderop ook geen regel in
  // de sitemap.
  if (is404) {
    resultaat = resultaat.replace("</head>", '  <meta name="robots" content="noindex">\n</head>');
    // Geen canonical en geen og-/twitter-tags: deze pagina verschijnt op elk
    // niet-bestaand adres en heeft dus geen eigen "echt" webadres om naar te
    // verwijzen of te delen.
    resultaat = resultaat.replace(new RegExp(bestaandMetaBlok.source + "\\r?\\n"), "");
  }

  fs.mkdirSync(path.dirname(doel), { recursive: true });
  schrijfTekst(doel, resultaat);
  console.log(`✓ ${relatief}${tip ? "  (tip)" : ""}`);
  aantal++;

  if (!is404 && (!isSnapshotsPagina || snapshotsEcht) && !(tip && tip.noindex)) {
    sitemapPaginas.push({ url: paginaUrl, bronbestand });
  }
}

// Opruimen: een gebouwde pagina in posts/ van een tip die niet meer bestaat
// (tipbestand verwijderd of hernoemd naar _naam.md) wordt weggehaald. Alleen
// pagina's die zelf als tippagina herkenbaar zijn (het blok "tip-inhoud") en
// waarvoor geen verhaal in src/posts en geen live tip meer is. Een verhaal
// wordt dus nooit verwijderd.
{
  const postsmap = path.join(__dirname, "posts");
  const liveTipNamen = new Set(liveTips.map((tip) => tip.naam));
  for (const bestandsnaam of fs.existsSync(postsmap) ? fs.readdirSync(postsmap).sort(alfabetisch) : []) {
    if (!bestandsnaam.endsWith(".html")) continue;
    const naam = bestandsnaam.slice(0, -".html".length);
    if (liveTipNamen.has(naam) || fs.existsSync(path.join(bronmap, "posts", bestandsnaam))) continue;
    const pad = path.join(postsmap, bestandsnaam);
    if (!leesTekst(pad).includes('<div class="tip-inhoud')) continue;
    fs.unlinkSync(pad);
    console.log(`○ posts/${bestandsnaam}  (oude tippagina opgeruimd: geen tipbestand meer)`);
  }
}

// sitemap.xml: automatisch opgebouwd uit de pagina's die hierboven écht
// gebouwd zijn (voorbereide posts met een toekomstige datum zijn dus al
// vanzelf geen onderdeel van sitemapPaginas). Geen handmatig bij te houden
// bestand meer.
//
// <lastmod> per pagina: posts, kaart.html en over.html krijgen
// laatsteWijziging() (laatste echte git-wijziging, nooit vóór de
// publicatiedatum). De homepage krijgt de publicatiedatum van de nieuwste
// live post: daar verandert de homepage inhoudelijk door (een nieuwe kaart
// bovenaan). Nooit de builddatum: de dagelijkse build zou dan elke dag alle
// datums verversen.
{
  const livePostBestanden = sitemapPaginas
    .map(({ bronbestand }) => bronbestand)
    .filter((bestand) => ["posts", "tips"].includes(path.relative(bronmap, bestand).split(path.sep)[0]));
  const nieuwstePostDatum = livePostBestanden
    .map((bestand) => publicatiedatum(bestand))
    .sort()
    .pop();

  // instagram.html: de nieuwste getoonde snapshot, of de eigen git-datum als
  // die later is (de pagina verandert inhoudelijk door een nieuwe foto).
  const lastmodVoor = (bronbestand) => {
    const relatief = path.relative(bronmap, bronbestand);
    if (relatief === "index.html" && nieuwstePostDatum) return nieuwstePostDatum;
    const gitDatum = laatsteWijziging(bronbestand);
    if (relatief === "instagram.html" && nieuwsteSnapshotDatum && nieuwsteSnapshotDatum > gitDatum) {
      return nieuwsteSnapshotDatum;
    }
    return gitDatum;
  };

  const urls = sitemapPaginas
    .map(
      ({ url, bronbestand }) =>
        `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmodVoor(bronbestand)}</lastmod>\n  </url>\n`
    )
    .join("");
  const resultaat =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls +
    `</urlset>\n`;
  schrijfTekst(path.join(__dirname, "sitemap.xml"), resultaat);
  console.log(`✓ sitemap.xml`);
  aantal++;
}

// Geeft een plek terug met de alt-tekst van de eigen postfoto als extra
// "alt"-veld direct na "image" (voor de kaart-popup), als de plek een eigen
// post mét foto heeft. Hier hoeft dus niets voor bijgehouden te worden in
// src/places.json zelf.
function metPopupAlt(plek) {
  if (!plek.post || !plek.image) return plek;
  const alt = popupAltTekst(plek.post);
  if (!alt) return plek;
  const uit = {};
  for (const [sleutel, waarde] of Object.entries(plek)) {
    uit[sleutel] = waarde;
    if (sleutel === "image") uit.alt = alt;
  }
  return uit;
}

// places.json: de gepubliceerde versie bevat alleen de plekken van al
// gepubliceerde posts (livePlekken hierboven), aangevuld met de alt-teksten.
// Gelezen en geschreven als echte JSON, niet meer geknipt op spaties.
{
  // Onafhankelijke controle: tel apart (exact op bestandsnaam) hoeveel pins
  // bij nog niet gepubliceerde posts horen, en stop als het resultaat daar
  // niet mee klopt. Zo kan er nooit ongemerkt een lege of halve kaart online.
  const aantalVerborgen = allePlekken.filter(
    (plek) => plek.post && verborgenPosts.has(path.basename(plek.post, ".html"))
  ).length;
  const verwacht = allePlekken.length - aantalVerborgen;
  const uitvoer = livePlekken.map(metPopupAlt);
  if (uitvoer.length !== verwacht) {
    throw new Error(
      `places.json: de build zou ${uitvoer.length} pins publiceren, maar dat hadden er ${verwacht} moeten zijn ` +
        `(${allePlekken.length} in src/places.json, waarvan ${aantalVerborgen} bij nog niet gepubliceerde posts). ` +
        `De build is gestopt, zodat er geen onvolledige kaart online komt.`
    );
  }
  // Elke plek krijgt een formaat: "verhaal" voor de plekken uit
  // src/places.json, "tip" voor de korte tips (achteraan). De kaart kan zo
  // beide soorten uit elkaar houden.
  const metFormaat = (plek) => {
    const uit = {};
    for (const [sleutel, waarde] of Object.entries(plek)) {
      uit[sleutel] = waarde;
      if (sleutel === "naam") uit.formaat = "verhaal";
    }
    return uit;
  };
  const metTips = [...uitvoer.map(metFormaat), ...liveTips.map((tip) => tipPlekPerPost.get(tip.post))];
  schrijfTekst(path.join(__dirname, "places.json"), JSON.stringify(metTips, null, 2) + "\n");
  console.log(`✓ places.json`);
  aantal++;
}

console.log(`Klaar: ${aantal} bestanden opgebouwd.`);
