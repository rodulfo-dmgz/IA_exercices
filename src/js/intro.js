/**
 * Exercices des séances (modules d'introduction et de leçon).
 * Pilotés par des attributs data-* :
 *   [data-game]  mini-jeu : un choix, comparé à data-answer
 *   [data-sort]  liste d'items [data-item data-answer data-explain] avec des boutons [data-choice]
 *   [data-quiz]  question à choix unique + bouton [data-validate]
 * La séance est marquée « terminée » (SCORM) quand tous les quiz de la page sont réussis.
 */
import { toast } from '../components/toast/toast.js';

function scormParent() {
  return window.parent && window.parent !== window ? window.parent.SCORM_API : null;
}

function prenom() {
  const p = window.RDProfile && window.RDProfile.get();
  return p ? p.prenom : '';
}

function show(el, ok, text, { bravo = true } = {}) {
  el.className = 'feedback ' + (ok ? 'feedback--ok' : 'feedback--ko');
  el.innerHTML = `<i class="ph-duotone ph-${ok ? 'check-circle' : 'x-circle'}" aria-hidden="true"></i> `;
  const n = ok && bravo ? prenom() : '';
  el.append(n ? `${text} Bravo ${n} !` : text);
}

// Mini-jeu : un clic sur un choix compare à data-answer
document.querySelectorAll('[data-game]').forEach((game) => {
  const feedback = game.querySelector('.feedback');
  game.querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ok = btn.dataset.choice === game.dataset.answer;
      show(feedback, ok, ok ? game.dataset.ok : game.dataset.ko);
    });
  });
});

// Classement : chaque item se corrige tout de suite, avec une explication
document.querySelectorAll('[data-sort]').forEach((root) => {
  const items = [...root.querySelectorAll('[data-item]')];
  const scoreEl = root.querySelector('[data-score]');
  let answered = 0, good = 0;

  items.forEach((item) => {
    const feedback = item.querySelector('.feedback');
    const buttons = [...item.querySelectorAll('[data-choice]')];
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (item.dataset.done) return;
        item.dataset.done = '1';
        const ok = btn.dataset.choice === item.dataset.answer;
        answered++; if (ok) good++;
        buttons.forEach((b) => {
          b.setAttribute('aria-disabled', 'true');
          b.classList.toggle('is-picked', b === btn);
          b.classList.toggle('is-right', b.dataset.choice === item.dataset.answer);
        });
        show(feedback, ok, (ok ? 'Exact. ' : 'Pas tout à fait. ') + item.dataset.explain, { bravo: false });
        if (answered === items.length) {
          const n = prenom();
          toast({ type: good === items.length ? 'success' : 'info', title: `Exercice terminé : ${good} sur ${items.length}`,
                  description: good === items.length ? 'Tout est juste, bravo !' : 'Relisez les explications pour progresser.' });
          scoreEl.className = 'sort-score is-done';
          scoreEl.textContent = `Résultat : ${good} sur ${items.length}${good === items.length ? (n ? ` : bravo ${n} !` : ' : bravo !') : '. Relisez les explications pour progresser.'}`;
        }
      });
    });
  });
});

// Quiz : bouton de validation + data-answer ; séance terminée quand tous les quiz sont réussis
const quizzes = [...document.querySelectorAll('[data-quiz]')];
const passed = new Set();

quizzes.forEach((quiz) => {
  const feedback = quiz.querySelector('.feedback');
  quiz.querySelector('[data-validate]').addEventListener('click', () => {
    const selected = quiz.querySelector('input[type="radio"]:checked');
    if (!selected) {
      feedback.className = 'feedback feedback--ko';
      feedback.innerHTML = '<i class="ph-duotone ph-warning-circle" aria-hidden="true"></i> ';
      feedback.append('Choisissez une réponse avant de valider.');
      return;
    }
    const ok = selected.value === quiz.dataset.answer;
    show(feedback, ok, ok ? quiz.dataset.ok : quiz.dataset.ko);
    if (ok) passed.add(quiz); else passed.delete(quiz);
    const done = passed.size === quizzes.length;
    const api = done ? scormParent() : null;
    if (api) {
      api.setStatus('completed');
      api.commit();
    }
    if (ok) {
      const connected = !!(api && api.isConnected && api.isConnected());
      toast(done
        ? { type: 'success', title: 'Séance validée', description: connected ? 'Votre progression est enregistrée dans votre plateforme.' : 'Bien joué, vous pouvez passer à la suite.' }
        : { type: 'success', title: 'Bonne réponse' });
    }
  });
});
