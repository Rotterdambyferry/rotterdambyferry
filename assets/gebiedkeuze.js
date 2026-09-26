// Keuzelijst voor het gebied op mobiel (homepage en kaartpagina).
//
// Op een telefoon staan de filters in één rij: vooraan de knop
// "Heel Rotterdam ▾" (staat al in de HTML, zodat er bij het laden niets
// verspringt), daarachter de categorieknoppen. Dit script maakt bij die knop
// een kleine keuzelijst met alle gebieden, gebouwd uit de gewone
// gebiedknopjes (.filterknop[data-filter="gebied"]) die op de computer
// zichtbaar zijn en op mobiel verborgen.
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
(function () {
  var houder = document.querySelector(".gebiedkeuze");
  if (!houder) return;
  var knop = houder.querySelector(".gebiedkeuze-knop");
  var knopTekst = houder.querySelector(".gebiedkeuze-tekst");
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
        knopTekst.textContent = alles ? "Heel Rotterdam" : o.bron.textContent.trim();
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
