/**
 * Accueil et consignes : présentation, MEXA, programme.
 * L'inscription (civilité, prénom, nom) se fait avant, sur inscription.html (démo web uniquement).
 */
import { getProfile, clearProfile } from './profile.js';
import { mountMexa } from '../components/mexa/mexa.js';
import { toast } from '../components/toast/toast.js';

const $ = (id) => document.getElementById(id);

function inLms() {
  try {
    const api = window.SCORM_API || (window.parent && window.parent.SCORM_API);
    return !!(api && api.isConnected && api.isConnected());
  } catch (_) { return false; }
}

/* Message d'accueil de MEXA, personnalisé avec le prénom (et la civilité pour les accords) */
function greeting() {
  const p = getProfile();
  const ready = !p || !p.civilite ? 'On commence ?' : p.civilite === 'Mme' ? 'Êtes-vous prête ?' : 'Êtes-vous prêt ?';
  return `${p ? `Bonjour ${p.prenom} !` : 'Bonjour !'} Je suis MEXA, votre guide dans ce parcours. `
    + 'Nous allons découvrir ensemble comment fonctionne l\'intelligence artificielle, '
    + 'à travers trois modules : des leçons, des ateliers et des auto-évaluations. '
    + ready;
}

const mexa = mountMexa($('mexa-slot'), { height: '340px', script: () => greeting() });

/* Juste après l'inscription, MEXA salue (le clic sur « Commencer » autorise le son) */
try {
  if (sessionStorage.getItem('rd_greet') === '1') {
    sessionStorage.removeItem('rd_greet');
    const p = getProfile();
    if (p) toast({ type: 'success', title: `Bienvenue, ${p.prenom} !`, description: 'Votre profil est enregistré sur cet appareil.' });
    setTimeout(() => mexa.speak(greeting()), 600);
  }
} catch (_) { /* ignoré */ }

/* Démo web : possibilité de changer de profil (inutile dans un LMS) */
if (!inLms() && getProfile()) {
  const change = $('change-profile');
  change.hidden = false;
  change.addEventListener('click', () => {
    clearProfile();
    try { if (window.parent !== window) window.parent.postMessage({ gate: true }, location.origin); } catch (_) { /* ignoré */ }
    location.href = 'inscription.html';
  });
}

/* Visite guidée : demandée à la coquille (le menu et la page de cours sont dans le parent) */
const tourBtn = $('start-tour');
if (tourBtn) tourBtn.addEventListener('click', () => {
  try {
    if (window.parent !== window) window.parent.postMessage({ tour: true }, location.origin);
    else toast({ type: 'info', title: 'Visite guidée', description: 'Ouvrez le parcours depuis la page principale pour lancer la visite.' });
  } catch (_) { /* ignoré */ }
});
