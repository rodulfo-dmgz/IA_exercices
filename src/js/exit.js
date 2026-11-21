/** Demande à la coquille (parent) de clôturer la session SCORM et d'afficher l'écran de fin. */
export function requestQuit() {
  try {
    if (window.parent && window.parent !== window) { window.parent.postMessage({ quit: true }, location.origin); return true; }
  } catch (_) { /* ignoré */ }
  return false;   // page ouverte seule : rien à clôturer
}
export function canQuit() { return window.parent && window.parent !== window; }
