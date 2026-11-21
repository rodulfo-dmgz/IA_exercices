/**
 * Séances en deux modes, au choix de l'apprenant :
 *   - Diaporama : une carte (.panel) à la fois, avec progression et boutons Précédent / Suivant ;
 *   - Lecture   : toute la séance sur une page, à faire défiler.
 * Activé par <body data-steps>. Le choix est mémorisé (localStorage) pour toutes les séances.
 * Les liens #lecon / #activite / #quiz du menu ouvrent la bonne étape (diaporama) ou défilent jusqu'à elle (lecture).
 */
import { startSeanceTour } from './tour-seance.js';

const body = document.body;
const MODE_KEY = 'rd_lesson_mode';

function readMode() {
  try { return localStorage.getItem(MODE_KEY) === 'lecture' ? 'lecture' : 'diaporama'; } catch (_) { return 'diaporama'; }
}
function saveMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch (_) { /* ignoré */ }
}

if (body.hasAttribute('data-steps')) {
  const main = document.querySelector('main.content');
  const steps = [...main.querySelectorAll('.panel')];
  const header = main.querySelector('.page-header');
  const lessonNav = main.querySelector('.lesson-nav');
  const sourceNote = main.querySelector('.source-note');

  if (steps.length > 1) {
    let current = 0;
    let mode = readMode();

    /* Barre au-dessus de la séance : libellé, choix du mode, progression */
    const toolbar = document.createElement('nav');
    toolbar.className = 'stepper';
    toolbar.setAttribute('aria-label', 'Affichage de la séance');
    toolbar.innerHTML = `
      <div class="stepper-top">
        <p class="stepper-label" aria-live="polite"></p>
        <div class="stepper-tools">
        <div class="mode-switch" role="radiogroup" aria-label="Mode d'affichage">
          <button type="button" role="radio" class="mode-btn" data-mode="diaporama"><i class="ph-duotone ph-slideshow" aria-hidden="true"></i> Diaporama</button>
          <button type="button" role="radio" class="mode-btn" data-mode="lecture"><i class="ph-duotone ph-article" aria-hidden="true"></i> Lecture</button>
        </div>
        <button type="button" class="stepper-help" aria-label="Aide : visite de la séance" title="Aide : visite de la séance"><i class="ph-duotone ph-question" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="stepper-track">
        <ol class="stepper-segments"></ol>
        <details class="stepper-toc">
          <summary><i class="ph-duotone ph-list-bullets" aria-hidden="true"></i> Sommaire de la séance</summary>
          <ol class="stepper-toc-list"></ol>
        </details>
      </div>`;
    header.append(toolbar);   // dans l'en-tête collant : le suivi reste visible pendant le défilement
    const track = toolbar.querySelector('.stepper-track');
    const segList = toolbar.querySelector('.stepper-segments');
    const tocList = toolbar.querySelector('.stepper-toc-list');
    const toc = toolbar.querySelector('.stepper-toc');
    const label = toolbar.querySelector('.stepper-label');
    const modeButtons = [...toolbar.querySelectorAll('.mode-btn')];

    /* Boutons Précédent / Suivant (diaporama) */
    const actions = document.createElement('div');
    actions.className = 'stepper-actions';
    actions.innerHTML = `
      <button type="button" class="btn btn-outline btn-lg" data-prev><i class="ph-duotone ph-arrow-circle-left" aria-hidden="true"></i> Précédent</button>
      <button type="button" class="btn btn-primary btn-lg" data-next>Suivant <i class="ph-duotone ph-arrow-circle-right" aria-hidden="true"></i></button>`;
    (lessonNav || sourceNote || main.lastElementChild).before(actions);
    const prev = actions.querySelector('[data-prev]');
    const next = actions.querySelector('[data-next]');

    /* Aux extrémités, Précédent / Suivant mènent à la séance voisine (liens .lesson-nav de la page) */
    const lessonLinks = lessonNav ? [...lessonNav.querySelectorAll('a')] : [];
    const prevLesson = lessonLinks.find((a) => a.classList.contains('btn-outline'));
    const nextLesson = lessonLinks.find((a) => a !== prevLesson);
    const setLabel = (btn, text, side) => {
      const icon = `<i class="ph-duotone ph-arrow-circle-${side}" aria-hidden="true"></i>`;
      btn.innerHTML = side === 'left' ? `${icon} ${text}` : `${text} ${icon}`;
    };

    const titleOf = (panel) => ((panel.querySelector('.panel-title') || {}).textContent || '').trim();
    const sectionOf = (panel) => panel.closest('section');

    /* Suivi : étapes déjà vues, mémorisées par page (on retrouve où on en était) */
    const VISITED_KEY = `rd_steps:${location.pathname}`;
    const visited = new Set();
    try { JSON.parse(localStorage.getItem(VISITED_KEY) || '[]').forEach((i) => { if (i < steps.length) visited.add(i); }); } catch (_) { /* ignoré */ }
    const saveVisited = () => { try { localStorage.setItem(VISITED_KEY, JSON.stringify([...visited])); } catch (_) { /* ignoré */ } };

    const segButtons = [], tocButtons = [];
    steps.forEach((panel, i) => {
      const title = titleOf(panel);
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="stepper-seg" aria-label="Carte ${i + 1} : ${title}" title="${i + 1}. ${title}"></button>`;
      segList.append(li);
      segButtons.push(li.firstElementChild);

      const item = document.createElement('li');
      item.innerHTML = `<button type="button" class="stepper-toc-item"><i class="ph-duotone ph-circle" aria-hidden="true"></i><span class="toc-title"></span><span class="sr-only toc-state"></span></button>`;
      item.querySelector('.toc-title').textContent = `${i + 1}. ${title}`;
      tocList.append(item);
      tocButtons.push(item.firstElementChild);
    });
    [...segButtons, ...tocButtons].forEach((btn, k) => btn.addEventListener('click', () => { show(k % steps.length); toc.open = false; }));

    function paintProgress() {
      segButtons.forEach((b, i) => {
        const state = i === current ? 'current' : visited.has(i) ? 'done' : 'todo';
        b.dataset.state = state;
        if (state === 'current') b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      tocButtons.forEach((b, i) => {
        const state = i === current ? 'current' : visited.has(i) ? 'done' : 'todo';
        b.dataset.state = state;
        b.querySelector('i').className = `ph-duotone ${state === 'done' ? 'ph-check-circle' : state === 'current' ? 'ph-arrow-circle-right' : 'ph-circle'}`;
        b.querySelector('.toc-state').textContent = state === 'done' ? ' (vue)' : state === 'current' ? ' (en cours)' : '';
        if (state === 'current') b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }

    function renderDiaporama({ focus, scroll }) {
      steps.forEach((panel, i) => { panel.hidden = i !== current; });
      // une section sans carte visible disparaît (sinon ses marges restent)
      main.querySelectorAll(':scope > section').forEach((sec) => { sec.hidden = !sec.querySelector('.panel:not([hidden])'); });

      const last = current === steps.length - 1;
      visited.add(current); saveVisited();
      paintProgress();
      label.textContent = `Carte ${current + 1} sur ${steps.length} · ${titleOf(steps[current])}`;
      const first = current === 0;
      prev.hidden = first && !prevLesson;
      next.hidden = last && !nextLesson;
      setLabel(prev, first && prevLesson ? prevLesson.textContent.trim() : 'Précédent', 'left');
      setLabel(next, last && nextLesson ? nextLesson.textContent.trim() : 'Suivant', 'right');
      actions.hidden = false;
      if (lessonNav) lessonNav.hidden = true;   // remplacé par les boutons ci-dessus
      if (sourceNote) sourceNote.hidden = !last;

      if (scroll) window.scrollTo({ top: 0 });
      if (focus) {
        const heading = steps[current].querySelector('.panel-title');
        if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
      }
    }

    function renderLecture() {
      steps.forEach((panel) => { panel.hidden = false; });
      main.querySelectorAll(':scope > section').forEach((sec) => { sec.hidden = false; });
      label.textContent = `Toute la séance sur une page · ${steps.length} parties`;
      actions.hidden = true;
      if (lessonNav) lessonNav.hidden = false;
      if (sourceNote) sourceNote.hidden = false;
    }

    function applyMode(options = {}) {
      body.classList.toggle('mode-diaporama', mode === 'diaporama');
      body.classList.toggle('mode-lecture', mode === 'lecture');
      modeButtons.forEach((b) => {
        const on = b.dataset.mode === mode;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
        b.classList.toggle('is-on', on);
      });
      track.hidden = mode === 'lecture';
      if (mode === 'diaporama') renderDiaporama({ focus: false, scroll: false, ...options }); else renderLecture();
    }

    function show(index, options = {}) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      renderDiaporama({ focus: true, scroll: true, ...options });
    }

    prev.addEventListener('click', () => {
      if (current === 0 && prevLesson) location.href = prevLesson.href; else show(current - 1);
    });
    next.addEventListener('click', () => {
      if (current === steps.length - 1 && nextLesson) location.href = nextLesson.href; else show(current + 1);
    });

    /* Choix du mode : on reste sur la partie en cours */
    function setMode(newMode) {
      if (newMode === mode) return;
      const visibleIndex = mode === 'diaporama' ? current : Math.max(0, steps.findIndex((p) => p.getBoundingClientRect().bottom > 80));
      mode = newMode;
      saveMode(mode);
      current = visibleIndex;
      applyMode();
      if (mode === 'lecture') steps[current].scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0 });
    }
    modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    toolbar.querySelector('.mode-switch').addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const other = modeButtons.find((b) => b.dataset.mode !== mode);
      setMode(other.dataset.mode);
      other.focus();
    });

    /* Liens du menu : #lecon, #activite, #quiz */
    function fromHash(initial) {
      const id = location.hash.replace('#', '');
      const sec = id && document.getElementById(id);
      if (!sec) return false;
      const index = steps.findIndex((p) => sectionOf(p) === sec || p === sec || sec.contains(p));
      if (index < 0) return false;
      if (mode === 'diaporama') { current = index; renderDiaporama({ focus: false, scroll: !initial }); }
      else sec.scrollIntoView({ block: 'start' });
      return true;
    }
    window.addEventListener('hashchange', () => fromHash(false));

    applyMode();
    fromHash(true);
    body.classList.add('steps-ready');
    toolbar.querySelector('.stepper-help').addEventListener('click', () => startSeanceTour());
  }
}
