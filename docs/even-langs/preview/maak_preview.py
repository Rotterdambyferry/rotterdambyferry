"""Maakt de statische preview van "Even langs" uit de gebouwde site (kopie in site/).
Raakt de repo zelf niet aan."""
import json, re, shutil, sys
from pathlib import Path

SITE = Path(sys.argv[1])
CSS = Path(sys.argv[2]).read_text(encoding="utf-8")
EXTRA = "<style>/* VOORSTEL even-langs */\n" + CSS + "</style>\n</head>"

TEKST = ("Als je in Rotterdam een kinderboekwinkel zoekt, is dit al jaren mijn vaste adres. "
         "De Kleine Kapitein heeft kinderboeken van 0 tot 18, en achterin een heerlijke spellenhoek "
         "met een houten treinbaan waar de kids zo even mee aan de slag gaan. Een spelletje voor op "
         "vakantie halen we hier altijd, dat is bij ons een vaste prik. In de zomer is er vaak een "
         "vakantiepaspoort met een puzzeltocht vanaf de winkel. Vroeger zat er ook een restaurantje in, "
         "dat is er helaas niet meer. Loop je door het centrum, spring dan even binnen.")
ZINNEN = re.split(r"(?<=\.)\s+", TEKST)
KAARTTEKST = " ".join(ZINNEN[:2])
TEASER = ZINNEN[0]
ALT_GEVEL = ("Gevel van kinderboekwinkel De Kleine Kapitein aan de Botersloot met twee blauwe vlaggen, "
             "met de Centrale Bibliotheek op de achtergrond")
ALT_SPEL = ("Houten treinbaan op een speeltafel in de spellenhoek van De Kleine Kapitein, "
            "met kasten vol gezelschapsspellen erachter")
ALT_KAART = "Gevel van De Kleine Kapitein aan de Botersloot met blauwe vlaggen"

def vervang(tekst, oud, nieuw, aantal=1):
    if oud not in tekst:
        raise SystemExit(f"Niet gevonden: {oud[:80]}")
    return tekst.replace(oud, nieuw, aantal)

# ---------- 1 + 4. Homepage: formaatfilter en tipkaart ----------
index = (SITE / "index.html").read_text(encoding="utf-8")
index = vervang(index, "</head>", EXTRA)
index = vervang(index, 'aria-label="Filter verhalen"', 'aria-label="Filter verhalen en tips"')
formaat = '''<div class="groep groep-formaat">
      <span class="label" id="label-soort">Soort</span>
      <div class="formaatkeuze" role="group" aria-labelledby="label-soort">
        <button type="button" class="formaatknop" data-formaat="alles" aria-pressed="true">Alles</button>
        <button type="button" class="formaatknop" data-formaat="verhaal" aria-pressed="false">Verhalen</button>
        <button type="button" class="formaatknop" data-formaat="tip" aria-pressed="false">Tips</button>
      </div>
    </div>
    <div class="groep groep-categorie">'''
index = vervang(index, '<div class="groep groep-categorie">', formaat)
tipkaart = f'''<main class="grid" id="verhalen">

  <article class="kaart kaart-tip" data-formaat="tip" data-categorie="kidsproof" data-gebied="centrum">
    <a class="thumb" href="posts/de-kleine-kapitein.html" aria-hidden="true" tabindex="-1">
      <img src="assets/img/de-kleine-kapitein-gevel-kaart.jpg" alt="{ALT_KAART}" width="800" height="500" loading="eager">
    </a>
    <div class="tags">
      <span class="tag formaat-tip">Even langs</span>
      <span class="tag">Kidsproof</span>
      <span class="tag gebied">Centrum</span>
    </div>
    <h2><a href="posts/de-kleine-kapitein.html">De Kleine Kapitein</a></h2>
    <p>{KAARTTEKST}</p>
    <a class="lees" href="posts/de-kleine-kapitein.html">Lees de tip &rarr;</a>
  </article>
'''
index = vervang(index, '<main class="grid" id="verhalen">\n', tipkaart)
(SITE / "index.html").write_text(index, encoding="utf-8")

