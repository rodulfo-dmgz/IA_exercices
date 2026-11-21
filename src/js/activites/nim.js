/**
 * Jeu des allumettes contre une machine qui applique minimax.
 * Règle : à tour de rôle on retire 1 ou 2 allumettes ; celui qui prend la dernière gagne.
 * <div data-nim data-start="7">
 */
import { toast } from '../../components/toast/toast.js';

const root = document.querySelector('[data-nim]');
if (root) {
  const memo = new Map();
  /** Valeur minimax pour celui qui doit jouer avec n allumettes : true = il peut forcer la victoire. */
  function gagne(n) {
    if (n === 0) return false;                 // la dernière allumette vient d'être prise : celui qui devrait jouer a perdu
    if (memo.has(n)) return memo.get(n);
    const v = [1, 2].some((m) => m <= n && !gagne(n - m));
    memo.set(n, v);
    return v;
  }
  let timer, n, over, busy = false, aide = false, start = Number(root.dataset.start || 7), log = [];

  root.innerHTML = `
    <div class="nim-setup"><label>Allumettes au départ
      <select data-start-select>${[5, 6, 7, 8, 10, 11].map((v) => `<option value="${v}" ${v === start ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <button type="button" class="btn btn-outline" data-new><i class="ph-duotone ph-arrow-counter-clockwise" aria-hidden="true"></i> Nouvelle partie</button></div>
    <div class="matches" data-matches aria-hidden="true"></div>
    <p class="act-readout" role="status" aria-live="polite" data-status></p>
    <div class="act-buttons" role="group" aria-label="Votre coup">
      <button type="button" class="btn btn-primary" data-take="1">Retirer 1 allumette</button>
      <button type="button" class="btn btn-primary" data-take="2">Retirer 2 allumettes</button>
    </div>
    <label class="act-check"><input type="checkbox" data-aide> Montrer ce que calcule la machine (valeurs minimax)</label>
    <ul class="act-values" data-values hidden></ul>
    <details class="act-details"><summary>Voir la stratégie gagnante</summary><div class="act-meta" data-strategy></div></details>
    <details class="act-details"><summary>Déroulé de la partie</summary><ol class="act-history" data-log></ol></details>`;
  const q = (s) => root.querySelector(s);

  function paint(status) {
    q('[data-matches]').innerHTML = Array.from({ length: n }, () => '<span class="match"></span>').join('');
    q('[data-status]').textContent = status || `Il reste ${n} allumette${n > 1 ? 's' : ''}. À vous de jouer.`;
    root.querySelectorAll('[data-take]').forEach((b) => b.setAttribute('aria-disabled', String(over || Number(b.dataset.take) > n)));
    const vals = q('[data-values]');
    vals.hidden = !aide || over;
    if (!vals.hidden) {
      vals.innerHTML = [1, 2].filter((m) => m <= n).map((m) => {
        const adv = gagne(n - m);   // l'adversaire, une fois mon coup joué, peut-il forcer la victoire ?
        return `<li><strong>Retirer ${m}</strong> → il reste ${n - m} : ${n - m === 0 ? 'vous prenez la dernière, <b>valeur +1</b> pour vous' : adv ? 'l\'adversaire peut forcer la victoire, <b>valeur −1</b> pour vous' : 'l\'adversaire est piégé, <b>valeur +1</b> pour vous'}</li>`;
      }).join('');
    }
    q('[data-strategy]').innerHTML = `<p>Laissez toujours à l'adversaire un <strong>multiple de 3</strong> d'allumettes (3, 6, 9…). Quoi qu'il retire (1 ou 2), vous retirez ce qui complète à 3 : 2 s'il a pris 1, 1 s'il a pris 2.</p><p>${over ? 'Partie terminée.' : n % 3 === 0 ? `Avec ${n} allumettes, vous êtes en position perdante face à un adversaire parfait : retirez 1 et espérez une erreur.` : `Maintenant, avec ${n} allumettes : retirez <strong>${n % 3}</strong> pour en laisser ${n - (n % 3)}.`}</p>`;
    q('[data-log]').innerHTML = log.map((l) => `<li>${l}</li>`).join('') || '<li>La partie commence.</li>';
  }

  function finish(winner) {
    over = true;
    const you = winner === 'vous';
    paint(you ? 'Vous avez pris la dernière allumette : vous gagnez !' : 'La machine prend la dernière allumette : elle gagne.');
    toast({ type: you ? 'success' : 'info', title: you ? 'Victoire' : 'La machine gagne', description: you ? 'Vous avez joué comme minimax.' : 'Activez les valeurs minimax pour voir où le coup gagnant se cachait.' });
  }

  function machine() {
    busy = false;
    if (over) return;
    const m = [1, 2].find((x) => x <= n && !gagne(n - x)) || 1;   // coup gagnant s'il existe, sinon n'importe lequel
    n -= m;
    log.push(`La machine retire ${m} → ${n}`);
    if (n === 0) { finish('machine'); return; }
    paint(`La machine retire ${m}. Il reste ${n} allumette${n > 1 ? 's' : ''}. À vous.`);
  }

  function newGame() { clearTimeout(timer); n = start; over = false; busy = false; log = []; paint(); }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-take]');
    if (b) {
      if (over || busy || b.getAttribute('aria-disabled') === 'true') return;
      busy = true;
      const m = Number(b.dataset.take);
      n -= m;
      log.push(`Vous retirez ${m} → ${n}`);
      if (n === 0) { busy = false; finish('vous'); return; }
      paint(`Vous retirez ${m}. Il reste ${n}. La machine réfléchit…`);
      timer = setTimeout(machine, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
    }
    if (e.target.closest('[data-new]')) newGame();
  });
  root.querySelector('[data-aide]').addEventListener('change', (e) => { aide = e.target.checked; paint(q('[data-status]').textContent); });
  root.querySelector('[data-start-select]').addEventListener('change', (e) => { start = Number(e.target.value); newGame(); });
  newGame();
}
