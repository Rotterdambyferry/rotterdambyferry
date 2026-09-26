// Alles voor video's in een post, in één script. Een post met een video
// laadt dit onderaan met <script src="../assets/video.js" defer></script>.
// De bijbehorende stijl staat in style.css (".post-video").
//
// 1. Eigen (zelf gehoste) video's: <video data-poster="..."> met de bron als
//    data-src op de <source>. Die worden pas geladen als ze tot op 300px van
//    het scherm komen, zodat ze de laadsnelheid en de LCP niet beïnvloeden,
//    en starten dan vanzelf (autoplay, muted, loop). Wie in het
//    besturingssysteem "minder beweging" heeft aanstaan, krijgt alleen het
//    stilstaande beeld. Elke eigen video krijgt een zichtbare knop
//    "Pauzeer" / "Speel af" (WCAG 2.2.2: bewegend beeld moet te stoppen zijn).
//
// 2. Video's van YouTube of TikTok: <a class="video-facade" href="LINK NAAR
//    DE VIDEO" data-titel="..."> met een stilstaand plaatje erin. Tot de
//    bezoeker op "Speel af" tikt, wordt er niets van YouTube of TikTok
//    geladen (geen megabytes, geen cookies). Na de tik vervangt dit script
//    het plaatje door de echte video (YouTube via youtube-nocookie.com,
//    TikTok via TikToks eigen embed), met de data-titel als titel voor
//    screenreaders. Zonder JavaScript is het gewoon een link naar de video.
(function () {
  // ---------- 1. Eigen video's ----------
  var videos = document.querySelectorAll("video[data-poster]");
  var minderBeweging = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PAUZE_ICOON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" focusable="false"><rect x="2" y="1" width="3.5" height="12"/><rect x="8.5" y="1" width="3.5" height="12"/></svg>';
  var SPEEL_ICOON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" focusable="false"><path d="M3 1l10 6-10 6z"/></svg>';

  function bronnenLaden(video) {
    video.poster = video.getAttribute("data-poster");
    if (video.hasAttribute("data-geladen")) return;
    video.setAttribute("data-geladen", "");
    var bronnen = video.querySelectorAll("source[data-src]");
    for (var i = 0; i < bronnen.length; i++) {
      bronnen[i].src = bronnen[i].getAttribute("data-src");
    }
    video.load();
  }

  function afspelen(video) {
    var belofte = video.play();
    if (belofte && belofte.catch) belofte.catch(function () {});
  }

  // Aangeroepen zodra de video bijna in beeld is.
  function laad(video) {
    if (minderBeweging) {
      video.poster = video.getAttribute("data-poster");
      video.removeAttribute("autoplay");
      return;
    }
    bronnenLaden(video);
    afspelen(video);
  }

  function maakPauzeknop(video) {
    var knop = document.createElement("button");
    knop.type = "button";
    knop.className = "video-pauze";
    function werkBij() {
      knop.innerHTML = video.paused ? SPEEL_ICOON + "Speel af" : PAUZE_ICOON + "Pauzeer";
    }
    knop.addEventListener("click", function () {
      if (video.paused) {
        bronnenLaden(video);
        afspelen(video);
      } else {
        video.pause();
      }
    });
    video.addEventListener("play", werkBij);
    video.addEventListener("pause", werkBij);
    werkBij();
    video.parentNode.appendChild(knop);
  }

  for (var k = 0; k < videos.length; k++) maakPauzeknop(videos[k]);

  if (videos.length && !("IntersectionObserver" in window)) {
    for (var i = 0; i < videos.length; i++) laad(videos[i]);
  } else if (videos.length) {
    var observer = new IntersectionObserver(function (items) {
      items.forEach(function (item) {
        if (!item.isIntersecting) return;
        observer.unobserve(item.target);
        laad(item.target);
      });
    }, { rootMargin: "300px 0px" });
    for (var j = 0; j < videos.length; j++) observer.observe(videos[j]);
  }

  // ---------- 2. Video's van YouTube of TikTok ----------
  // Herkent de gewone link naar een video en geeft terug om welke dienst en
  // welke video het gaat, of null bij een onbekend adres (dan blijft het
  // gewoon een link).
  function embedVoor(href) {
    var m = href.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return { bron: "YouTube", id: m[1] };
    m = href.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
    if (m) return { bron: "TikTok", id: m[1] };
    return null;
  }

  // YouTube: de speler direct in het kader zetten, via youtube-nocookie.com,
  // en meteen laten afspelen (de tik op "Speel af" telt als toestemming).
  function laadYouTube(link, embed, titel) {
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + embed.id + "?autoplay=1&rel=0";
    iframe.title = "YouTube-video: " + titel;
    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; web-share");
    iframe.setAttribute("allowfullscreen", "");
    link.parentNode.replaceChild(iframe, link);
    // Toetsenbordgebruikers niet laten "verdwalen": de focus gaat naar de video
    iframe.focus();
  }

  // TikTok: de gewone TikTok-embed (blockquote + embed.js van TikTok zelf),
  // precies zoals TikTok hem aanbiedt. Bewust niet TikToks kale "player/v1":
  // die gaf in tests bij nieuwe bezoekers (zonder TikTok-cookies) een
  // foutmelding. De embed bepaalt zelf zijn hoogte, dus hij vervangt het hele
  // 9:16-kader. Zodra embed.js de iframe heeft gemaakt, krijgt die alsnog
  // een titel voor screenreaders.
  function laadTikTok(link, embed, titel) {
    var kader = link.parentNode;
    var blok = document.createElement("blockquote");
    blok.className = "tiktok-embed";
    blok.setAttribute("cite", link.href);
    blok.setAttribute("data-video-id", embed.id);
    blok.style.cssText = "max-width: 360px; min-width: 325px;";
    blok.appendChild(document.createElement("section"));
    kader.parentNode.replaceChild(blok, kader);

    if (window.MutationObserver) {
      var waarnemer = new MutationObserver(function () {
        var iframe = blok.querySelector("iframe");
        if (!iframe) return;
        waarnemer.disconnect();
        iframe.title = "TikTok-video: " + titel;
        iframe.focus();
        // Lukte dat nog niet (iframe nog niet klaar), dan na het laden,
        // maar alleen als de focus nog nergens anders staat.
        iframe.addEventListener("load", function () {
          if (document.activeElement === document.body) iframe.focus();
        });
      });
      waarnemer.observe(blok, { childList: true, subtree: true });
    }
    // Steeds een nieuw script-element: zo pakt embed.js ook een tweede
    // TikTok op dezelfde pagina op.
    var script = document.createElement("script");
    script.src = "https://www.tiktok.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }

  var facades = document.querySelectorAll("a.video-facade");
  for (var f = 0; f < facades.length; f++) maakFacade(facades[f]);

  function maakFacade(link) {
    var embed = embedVoor(link.href);
    if (!embed) return;
    var titel = link.getAttribute("data-titel") || "Video";
    link.setAttribute("aria-label", "Speel af: " + titel + " (video van " + embed.bron + ")");

    // Klein label "YouTube"/"TikTok" linksboven in het kader. Bewust naast de
    // link in plaats van erin: zo is "Speel af" de enige zichtbare tekst van
    // de link, en klopt die met wat een screenreader voorleest.
    var label = document.createElement("span");
    label.className = "video-facade-bron";
    label.setAttribute("aria-hidden", "true");
    label.textContent = embed.bron;
    link.parentNode.appendChild(label);

    link.addEventListener("click", function (e) {
      // Ctrl-/Cmd-klik of middelste muisknop: gewoon in een nieuw tabblad openen
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      if (label.parentNode) label.parentNode.removeChild(label);
      if (embed.bron === "YouTube") laadYouTube(link, embed, titel);
      else laadTikTok(link, embed, titel);
    });
  }
})();
