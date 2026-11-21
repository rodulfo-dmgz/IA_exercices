/**
 * Carnet de notes des auto-évaluations.
 *
 * Stockage : { [idÉvaluation]: [meilleure, max, tentatives, dernière, date ISO] }
 *   - navigateur (démo Vercel) : localStorage « rd_notes » ;
 *   - LMS : suspend_data (section « notes »), relu à chaque ouverture.
 * Remontée au carnet de notes du LMS (Moodle, 360Learning, MOOC…) : cmi.core.score.raw / min / max,
 * calculés sur TOUTES les évaluations du cours (une évaluation jamais passée compte 0).
 * Statut « passed » dès que la note globale atteint la note de réussite.
 */
import { EVALS, MODULES, MAITRISE, totalPoints } from './evaluations.js';

const KEY = 'rd_notes';

function lms() {
  try {
    const api = window.SCORM_API || (window.parent && window.parent.SCORM_API) || null;
    return api && api.isConnected && api.isConnected() ? api : null;
  } catch (_) { return null; }
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; }
}

export function loadNotes() {
  const api = lms();
  const fromLms = api ? api.getSection('notes') : null;
  const local = readLocal();
  // En LMS, la plateforme fait foi ; on y ajoute ce que le navigateur a de plus haut.
  const out = { ...(fromLms || {}) };
  if (!api) return local;
  Object.keys(local).forEach((id) => { if (!out[id] || local[id][0] > out[id][0]) out[id] = local[id]; });
  return out;
}

/** Note globale : meilleurs scores cumulés sur le total de points du cours. */
export function summary(notes = loadNotes()) {
  const max = totalPoints();
  let got = 0, done = 0;
  EVALS.forEach((e) => {
    const n = notes[e.id];
    if (n) { got += Math.min(n[0], e.questions.length); done++; }
  });
  return { got, max, pct: max ? Math.round((got / max) * 100) : 0, done, total: EVALS.length, reussi: max > 0 && got / max * 100 >= MAITRISE };
}

/** Bilan d'un module : évaluations faites, points, % et réussite (sur les évaluations de ce module seulement). */
export function moduleSummary(moduleId, notes = loadNotes()) {
  const evs = EVALS.filter((e) => e.module === moduleId);
  let got = 0, max = 0, done = 0;
  evs.forEach((e) => {
    max += e.questions.length;
    const n = notes[e.id];
    if (n) { got += Math.min(n[0], e.questions.length); done++; }
  });
  const pct = max ? Math.round((got / max) * 100) : 0;
  return { got, max, pct, done, total: evs.length, termine: done === evs.length, reussi: done === evs.length && pct >= MAITRISE };
}

function report(notes) {
  const api = lms();
  if (!api || !api.canRecord()) return;   // « browse », « review » ou « no-credit » : rien n'est enregistré
  // La note de réussite imposée par le LMS (mastery_score) l'emporte sur celle du cours.
  const seuil = (api.masteryScore && api.masteryScore()) || MAITRISE;
  const s = summary(notes);
  const reussi = s.max > 0 && s.pct >= seuil;
  api.setSection('notes', notes);
  api.flush();
  api.set('cmi.core.score.min', 0);
  api.set('cmi.core.score.max', 100);
  api.set('cmi.core.score.raw', s.pct);
  // Un objectif par module : la note de chaque module apparaît dans les rapports détaillés.
  MODULES.forEach((m) => {
    const ms = moduleSummary(m.id, notes);
    api.objective({
      id: `module-${m.id}`, min: 0, max: 100, raw: ms.pct,
      status: ms.termine ? (ms.pct >= seuil ? 'passed' : 'failed') : 'incomplete',
    });
  });
  if (reussi && s.done === s.total) api.setStatus('passed');
  else api.markIncomplete();
  api.commit();
}

/** Enregistre une tentative ; garde la meilleure note. → { notes, previous, best } */
export function saveAttempt(id, score, max) {
  const notes = loadNotes();
  const prev = notes[id] || null;
  const best = prev ? Math.max(prev[0], score) : score;
  if (lmsReadOnly()) return { notes, previous: prev, best, practice: true };   // révision : rien n'est conservé, ni ici ni dans la plateforme
  notes[id] = [best, max, (prev ? prev[2] : 0) + 1, score, new Date().toISOString()];
  try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (_) { /* stockage indisponible */ }
  report(notes);
  return { notes, previous: prev, best };
}

/** Trace chaque réponse dans cmi.interactions (rapports détaillés du LMS). */
export function traceInteractions(evalId, rows) {
  const api = lms();
  if (!api || !api.interaction) return;
  rows.forEach((r, i) => api.interaction({
    id: `${evalId}-q${i + 1}`, type: r.type, weighting: 1, response: r.response, correct: r.correct, result: r.ok ? 'correct' : 'wrong',
  }));
  api.commit();
}

export function inLms() { return !!lms(); }

/** Cours ouvert en révision (« review »/« browse ») ou sans crédit : la plateforme n'enregistre rien. */
export function lmsReadOnly() { const api = lms(); return !!api && !api.canRecord(); }
