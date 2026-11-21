/**
 * Profil de l'apprenant : prénom (obligatoire) et nom (facultatif).
 *
 * Où il vit :
 *   - navigateur : localStorage (démo Vercel, sans LMS) ;
 *   - LMS : suspend_data (section « profil »), ou à défaut cmi.core.student_name ("Nom, Prénom").
 *
 * Dans les pages, personnaliser sans écrire de JS :
 *   <span data-user="prenom" data-fallback="vous"></span>   → remplacé par le prénom
 *   <span data-user="nom"></span> / data-user="complet"
 *   <p data-needs-user hidden>…</p>                          → affiché seulement si un prénom est connu
 */
const KEY = 'rd_profile';

function lmsApi() {
  try { return window.SCORM_API || (window.parent && window.parent.SCORM_API) || null; } catch (_) { return null; }
}

function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60); }

/** « rodulfo » → « Rodulfo » (on ne touche pas aux saisies déjà mises en forme). */
export function tidyName(s) {
  const v = clean(s);
  return v === v.toLowerCase() ? v.replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : v;
}

function fromLms() {
  const api = lmsApi();
  if (!api || !api.isConnected || !api.isConnected()) return null;
  const saved = api.getSection('profil');
  if (saved && saved.prenom) return { civilite: saved.civilite || '', prenom: saved.prenom, nom: saved.nom || '' };
  const raw = api.get('cmi.core.student_name');   // SCORM 1.2 : « Nom, Prénom »
  if (!raw) return null;
  if (raw.includes(',')) {
    const [nom, ...rest] = raw.split(',');
    return { prenom: tidyName(rest.join(' ')), nom: tidyName(nom) };
  }
  const parts = clean(raw).split(' ');
  return { prenom: tidyName(parts[0]), nom: tidyName(parts.slice(1).join(' ')) };
}

export function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p && p.prenom) return p;
  } catch (_) { /* stockage indisponible */ }
  return fromLms();
}

export function saveProfile({ civilite, prenom, nom }) {
  // civilite : « Mme » ou « M » — sert aux accords féminin / masculin
  const p = { civilite: civilite === 'Mme' || civilite === 'M' ? civilite : '', prenom: tidyName(prenom), nom: tidyName(nom) };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) { /* ignoré */ }
  const api = lmsApi();
  if (api && api.isConnected && api.isConnected()) {
    api.setSection('profil', p);
    api.flush();
    api.commit();
  }
  applyProfile();
  return p;
}

export function clearProfile() {
  try { localStorage.removeItem(KEY); } catch (_) { /* ignoré */ }
  const api = lmsApi();
  if (api && api.isConnected && api.isConnected()) {
    api.setSection('profil', null);
    api.flush();
    api.commit();
  }
  applyProfile();
}

export function applyProfile(root = document) {
  const p = getProfile();
  root.querySelectorAll('[data-user]').forEach((el) => {
    const kind = el.dataset.user;
    el.textContent = !p ? (el.dataset.fallback || '')
      : kind === 'prenom' ? p.prenom
      : kind === 'nom' ? p.nom
      : [p.prenom, p.nom].filter(Boolean).join(' ');
  });
  root.querySelectorAll('[data-needs-user]').forEach((el) => { el.hidden = !p; });
  // Accords : <span data-m="" data-f="e" data-n="·e"></span> → selon la civilité
  root.querySelectorAll('[data-f]').forEach((el) => {
    const c = p && p.civilite;
    el.textContent = c === 'Mme' ? el.dataset.f : c === 'M' ? (el.dataset.m || '') : (el.dataset.n ?? el.dataset.m ?? '');
  });
}

/**
 * Garde-fou (démo web) : hors LMS, une page de contenu ouverte sans prénom renvoie au formulaire.
 * La page d'accueil porte l'attribut data-public et n'est pas concernée.
 */
function guard() {
  if (document.body.hasAttribute('data-public')) return;
  const api = lmsApi();
  if (api && api.isConnected && api.isConnected()) return;
  if (getProfile()) return;
  (window.top || window).location.replace(new URL('../', location.href));
}

/** Accord selon la civilité : RDProfile.g('prêt', 'prête', 'prêt·e') */
export function g(masculin, feminin, neutre) {
  const p = getProfile();
  const c = p && p.civilite;
  return c === 'Mme' ? feminin : c === 'M' ? masculin : (neutre ?? masculin);
}

window.RDProfile = { g, get: getProfile, save: saveProfile, clear: clearProfile, apply: applyProfile, tidy: tidyName };

function init() { guard(); applyProfile(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
