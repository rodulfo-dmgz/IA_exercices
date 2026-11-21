/**
 * Visite d'une séance type, dans la page de cours. On y MONTRE les deux modes :
 *   Diaporama (une carte à la fois) puis Lecture (tout sur une page), avec le changement de mode en direct,
 *   puis la progression, le sommaire, les trois temps (leçon, atelier, auto-évaluation) et la navigation.
 *
 *   - pilotée par la visite guidée du menu (message { seanceTour: true, offset, total }) : compteur commun « Étape X sur Y »,
 *     et réponse { seanceTourEnd: bool } à la fin ;
 *   - ou lancée seule par le bouton « ? » de la barre de la séance.
 * Le mode de lecture choisi par l'apprenant est remis à la fin.
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let active = null;

export const SEANCE_STEPS = 9;

function currentMode() {
  const b = document.querySelector('.mode-btn[aria-checked="true"]');
  return b ? b.dataset.mode : 'diaporama';
}
function setMode(mode) {
  const b = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
  if (b && currentMode() !== mode) b.click();
}

function steps() {
  const has = (sel) => !!document.querySelector(sel);
  const all = [
    { mode: 'diaporama', element: '.mode-switch', popover: { title: 'Deux façons de lire une séance', side: 'bottom', align: 'end',
      description: 'Ces deux boutons changent l\'affichage : <strong>Diaporama</strong> ou <strong>Lecture</strong>. Vous choisissez à tout moment, et votre choix est mémorisé. Regardons les deux, en commençant par le Diaporama.' } },
    { mode: 'diaporama', element: '.stepper-actions', popover: { title: 'Mode Diaporama', side: 'top', align: 'center',
      description: 'La séance s\'affiche <strong>une carte à la fois</strong>. Les boutons <strong>Précédent</strong> et <strong>Suivant</strong> font avancer de carte en carte. C\'est le plus simple pour avancer à son rythme.' } },
    { mode: 'diaporama', element: '.stepper-track', popover: { title: 'Votre progression', side: 'bottom', align: 'start',
      description: 'Chaque segment représente une carte de la séance. Il se remplit à mesure que vous avancez : vous savez toujours où vous en êtes dans cette séance.' } },
    { mode: 'diaporama', element: '.stepper-toc summary', popover: { title: 'Le sommaire', side: 'bottom', align: 'start',
      description: 'Ouvrez-le pour aller directement à une carte : la leçon, l\'atelier ou l\'auto-évaluation.' } },
    { mode: 'lecture', element: '.mode-switch', popover: { title: 'Mode Lecture', side: 'bottom', align: 'end',
      description: 'Voici le mode <strong>Lecture</strong> : toute la séance est maintenant sur <strong>une seule page</strong>, à faire défiler. Idéal pour relire ou pour repérer un passage. Vous voyez la différence : toutes les cartes sont là.' } },
    { mode: 'lecture', element: '#lecon > .panel', popover: { title: '1. La leçon', side: 'top', align: 'center',
      description: 'Quelques cartes à lire, courtes. La première rappelle ce que vous saurez à la fin de la séance.' } },
    { mode: 'lecture', element: '#activite .panel', popover: { title: '2. L\'atelier', side: 'top', align: 'center',
      description: 'Une activité interactive pour essayer vous-même. Si vous bloquez, un bouton « Voir une solution » ou « Voir la stratégie » vous aide.' } },
    { mode: 'lecture', element: '#quiz .panel', popover: { title: '3. L\'auto-évaluation', side: 'top', align: 'center',
      description: 'Des questions notées. Vous pouvez <strong>recommencer</strong> : la meilleure note est conservée. « Voir les réponses » affiche les corrigés sans note. Les notes alimentent « Mon bilan » et le carnet de notes de votre plateforme.' } },
    { mode: 'lecture', element: '.lesson-nav', popover: { title: 'Passer à la suite', side: 'top', align: 'center',
      description: 'En bas de chaque séance, les boutons mènent à la séance précédente ou suivante.' } },
  ];
  return all.filter((s) => !s.element || has(s.element));
}

/** Lance la visite ; onEnd(completed) est appelé à la fin ; ctx = { offset, total } pour un compteur commun. */
/** Va à l'étape voisine en imposant son mode d'affichage (Diaporama / Lecture), même si l'apprenant a changé de mode entre-temps. */
function go(list, o, dir) {
  const target = (o.driver.getActiveIndex() || 0) + dir;
  const want = list[target] && list[target].mode;
  const move = () => (dir > 0 ? o.driver.moveNext() : o.driver.movePrevious());
  if (want && currentMode() !== want) {
    setMode(want);
    window.scrollTo({ top: 0 });
    setTimeout(move, 450);   // laisse la page se réorganiser avant de viser l'élément
  } else move();
}

export function startSeanceTour(onEnd, ctx) {
  if (active) active.destroy();
  const before = currentMode();
  setMode('diaporama');           // on commence par le Diaporama, puis la visite bascule en Lecture
  window.scrollTo({ top: 0 });
  let completed = false;
  setTimeout(() => {
    const list = steps();
    const last = list.length - 1;
    list[last].popover.onNextClick = (el, step, o) => { completed = true; o.driver.destroy(); };
    const offset = (ctx && ctx.offset) || 0;
    const total = (ctx && ctx.total) || list.length;
    active = driver({
      showProgress: true,
      progressText: 'Visite : {{current}} sur {{total}}',
      onPopoverRender: (popover, o) => { popover.progress.textContent = 'Visite : ' + (offset + (o.driver.getActiveIndex() || 0) + 1) + ' sur ' + total; },
      nextBtnText: 'Suivant',
      prevBtnText: 'Précédent',
      doneBtnText: 'Compris',
      closeBtnLabel: 'Quitter la visite de la séance',
      allowClose: true,
      overlayOpacity: 0.5,
      stagePadding: 6,
      stageRadius: 10,
      animate: !reduced(),
      smoothScroll: false,
      popoverClass: 'rd-tour',
      steps: list,
      onNextClick: (el, step, o) => go(list, o, +1),
      onPrevClick: (el, step, o) => go(list, o, -1),
      onDestroyed: () => {
        active = null;
        setMode(before);
        window.scrollTo({ top: 0 });
        if (typeof onEnd === 'function') onEnd(completed);
      },
    });
    active.drive();
  }, 350);
}

/* Pilotage par la visite guidée du menu */
window.addEventListener('message', (e) => {
  if (e.source !== window.parent || !e.data || e.data.seanceTour !== true) return;
  startSeanceTour((completed) => {
    try { window.parent.postMessage({ seanceTourEnd: completed }, location.origin); } catch (_) { /* ignoré */ }
  }, { offset: e.data.offset || 0, total: e.data.total || 0 });
});
