/**
 * Éditeur de séances — MODE DÉVELOPPEMENT UNIQUEMENT (injecté par tools/editor-plugin.js, absent du build).
 *
 * Bouton « Éditer » (bas gauche). En mode édition, la page passe en Lecture et :
 *  - entre les blocs, des zones « Image » / « Texte » : on y glisse une image depuis l'ordinateur (ou on clique) ;
 *  - un clic sélectionne une image ou un bloc → panneau d'options à droite :
 *      image : placement (bloc, habillée à gauche / à droite, derrière le texte), format, taille, contour, opacité ;
 *      bloc  : colonnes (1 à 3), largeur de lecture ;
 *  - le texte (paragraphes, titres, listes) se modifie directement en cliquant dedans ;
 *  - une image « derrière le texte » se déplace en la faisant glisser.
 * Chaque changement est écrit dans le fichier HTML source : build et SCORM le contiennent.
 */
import './editor.css';
import { setupFree, freeInspector } from './free.js';

const file = document.querySelector('meta[name="editor-file"]')?.content;
if (file) start();

const FORMATS = [
  { id: '', label: 'Paysage 21:9', hint: '1680 × 720 px', min: 1200 },
  { id: 'wide', label: 'Paysage 16:9', hint: '1600 × 900 px', min: 1200 },
  { id: 'square', label: 'Carré 1:1', hint: '1080 × 1080 px', min: 800 },
  { id: 'portrait', label: 'Portrait 4:5', hint: '960 × 1200 px', min: 720 },
  { id: 'natural', label: 'Naturel (sans recadrage)', hint: 'tel quel', min: 600 },
];
const PLACEMENTS = [
  { id: '', label: 'Bloc', icon: 'ph-rows' },
  { id: 'float-left', label: 'Texte à droite', icon: 'ph-align-left' },
  { id: 'float-right', label: 'Texte à gauche', icon: 'ph-align-right' },
  { id: 'behind', label: 'Derrière le texte', icon: 'ph-stack' },
];
const SIZES = [25, 40, 60, 80, 100];
const TEXT_TAGS = new Set(['P', 'H2', 'H3', 'LI']);

