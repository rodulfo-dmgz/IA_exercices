/** Glossaire : recherche et filtre par module. Tout reste lisible sans JS (liste complète dans le HTML rendu ici). */
import { TERMES } from './glossaire-data.js';

const list = document.getElementById('gloss-list');
const search = document.getElementById('gloss-search');
const count = document.getElementById('gloss-count');
const chips = [...document.querySelectorAll('[data-mod]')];
let mod = '';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const flat = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const sorted = [...TERMES].sort((a, b) => a.t.localeCompare(b.t, 'fr', { sensitivity: 'base' }));
const PAGES = { 1: ['ia-definir', 'ia-domaines', 'ia-philosophie'], 2: ['pb-formuler', 'pb-histoire', 'pb-jeux'], 3: ['inc-cotes', 'inc-bayes', 'inc-naif'] };
const link = (ref) => { const [m, s] = ref.split('.').map(Number); return `${PAGES[m][s - 1]}.html`; };

function paint() {
  const q = flat(search.value.trim());
  const items = sorted.filter((x) => (!mod || x.ref.startsWith(mod + '.')) && (!q || flat(x.t + ' ' + x.d).includes(q)));
  const groups = {};
  items.forEach((x) => { (groups[flat(x.t)[0].toUpperCase()] ||= []).push(x); });
  list.innerHTML = Object.keys(groups).map((l) => `<section class="gloss-group" aria-labelledby="l-${l}">
    <h2 class="gloss-letter" id="l-${l}">${l}</h2>
    <dl>${groups[l].map((x) => `<div class="gloss-item"><dt>${esc(x.t)}</dt><dd>${esc(x.d)} <a class="gloss-ref" href="${link(x.ref)}">Séance ${x.ref}</a></dd></div>`).join('')}</dl>
  </section>`).join('');
  count.textContent = items.length === 0 ? 'Aucun terme ne correspond.' : `${items.length} terme${items.length > 1 ? 's' : ''}`;
  document.getElementById('gloss-empty').hidden = items.length > 0;
}

search.addEventListener('input', paint);
chips.forEach((c) => c.addEventListener('click', () => {
  mod = c.dataset.mod;
  chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
  paint();
}));
paint();
