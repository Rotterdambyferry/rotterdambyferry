// Eigen (zelf gehoste) video's in een post pas laden als ze bijna in beeld
// zijn, zodat ze de laadsnelheid en de LCP niet beïnvloeden. In de HTML staan
// het stilstaande beeld als data-poster en het filmpje als data-src op de
// <source>; dit script zet die om naar echte attributen zodra de video tot
// op 300px van het scherm komt, en start hem dan (autoplay, muted, loop).
// Wie in het besturingssysteem "minder beweging" heeft aanstaan, krijgt
// alleen het stilstaande beeld. De bijbehorende stijl staat in style.css
// (".post-video.staand").
(function () {
  var videos = document.querySelectorAll("video[data-poster]");
  if (!videos.length) return;
  var minderBeweging = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function laad(video) {
    video.poster = video.getAttribute("data-poster");
    if (minderBeweging) {
      video.removeAttribute("autoplay");
      return;
    }
    var bronnen = video.querySelectorAll("source[data-src]");
    for (var i = 0; i < bronnen.length; i++) {
      bronnen[i].src = bronnen[i].getAttribute("data-src");
    }
    video.load();
    var afspelen = video.play();
    if (afspelen && afspelen.catch) afspelen.catch(function () {});
  }

  if (!("IntersectionObserver" in window)) {
    for (var i = 0; i < videos.length; i++) laad(videos[i]);
    return;
  }
  var observer = new IntersectionObserver(function (items) {
    items.forEach(function (item) {
      if (!item.isIntersecting) return;
      observer.unobserve(item.target);
      laad(item.target);
    });
  }, { rootMargin: "300px 0px" });
  for (var j = 0; j < videos.length; j++) observer.observe(videos[j]);
})();
