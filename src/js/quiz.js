/**
 * Moteur d'auto-évaluation : <div class="panel" data-assessment="m2-s1"></div>
 * Les questions viennent de evaluations.js. Une correction globale, puis :
 *   - corrigé détaillé par question (texte + icône, jamais la couleur seule) ;
 *   - note enregistrée (meilleure tentative) et remontée au carnet de notes du LMS ;
 *   - « Recommencer » à volonté ; « Imprimer / PDF » du corrigé.
 */
import { parId, MAITRISE, MODULES } from './evaluations.js';
import { saveAttempt, loadNotes, traceInteractions, inLms, lmsReadOnly, moduleSummary, summary as summary_ } from './notes.js';
import { toast } from '../components/toast/toast.js';
import { requestQuit, canQuit } from './exit.js';

const LETTERS = 'abcdefghij';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** « 1 080 », « 5,7 % », « 2/5 », « 60:998 » → nombre (NaN si illisible). */
export function parseValue(raw) {
  const s = String(raw).replace(/ |\s/g, '').replace('%', '').replace(',', '.');
  if (!s) return NaN;
  const ratio = s.match(/^(-?\d+(?:\.\d+)?)[:/](\d+(?:\.\d+)?)$/);
  if (ratio) return Number(ratio[2]) === 0 ? NaN : Number(ratio[1]) / Number(ratio[2]);
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

function learnerName() {
  const p = window.RDProfile && window.RDProfile.get();
  if (p) return [p.civilite === 'Mme' ? 'Mme' : p.civilite === 'M' ? 'M.' : '', p.prenom, p.nom].filter(Boolean).join(' ');
  try {
    const api = window.parent && window.parent.SCORM_API;
    const raw = api && api.get('cmi.core.student_name');
    if (raw) return raw.includes(',') ? raw.split(',').reverse().join(' ').trim() : raw;
  } catch (_) { /* ignoré */ }
  return '';
}

/* ───────── rendu d'une question ───────── */
function renderQuestion(q, i, uid) {
  const name = `${uid}-q${i}`;
  let body = '';
  if (q.t === 'single' || q.t === 'multi') {
    const type = q.t === 'single' ? 'radio' : 'checkbox';
    body = `<div class="quiz-options">${q.options.map((o, k) =>
      `<label class="quiz-option"><input type="${type}" name="${name}" value="${k}"><span><b aria-hidden="true">${LETTERS[k].toUpperCase()}.</b> ${esc(o)}</span></label>`).join('')}</div>`;
    if (q.t === 'multi') body = `<p class="quiz-hint">Plusieurs réponses possibles.</p>` + body;
  } else {
    body = `<div class="quiz-field"><input class="quiz-input" type="text" inputmode="${q.t === 'num' ? 'text' : 'text'}" autocomplete="off" spellcheck="false" name="${name}" aria-describedby="${name}-hint" ${q.t === 'num' ? 'enterkeyhint="done"' : ''}>${q.unit ? `<span class="quiz-unit" aria-hidden="true">${esc(q.unit)}</span>` : ''}</div>
      <p class="quiz-hint" id="${name}-hint">${esc(q.hint || '')}</p>`;
  }
  return `<fieldset class="quiz-q" data-i="${i}"><legend><span class="quiz-num">Question ${i + 1}</span> ${esc(q.q)}</legend>${body}<div class="quiz-result" role="status"></div></fieldset>`;
}

/* ───────── lecture / correction ───────── */
function readAnswer(q, fs) {
  if (q.t === 'single') { const c = fs.querySelector('input:checked'); return c ? Number(c.value) : null; }
  if (q.t === 'multi') { const v = [...fs.querySelectorAll('input:checked')].map((c) => Number(c.value)); return v.length ? v : null; }
  const v = fs.querySelector('input').value.trim();
  return v === '' ? null : v;
}

function isRight(q, a) {
  if (q.t === 'single') return a === q.a;
  if (q.t === 'multi') return a.length === q.a.length && q.a.every((x) => a.includes(x));
  if (q.t === 'num') { const v = parseValue(a); return !Number.isNaN(v) && Math.abs(v - q.a) <= (q.tol || 0); }
  return q.accept.map(norm).includes(norm(a));
}

const fmt = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
function givenText(q, a) {
  if (a === null) return 'Pas de réponse';
  if (q.t === 'single') return `${LETTERS[a].toUpperCase()}. ${q.options[a]}`;
  if (q.t === 'multi') return a.sort().map((k) => `${LETTERS[k].toUpperCase()}. ${q.options[k]}`).join(' ; ');
  return `${a}${q.unit ? ' ' + q.unit : ''}`;
}
function expectedText(q) {
  if (q.t === 'single') return `${LETTERS[q.a].toUpperCase()}. ${q.options[q.a]}`;
  if (q.t === 'multi') return q.a.map((k) => `${LETTERS[k].toUpperCase()}. ${q.options[k]}`).join(' ; ');
  if (q.t === 'num') return `${fmt(q.a)}${q.unit ? ' ' + q.unit : ''}`;
  return q.accept[0];
}
function interactionOf(q, a) {
  let type = q.t === 'num' ? 'numeric' : q.t === 'text' ? 'fill-in' : 'choice';
  let response = a === null ? '' : q.t === 'single' ? LETTERS[a] : q.t === 'multi' ? a.map((k) => LETTERS[k]).join(',') : String(a);
  if (q.t === 'num' && a !== null) {
    const v = parseValue(a);
    if (Number.isNaN(v)) type = 'fill-in';            // saisie illisible : texte libre plutôt qu'une valeur refusée
    else response = String(Math.round(v * 1e6) / 1e6); // « 2:998 » ou « 5,7 % » → nombre décimal
  }
  // Bonne réponse, au même format que la réponse de l'apprenant (rapports détaillés du LMS)
  const correct = q.t === 'single' ? LETTERS[q.a] : q.t === 'multi' ? q.a.map((k) => LETTERS[k]).join(',')
    : q.t === 'num' ? String(Math.round(q.a * 1e6) / 1e6) : q.accept[0];
  return { type, response, correct };
}

/* ───────── composant ───────── */
function mount(root) {
  const ev = parId(root.dataset.assessment);
  if (!ev) { root.textContent = `Évaluation inconnue : ${root.dataset.assessment}`; return; }
  const uid = `qz-${ev.id}`;
  const max = ev.questions.length;

  function draw() {
    const prev = loadNotes()[ev.id];
    root.innerHTML = `
      <h2 class="panel-title">Auto-évaluation</h2>
      ${lmsReadOnly()
        ? `<p class="quiz-readonly" role="status"><i class="ph-duotone ph-eye" aria-hidden="true"></i><span><strong>Mode révision : vos résultats ne sont pas enregistrés par la plateforme.</strong> Vous pouvez vous entraîner, mais votre note officielle ne changera pas.</span></p>
      <p class="panel-text">${max} question${max > 1 ? 's' : ''}. Vous pouvez recommencer autant de fois que vous voulez pour vous entraîner.</p>`
        : `<p class="panel-text">${max} question${max > 1 ? 's' : ''}. Vous pouvez recommencer autant de fois que vous voulez : <strong>votre meilleure note est conservée</strong>${inLms() ? ' et transmise au carnet de notes de votre plateforme' : ''}.</p>`}
      <p class="quiz-best" ${prev ? '' : 'hidden'}>${prev ? `<i class="ph-duotone ph-medal" aria-hidden="true"></i> Meilleure note : <strong>${prev[0]} / ${prev[1]}</strong> · ${prev[2]} tentative${prev[2] > 1 ? 's' : ''}` : ''}</p>
      <form class="quiz-form" novalidate>
        ${ev.questions.map((q, i) => renderQuestion(q, i, uid)).join('')}
        <div class="quiz-actions">
          <button type="submit" class="btn btn-primary btn-lg"><i class="ph-duotone ph-check-circle" aria-hidden="true"></i> Corriger mes réponses</button>
          <button type="button" class="btn btn-outline btn-lg" data-reveal><i class="ph-duotone ph-eye" aria-hidden="true"></i> Voir les réponses</button>
        </div>
        <p class="quiz-hint">« Voir les réponses » affiche les corrigés sans note. Pour être noté·e, recommencez ensuite.</p>
      </form>
      <div class="quiz-summary" role="status" tabindex="-1" hidden></div>
      <div class="print-sheet" aria-hidden="true"></div>`;
    root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); correct(); });
    root.querySelector('[data-reveal]').addEventListener('click', reveal);
  }

  /* Consultation des corrigés, sans note : on apprend d'abord, on se fait noter ensuite */
  function reveal() {
    const form = root.querySelector('form');
    const fields = [...form.querySelectorAll('.quiz-q')];
    fields.forEach((fs, i) => {
      const q = ev.questions[i];
      fs.disabled = true;
      fs.classList.add('is-answer');
      if (q.t === 'single' || q.t === 'multi') {
        const good = q.t === 'single' ? [q.a] : q.a;
        fs.querySelectorAll('.quiz-option').forEach((lab, k) => {
          if (good.includes(k)) { lab.classList.add('is-right'); lab.insertAdjacentHTML('beforeend', '<em class="quiz-flag">Bonne réponse</em>'); }
        });
      }
      fs.querySelector('.quiz-result').innerHTML = `<p class="quiz-verdict quiz-verdict--info"><i class="ph-duotone ph-eye" aria-hidden="true"></i> Réponse : <strong>${esc(expectedText(q))}</strong></p><p class="quiz-why">${esc(q.why)}</p>`;
    });
    form.querySelector('.quiz-actions').hidden = true;
    const summary = root.querySelector('.quiz-summary');
    summary.hidden = false;
    summary.className = 'quiz-summary';
    summary.innerHTML = `<p class="quiz-score"><i class="ph-duotone ph-eye" aria-hidden="true"></i><span><strong>Corrigés affichés, sans note.</strong> Prenez le temps de les relire, puis recommencez pour obtenir votre note.</span></p>
      <div class="quiz-actions"><button type="button" class="btn btn-primary" data-retry><i class="ph-duotone ph-arrow-counter-clockwise" aria-hidden="true"></i> Recommencer pour être noté·e</button></div>`;
    summary.querySelector('[data-retry]').addEventListener('click', () => { draw(); root.querySelector('input')?.focus(); root.scrollIntoView({ block: 'start' }); });
    summary.focus();
  }

  function correct() {
    const form = root.querySelector('form');
    const fields = [...form.querySelectorAll('.quiz-q')];
    const answers = ev.questions.map((q, i) => readAnswer(q, fields[i]));
    const empty = answers.findIndex((a) => a === null);
    if (empty !== -1) {
      toast({ type: 'info', title: 'Il reste des questions sans réponse', description: `Question ${empty + 1} : répondez, puis corrigez.` });
      (fields[empty].querySelector('input') || form).focus();
      return;
    }

    let score = 0;
    const rows = ev.questions.map((q, i) => {
      const ok = isRight(q, answers[i]);
      if (ok) score++;
      return { q, a: answers[i], ok, ...interactionOf(q, answers[i]) };
    });

    fields.forEach((fs, i) => {
      const r = rows[i];
      fs.disabled = true;
      fs.classList.add(r.ok ? 'is-ok' : 'is-ko');
      const res = fs.querySelector('.quiz-result');
      res.innerHTML = `<p class="quiz-verdict"><i class="ph-duotone ph-${r.ok ? 'check-circle' : 'x-circle'}" aria-hidden="true"></i> ${r.ok ? 'Bonne réponse.' : `Pas tout à fait. Bonne réponse : <strong>${esc(expectedText(r.q))}</strong>`}</p><p class="quiz-why">${esc(r.q.why)}</p>`;
    });

    const { best, previous, practice } = saveAttempt(ev.id, score, max);
    traceInteractions(ev.id, rows);

    const pct = Math.round((score / max) * 100);
    const passed = pct >= MAITRISE;
    const summary = root.querySelector('.quiz-summary');
    const nom = (window.RDProfile && window.RDProfile.get() || {}).prenom;
    const mod = moduleSummary(ev.module);
    const course = summary_(loadNotes());
    const modInfo = MODULES.find((m) => m.id === ev.module);
    let congrats = '';
    if (practice) congrats = '';   // entraînement : pas de félicitations, rien n'a été enregistré
    else if (course.done === course.total) {
      congrats = course.reussi
        ? `<p class="quiz-congrats is-ok"><i class="ph-duotone ph-confetti" aria-hidden="true"></i><span><strong>Félicitations${nom ? `, ${esc(nom)}` : ''} ! Vous avez réussi le parcours</strong> avec ${course.pct} %. Votre attestation est prête dans <a href="bilan.html">Mon bilan</a>.</span></p>`
        : `<p class="quiz-congrats"><i class="ph-duotone ph-flag-checkered" aria-hidden="true"></i><span><strong>Parcours terminé</strong> : note globale de ${course.pct} %, sous les ${MAITRISE} % attendus. Refaites les évaluations les plus faibles depuis <a href="bilan.html">Mon bilan</a>.</span></p>`;
    } else if (mod.termine) {
      congrats = mod.reussi
        ? `<p class="quiz-congrats is-ok"><i class="ph-duotone ph-confetti" aria-hidden="true"></i><span><strong>Félicitations${nom ? `, ${esc(nom)}` : ''} ! Vous avez réussi le module ${ev.module}</strong> (${esc(modInfo.titre)}) avec ${mod.pct} %.</span></p>`
        : `<p class="quiz-congrats"><i class="ph-duotone ph-flag-checkered" aria-hidden="true"></i><span><strong>Module ${ev.module} terminé</strong> : ${mod.pct} % sur l'ensemble de ses évaluations. Recommencez celles qui vous ont posé problème pour dépasser ${MAITRISE} %.</span></p>`;
    }
    summary.hidden = false;
    summary.className = `quiz-summary ${passed ? 'is-ok' : 'is-ko'}`;
    summary.innerHTML = `
      <p class="quiz-score"><i class="ph-duotone ph-${passed ? 'seal-check' : 'arrow-counter-clockwise'}" aria-hidden="true"></i>
        <span><strong>${score} / ${max}</strong> (${pct} %) · ${passed ? `Réussi${nom ? `, bravo ${esc(nom)}` : ''} !` : `En dessous de ${MAITRISE} % : relisez les corrigés puis recommencez.`}</span></p>
      ${congrats}
      <p class="quiz-note">${practice ? `Entraînement : ce résultat n'est pas enregistré. Votre note officielle reste ${previous ? `${previous[0]} / ${max}` : 'inchangée'}.` : best > score ? `Votre meilleure note reste ${best} / ${max}.` : previous && score > previous[0] ? `Nouvelle meilleure note (précédente : ${previous[0]} / ${max}).` : `Meilleure note enregistrée : ${best} / ${max}.`}</p>
      <div class="quiz-actions">
        <button type="button" class="btn btn-outline" data-retry><i class="ph-duotone ph-arrow-counter-clockwise" aria-hidden="true"></i> Recommencer</button>
        <button type="button" class="btn btn-outline" data-print><i class="ph-duotone ph-printer" aria-hidden="true"></i> Imprimer / enregistrer en PDF</button>
        <a class="btn btn-outline" href="bilan.html"><i class="ph-duotone ph-chart-bar" aria-hidden="true"></i> Mon bilan</a>
        ${course.done === course.total && canQuit() ? '<button type="button" class="btn btn-cta" data-quit><i class="ph-duotone ph-sign-out" aria-hidden="true"></i> Terminer et quitter</button>' : ''}
      </div>`;
    root.querySelector('.quiz-form .quiz-actions').hidden = true;
    summary.querySelector('[data-retry]').addEventListener('click', () => { draw(); root.querySelector('input')?.focus(); root.scrollIntoView({ block: 'start' }); });
    const quitBtn = summary.querySelector('[data-quit]');
    if (quitBtn) quitBtn.addEventListener('click', requestQuit);
    summary.querySelector('[data-print]').addEventListener('click', () => print(ev, rows, score, max));
    summary.focus();
    const fin = practice ? '' : course.done === course.total ? (course.reussi ? 'Parcours réussi : félicitations !' : 'Parcours terminé') : mod.termine ? (mod.reussi ? `Module ${ev.module} réussi : félicitations !` : `Module ${ev.module} terminé`) : '';
    toast({ type: passed || (fin && /félicitations/.test(fin)) ? 'success' : 'info', title: fin || `${score} sur ${max}`, description: practice ? 'Mode révision : résultat non enregistré.' : fin ? `${score} sur ${max} à cette évaluation. Note enregistrée.` : passed ? 'Note enregistrée.' : 'Note enregistrée. Vous pouvez recommencer.' });
  }

  draw();
}

/* ───────── impression : corrigé complet de cette évaluation ───────── */
function print(ev, rows, score, max) {
  const sheet = document.querySelector(`[data-assessment="${ev.id}"] .print-sheet`);
  const nom = learnerName();
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  sheet.innerHTML = `
    <h1>Auto-évaluation : ${esc(ev.titre)}</h1>
    <p class="print-meta">Séance ${esc(ev.seance)} · ${esc(date)}${nom ? ` · ${esc(nom)}` : ''}</p>
    <p class="print-score">Résultat : <strong>${score} / ${max}</strong> (${Math.round(score / max * 100)} %)</p>
    <ol>${rows.map((r) => `<li><p><strong>${esc(r.q.q)}</strong></p>
      <p>Votre réponse : ${esc(givenText(r.q, r.a))}</p>
      <p><strong>${r.ok ? '✓ Juste' : `✗ Faux. Bonne réponse : ${esc(expectedText(r.q))}`}</strong></p>
      <p class="print-why">${esc(r.q.why)}</p></li>`).join('')}</ol>
    <p class="print-foot">Intelligentsia</p>`;
  document.body.dataset.print = 'quiz';
  const clear = () => { delete document.body.dataset.print; window.removeEventListener('afterprint', clear); };
  window.addEventListener('afterprint', clear);
  window.print();
}

document.querySelectorAll('[data-assessment]').forEach(mount);
