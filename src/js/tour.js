/**
 * Visite guidée complète + guide (Driver.js, MIT, ~5 Ko).
 *
 *   1. MENU    : chaque élément du menu (logo, accueil, modules, flèche, séances, bilan, glossaire, liens, boutons du bas) ;
 *   2. SÉANCE  : une vraie séance type, ouverte pour l'occasion (modes, progression, sommaire, leçon, atelier, auto-évaluation) ;
 *   3. DÉPART  : retour à l'accueil (appuyer sur lecture ▶, puis Commencer) et rappel que le guide reste dans le menu.
 *
 * Elle démarre seule à la première arrivée sur l'accueil. Le bouton « Guide » (boussole, bas du menu) ouvre ensuite
 * un panneau : ce qu'il reste à faire, et la possibilité de revoir UN point sans refaire toute la visite.
 * Les étapes qui visent le menu sont ignorées sur petit écran (menu en surimpression).
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { EVALS, MAITRISE } from './evaluations.js';
import { loadNotes, summary } from './notes.js';

const KEY = 'rd_tour_done';
const stage = document.getElementById('stage');
let active = null;      // instance Driver en cours
let running = false;    // une visite est en cours

const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return true; } };
const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (_) { /* ignoré */ } };
const small = () => matchMedia('(max-width: 720px)').matches;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BASE = {
  showProgress: true, nextBtnText: 'Suivant', prevBtnText: 'Précédent', closeBtnLabel: 'Quitter la visite guidée',
  allowClose: true, overlayOpacity: 0.55, stagePadding: 6, stageRadius: 12, smoothScroll: false, popoverClass: 'rd-tour',
};

/* ───────── utilitaires ───────── */
function openFirstModule(open) {
  const row = document.querySelector('#nav .nav-parent .nav-item--parent-row');
  if (!row) return;
  const isOpen = row.classList.contains('open');
  if (open !== isOpen) row.querySelector('.nav-toggle-btn').click();
}

function loadStage(url) {
  return new Promise((resolve) => {
    let done = false;
    const end = () => { if (!done) { done = true; resolve(); } };
    stage.addEventListener('load', () => setTimeout(end, 500), { once: true });
    setTimeout(end, 6000);
    stage.contentWindow.location.href = url;
  });
}

function stageUrl() { try { return stage.contentWindow.location.href; } catch (_) { return ''; } }

function stepTo(steps, o, dir) {
  const target = (o.driver.getActiveIndex() || 0) + dir;
  const move = () => (dir > 0 ? o.driver.moveNext() : o.driver.movePrevious());
  if (steps[target] && steps[target].needsOpen) { openFirstModule(true); setTimeout(move, 250); } else move();
}

/** Lance un Driver et rend la main quand il se termine : true = terminé jusqu'au bout, false = fermé avant. */
function drive(steps, opts) {
  return new Promise((resolve) => {
    let completed = false;
    const last = steps.length - 1;
    steps.forEach((s, i) => {
      if (i === last) {
        s.popover = s.popover || {};
        const prev = s.popover.onNextClick;
        s.popover.onNextClick = (el, step, o) => { completed = true; if (prev) prev(el, step, o); o.driver.destroy(); };
      }
    });
    active = driver({
      ...BASE,
      steps,
      progressText: 'Visite : {{current}} sur {{total}}',
      // Précédent / Suivant : si l'étape visée est la liste des séances, on s'assure qu'elle est ouverte (l'apprenant a pu la refermer)
      onNextClick: (el, step, o) => stepTo(steps, o, +1),
      onPrevClick: (el, step, o) => stepTo(steps, o, -1),
      onPopoverRender: (popover, o) => {
        // Compteur unique sur toute la visite (menu + séance + départ) : « Étape 17 sur 24 »
        const i = o.driver.getActiveIndex() || 0;
        popover.progress.textContent = 'Visite : ' + ((opts.offset || 0) + i + 1) + ' sur ' + (opts.total || steps.length);
      },
      doneBtnText: opts.doneText || 'Terminer',
      animate: !reduced(),
      onDestroyed: () => { active = null; resolve(completed); },
    });
    active.drive();
  });
}

