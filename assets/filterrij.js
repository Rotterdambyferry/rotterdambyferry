// De filterrij (homepage en kaartpagina): de keuzelijst voor het gebied, en
// op een telefoon het aan- en uitzetten van een categorie.
//
// 1. Categorieën (tot 600px breed): op een telefoon staat er geen knop
// "Alles" bij de categorieën (verborgen via style.css); geen categorie
// gekozen betekent alle categorieën. Tik je op de categorie die al aan
// staat, dan gaat die weer uit: dit script drukt dan op de achtergrond het
// verborgen knopje "Alles" in, zodat de pagina gewoon zelf filtert (en de
// aantallen in de keuzelijst bijwerkt). Op bredere schermen verandert er
// niets: daar blijft "Alles" gewoon staan.
//
// 2. Keuzelijst voor het gebied (alle breedtes, sinds november 2026 ook op
// de computer). De knop voor het gebied staat al in de HTML, zodat er bij
// het laden niets verspringt. Op een telefoon staat hij vooraan in de
// veegbare rij met categorieknoppen, op de computer rechts naast de
// categorieën (zie style.css). Dit script maakt bij die knop een kleine
// keuzelijst met alle gebieden, gebouwd uit de gewone gebiedknopjes
// (.filterknop[data-filter="gebied"]), die in de HTML blijven staan maar
// niet te zien zijn.
//
// De filterlogica zelf blijft van de pagina: een keuze in de lijst "drukt"
// gewoon op het bijbehorende (verborgen) gebiedknopje. Andersom houdt dit
// script de lijst bij als een gebiedknopje verandert, bijvoorbeeld als de
// homepage via ?gebied=zuid meteen gefilterd opent. De pagina zet per
// gebiedknopje het aantal verhalen/plekken in data-aantal; de lijst toont dat
// als "Oost (0)" en maakt gebieden zonder verhalen grijs.
//
// Toetsenbord: Enter of spatie opent de lijst, pijltjes (of Tab) lopen door
// de gebieden, Enter kiest, Escape sluit. De stijl staat in style.css
// (".gebiedkeuze").

// ---------- 1. Categorie aan en weer uit (tot 600px breed) ----------
(function () {
  var smal = window.matchMedia && window.matchMedia("(max-width: 600px)");
  var allesKnop = document.querySelector('.filterknop[data-filter="categorie"][data-waarde="alles"]');
  if (!smal || !allesKnop) return;
  // Luistert vóór de knoppen zelf (capture), zodat een tik op de al actieve
  // categorie de pagina niet bereikt en een tik op "Alles" wordt.
  document.addEventListener("click", function (e) {
    if (!smal.matches) return;
    var knop = e.target.closest && e.target.closest('.filterknop[data-filter="categorie"]');
    if (!knop || knop === allesKnop || knop.getAttribute("aria-pressed") !== "true") return;
    e.stopPropagation();
    allesKnop.click();
  }, true);
})();

