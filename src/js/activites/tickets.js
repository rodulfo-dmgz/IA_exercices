/**
 * Atelier : tri de tickets de support par classifieur bayésien naïf.
 * Comptages dans le tableau de la séance ; plancher de probabilité 1/50 000 pour un mot absent d'une classe.
 * <div data-tickets>
 */
const root = document.querySelector('[data-tickets]');
if (root) {
  const TOT_U = 40000, TOT_C = 160000, FLOOR = 2e-5, PRIOR = 1 / 4;
  const COMPTES = { panne: [160, 80], bloque: [120, 40], merci: [50, 800], facture: [100, 400], serveur: [40, 0] };
  const AFFICHE = { bloque: 'bloqué' };
  const lr = (w) => { const [u, c] = COMPTES[w]; return (u / TOT_U) / Math.max(c / TOT_C, FLOOR); };
  const flat = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const f = (n) => (n >= 100 ? String(Math.round(n)) : n < 1 ? String(Math.round(n * 10000) / 10000) : String(Math.round(n * 100) / 100)).replace('.', ',');
  const EX = ['panne serveur bloqué merci', 'merci facture', 'panne bloqué', 'bonjour merci'];

  root.innerHTML = `
    <label class="tk-label">Texte du ticket <input type="text" class="quiz-input" data-msg autocomplete="off" spellcheck="false" value="panne bloqué" placeholder="Tapez un message avec les mots du tableau"></label>
    <div class="act-buttons" role="group" aria-label="Exemples de tickets">${EX.map((e) => `<button type="button" class="chip" data-ex="${e}">${e}</button>`).join('')}</div>
    <ol class="tk-steps" data-steps></ol>
    <p class="act-readout tk-verdict" role="status" aria-live="polite" data-verdict></p>`;
  const q = (s) => root.querySelector(s);

  function paint() {
    const mots = flat(q('[data-msg]').value).split(/[^a-z0-9]+/).filter(Boolean);
    let cote = PRIOR;
    const lignes = [`<li><span>Départ</span><span>cote antérieure <strong>1:4</strong> = ${f(PRIOR)}</span></li>`];
    const ignores = [];
    mots.forEach((w) => {
      if (!COMPTES[w]) { ignores.push(w); return; }
      const r = lr(w);
      cote *= r;
      lignes.push(`<li><span>« ${AFFICHE[w] || w} »</span><span>× ${f(r)} → <strong>${f(cote)}</strong></span></li>`);
    });
    q('[data-steps]').innerHTML = lignes.join('');
    const urgent = cote > 1;
    const p = cote / (1 + cote) * 100;
    q('[data-verdict]').className = `act-readout tk-verdict ${urgent ? 'is-urgent' : ''}`;
    q('[data-verdict]').innerHTML = `Cote postérieure : <strong>${f(cote)}</strong> en faveur d'« urgent » (probabilité ${f(p)} %). Classement : <strong>${urgent ? 'URGENT' : 'courant'}</strong>.${ignores.length ? ` <span class="act-meta">Mots ignorés (absents du tableau) : ${ignores.join(', ')}.</span>` : ''}`;
  }
  root.addEventListener('input', paint);
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) { q('[data-msg]').value = b.dataset.ex; paint(); } });
  paint();
}