function start() {
  const body = document.body;
  const main = document.querySelector('main.content');
  if (!main) return;

  /* ── Réseau ── */
  async function api(action, payload) {
    const res = await fetch(`/__editor/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, ...payload }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur');
    if ('canUndo' in json) paintHistory(json);
    return json;
  }
  async function upload(f) {
    const slug = file.replace(/^modules\//, '').replace(/\.html$/, '');
    const res = await fetch(`/__editor/upload?name=${encodeURIComponent(f.name)}&slug=${encodeURIComponent(slug)}`, { method: 'POST', body: f });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Envoi impossible');
    return json.src;
  }
  // après chaque écriture le fichier a changé (les positions aussi) : on recharge en gardant l'endroit où l'on était
  const done = () => {
    sessionStorage.setItem('rd_edit_scroll', String(window.scrollY));
    if (selected) {
      const figs = [...document.querySelectorAll('figure.lesson-hero')], blocks = blocksOf();
      sessionStorage.setItem('rd_edit_sel', selected.tagName === 'FIGURE' ? `fig:${figs.indexOf(selected)}` : `blk:${blocks.indexOf(selected)}`);
    }
    location.reload();
  };
  const fail = (e) => alert(`Édition impossible : ${e.message}`);
  const off = (el) => Number(el.dataset.srcOffset);

  /* ── Bouton Éditer ── */
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ed-toggle';
  toggle.innerHTML = '<i class="ph-duotone ph-pencil-simple-line" aria-hidden="true"></i> <span>Éditer</span>';

  /* ── Annuler / Rétablir / Historique ── */
  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  bar.append(toggle);
  const histBtns = document.createElement('span');
  histBtns.className = 'ed-hist';
  histBtns.innerHTML = `
    <button type="button" data-h="undo" disabled><i class="ph-duotone ph-arrow-counter-clockwise" aria-hidden="true"></i> Annuler</button>
    <button type="button" data-h="redo" disabled><i class="ph-duotone ph-arrow-clockwise" aria-hidden="true"></i> Rétablir</button>
    <button type="button" data-h="list"><i class="ph-duotone ph-clock-counter-clockwise" aria-hidden="true"></i> Historique</button>`;
  bar.append(histBtns);
  document.body.append(bar);

  function paintHistory(st) {
    const u = histBtns.querySelector('[data-h="undo"]'), r = histBtns.querySelector('[data-h="redo"]');
    u.disabled = !st.canUndo; r.disabled = !st.canRedo;
    u.title = st.canUndo ? `Annuler : ${st.undoLabel} (Ctrl+Z)` : 'Rien à annuler';
    r.title = st.canRedo ? `Rétablir : ${st.redoLabel} (Ctrl+Maj+Z)` : 'Rien à rétablir';
  }
  const reloadHere = () => { sessionStorage.setItem('rd_edit_scroll', String(window.scrollY)); location.reload(); };
  async function undoRedo(kind) {
    try { await api(kind, {}); reloadHere(); } catch (e) { if (!/Rien à/.test(e.message)) fail(e); }
  }
  histBtns.querySelector('[data-h="undo"]').addEventListener('click', () => undoRedo('undo'));
  histBtns.querySelector('[data-h="redo"]').addEventListener('click', () => undoRedo('redo'));
  histBtns.querySelector('[data-h="list"]').addEventListener('click', openHistory);
  api('state', {}).catch(() => {});

  // Ctrl+Z / Ctrl+Maj+Z / Ctrl+Y (sauf quand on tape dans un champ : l'annulation native du navigateur s'applique alors)
  document.addEventListener('keydown', (e) => {
    if (!editing || !(e.ctrlKey || e.metaKey)) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoRedo('undo'); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); undoRedo('redo'); }
  });

  async function openHistory() {
    let versions = [];
    try { versions = (await api('history', {})).versions; } catch (e) { return fail(e); }
    const dlg = document.createElement('dialog');
    dlg.className = 'ed-dialog';
    const fmt = (t) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    dlg.innerHTML = `
      <h2>Historique de cette page</h2>
      <p class="ed-size">Chaque modification est sauvegardée <strong>avant</strong> d'être appliquée. « Restaurer » ramène la page à l'état qu'elle avait juste avant ce changement (cette restauration est elle-même annulable).</p>
      ${versions.length ? `<ol class="ed-versions">${versions.map((v) => `<li><span><strong>${v.label}</strong><small>${fmt(v.time)}</small></span><button type="button" data-id="${v.id}">Restaurer</button></li>`).join('')}</ol>` : '<p>Aucune version enregistrée pour le moment.</p>'}
      <div class="ed-actions"><button type="button" class="ed-cancel">Fermer</button></div>`;
    document.body.append(dlg);
    dlg.querySelector('.ed-cancel').addEventListener('click', () => dlg.close());
    dlg.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Restaurer cette version ? Les modifications faites depuis seront annulables avec « Annuler ».')) return;
      try { await api('restore', { id: b.dataset.id }); reloadHere(); } catch (e) { fail(e); }
    }));
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  }

  let editing = sessionStorage.getItem('rd_edit') === '1';
  let selected = null;
  toggle.addEventListener('click', () => setEditing(!editing));
  window.addEventListener('load', () => {
    setEditing(editing, true);
    const y = Number(sessionStorage.getItem('rd_edit_scroll') || 0);
    if (y) { sessionStorage.removeItem('rd_edit_scroll'); setTimeout(() => window.scrollTo({ top: y }), 60); }
  });

  function setEditing(on, silent = false) {
    editing = on;
    sessionStorage.setItem('rd_edit', on ? '1' : '0');
    body.classList.toggle('ed-on', on);
    toggle.classList.toggle('is-on', on);
    toggle.querySelector('span').textContent = on ? 'Terminer' : 'Éditer';
    toggle.setAttribute('aria-pressed', String(on));
    document.querySelectorAll('.ed-zone, .ed-handle, .ed-inspector, .ed-canvas-bar, .ed-canvas-hint, .ed-hdl').forEach((n) => n.remove());
    document.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    document.querySelectorAll('.ed-selected').forEach((n) => n.classList.remove('ed-selected'));
    selected = null;

    const lecture = document.querySelector('[data-mode="lecture"]');
    const diaporama = document.querySelector('[data-mode="diaporama"]');
    if (on) {
      if (diaporama && diaporama.getAttribute('aria-checked') === 'true') { sessionStorage.setItem('rd_edit_prev', 'diaporama'); lecture.click(); }
      document.querySelectorAll('figure.lesson-hero').forEach((f) => { f.hidden = false; });
      buildZones();
      buildSelection();
      buildTextEditing();
      setupFree(ctx);
      const [kind, idx] = (sessionStorage.getItem('rd_edit_sel') || '').split(':');
      const eid = sessionStorage.getItem('rd_edit_eid');
      sessionStorage.removeItem('rd_edit_sel'); sessionStorage.removeItem('rd_edit_eid');
      const target = eid ? document.querySelector(`[data-eid="${eid}"]`)
        : kind === 'fig' ? document.querySelectorAll('figure.lesson-hero')[Number(idx)] : kind === 'blk' ? blocksOf()[Number(idx)] : null;
      if (target) select(target); else showInspector();
    } else if (sessionStorage.getItem('rd_edit_prev') === 'diaporama' && diaporama && !silent) {
      sessionStorage.removeItem('rd_edit_prev');
      diaporama.click();
    }
  }

  /* ═════════ Zones d'ajout entre les blocs ═════════ */
  function makeZone(ref, position) {
    const zone = document.createElement('div');
    zone.className = 'ed-zone';
    zone.innerHTML = `<span class="ed-zone-btns">
      <button type="button" class="ed-add" data-kind="image"><i class="ph-duotone ph-image-square" aria-hidden="true"></i> Image</button>
      <button type="button" class="ed-add" data-kind="text"><i class="ph-duotone ph-text-t" aria-hidden="true"></i> Texte</button>
      <button type="button" class="ed-add" data-kind="free"><i class="ph-duotone ph-frame-corners" aria-hidden="true"></i> Zone libre</button></span>`;
    zone.dataset.ref = ref;
    zone.dataset.position = position;
    zone.querySelector('[data-kind="image"]').addEventListener('click', () => pick(zone));
    zone.querySelector('[data-kind="text"]').addEventListener('click', () => api('insert', { kind: 'text', offset: Number(ref), position }).then(done).catch(fail));
    zone.querySelector('[data-kind="free"]').addEventListener('click', () => {
      const eid = newId();
      api('insert', { kind: 'free', eid, offset: Number(ref), position }).then(() => reloadSelecting(eid)).catch(fail);
    });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('is-over'); body.classList.remove('ed-dragging');
      const moved = e.dataTransfer.getData('text/x-ed-figure');
      if (moved) { api('move', { from: Number(moved), to: Number(ref), position }).then(done).catch(fail); return; }
      const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
      if (f) openDialog(f, zone);
    });
    return zone;
  }

  function buildZones() {
    main.querySelectorAll('.panel').forEach((panel) => {
      const kids = [...panel.children].filter((c) => c.dataset.srcOffset && !c.classList.contains('lesson-hero--behind'));
      kids.forEach((kid) => kid.before(makeZone(kid.dataset.srcOffset, 'before')));
      if (kids.length) kids[kids.length - 1].after(makeZone(kids[kids.length - 1].dataset.srcOffset, 'after'));
    });
    document.addEventListener('dragenter', (e) => { if (editing && e.dataTransfer && [...e.dataTransfer.types].some((t) => t === 'Files' || t === 'text/x-ed-figure')) body.classList.add('ed-dragging'); });
    document.addEventListener('dragend', () => body.classList.remove('ed-dragging'));
  }

  function pick(zone) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', () => { if (input.files[0]) openDialog(input.files[0], zone); });
    input.click();
  }

  /* ═════════ Sélection (images et blocs) ═════════ */
  function blocksOf() {
    return [...main.querySelectorAll('.panel')].flatMap((p) => [...p.children]).filter((c) => c.dataset.srcOffset && !c.classList.contains('ed-zone') && !c.classList.contains('free') && c.tagName !== 'FIGURE');
  }

  function buildSelection() {
    document.querySelectorAll('figure.lesson-hero').forEach((fig) => {
      fig.classList.add('ed-figure');
      fig.draggable = !fig.classList.contains('lesson-hero--behind');
      fig.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-ed-figure', fig.dataset.srcOffset); body.classList.add('ed-dragging'); });
      fig.addEventListener('dragend', () => body.classList.remove('ed-dragging'));
      fig.addEventListener('click', (e) => { e.stopPropagation(); select(fig); });
      // poignée : sélectionne et déplace (indispensable pour une image derrière le texte)
      const handle = document.createElement('button');
      handle.type = 'button'; handle.className = 'ed-handle';
      handle.innerHTML = '<i class="ph-duotone ph-arrows-out-cardinal" aria-hidden="true"></i> Image';
      handle.addEventListener('click', (e) => { e.stopPropagation(); select(fig); });
      if (fig.classList.contains('lesson-hero--behind')) enableBehindDrag(fig, handle);
      fig.append(handle);
    });
    blocksOf().forEach((blk) => blk.addEventListener('click', (e) => { if (!e.target.closest('a')) select(blk); }));
    main.addEventListener('click', (e) => { if (e.target === main) select(null); });
  }

  function select(el) {
    document.querySelectorAll('.ed-selected').forEach((n) => n.classList.remove('ed-selected'));
    selected = el;
    if (el) el.classList.add('ed-selected');
    showInspector();
  }

  /* ═════════ Texte modifiable ═════════ */
  function cleanHtml(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[data-user]').forEach((n) => { n.textContent = n.dataset.fallback || ''; });          // remplis à l'exécution : on ne les fige pas
    clone.querySelectorAll('[data-f]').forEach((n) => { n.textContent = n.dataset.m || ''; });
    clone.querySelectorAll('[data-needs-user]').forEach((n) => n.setAttribute('hidden', ''));
    clone.querySelectorAll('[data-src-offset]').forEach((n) => n.removeAttribute('data-src-offset'));
    clone.querySelectorAll('.ed-handle, .ed-zone').forEach((n) => n.remove());
    clone.removeAttribute('contenteditable');
    return clone.innerHTML.trim();
  }

  function buildTextEditing() {
    main.querySelectorAll('.panel p, .panel h2, .panel h3, .panel li').forEach((el) => {
      if (!TEXT_TAGS.has(el.tagName) || !el.dataset.srcOffset) return;
      if (el.classList.contains('feedback') || el.hasAttribute('role') || el.closest('[data-quiz], .sort-item, .quiz-options, .ed-zone')) return;
      el.setAttribute('contenteditable', 'true');
      el.spellcheck = true;
      let before = '';
      el.addEventListener('focus', () => { before = cleanHtml(el); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && el.tagName !== 'LI') e.preventDefault(); if (e.key === 'Escape') { el.innerHTML = before; el.blur(); } });
      el.addEventListener('blur', () => {
        const after = cleanHtml(el);
        if (after === before) return;
        api('text', { offset: off(el), html: after }).then(done).catch(fail);
      });
    });
  }

  /* ═════════ Panneau d'options ═════════ */
  const seg = (name, items, current) => `<div class="ed-seg" role="radiogroup" aria-label="${name}">${items.map((i) => `<button type="button" role="radio" aria-checked="${String(i.id === current)}" data-val="${i.id}" title="${i.label}">${i.icon ? `<i class="ph-duotone ${i.icon}" aria-hidden="true"></i>` : ''}<span>${i.label}</span></button>`).join('')}</div>`;

  /* ═════════ Outils partagés avec la zone libre (free.js) ═════════ */
  const newId = () => `e${Math.random().toString(36).slice(2, 8)}`;
  let quietUntil = 0;
  // Après un réglage « par identifiant » on garde la page telle quelle : on empêche le rechargement automatique de Vite
  if (import.meta.hot) import.meta.hot.on('vite:beforeFullReload', () => { if (Date.now() < quietUntil) throw '(éditeur : rechargement évité)'; });
  const quiet = () => { quietUntil = Date.now() + 2500; };
  // Les positions (data-src-offset) bougent quand le fichier change : on les relit sans recharger la page
  async function refresh() {
    try {
      const html = await (await fetch(location.pathname + location.search, { cache: 'no-store' })).text();
      const fresh = [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('[data-src-offset]')].map((n) => n.dataset.srcOffset);
      const live = [...document.querySelectorAll('[data-src-offset]')];
      if (fresh.length === live.length) live.forEach((n, i) => { n.dataset.srcOffset = fresh[i]; });
      else location.reload();
    } catch (_) { location.reload(); }
  }
  function reloadSelecting(eid) {
    sessionStorage.setItem('rd_edit_scroll', String(window.scrollY));
    if (eid) sessionStorage.setItem('rd_edit_eid', eid);
    location.reload();
  }
  const ctx = { api, upload, fail, seg, newId, quiet, refresh, reloadSelecting, select, showInspector,
    selected: () => selected, editing: () => editing };

  function readStyle(el) {
    const map = {};
    (el.getAttribute('style') || '').split(';').forEach((d) => { const i = d.indexOf(':'); if (i > 0) map[d.slice(0, i).trim()] = d.slice(i + 1).trim(); });
    return map;
  }
  const styleText = (map) => Object.entries(map).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}: ${v}`).join('; ');

  function figureState(fig) {
    const cls = [...fig.classList];
    const placement = PLACEMENTS.find((p) => p.id && cls.includes(`lesson-hero--${p.id}`))?.id || '';
    const format = FORMATS.find((f) => f.id && cls.includes(`lesson-hero--${f.id}`))?.id || '';
    const st = readStyle(fig);
    return { placement, format, w: parseInt(st['--w'] || '0', 10) || 0, o: parseFloat(st['--o'] || '0.22'), contour: fig.hasAttribute('data-contour') };
  }

  function commitFigure(fig, patch) {
    const state = { ...figureState(fig), ...patch };
    if (patch.placement && patch.placement !== '' && !state.format) state.format = 'natural';   // habillage / arrière-plan : on garde les proportions de l'image
    const st = readStyle(fig);
    if (state.w) st['--w'] = `${state.w}%`; else delete st['--w'];
    if (state.placement === 'behind') { st['--o'] = String(state.o); } else { delete st['--o']; delete st['--x']; delete st['--y']; }
    const src = fig.querySelector('img').getAttribute('src');
    const contour = state.contour && state.placement.startsWith('float');
    if (contour) st['--shape'] = `url('${src}')`; else delete st['--shape'];
    const cls = ['lesson-hero', state.placement && `lesson-hero--${state.placement}`, state.format && `lesson-hero--${state.format}`].filter(Boolean).join(' ');
    api('attrs', { offset: off(fig), attrs: { class: cls, style: styleText(st) || null, 'data-contour': contour ? '' : null } }).then(done).catch(fail);
  }

  function showInspector() {
    document.querySelector('.ed-inspector')?.remove();
    if (!editing) return;
    const box = document.createElement('aside');
    box.className = 'ed-inspector';
    box.setAttribute('aria-label', 'Options de l\'élément sélectionné');
    document.body.append(box);

    if (!selected) {
      box.innerHTML = '<h2>Éditeur</h2><p class="ed-help">Cliquez sur une <strong>image</strong> ou un <strong>bloc</strong> pour régler sa taille, son placement ou ses colonnes.<br>Cliquez dans un <strong>texte</strong> pour le modifier.<br>Glissez une image depuis votre ordinateur sur une zone « Image ».</p>';
      return;
    }

    if (selected.matches('.free, .free-item')) { freeInspector(selected, box, ctx); return; }

    if (selected.tagName === 'FIGURE') {
      const fig = selected, s = figureState(fig);
      const wNow = s.w || (fig.getBoundingClientRect().width / fig.parentElement.getBoundingClientRect().width * 100) | 0;
      box.innerHTML = `
        <h2>Image</h2>
        <section><h3>Placement</h3>${seg('Placement', PLACEMENTS, s.placement)}</section>
        <section><h3>Format</h3>
          <select class="ed-format" aria-label="Format">${FORMATS.map((f) => `<option value="${f.id}" ${f.id === s.format ? 'selected' : ''}>${f.label}</option>`).join('')}</select></section>
        <section><h3>Taille <output>${wNow}%</output></h3>
          ${seg('Tailles', SIZES.map((n) => ({ id: String(n), label: n === 100 ? 'Pleine' : `${n}%` })), String(s.w))}
          <input class="ed-range" type="range" min="15" max="100" step="1" value="${wNow}" aria-label="Largeur en pourcentage"></section>
        ${s.placement.startsWith('float') ? `<section><label class="ed-check"><input type="checkbox" class="ed-contour" ${s.contour ? 'checked' : ''}> Le texte suit le contour de l'image <small>(fond transparent : PNG, WebP, SVG)</small></label></section>` : ''}
        ${s.placement === 'behind' ? `<section><h3>Opacité <output>${Math.round(s.o * 100)}%</output></h3><input class="ed-opacity" type="range" min="5" max="100" step="5" value="${Math.round(s.o * 100)}" aria-label="Opacité"><p class="ed-help">Glissez la poignée « Image » pour la déplacer.</p></section>` : ''}
        <button type="button" class="ed-delete"><i class="ph-duotone ph-trash" aria-hidden="true"></i> Supprimer l'image</button>`;
      box.querySelectorAll('[aria-label="Placement"] button').forEach((b) => b.addEventListener('click', () => commitFigure(fig, { placement: b.dataset.val })));
      box.querySelector('.ed-format').addEventListener('change', (e) => commitFigure(fig, { format: e.target.value }));
      box.querySelectorAll('[aria-label="Tailles"] button').forEach((b) => b.addEventListener('click', () => commitFigure(fig, { w: Number(b.dataset.val) === 100 ? 0 : Number(b.dataset.val) })));
      const range = box.querySelector('.ed-range');
      range.addEventListener('input', () => { fig.style.setProperty('--w', `${range.value}%`); range.closest('section').querySelector('output').textContent = `${range.value}%`; });
      range.addEventListener('change', () => commitFigure(fig, { w: Number(range.value) >= 100 ? 0 : Number(range.value) }));
      box.querySelector('.ed-contour')?.addEventListener('change', (e) => commitFigure(fig, { contour: e.target.checked }));
      const op = box.querySelector('.ed-opacity');
      op?.addEventListener('input', () => { fig.style.setProperty('--o', String(op.value / 100)); op.closest('section').querySelector('output').textContent = `${op.value}%`; });
      op?.addEventListener('change', () => commitFigure(fig, { o: op.value / 100 }));
      box.querySelector('.ed-delete').addEventListener('click', () => { if (confirm('Supprimer cette image de la page ?')) api('remove', { offset: off(fig) }).then(done).catch(fail); });
      return;
    }

    const blk = selected;
    const cols = blk.dataset.cols || '1', measure = blk.dataset.measure || '', align = blk.dataset.align || '';
    box.innerHTML = `
      <h2>Bloc de texte <small>&lt;${blk.tagName.toLowerCase()}&gt;</small></h2>
      <section><h3>Alignement</h3>${seg('Alignement du texte', [{ id: 'left', label: 'Gauche' }, { id: 'center', label: 'Centre' }, { id: 'right', label: 'Droite' }, { id: 'justify', label: 'Justifié' }], align || 'left')}
        ${align === 'justify' ? `<h3>Dernière ligne</h3>${seg('Dernière ligne', [{ id: 'left', label: 'Gauche' }, { id: 'center', label: 'Centre' }, { id: 'right', label: 'Droite' }], blk.dataset.last || 'left')}` : ''}</section>
      <section><h3>Colonnes</h3>${seg('Colonnes', [{ id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }], cols)}</section>
      <section><h3>Largeur de lecture</h3>${seg('Largeur', [{ id: 'narrow', label: 'Étroite' }, { id: '', label: 'Normale' }, { id: 'full', label: 'Pleine' }], measure)}</section>
      <p class="ed-help">Cliquez dans le texte pour le modifier ; Échap annule.</p>
      <button type="button" class="ed-delete"><i class="ph-duotone ph-trash" aria-hidden="true"></i> Supprimer le bloc</button>`;
    box.querySelectorAll('[aria-label="Alignement du texte"] button').forEach((b) => b.addEventListener('click', () => api('attrs', { offset: off(blk), attrs: { 'data-align': b.dataset.val === 'left' ? null : b.dataset.val, 'data-last': b.dataset.val === 'justify' ? blk.dataset.last || null : null } }).then(done).catch(fail)));
    box.querySelectorAll('[aria-label="Dernière ligne"] button').forEach((b) => b.addEventListener('click', () => api('attrs', { offset: off(blk), attrs: { 'data-last': b.dataset.val === 'left' ? null : b.dataset.val } }).then(done).catch(fail)));
    box.querySelectorAll('[aria-label="Colonnes"] button').forEach((b) => b.addEventListener('click', () => api('attrs', { offset: off(blk), attrs: { 'data-cols': b.dataset.val === '1' ? null : b.dataset.val } }).then(done).catch(fail)));
    box.querySelectorAll('[aria-label="Largeur"] button').forEach((b) => b.addEventListener('click', () => api('attrs', { offset: off(blk), attrs: { 'data-measure': b.dataset.val || null } }).then(done).catch(fail)));
    box.querySelector('.ed-delete').addEventListener('click', () => { if (confirm('Supprimer ce bloc ?')) api('remove', { offset: off(blk) }).then(done).catch(fail); });
  }

  /* ═════════ Image derrière le texte : déplacement libre ═════════ */
  function enableBehindDrag(fig, handle) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault(); handle.setPointerCapture(e.pointerId);
      const panel = fig.parentElement;
      const move = (ev) => {
        const r = panel.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
        const y = Math.max(-20, Math.min(90, ((ev.clientY - r.top) / r.height) * 100));
        fig.style.setProperty('--x', `${x.toFixed(1)}%`); fig.style.setProperty('--y', `${y.toFixed(1)}%`);
      };
      const up = () => {
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up);
        const st = readStyle(fig);
        api('attrs', { offset: off(fig), attrs: { style: styleText(st) } }).then(done).catch(fail);
      };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
    });
  }

  /* ═════════ Boîte de dialogue d'insertion ═════════ */
  function openDialog(f, zone) {
    const url = URL.createObjectURL(f);
    const dlg = document.createElement('dialog');
    dlg.className = 'ed-dialog';
    dlg.innerHTML = `
      <form method="dialog">
        <h2>Insérer l'image</h2>
        <img class="ed-preview" src="${url}" alt="">
        <p class="ed-size"></p>
        <fieldset><legend>Placement</legend>${PLACEMENTS.map((p, i) => `<label><input type="radio" name="placement" value="${p.id}" ${i === 0 ? 'checked' : ''}> ${p.label}</label>`).join('')}</fieldset>
        <fieldset><legend>Format</legend>${FORMATS.map((x) => `<label><input type="radio" name="fmt" value="${x.id}"> ${x.label} <small>${x.hint}</small></label>`).join('')}</fieldset>
        <label class="ed-alt">Description pour les lecteurs d'écran <small>(laisser vide si l'image est décorative)</small>
          <input type="text" name="alt" maxlength="160"></label>
        <p class="ed-error" role="alert"></p>
        <div class="ed-actions"><button type="button" class="ed-cancel">Annuler</button><button type="submit" class="ed-ok">Insérer</button></div>
      </form>`;
    document.body.append(dlg);
    const img = dlg.querySelector('.ed-preview'), sizeEl = dlg.querySelector('.ed-size');
    let natural = { width: 0, height: 0 };
    img.addEventListener('load', () => {
      natural = { width: img.naturalWidth, height: img.naturalHeight };
      const r = natural.width / natural.height;
      const auto = r > 2 ? '' : r > 1.4 ? 'wide' : r > 0.9 ? 'square' : 'portrait';
      dlg.querySelector(`input[name="fmt"][value="${auto}"]`).checked = true;
      const min = FORMATS.find((x) => x.id === auto).min;
      sizeEl.textContent = `${natural.width} × ${natural.height} px${natural.width < min ? ` — attention : sous ${min} px de large, l'image risque d'être floue.` : ''}`;
    });
    dlg.querySelector('.ed-cancel').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => { URL.revokeObjectURL(url); dlg.remove(); });
    dlg.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target), ok = dlg.querySelector('.ed-ok');
      ok.disabled = true; ok.textContent = 'Envoi…';
      try {
        const src = await upload(f);
        const placement = form.get('placement') || '';
        await api('insert', { offset: Number(zone.dataset.ref), position: zone.dataset.position, src, format: form.get('fmt') || '', placement, alt: form.get('alt') || '', ...natural });
        done();
      } catch (err) { dlg.querySelector('.ed-error').textContent = err.message; ok.disabled = false; ok.textContent = 'Insérer'; }
    });
    dlg.showModal();
  }
}