// ---------- 2. Keuzelijst voor het gebied ----------
(function () {
  var houder = document.querySelector(".gebiedkeuze");
  if (!houder) return;
  var knop = houder.querySelector(".gebiedkeuze-knop");
  var knopTekst = houder.querySelector(".gebiedkeuze-tekst");
  // Verborgen voorvoegsel "Gebied: " voor screenreaders, alleen aan als er
  // een gebied gekozen is (anders zou de knop "Gebied: Gebied" heten).
  var voorvoegsel = houder.querySelector(".gebiedkeuze-voor");
  var bronknoppen = document.querySelectorAll('.filterknop[data-filter="gebied"]');
  if (!knop || !bronknoppen.length) return;

  var lijst = document.createElement("div");
  lijst.className = "gebiedkeuze-lijst";
  lijst.id = knop.getAttribute("aria-controls");
  lijst.setAttribute("role", "group");
  lijst.setAttribute("aria-label", "Kies een gebied");
  lijst.hidden = true;

  var opties = [];
  bronknoppen.forEach(function (bron) {
    var optie = document.createElement("button");
    optie.type = "button";
    optie.className = "gebiedkeuze-optie";
    var naam = document.createElement("span");
    naam.textContent = bron.textContent.trim();
    var aantal = document.createElement("span");
    aantal.className = "aantal";
    optie.appendChild(naam);
    optie.appendChild(aantal);
    optie.addEventListener("click", function () {
      // Eerst sluiten (focus terug naar de knop), dan het gebiedknopje
      // indrukken: de pagina filtert zelf, net als bij een klik daarop.
      sluit(true);
      bron.click();
    });
    lijst.appendChild(optie);
    opties.push({ optie: optie, bron: bron, aantal: aantal });
  });
  houder.appendChild(lijst);

  // Lijst en knop gelijk trekken met de (verborgen) gebiedknopjes.
  function werkBij() {
    opties.forEach(function (o) {
      var gekozen = o.bron.getAttribute("aria-pressed") === "true";
      o.optie.setAttribute("aria-pressed", gekozen ? "true" : "false");
      var n = o.bron.getAttribute("data-aantal");
      o.aantal.textContent = n === null ? "" : " (" + n + ")";
      o.optie.classList.toggle("is-leeg", n === "0");
      if (gekozen) {
        var alles = o.bron.getAttribute("data-waarde") === "alles";
        // Dezelfde tekst als in de HTML ("Gebied"), zodat er bij het laden
        // niets verspringt; alleen een gekozen gebied verandert de tekst.
        knopTekst.textContent = alles ? "Gebied" : o.bron.textContent.trim();
        if (voorvoegsel) voorvoegsel.hidden = alles;
        knop.classList.toggle("is-gekozen", !alles);
      }
    });
  }

  function open() {
    lijst.hidden = false;
    knop.setAttribute("aria-expanded", "true");
    var gekozen = lijst.querySelector('[aria-pressed="true"]') || opties[0].optie;
    gekozen.focus();
  }
  function sluit(focusTerug) {
    if (lijst.hidden) return;
    lijst.hidden = true;
    knop.setAttribute("aria-expanded", "false");
    if (focusTerug) knop.focus();
  }

  knop.addEventListener("click", function () {
    if (lijst.hidden) open();
    else sluit(true);
  });

  lijst.addEventListener("keydown", function (e) {
    var huidige = opties.map(function (o) { return o.optie; }).indexOf(document.activeElement);
    var doel = null;
    if (e.key === "ArrowDown") doel = (huidige + 1) % opties.length;
    else if (e.key === "ArrowUp") doel = (huidige - 1 + opties.length) % opties.length;
    else if (e.key === "Home") doel = 0;
    else if (e.key === "End") doel = opties.length - 1;
    else if (e.key === "Escape") { e.preventDefault(); sluit(true); return; }
    if (doel !== null) {
      e.preventDefault();
      opties[doel].optie.focus();
    }
  });
  knop.addEventListener("keydown", function (e) {
    if (e.key === "Escape") sluit(true);
  });

  // Sluiten bij een tik ergens anders, of als de focus de keuze verlaat.
  document.addEventListener("click", function (e) {
    if (!houder.contains(e.target)) sluit(false);
  });
  houder.addEventListener("focusout", function (e) {
    if (e.relatedTarget && !houder.contains(e.relatedTarget)) sluit(false);
  });

  if (window.MutationObserver) {
    var waarnemer = new MutationObserver(werkBij);
    bronknoppen.forEach(function (bron) {
      waarnemer.observe(bron, { attributes: true, attributeFilter: ["aria-pressed", "data-aantal"] });
    });
  }
  werkBij();
})();

