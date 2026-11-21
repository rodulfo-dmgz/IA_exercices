/**
 * Inscription (démo web / Vercel) : civilité, prénom (obligatoires), nom (facultatif).
 * Une fois enregistré, la coquille affiche sa barre latérale et on arrive sur accueil.html (consignes).
 * Dans un LMS cette page n'est jamais affichée : le SCORM identifie l'apprenant.
 */
import { getProfile, saveProfile } from './profile.js';

const $ = (id) => document.getElementById(id);
const form = $('name-form');
const prenom = $('prenom'), nom = $('nom');
const prenomError = $('prenom-error'), civiliteError = $('civilite-error');

/** Déjà dans un LMS ? On ne demande rien. */
try {
  const api = window.SCORM_API || (window.parent && window.parent.SCORM_API);
  if (api && api.isConnected && api.isConnected()) location.replace('accueil.html');
} catch (_) { /* ignoré */ }

function notifyShell(gate) {
  try { if (window.parent !== window) window.parent.postMessage({ gate }, location.origin); } catch (_) { /* ignoré */ }
}
notifyShell(true);   // la coquille masque sa barre latérale tant que le prénom manque

/* Pré-remplissage si le visiteur revient modifier ses informations */
const existing = getProfile();
if (existing) {
  prenom.value = existing.prenom || '';
  nom.value = existing.nom || '';
  const radio = form.querySelector(`input[name="civilite"][value="${existing.civilite}"]`);
  if (radio) radio.checked = true;
}

/* Lien SCORM : visible seulement si le package existe (sinon « Bientôt disponible ») */
(async function checkScormPackage() {
  const link = $('scorm-link'), soon = $('scorm-soon');
  try {
    const res = await fetch(link.getAttribute('href'), { method: 'HEAD' });
    const isFile = res.ok && !(res.headers.get('content-type') || '').includes('text/html');
    link.hidden = !isFile;
    soon.hidden = isFile;
  } catch (_) {
    link.hidden = true;
    soon.hidden = false;
  }
})();

/* Bouton thème : passe par la coquille (même thème partout), sinon bascule localement */
const themeBtn = $('theme-toggle');
function syncThemeButton() {
  const dark = document.documentElement.classList.contains('dark');
  themeBtn.setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre');
  themeBtn.title = dark ? 'Thème clair' : 'Thème sombre';
  themeBtn.querySelector('i').className = dark ? 'ph-duotone ph-sun' : 'ph-duotone ph-moon';
}
themeBtn.addEventListener('click', () => {
  let ui = null;
  try { ui = window.parent !== window ? window.parent.RDUI : null; } catch (_) { /* ignoré */ }
  if (ui) ui.toggleTheme();                                    // la coquille recopie la classe dans l'iframe
  else {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('rd_theme', dark ? 'dark' : 'light'); } catch (_) { /* ignoré */ }
  }
  setTimeout(syncThemeButton, 50);
});
syncThemeButton();

form.addEventListener('input', (e) => {
  if (e.target === prenom && prenom.value.trim()) { prenomError.textContent = ''; prenom.removeAttribute('aria-invalid'); }
  if (e.target.name === 'civilite') civiliteError.textContent = '';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const civilite = form.querySelector('input[name="civilite"]:checked');
  prenomError.textContent = '';
  civiliteError.textContent = '';

  if (!civilite) {
    civiliteError.textContent = 'Choisissez Madame ou Monsieur pour continuer.';
    form.querySelector('input[name="civilite"]').focus();
    return;
  }
  if (!prenom.value.trim()) {
    prenomError.textContent = 'Indiquez votre prénom pour continuer.';
    prenom.setAttribute('aria-invalid', 'true');
    prenom.focus();
    return;
  }

  saveProfile({ civilite: civilite.value, prenom: prenom.value, nom: nom.value });
  try { sessionStorage.setItem('rd_greet', '1'); } catch (_) { /* ignoré */ }  // MEXA saluera sur l'accueil
  notifyShell(false);
  location.href = 'accueil.html';
});
