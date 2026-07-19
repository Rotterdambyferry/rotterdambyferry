// Sticky header: zet de klasse "is-gescrold" op de header zodra de pagina
// gescrold is, zodat de header een subtiele schaduw krijgt en optisch los
// van de content komt te liggen. De bijbehorende stijl staat in style.css.
(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;
  function bijwerken() {
    header.classList.toggle("is-gescrold", window.scrollY > 4);
  }
  window.addEventListener("scroll", bijwerken, { passive: true });
  bijwerken();
})();
