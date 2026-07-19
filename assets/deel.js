// Deelknoppen in de footer (op elke pagina): WhatsApp delen + link kopiëren.
// De knoppen zelf staan in partials/footer.html.
(function () {
  // De canonical-link bevat het echte webadres van de post; handig als
  // de pagina lokaal (vanaf de eigen computer) wordt bekeken.
  var canonical = document.querySelector('link[rel="canonical"]');
  var url = canonical ? canonical.href : location.href;
  var titel = document.title.replace(/\s*\|\s*Rotterdam by Ferry\s*$/, "");

  var whatsapp = document.querySelector(".deelknop.whatsapp");
  if (whatsapp) {
    var bericht = encodeURIComponent(titel + " — " + url);
    var mobiel = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Mobiel: wa.me opent de WhatsApp-app. Desktop: rechtstreeks WhatsApp Web.
    whatsapp.href = mobiel
      ? "https://wa.me/?text=" + bericht
      : "https://web.whatsapp.com/send?text=" + bericht;
  }

  var kopieer = document.querySelector(".deelknop.kopieer");
  if (kopieer) {
    var origineleTekst = kopieer.textContent;
    var timer = null;

    function toonGelukt() {
      kopieer.textContent = "Link gekopieerd ✓";
      clearTimeout(timer);
      timer = setTimeout(function () {
        kopieer.textContent = origineleTekst;
      }, 2000);
    }

    kopieer.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(toonGelukt, function () {
          kopieerViaTekstveld();
        });
      } else {
        kopieerViaTekstveld();
      }
    });

    // Reserve-oplossing voor oudere browsers.
    function kopieerViaTekstveld() {
      var veld = document.createElement("textarea");
      veld.value = url;
      veld.setAttribute("readonly", "");
      veld.style.position = "absolute";
      veld.style.left = "-9999px";
      document.body.appendChild(veld);
      veld.select();
      try {
        document.execCommand("copy");
        toonGelukt();
      } catch (e) {
        window.prompt("Kopieer de link zelf (Ctrl+C):", url);
      }
      document.body.removeChild(veld);
    }
  }
})();
