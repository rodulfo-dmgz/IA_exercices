/** Atelier « Deux jerricans » : manipuler des états et des transitions. <div data-jarres data-a="3" data-b="5" data-cible="4"> */
import { toast } from '../../components/toast/toast.js';

const root = document.querySelector('[data-jarres]');
if (root) {
  const CA = Number(root.dataset.a || 3), CB = Number(root.dataset.b || 5), GOAL = Number(root.dataset.cible || 4), BEST = Number(root.dataset.min || 6);
  const ACTIONS = [
    { id: 'fa', label: 'Remplir A', f: ([a, b]) => [CA, b] },
    { id: 'fb', label: 'Remplir B', f: ([a, b]) => [a, CB] },
    { id: 'ea', label: 'Vider A', f: ([a, b]) => [0, b] },
    { id: 'eb', label: 'Vider B', f: ([a, b]) => [a, 0] },
    { id: 'ab', label: 'Verser A dans B', f: ([a, b]) => { const t = Math.min(a, CB - b); return [a - t, b + t]; } },
    { id: 'ba', label: 'Verser B dans A', f: ([a, b]) => { const t = Math.min(b, CA - a); return [a + t, b - t]; } },
  ];
  let state, history, done;

  /* Plus court chemin (recherche en largeur) : on explore les états à partir de (0, 0) */
  function shortest() {
    const key = (s) => s.join(',');
    const prev = new Map([[key([0, 0]), null]]);
    const queue = [[0, 0]];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.includes(GOAL)) {
        const path = [];
        for (let k = key(cur); prev.get(k); k = key(prev.get(k).from)) path.unshift({ label: prev.get(k).label, s: k.split(',').map(Number) });
        return path;
      }
      for (const x of ACTIONS) {
        const n = x.f(cur);
        if (!prev.has(key(n))) { prev.set(key(n), { from: cur, label: x.label }); queue.push(n); }
      }
    }
    return [];
  }

  root.innerHTML = `
    <div class="jugs" aria-hidden="true">
      <div class="jug"><div class="jug-body"><div class="jug-fill" data-fill="a"></div></div><span>A · ${CA} L</span></div>
      <div class="jug"><div class="jug-body" style="--cap:${CB / Math.max(CA, CB)}"><div class="jug-fill" data-fill="b"></div></div><span>B · ${CB} L</span></div>
    </div>
    <div class="act-readout" role="status" aria-live="polite" data-readout></div>
    <div class="act-buttons" role="group" aria-label="Actions possibles">${ACTIONS.map((x) => `<button type="button" class="btn btn-outline" data-act="${x.id}">${x.label}</button>`).join('')}</div>
    <div class="act-row"><button type="button" class="btn btn-outline" data-reset><i class="ph-duotone ph-arrow-counter-clockwise" aria-hidden="true"></i> Recommencer</button><p class="act-meta" data-meta></p></div>
    <details class="act-details"><summary>Voir une solution</summary><p class="act-meta" data-solution-intro></p><ol class="act-history" data-solution></ol></details>
    <details class="act-details"><summary>Chemin parcouru</summary><ol class="act-history" data-history></ol></details>`;
  const q = (s) => root.querySelector(s);

  function paint(msg) {
    q('[data-fill="a"]').style.height = `${(state[0] / CA) * 100}%`;
    q('[data-fill="b"]').style.height = `${(state[1] / CB) * 100}%`;
    q('[data-readout]').innerHTML = msg || `État actuel : <strong>(${state[0]}, ${state[1]})</strong>, soit ${state[0]} L dans A et ${state[1]} L dans B. Objectif : ${GOAL} L dans l'un des deux.`;
    q('[data-meta]').textContent = `Transitions : ${history.length} · ${(CA + 1) * (CB + 1)} états possibles`;
    q('[data-history]').innerHTML = history.map((h) => `<li>${h.label} → (${h.s[0]}, ${h.s[1]})</li>`).join('') || '<li>Aucune transition pour l\'instant.</li>';
    root.querySelectorAll('[data-act]').forEach((b) => {
      const x = ACTIONS.find((a) => a.id === b.dataset.act), n = x.f(state);
      b.setAttribute('aria-disabled', String(done || (n[0] === state[0] && n[1] === state[1])));
    });
  }
  function reset() { state = [0, 0]; history = []; done = false; paint(); }
  const sol = shortest();
  q('[data-solution-intro]').textContent = `Un plus court chemin : ${sol.length} transitions, de (0, 0) à un état avec ${GOAL} L.`;
  q('[data-solution]').innerHTML = sol.map((t) => `<li>${t.label} → (${t.s[0]}, ${t.s[1]})</li>`).join('');

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-reset')) { reset(); return; }
    if (!b.dataset.act || b.getAttribute('aria-disabled') === 'true') return;
    const x = ACTIONS.find((a) => a.id === b.dataset.act);
    state = x.f(state);
    history.push({ label: x.label, s: state });
    if (state.includes(GOAL)) {
      done = true;
      const n = history.length;
      const verdict = n === BEST ? 'C\'est le chemin le plus court possible.' : n > BEST ? `Il existe un chemin plus court (${BEST} transitions). Retentez !` : '';
      paint(`<strong>Objectif atteint en ${n} transitions.</strong> ${verdict}`);
      toast({ type: 'success', title: `${GOAL} litres en ${n} transitions`, description: verdict });
    } else paint();
  });
  reset();
}