# ---------- 2. Tippagina ----------
post = (SITE / "posts" / "rif010.html").read_text(encoding="utf-8")
post = vervang(post, "</head>", EXTRA)
post = re.sub(r"<title>.*?</title>", "<title>De Kleine Kapitein, kinderboekwinkel in het centrum | Rotterdam by Ferry</title>", post, count=1)
main_nieuw = f'''<main class="artikel artikel-tip">
<nav class="broodkruimel" aria-label="Kruimelpad">
<a href="/">Home</a> <span aria-hidden="true">&rsaquo;</span> <a href="/?gebied=centrum">Centrum</a> <span aria-hidden="true">&rsaquo;</span> <span aria-current="page">De Kleine Kapitein</span>
</nav>
<div class="tags">
<a class="tag formaat-tip" href="/?formaat=tip">Even langs<span class="visueel-verborgen">, meer tips</span></a>
<a class="tag" href="/?categorie=kidsproof">Kidsproof<span class="visueel-verborgen">, meer verhalen</span></a>
<a class="tag gebied" href="/?gebied=centrum">Centrum<span class="visueel-verborgen">, meer verhalen</span></a>
</div>

<h1>De Kleine Kapitein</h1>
<p class="meta">Door Ferry &middot; Bezocht in november 2026</p>

<div class="tip-inhoud">
<figure class="tip-foto tip-foto-1">
<img src="../assets/img/de-kleine-kapitein-gevel.jpg" srcset="../assets/img/de-kleine-kapitein-gevel-mobiel.jpg 800w, ../assets/img/de-kleine-kapitein-gevel.jpg 1200w" sizes="(max-width: 640px) 100vw, 312px" alt="{ALT_GEVEL}" width="1200" height="1600" loading="eager" fetchpriority="high">
</figure>
<p class="tip-tekst">{TEKST}</p>
<figure class="tip-foto tip-foto-2">
<img src="../assets/img/de-kleine-kapitein-spellenhoek.jpg" srcset="../assets/img/de-kleine-kapitein-spellenhoek-mobiel.jpg 800w, ../assets/img/de-kleine-kapitein-spellenhoek.jpg 1200w" sizes="(max-width: 640px) 100vw, 312px" alt="{ALT_SPEL}" width="1200" height="1600" loading="eager">
</figure>
<p class="tip-adres">Botersloot 173, Rotterdam &middot; <a href="../kaart.html?plek=de-kleine-kapitein">Bekijk op de kaart</a></p>
</div>
'''

SITEURL = "https://rotterdambyferry.nl/posts/de-kleine-kapitein.html"
OGTITEL = "De Kleine Kapitein"
OMSCHR = "Kinderboekwinkel De Kleine Kapitein aan de Botersloot: boeken van 0 tot 18 en een spellenhoek met houten treinbaan. Een korte tip van Ferry."
DEELFOTO = "https://rotterdambyferry.nl/assets/img/de-kleine-kapitein-deel.jpg"
post = re.sub(r'<link rel="preload" as="image"[^>]*>', '<link rel="preload" as="image" href="../assets/img/de-kleine-kapitein-gevel.jpg" imagesrcset="../assets/img/de-kleine-kapitein-gevel-mobiel.jpg 800w, ../assets/img/de-kleine-kapitein-gevel.jpg 1200w" imagesizes="(max-width: 640px) 100vw, 312px" fetchpriority="high">', post, count=1)
post = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{OMSCHR}">', post, count=1)
post = re.sub(r'<meta (property|name)="(og|twitter):title" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{m.group(2)}:title" content="{OGTITEL}">', post)
post = re.sub(r'<meta (property|name)="(og|twitter):description" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{m.group(2)}:description" content="{OMSCHR}">', post)
post = re.sub(r'<meta (property|name)="(og|twitter):image" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{m.group(2)}:image" content="{DEELFOTO}">', post)
post = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{SITEURL}">', post)
post = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{SITEURL}">', post)
post = re.sub(r'<meta name="instagram_url"[^>]*>\s*', '', post)
ld = {"@context": "https://schema.org", "@type": "BlogPosting",
      "mainEntityOfPage": {"@type": "WebPage", "@id": SITEURL},
      "headline": OGTITEL, "description": OMSCHR,
      "image": [DEELFOTO, "https://rotterdambyferry.nl/assets/img/de-kleine-kapitein-gevel.jpg"],
      "datePublished": "2026-11-18", "dateModified": "2026-11-18",
      "author": {"@type": "Person", "name": "Ferry", "url": "https://rotterdambyferry.nl/over.html"},
      "publisher": {"@type": "Organization", "name": "Rotterdam by Ferry",
                    "logo": {"@type": "ImageObject", "url": "https://rotterdambyferry.nl/assets/img/favicon-192x192.png"}},
      "contentLocation": {"@type": "Place", "name": "De Kleine Kapitein",
                          "geo": {"@type": "GeoCoordinates", "latitude": 51.922104, "longitude": 4.487699},
                          "address": {"@type": "PostalAddress", "streetAddress": "Botersloot 173", "postalCode": "3011 HE",
                                      "addressLocality": "Rotterdam", "addressCountry": "NL"}}}
