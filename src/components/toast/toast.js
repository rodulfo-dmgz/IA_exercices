/**
 * Toasts — notifications discrètes, dans l'esprit de shadcn/ui (Sonner).
 *
 *   import { toast } from '/src/components/toast/toast.js';
 *   toast({ type: 'success', title: 'Progression enregistrée', description: 'Votre LMS a bien reçu votre score.' });
 *
 * type : 'default' | 'success' | 'error' | 'info'. Durée par défaut : 4,5 s (en pause au survol / au focus).
 * La zone est une région « polite » : les lecteurs d'écran annoncent chaque message (les erreurs en « alert »).
 * Les animations respectent prefers-reduced-motion (voir base/reset.css).
 */
const ICONS = { default: 'ph-bell', success: 'ph-check-circle', error: 'ph-warning-circle', info: 'ph-info' };
const MAX_VISIBLE = 3;

let list = null;

function ensureRegion() {
  if (list && list.isConnected) return list;
  const region = document.createElement('section');
  region.className = 'toaster';
  region.setAttribute('aria-label', 'Notifications');
  region.setAttribute('role', 'region');
  list = document.createElement('ol');
  list.className = 'toaster-list';
  list.setAttribute('aria-live', 'polite');
  region.append(list);
  document.body.append(region);
  return list;
}

export function toast({ title, description = '', type = 'default', duration = 4500 } = {}) {
  if (!title) return { dismiss() {} };
  const host = ensureRegion();

  const item = document.createElement('li');
  item.className = `toast toast--${type}`;
  item.setAttribute('role', type === 'error' ? 'alert' : 'status');
  item.innerHTML = `
    <i class="ph-duotone ${ICONS[type] || ICONS.default} toast-icon" aria-hidden="true"></i>
    <div class="toast-body">
      <p class="toast-title"></p>
      ${description ? '<p class="toast-description"></p>' : ''}
    </div>
    <button type="button" class="toast-close" aria-label="Fermer la notification"><i class="ph-duotone ph-x" aria-hidden="true"></i></button>`;
  item.querySelector('.toast-title').textContent = title;
  if (description) item.querySelector('.toast-description').textContent = description;

  let timer = null, remaining = duration, started = 0, closed = false;
  const start = () => { if (!duration) return; started = Date.now(); timer = setTimeout(dismiss, remaining); };
  const pause = () => { if (!timer) return; clearTimeout(timer); timer = null; remaining -= Date.now() - started; };

  function dismiss() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    item.classList.add('is-leaving');
    const remove = () => item.remove();
    item.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 400);   // sécurité si l'animation est désactivée
  }

  item.querySelector('.toast-close').addEventListener('click', dismiss);
  item.addEventListener('mouseenter', pause);
  item.addEventListener('mouseleave', start);
  item.addEventListener('focusin', pause);
  item.addEventListener('focusout', start);

  host.append(item);
  // on garde au plus MAX_VISIBLE messages : les plus anciens partent
  [...host.querySelectorAll('.toast:not(.is-leaving)')].slice(0, -MAX_VISIBLE).forEach((old) => old.querySelector('.toast-close').click());
  start();
  return { dismiss };
}

window.RDToast = toast;