/* ───────── 1. Menu ───────── */
function menuSteps() {
  const nav = (id) => `#nav a[data-id="${id}"]`;
  const first = '#nav .nav-parent';
  return [
    { id: 'bienvenue', popover: { showButtons: ['next', 'close'], title: 'Bienvenue dans le parcours',
      description: 'Une visite complète d\'environ deux minutes : le menu, une séance type, puis comment démarrer.<br><br><strong>Le guide reste disponible tout au long du parcours</strong> : bouton boussole, en bas du menu. Vous pouvez aussi le fermer maintenant (Échap) et le rouvrir quand vous voulez.' } },
    { id: 'logo', menu: true, element: '.sidebar-header .logo', popover: { title: 'Le logo', side: 'right', align: 'start', description: 'Un clic ramène toujours à l\'accueil.' } },
    { id: 'accueil', menu: true, element: nav('accueil'), popover: { title: 'Accueil et consignes', side: 'right', description: 'Le point de départ : le message de bienvenue de MEXA et les grands principes du parcours.' } },
    { id: 'modules', menu: true, element: first + ' .nav-item--parent-row', popover: { title: 'Les modules', side: 'right', align: 'start',
      description: 'Trois modules à suivre dans l\'ordre : 1. Comprendre l\'IA, 2. Résoudre des problèmes, 3. Raisonner dans l\'incertain.' } },
    { id: 'fleche', menu: true, element: first + ' .nav-toggle-btn', popover: { title: 'La flèche', side: 'right',
      description: 'Elle ouvre ou ferme la liste des séances d\'un module.',
      onNextClick: (el, step, o) => { openFirstModule(true); setTimeout(() => o.driver.moveNext(), 250); } } },
    { id: 'seances', menu: true, needsOpen: true, element: first + ' .nav-children', popover: { title: 'Les séances', side: 'right', align: 'start',
      description: 'Chaque module compte trois séances. Une séance vue est mémorisée : vous reprenez toujours là où vous en étiez.' } },
    { id: 'bilan', menu: true, element: nav('bilan'), popover: { title: 'Mon bilan', side: 'right',
      description: 'Vos notes aux auto-évaluations, votre note globale (réussite à ' + MAITRISE + ' %) et, une fois le parcours réussi, une <strong>attestation à imprimer en PDF</strong>.' } },
    { id: 'glossaire', menu: true, element: nav('glossaire'), popover: { title: 'Le glossaire', side: 'right', description: 'Tous les termes clés expliqués, avec la séance où chacun est vu. Une recherche est disponible.' } },
    { id: 'ressources', menu: true, element: nav('ressources'), popover: { title: 'Les liens utiles', side: 'right', description: 'Des ressources choisies pour aller plus loin sur chaque module.' } },
    { id: 'mentions', menu: true, element: nav('mentions'), popover: { title: 'Mentions légales', side: 'right', description: 'Qui est l\'auteur, qui peut utiliser ce cours (tout le monde, en citant l\'auteur), et ce qui concerne vos données.' } },
    { id: 'guide', menu: true, element: '#tour-btn', popover: { title: 'Le guide', side: 'right', align: 'end',
      description: 'Ce bouton ouvre le guide à tout moment : la <strong>liste de ce qu\'il vous reste à faire</strong>, et la possibilité de revoir un seul point sans refaire toute la visite.' } },
    { id: 'theme', menu: true, element: '#theme-btn', popover: { title: 'Thème clair ou sombre', side: 'right', align: 'end', description: 'Choisissez l\'affichage le plus confortable pour vos yeux.' } },
    { id: 'contrast', menu: true, element: '#contrast-btn', popover: { title: 'Contraste élevé', side: 'right', align: 'end', description: 'Renforce les contrastes pour faciliter la lecture.' } },
    { id: 'toggle', menu: true, element: '#toggle-btn', popover: { title: 'Réduire le menu', side: 'right', align: 'end', description: 'Réduit le menu pour laisser plus de place au cours, ou le déplie.' } },
    { id: 'exit', menu: true, element: '#exit-btn', popover: { title: 'Quitter le cours', side: 'right', align: 'end',
      description: 'Enregistre votre progression et vos notes, puis vous laisse choisir entre fermer la fenêtre et reprendre. Rien n\'est perdu si vous fermez l\'onglet directement.' } },
  ];
}

const SEANCE_STEPS = 9;   // doit correspondre à tour-seance.js

