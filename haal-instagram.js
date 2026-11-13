// Haalt de laatste Instagram-posts van @rotterdambyferry op voor de pagina
// "Snapshots uit 010" (instagram.html). Draait in de publicatie op GitHub
// vlak vóór node build.js (zie .github/workflows/publiceer.yml).
//
// Gebruik:  node haal-instagram.js             (echt ophalen, met de sleutel
//                                               uit INSTAGRAM_TOKEN)
//           node haal-instagram.js --voorbeeld  (6 voorbeeldposts met foto's
//                                               die al op de site staan, om
//                                               de pagina lokaal te bekijken)
//           node haal-instagram.js --wis        (gegevens weg: de pagina
//                                               toont weer de lege stand)
// Daarna altijd: npm run build.
//
// Resultaat: instagram.json in de projectmap en een eigen kopie van elke
// foto in assets/img/instagram/. Beide staan in .gitignore: ze worden bij
// elke publicatie opnieuw gemaakt. Bezoekers laden de foto's dus van de
// eigen site, niet van Instagram (geen cookies, geen trage widget).
//
// Dit script laat de publicatie nooit mislukken: geen sleutel, geen
// internet of een fout van Instagram geeft alleen een ⚠-melding. De pagina
// toont dan de lege stand (intro en knoppen, noindex, niet in de sitemap).
//
// Alleen ingebouwde Node.js-onderdelen (fetch, fs, path): geen npm-pakketten.

const fs = require("fs");
const path = require("path");

const DATABESTAND = path.join(__dirname, "instagram.json");
const FOTOMAP = path.join(__dirname, "assets", "img", "instagram");
const AANTAL_OPHALEN = 12; // ruim meer dan de 6 die getoond worden: posts kunnen verborgen zijn
const API = "https://graph.instagram.com/me/media";

function code(link) {
  const match = String(link || "").match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// Instagram geeft tijden als 2026-11-10T18:22:01+0000; maak er een
// standaard ISO-tijd van.
function isoTijd(tijd) {
  const datum = new Date(String(tijd || "").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return isNaN(datum) ? null : datum.toISOString();
}

function schrijfData(data) {
  fs.writeFileSync(DATABESTAND, JSON.stringify(data, null, 2) + "\n");
}

// Voorbeeldgegevens: echte links en (het begin van) echte captions van
// @rotterdambyferry, maar met foto's die al op de site staan. Alleen om de
// pagina lokaal te bekijken; de build maakt de pagina hiermee bewust niet
// vindbaar (bron "voorbeeld").
function voorbeeld() {
  const posts = [
    ["DfrK2LCuyD6", "2026-11-08T12:00:00.000Z", "assets/img/due-tonino.jpg",
      "Normaal deel ik hier reviews van plekken waar ik zelf heb gegeten of gedronken, maar voor vandaag een uitzondering."],
    ["De2JMdIqdHj", "2026-11-01T12:00:00.000Z", "assets/img/hero-centraal-station.jpg",
      "Rainy day in the city #rotterdam\n\nMooie rauwe doorgang komend vanaf Rotterdam Centraal naar het uitgaansleven."],
    ["DeWVWs0u21Q", "2026-10-25T12:00:00.000Z", "assets/img/vijgeboom-terras.jpg",
      "Biertje op het terras van de bruine kroeg Tante Sidonia met uitzicht op de Bospoldervos 🦊\n\n#bospolder #rotterdam"],
    ["DeLpySNuRcr", "2026-10-18T12:00:00.000Z", "assets/img/hero-erasmusbrug-winter.jpg",
      "🍂 (songtekst, wordt vervangen door het onderschrift uit src/instagram-uitzonderingen.json)"],
    ["Dd3REa4Dmre", "2026-10-11T12:00:00.000Z", "assets/img/hero-laurenskerk.jpg",
      "Een mooi Rotterdams doorkijkje. Op een plek waar je het misschien niet verwacht, ligt een mooie BMX-baan."],
    ["DdtD8aGDk2y", "2026-10-04T12:00:00.000Z", "assets/img/warung-melatie-saoto-soep-hero.jpg",
      "Is dit de beste saoto soep van Rotterdam? 🍜 Ik vind van wel!"],
  ].map(([c, datum, afbeelding, caption]) => ({
    code: c,
    permalink: `https://www.instagram.com/p/${c}/`,
    afbeelding,
    caption,
    datum,
  }));
  schrijfData({ bron: "voorbeeld", opgehaald: new Date().toISOString(), posts });
  console.log(`✓ instagram.json met ${posts.length} voorbeeldposts (draai nu npm run build)`);
}

async function haalOp(token) {
  const velden = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const url = `${API}?fields=${velden}&limit=${AANTAL_OPHALEN}&access_token=${encodeURIComponent(token)}`;
  const antwoord = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const json = await antwoord.json().catch(() => ({}));
  if (!antwoord.ok || !Array.isArray(json.data)) {
    // Nooit de sleutel of de volledige link in de melding: alleen wat
    // Instagram zelf als fout teruggeeft.
    const melding = (json.error && json.error.message) || `HTTP ${antwoord.status}`;
    throw new Error(`Instagram gaf een fout: ${melding}`);
  }

  // Pas nu (antwoord is goed) de oude kopieën weghalen.
  fs.rmSync(FOTOMAP, { recursive: true, force: true });
  fs.mkdirSync(FOTOMAP, { recursive: true });

  const posts = [];
  for (const item of json.data) {
    const c = code(item.permalink);
    // Video: het stilstaande beeld. Foto en carrousel: de (eerste) foto.
    const fotoUrl = item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url;
    if (!c || !fotoUrl) continue;
    try {
      const foto = await fetch(fotoUrl, { signal: AbortSignal.timeout(20000) });
      const type = foto.headers.get("content-type") || "";
      if (!foto.ok || !type.startsWith("image/")) throw new Error(`HTTP ${foto.status} ${type}`);
      const extensie = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const bestandsnaam = `${c}.${extensie}`;
      fs.writeFileSync(path.join(FOTOMAP, bestandsnaam), Buffer.from(await foto.arrayBuffer()));
      posts.push({
        code: c,
        permalink: item.permalink,
        afbeelding: `assets/img/instagram/${bestandsnaam}`,
        caption: item.caption || "",
        datum: isoTijd(item.timestamp),
      });
    } catch (fout) {
      console.warn(`⚠ foto van post ${c} niet opgehaald (${fout.message}): overgeslagen`);
    }
  }

  schrijfData({ bron: "instagram", opgehaald: new Date().toISOString(), posts });
  console.log(`✓ instagram.json: ${posts.length} posts opgehaald`);
}

(async () => {
  const argumenten = process.argv.slice(2);
  if (argumenten.includes("--voorbeeld")) return voorbeeld();
  if (argumenten.includes("--wis")) {
    fs.rmSync(DATABESTAND, { force: true });
    fs.rmSync(FOTOMAP, { recursive: true, force: true });
    console.log("✓ Instagram-gegevens gewist (draai nu npm run build)");
    return;
  }

  const token = (process.env.INSTAGRAM_TOKEN || "").trim();
  if (!token) {
    console.warn("⚠ geen INSTAGRAM_TOKEN: snapshots niet opgehaald (de pagina toont de lege stand)");
    return;
  }
  try {
    await haalOp(token);
  } catch (fout) {
    console.warn(`⚠ snapshots niet opgehaald: ${fout.message}`);
  }
})();