// ---------- 3. Aantal gevonden en "Wis filters" ----------
// Alleen zolang er een filter aan staat (een categorie, een gebied of een
// soort anders dan Alles) staat onder de filterrij een regel met het aantal
// gevonden verhalen/tips (homepage) of plekken (kaartpagina) en rechts de
// knop "Wis filters". Die regel (.filter-status) staat al in de HTML en
// style.css toont hem op basis van aria-pressed van de knoppen, zodat hij
// er bij filters uit het webadres al staat voordat dit script draait (geen
// verspringen). Dit script vult de tekst: die komt uit het voorleesvak
// #filter-uitkomst dat de pagina zelf vult; het aantal is daarom
// aria-hidden (anders hoort een screenreader het twee keer), de knop niet.
// "Wis filters" drukt op de verborgen knopjes "Alles" die nog niet aan
// staan (dus de filterlogica van de pagina doet het werk, en de kaart past
// zich maar één keer opnieuw in) en zet daarna de focus op de
// categorieknop "Alles" (op een telefoon, waar die verborgen is, op de knop
// Gebied), want de knop zelf verdwijnt. Bewust nooit de klasse filterknop:
// die pakken de filterscripts allemaal op.
(function () {
  var status = document.querySelector(".filter-status");
  var uitkomst = document.getElementById("filter-uitkomst");
  if (!status || !uitkomst) return;
  var tekst = status.querySelector(".filter-status-tekst");
  var wis = status.querySelector(".wisknop");
  // Oudere browsers zonder :has() in CSS: dan zet dit script de regel aan en uit.
  var zelfTonen = !(window.CSS && CSS.supports && CSS.supports("selector(:has(*))"));

  function filterAan() {
    return Boolean(document.querySelector(
      '.filterknop[aria-pressed="true"]:not([data-waarde="alles"]), .formaatknop[aria-pressed="true"]:not([data-formaat="alles"])'
    ));
  }

  function werkBij() {
    if (zelfTonen) status.style.display = filterAan() ? "flex" : "none";
    // "3 verhalen en 1 tip gevonden." zonder de punt aan het eind
    tekst.textContent = uitkomst.textContent.trim().replace(/\.$/, "");
  }

  wis.addEventListener("click", function () {
    document.querySelectorAll('.filterknop[data-waarde="alles"], .formaatknop[data-formaat="alles"]').forEach(function (k) {
      if (k.getAttribute("aria-pressed") !== "true") k.click();
    });
    var alles = document.querySelector('.filterknop[data-filter="categorie"][data-waarde="alles"]');
    var doel = alles && alles.offsetParent ? alles : document.querySelector(".gebiedkeuze-knop");
    if (doel) doel.focus();
  });

  if (window.MutationObserver) {
    var waarnemer = new MutationObserver(werkBij);
    document.querySelectorAll(".filterknop, .formaatknop").forEach(function (k) {
      waarnemer.observe(k, { attributes: true, attributeFilter: ["aria-pressed"] });
    });
    waarnemer.observe(uitkomst, { childList: true, characterData: true, subtree: true });
  }
  // Eerste keer meteen: op de homepage zijn de filters uit het adres al
  // ingesteld voordat dit script draait, die mist de waarnemer anders.
  werkBij();
})();

// ---------- 4. De filterkeuze in het webadres ----------
// Kiest de bezoeker een filter, dan komt dat in het adres (?categorie=,
// ?gebied=, ?formaat=; bij Alles gaat de parameter er weer uit), met
// history.replaceState: dus geen extra stap voor de terugknop, maar wel een
// adres dat bij herladen of delen hetzelfde filter opent. Andere parameters
// blijven staan, behalve ?plek= op de kaartpagina: die telt niet meer zodra
// de bezoeker zelf een filter kiest (het kaartscript laat de gekozen pin dan
// los), en zou na herladen anders weer die pin met popup openen. De
// canonical blijft gewoon de pagina zonder parameters, en de deelknoppen
// delen bewust de canonical (zonder filter).
// Alleen bij een wijziging ná het laden: de filters uit het adres zelf
// staan er al in.
(function () {
  if (!window.history || !history.replaceState || !window.MutationObserver || !window.URL) return;
  function waarde(selector, veld) {
    var knop = document.querySelector(selector + '[aria-pressed="true"]');
    return knop ? knop.getAttribute(veld) : "alles";
  }
  function schrijf() {
    var adres = new URL(location.href);
    var p = adres.searchParams;
    var nu = {
      categorie: waarde('.filterknop[data-filter="categorie"]', "data-waarde"),
      gebied: waarde('.filterknop[data-filter="gebied"]', "data-waarde"),
      formaat: waarde(".formaatknop", "data-formaat")
    };
    Object.keys(nu).forEach(function (sleutel) {
      if (nu[sleutel] === "alles") p.delete(sleutel);
      else p.set(sleutel, nu[sleutel]);
    });
    p.delete("plek");
    var nieuw = adres.pathname + (p.toString() ? "?" + p.toString() : "") + adres.hash;
    if (nieuw !== location.pathname + location.search + location.hash) {
      history.replaceState(history.state, "", nieuw);
    }
  }
  var waarnemer = new MutationObserver(schrijf);
  document.querySelectorAll(".filterknop, .formaatknop").forEach(function (k) {
    waarnemer.observe(k, { attributes: true, attributeFilter: ["aria-pressed"] });
  });
})();