async function runMenu(opts) {
  let list = menuSteps();
  if (small()) list = list.filter((s) => !s.menu);
  if (opts.only) list = list.filter((s) => opts.only.includes(s.id));
  list.forEach((s) => delete s.menu);
  list = list.map(({ id, ...rest }) => rest);
  if (!list.length) return true;
  const sidebar = document.getElementById('sidebar');
  if (!small() && sidebar && sidebar.classList.contains('collapsed') && window.RDUI) window.RDUI.setSidebarCollapsed(false);
  if (!small() && (!opts.only || opts.only.includes('seances') || opts.only.includes('modules'))) openFirstModule(false);
  const total = opts.full ? list.length + SEANCE_STEPS + (small() ? 1 : 2) : list.length;
  opts.onCount && opts.onCount(list.length);
  const ok = await drive(list, { offset: 0, total, doneText: opts.doneText || 'Terminer' });
  return ok;
}

/* ───────── 2. Une séance type (dans une vraie séance, pilotée par la page de cours) ───────── */
function runSeance(ctx) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; window.removeEventListener('message', onMsg); resolve(v); } };
    const onMsg = (e) => {
      if (e.source !== stage.contentWindow || !e.data || typeof e.data.seanceTourEnd !== 'boolean') return;
      finish(e.data.seanceTourEnd);
    };
    window.addEventListener('message', onMsg);
    loadStage('modules/ia-definir.html').then(() => {
      try { stage.contentWindow.postMessage({ seanceTour: true, offset: (ctx && ctx.offset) || 0, total: (ctx && ctx.total) || 0 }, location.origin); } catch (_) { finish(false); }
      setTimeout(() => finish(false), 240000);   // garde-fou
    });
  });
}

/* ───────── 3. Départ ───────── */
async function runDepart(ctx) {
  await loadStage('modules/accueil.html');
  const list = [
    { popover: { title: 'Pour démarrer',
      description: 'Sur l\'accueil, appuyez d\'abord sur le bouton <strong>lecture ▶</strong> pour écouter le message de bienvenue de MEXA, puis cliquez sur <strong>Commencer</strong>.' } },
    { element: '#tour-btn', popover: { title: 'Le guide est toujours là', side: 'right', align: 'end',
      description: 'Pendant tout le parcours, ce bouton reste dans le menu. Il contient <strong>la liste de ce que vous avez à faire</strong> et permet de revoir un point précis, sans tout refaire.' } },
  ];
  if (small()) list.pop();
  return drive(list, { offset: (ctx && ctx.offset) || 0, total: (ctx && ctx.total) || list.length, doneText: 'C\'est parti' });
}

/* ───────── Lancement ───────── */
export async function startTour(opts = {}) {
  if (running) return;
  running = true;
  closeGuide();
  const back = stageUrl();
  try {
    if (opts.topic === 'seance') { await runSeance(); await loadStage(back || 'modules/accueil.html'); }
    else if (opts.topic === 'depart') await runDepart();
    else if (opts.topic === 'menu') await runMenu({ doneText: 'Terminer' });
    else if (opts.only) await runMenu({ only: opts.only, doneText: 'Terminer' });
    else {
      // Visite complète : menu → séance type → départ
      let nMenu = 0;
      if (await runMenu({ doneText: 'Voir une séance', full: true, onCount: (n) => { nMenu = n; } })) {
        const dep = small() ? 1 : 2;
        const total = nMenu + SEANCE_STEPS + dep;
        if (await runSeance({ offset: nMenu, total })) await runDepart({ offset: nMenu + SEANCE_STEPS, total });
        else await loadStage('modules/accueil.html');
      }
    }
  } finally {
    running = false;
    mark();
  }
}

/* ───────── Guide : ce qu'il reste à faire + thèmes ───────── */
const guide = document.getElementById('guide');
const inertTargets = () => [document.getElementById('sidebar'), document.querySelector('.content-stage')];

function seancesParcours() {
  const out = [];
  (window.PARCOURS || []).forEach((m) => { if (m.id && m.id.indexOf('module-') === 0 && m.children) m.children.forEach((c) => { if (c.suivi) out.push(c); }); });
  return out;
}

