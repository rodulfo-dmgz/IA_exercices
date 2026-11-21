/**
 * Page « Mentions légales ».
 *  - Bouton Retour quand le menu n'est pas visible (formulaire d'inscription) ;
 *  - dans un LMS, la partie « Hébergement » ne s'applique pas (la plateforme héberge) : on la remplace par une note de diffusion.
 *    Le droit d'auteur, la licence, les crédits et les données restent valables partout.
 */
const back = document.getElementById('legal-back');
try {
  const inGate = window.parent !== window && window.parent.document.body.classList.contains('is-gate');
  if (back && inGate) { back.hidden = false; back.addEventListener('click', () => history.back()); }
} catch (_) { /* ignoré */ }

let enLms = false;
try { const api = window.SCORM_API || (window.parent && window.parent.SCORM_API); enLms = !!(api && api.isConnected && api.isConnected()); } catch (_) { /* ignoré */ }
if (enLms) {
  document.getElementById('legal-host').hidden = true;
  document.getElementById('legal-host-lms').hidden = false;
  document.getElementById('legal-title').textContent = 'Auteur, licence et crédits';
  document.title = 'Auteur, licence et crédits';
}