kruimel = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://rotterdambyferry.nl/"},
      {"@type": "ListItem", "position": 2, "name": "Centrum", "item": "https://rotterdambyferry.nl/?gebied=centrum"},
      {"@type": "ListItem", "position": 3, "name": OGTITEL, "item": SITEURL}]}
blokken = list(re.finditer(r'<script type="application/ld\+json">.*?</script>', post, flags=re.S))
assert len(blokken) == 2, len(blokken)
nieuw = ('<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=2) + '\n</script>\n'
         '<script type="application/ld+json">\n' + json.dumps(kruimel, ensure_ascii=False, indent=2) + '\n</script>')
post = post[:blokken[0].start()] + nieuw + post[blokken[1].end():]
post = post.replace("RiF010%3A%20surfen%20achter%20de%20Markthal%0Ahttps%3A%2F%2Frotterdambyferry.nl%2Fposts%2Frif010.html",
                    "De%20Kleine%20Kapitein%0Ahttps%3A%2F%2Frotterdambyferry.nl%2Fposts%2Fde-kleine-kapitein.html")
post = post.replace("https%3A%2F%2Frotterdambyferry.nl%2Fposts%2Frif010.html", "https%3A%2F%2Frotterdambyferry.nl%2Fposts%2Fde-kleine-kapitein.html")

post = re.sub(r'<main class="artikel">.*?(?=<section class="verwant">)', lambda m: main_nieuw + "\n", post, count=1, flags=re.S)
post = re.sub(r'\s*<a class="deelknop instagram" href="https://www.instagram.com/p/[^"]+"[^\n]*</a>', "", post, count=1)  # Instagram-knop hoort bij RiF010, deze tip heeft (nog) geen instagram_url
(SITE / "posts" / "de-kleine-kapitein.html").write_text(post, encoding="utf-8")

# ---------- 3. Kaart: pin-type en popup ----------
plekken = json.loads((SITE / "places.json").read_text(encoding="utf-8"))
for p in plekken:
    p.setdefault("formaat", "verhaal")
plekken.insert(0, {
    "naam": "De Kleine Kapitein", "formaat": "tip",
    "lat": 51.922104, "lon": 4.487699,
    "categorie": ["kidsproof"], "gebied": "centrum",
    "post": "posts/de-kleine-kapitein.html",
    "image": "assets/img/de-kleine-kapitein-gevel-kaart.jpg",
    "alt": ALT_KAART, "teaser": TEASER,
})
(SITE / "places.json").write_text(json.dumps(plekken, ensure_ascii=False, indent=2), encoding="utf-8")