function todo() {
  const vues = window.RDVues || {};
  const sp = seancesParcours();
  const vu = sp.filter((s) => vues[s.id]).length;
  const notes = loadNotes();
  const sum = summary(notes);
  const premiere = sp.length ? !!vues[sp[0].id] : false;
  const items = [
    { ok: premiere, label: 'Écouter MEXA sur l\'accueil (bouton lecture ▶), puis cliquer sur Commencer' },
    { ok: vu === sp.length, label: `Parcourir les ${sp.length} séances`, detail: `${vu} sur ${sp.length}` },
    { ok: sum.done === sum.total, label: `Faire les ${sum.total} auto-évaluations`, detail: `${sum.done} sur ${sum.total}` },
    { ok: sum.reussi && sum.done === sum.total, label: `Atteindre ${MAITRISE} % de note globale`, detail: `${sum.pct} % actuellement` },
    { ok: sum.reussi && sum.done === sum.total, label: 'Récupérer l\'attestation dans « Mon bilan » (imprimable en PDF)' },
  ];
  // Prochaine étape : première séance non vue, sinon première évaluation à faire, sinon le bilan
  let next = null;
  const s = sp.find((x) => !vues[x.id]);
  if (s) next = { page: s.page, label: 'Aller à la prochaine séance : ' + s.titre };
  else {
    const e = EVALS.find((x) => !notes[x.id]);
    if (e) next = { page: 'modules/' + e.page + '#quiz', label: 'Faire la prochaine auto-évaluation : ' + e.titre };
    else next = { page: 'modules/bilan.html', label: 'Ouvrir mon bilan' };
  }
  return { items, next };
}

function renderGuide() {
  const { items, next } = todo();
  document.getElementById('guide-todo').innerHTML = items.map((i) =>
    `<li class="${i.ok ? 'is-done' : ''}"><i class="ph-duotone ph-${i.ok ? 'check-circle' : 'circle'}" aria-hidden="true"></i><span>${esc(i.label)}${i.detail ? ` <em>(${esc(i.detail)})</em>` : ''}</span><span class="sr-only">${i.ok ? ' : fait' : ' : à faire'}</span></li>`).join('');
  const go = document.getElementById('guide-next');
  go.textContent = next.label;
  go.dataset.page = next.page;
}

export function openGuide() {
  if (!guide || running) return;
  renderGuide();
  guide.hidden = false;
  inertTargets().forEach((el) => { if (el) el.inert = true; });
  document.getElementById('guide-next').focus();
}
export function closeGuide() {
  if (!guide || guide.hidden) return;
  guide.hidden = true;
  inertTargets().forEach((el) => { if (el) el.inert = false; });
  const b = document.getElementById('tour-btn'); if (b) b.focus();
}

if (guide) {
  document.getElementById('guide-close').addEventListener('click', closeGuide);
  guide.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGuide(); });
  guide.addEventListener('click', (e) => { if (e.target === guide) closeGuide(); });
  document.getElementById('guide-next').addEventListener('click', (e) => {
    const page = e.currentTarget.dataset.page;
    closeGuide();
    if (page) stage.contentWindow.location.href = page;
  });
  guide.querySelectorAll('[data-topic]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.topic;
    if (t === 'tout') startTour();
    else if (t === 'menu') startTour({ topic: 'menu' });
    else if (t === 'seance') startTour({ topic: 'seance' });
    else if (t === 'bilan') startTour({ only: ['bilan'] });
    else if (t === 'confort') startTour({ only: ['theme', 'contrast', 'toggle'] });
    else if (t === 'quitter') startTour({ only: ['exit'] });
    else if (t === 'depart') startTour({ topic: 'depart' });
  }));
}

window.RDTour = { start: startTour, guide: openGuide };

/* Bouton « Guide » du menu */
const btn = document.getElementById('tour-btn');
if (btn) btn.addEventListener('click', openGuide);

/* Bouton « Visite guidée » de l'accueil (iframe) */
window.addEventListener('message', (e) => {
  if (stage && e.source === stage.contentWindow && e.data && e.data.tour === true) startTour();
});

/* Première arrivée sur l'accueil : visite complète */
if (stage) stage.addEventListener('load', () => {
  if (running) return;
  const url = stageUrl();
  if (!/accueil\.html/.test(url) || seen() || document.body.classList.contains('is-gate')) return;
  setTimeout(() => { if (!seen() && !running) startTour(); }, 1400);
});
