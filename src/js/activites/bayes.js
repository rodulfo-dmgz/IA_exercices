/** Calculateur de Bayes en fréquences naturelles (détecteur de fraude). <div data-bayes> */
const root = document.querySelector('[data-bayes]');
if (root) {
  const N = 1000;
  root.innerHTML = `
    <div class="act-sliders">
      <label>Paiements frauduleux sur 1 000 <output data-o1></output><input type="range" min="1" max="200" step="1" value="2" data-base></label>
      <label>Le détecteur repère les fraudes (sensibilité) <output data-o2></output><input type="range" min="10" max="100" step="1" value="90" data-sens></label>
      <label>Il se trompe sur les paiements normaux (faux positifs) <output data-o3></output><input type="range" min="0" max="30" step="1" value="3" data-fp></label>
    </div>
    <div class="bayes-bar" aria-hidden="true"><span class="bayes-true" data-tbar></span><span class="bayes-false" data-fbar></span></div>
    <ul class="act-readout bayes-list" role="status" aria-live="polite" data-out></ul>`;
  const q = (s) => root.querySelector(s);
  const f1 = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

  function paint() {
    const base = +q('[data-base]').value, sens = +q('[data-sens]').value / 100, fp = +q('[data-fp]').value / 100;
    q('[data-o1]').textContent = base; q('[data-o2]').textContent = `${Math.round(sens * 100)} %`; q('[data-o3]').textContent = `${Math.round(fp * 100)} %`;
    const vrai = base * sens, faux = (N - base) * fp, alertes = vrai + faux;
    const prob = alertes > 0 ? vrai / alertes * 100 : 0;
    q('[data-tbar]').style.flexGrow = vrai; q('[data-fbar]').style.flexGrow = faux;
    const lr = fp > 0 ? sens / fp : Infinity;
    const post = fp > 0 ? (base / (N - base)) * lr : Infinity;
    q('[data-out]').innerHTML = `
      <li>Sur 1 000 paiements : <strong>${base}</strong> frauduleux, <strong>${N - base}</strong> normaux. Cote antérieure : <strong>${base}:${N - base}</strong>.</li>
      <li>Alertes attendues : <strong>${f1(vrai)}</strong> vraies fraudes et <strong>${f1(faux)}</strong> fausses alertes, soit ${f1(alertes)} au total.</li>
      <li>Rapport de vraisemblance : <strong>${fp > 0 ? f1(lr) : 'infini (aucune fausse alerte)'}</strong>${fp > 0 ? ` (${Math.round(sens * 100)} % ÷ ${Math.round(fp * 100)} %)` : ''}.</li>
      <li>Cote postérieure : <strong>${fp > 0 ? `${f1(vrai)}:${f1(faux)}` : 'aucune fausse alerte : fraude certaine'}</strong>${fp > 0 ? ` (≈ ${String(Math.round(post * 1000) / 1000).replace('.', ',')}), c'est-à-dire cote antérieure × rapport.` : ''}</li>
      <li class="bayes-result">Après une alerte, probabilité de fraude : <strong>${f1(prob)} %</strong>.</li>`;
  }
  root.addEventListener('input', paint);
  paint();
}