kaart = (SITE / "kaart.html").read_text(encoding="utf-8")
kaart = vervang(kaart, "</head>", EXTRA.replace("</head>", "<style>/* PREVIEW: CARTO-tegels laden hier niet, donkere achtergrond als vervanger */ #plattegrond{background:#262626}</style>\n</head>"))
# Leaflet lokaal in plaats van via unpkg (de preview heeft geen internet)
kaart = re.sub(r'<link rel="stylesheet" href="https://unpkg.com/leaflet@[^"]+/dist/leaflet.css"[^>]*>', '<link rel="stylesheet" href="vendor/leaflet.css">', kaart)
kaart = re.sub(r'<script defer src="https://unpkg.com/leaflet@[^"]+/dist/leaflet.js"[^>]*></script>', '<script defer src="vendor/leaflet.js"></script>', kaart)
kaart = re.sub(r'<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster[^>]*>\s*', "", kaart)
kaart = re.sub(r'<script defer src="https://unpkg.com/leaflet.markercluster[^>]*></script>', "", kaart)
kaart = re.sub(r'L\.tileLayer\(.*?\)\.addTo\(map\);', "/* PREVIEW: geen tegels */", kaart, count=1, flags=re.S)
# Zonder markercluster: gewone laaggroep
kaart = re.sub(r'var cluster = L\.markerClusterGroup\(\{.*?\n    \}\);', "var cluster = L.featureGroup(); cluster.addLayers = function (a) { a.forEach(function (l) { cluster.addLayer(l); }); };", kaart, count=1, flags=re.S)
kaart = re.sub(r'cluster\.on\("clusterclick".*?\n    \}\);', "", kaart, count=1, flags=re.S)
# Pin-type per formaat
kaart = vervang(kaart, '''var marker = L.circleMarker([p.lat, p.lon], {
            radius: 9,
            color: "#FAF9F5",
            weight: 2,
            fillColor: "#1D7A46",
            fillOpacity: 1
          });''', '''var tip = p.formaat === "tip";
          var marker = tip ? L.marker([p.lat, p.lon], {
            icon: L.divIcon({ className: "tip-pin", iconSize: [20, 20] }),
            title: p.naam + " (tip)",
            alt: p.naam + " (tip)",
            keyboard: true
          }) : L.circleMarker([p.lat, p.lon], {
            radius: 9,
            color: "#FAF9F5",
            weight: 2,
            fillColor: "#1D7A46",
            fillOpacity: 1
          });''')
# Popup: formaatlabel en knoptekst
kaart = vervang(kaart, '''var tekst = '<p class="popup-naam">' + p.naam + "</p>" +''',
                '''var tekst = (p.formaat === "tip" ? '<span class="popup-formaat">Even langs</span>' : "") +
                  '<p class="popup-naam">' + p.naam + "</p>" +''')
kaart = kaart.replace("'\">Lees het verhaal &rarr;</a>'", "'\">' + (p.formaat === \"tip\" ? \"Lees de tip\" : \"Lees het verhaal\") + ' &rarr;</a>'")
# Formaatfilter ook op de kaartpagina
kaart = vervang(kaart, '<div class="groep groep-categorie">', formaat)
# Haakje voor de screenshots
kaart = vervang(kaart, "toonPlekken();\n        // Nogmaals", "toonPlekken(); window.__plekken = plekken; window.__map = map;\n        var plekUitUrl = new URLSearchParams(location.search).get(\"plek\");\n        function kiesPlek() { if (!plekUitUrl) return; var gevonden = plekken.filter(function (x) { return x.data.post === \"posts/\" + plekUitUrl + \".html\"; })[0]; if (gevonden) { map.setView(gevonden.marker.getLatLng(), 16, { animate: false }); gevonden.marker.openPopup(); document.getElementById(\"plattegrond\").scrollIntoView({ block: \"center\" }); } }\n        kiesPlek();\n        // Nogmaals")
kaart = vervang(kaart, 'window.addEventListener("load", toonPlekken);', 'window.addEventListener("load", function () { toonPlekken(); kiesPlek(); });')
(SITE / "kaart.html").write_text(kaart, encoding="utf-8")
(SITE / "vendor").mkdir(exist_ok=True)
for f in ["leaflet.css", "leaflet.js"]:
    shutil.copy(Path(sys.argv[3]) / f, SITE / "vendor" / f)
print("Preview klaar. Kaarttekst:", KAARTTEKST)
