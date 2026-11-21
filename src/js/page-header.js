/**
 * En-tête de page qui se compacte au scroll.
 * Écrit --p (0 → 1) sur .page-header ; le CSS (layout/stage.css) fait le reste.
 * À p = 1, l'en-tête a la hauteur du logo de la sidebar : le trait orange
 * s'aligne sur la ligne de séparation du logo.
 */
const header = document.querySelector('.page-header');

if (header) {
  const RANGE = 120; // px de scroll pour passer de l'état grand à l'état compact
  let ticking = false;

  const update = () => {
    ticking = false;
    const p = Math.min(1, Math.max(0, window.scrollY / RANGE));
    header.style.setProperty('--p', p.toFixed(3));
    header.classList.toggle('is-stuck', p > 0.02);
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  update();
}
