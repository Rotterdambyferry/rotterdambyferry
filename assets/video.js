// Eigen (zelf gehoste) video's in een post. Een post met zo'n video laadt
// dit onderaan met <script src="../assets/video.js" defer></script>.
// De bijbehorende stijl staat in style.css (".post-video").
//
// In de HTML staan het stilstaande beeld als data-poster en het filmpje als
// data-src op de <source>. De video wordt pas geladen als hij tot op 300px
// van het scherm komt, zodat hij de laadsnelheid en de LCP niet beïnvloedt,
// en start dan vanzelf (autoplay, muted, loop). Wie in het besturingssysteem
// "minder beweging" heeft aanstaan, krijgt alleen het stilstaande beeld.
// Elke eigen video krijgt een zichtbare knop "Pauzeer" / "Speel af"
// (WCAG 2.2.2: bewegend beeld moet te stoppen zijn).
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
})();
