/** Convertisseur cote ↔ probabilité. <div data-cotes> */
const root = document.querySelector('[data-cotes]');
if (root) {
  root.innerHTML = `
    <div class="act-two">
      <fieldset class="act-card"><legend>De la cote à la probabilité</legend>
        <div class="act-inline"><label>Pour <input type="number" min="0" step="1" value="3" data-x inputmode="numeric"></label>
          <span aria-hidden="true">contre</span><label>contre <input type="number" min="0" step="1" value="1" data-y inputmode="numeric"></label></div>
        <p class="act-readout" role="status" aria-live="polite" data-r1></p>
        <div class="prob-bar" aria-hidden="true"><span data-bar1></span></div>
      </fieldset>
      <fieldset class="act-card"><legend>De la probabilité à la cote</legend>
        <div class="act-inline"><label>Probabilité (%) <input type="number" min="0" max="100" step="any" value="20" data-p inputmode="decimal"></label></div>
        <p class="act-readout" role="status" aria-live="polite" data-r2></p>
        <div class="prob-bar" aria-hidden="true"><span data-bar2></span></div>
      </fieldset>
    </div>
    <details class="act-details"><summary>Voir les formules et des exemples résolus</summary>
      <ul class="act-values">
        <li><strong>Cote → probabilité :</strong> x:y donne x / (x + y). Exemple : 4:1 → 4 / 5 = 0,8 = 80 %.</li>
        <li><strong>Probabilité → cote :</strong> p donne p : (1 − p). Exemple : 25 % → 0,25 : 0,75 = 1:3.</li>
        <li><strong>Piège :</strong> 1:4 n'est pas 25 % : c'est 1 / (1 + 4) = 20 %.</li>
      </ul>
    </details>`;
  const q = (s) => root.querySelector(s);
  const f = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

  function fromOdds() {
    const x = Number(q('[data-x]').value), y = Number(q('[data-y]').value);
    if (!(x >= 0 && y >= 0) || x + y === 0) { q('[data-r1]').textContent = 'Saisissez deux nombres positifs.'; q('[data-bar1]').style.width = '0'; return; }
    const p = x / (x + y) * 100;
    q('[data-r1]').innerHTML = `Cote <strong>${x}:${y}</strong> : ${x} cas favorable${x > 1 ? 's' : ''} pour ${y} défavorable${y > 1 ? 's' : ''}, donc <strong>${x} chance${x > 1 ? 's' : ''} sur ${x + y}</strong>, soit <strong>${f(p)} %</strong>.`;
    q('[data-bar1]').style.width = `${p}%`;
  }
  function fromProb() {
    const p = Number(q('[data-p]').value);
    if (!(p >= 0 && p <= 100)) { q('[data-r2]').textContent = 'Saisissez un pourcentage entre 0 et 100.'; q('[data-bar2]').style.width = '0'; return; }
    q('[data-bar2]').style.width = `${p}%`;
    if (p === 100) { q('[data-r2]').textContent = 'Certain : aucun cas défavorable, la cote est infinie.'; return; }
    if (p === 0) { q('[data-r2]').textContent = 'Impossible : aucun cas favorable.'; return; }
    const c = p / (100 - p);
    q('[data-r2]').innerHTML = `<strong>${f(p)} %</strong> : ${f(p)} cas favorables pour ${f(100 - p)} défavorables, soit une cote de <strong>${f(c)}:1</strong>${c < 1 ? ` (ou <strong>1:${f(1 / c)}</strong>)` : ''}.`;
  }
  root.addEventListener('input', (e) => { if (e.target.matches('[data-x], [data-y]')) fromOdds(); else fromProb(); });
  fromOdds(); fromProb();
}
