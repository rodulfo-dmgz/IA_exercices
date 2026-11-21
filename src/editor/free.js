/**
 * Zone libre de l'éditeur (mode dev) : images et textes placés n'importe où dans une « diapositive ».
 *  - glisser un élément pour le déplacer, poignées pour l'élargir / le réduire ;
 *  - double-clic (ou Entrée) pour écrire dans un texte ; flèches pour ajuster au pixel près ;
 *  - Suppr pour supprimer, Ctrl+D pour dupliquer ;
 *  - panneau d'options : police, taille, gras, italique, alignement, couleur, ordre, opacité, arrondi…
 * Les réglages sont écrits dans le HTML source par identifiant (data-eid) : la page n'est pas rechargée.
 */
const COLORS = [
  { v: 'var(--rd-text)', label: 'Texte' }, { v: 'var(--brand-primary)', label: 'Bleu' }, { v: 'var(--brand-accent)', label: 'Orange' },
  { v: 'var(--success)', label: 'Vert' }, { v: 'var(--text-muted)', label: 'Gris' }, { v: '#ffffff', label: 'Blanc' }, { v: '#000000', label: 'Noir' },
];
const FONTS = [{ id: 'display', label: 'Titres' }, { id: 'sans', label: 'Texte' }, { id: 'mono', label: 'Code' }];
const RATIOS = ['16 / 9', '21 / 9', '4 / 3', '1 / 1', '3 / 4'];
const BACKGROUNDS = [{ id: '', label: 'Aucun' }, { id: 'card', label: 'Carte' }, { id: 'soft', label: 'Bleu doux' }, { id: 'accent', label: 'Orange doux' }, { id: 'dark', label: 'Sombre' }];
const RADII = [{ id: '0', label: 'Droit' }, { id: '12px', label: 'Arrondi' }, { id: '28px', label: 'Très arrondi' }, { id: '50%', label: 'Rond' }];

const num = (item, name, fallback) => { const v = parseFloat(item.style.getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round1 = (n) => Math.round(n * 10) / 10;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function setupFree(ctx) {
  document.querySelectorAll('.free').forEach((canvas) => {
    canvas.classList.add('ed-canvas');
    canvas.addEventListener('click', (e) => { if (e.target === canvas || e.target.closest('.ed-canvas-hint')) ctx.select(canvas); });
    canvas.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); canvas.classList.add('is-over'); } });
    canvas.addEventListener('dragleave', () => canvas.classList.remove('is-over'));
    canvas.addEventListener('drop', (e) => {
      canvas.classList.remove('is-over');
      const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/'));
      if (!f) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      addImage(canvas, f, ctx, { x: ((e.clientX - r.left) / r.width) * 100 - 15, y: ((e.clientY - r.top) / r.height) * 100 - 10 });
    });

    const bar = document.createElement('div');
    bar.className = 'ed-canvas-bar';
    bar.innerHTML = '<button type="button" data-add="text"><i class="ph-duotone ph-text-t" aria-hidden="true"></i> Texte</button><button type="button" data-add="image"><i class="ph-duotone ph-image-square" aria-hidden="true"></i> Image</button>';
    bar.querySelector('[data-add="text"]').addEventListener('click', (e) => { e.stopPropagation(); addText(canvas, ctx); });
    bar.querySelector('[data-add="image"]').addEventListener('click', (e) => { e.stopPropagation(); pickImage(canvas, ctx); });
    canvas.append(bar);
    if (!canvas.querySelector('.free-item')) {
      const hint = document.createElement('p');
      hint.className = 'ed-canvas-hint';
      hint.textContent = 'Zone libre : ajoutez un texte ou glissez une image ici.';
      canvas.append(hint);
    }
    canvas.querySelectorAll('.free-item').forEach((item) => wireItem(item, canvas, ctx));
  });

  document.addEventListener('keydown', (e) => {
    const el = ctx.selected();
    if (!ctx.editing() || !el || !el.classList.contains('free-item') || el.isContentEditable) return;
    if (e.target.closest('input, select, textarea')) return;
    const step = e.shiftKey ? 2 : 0.5;
    const move = { ArrowLeft: ['--x', -step], ArrowRight: ['--x', step], ArrowUp: ['--y', -step], ArrowDown: ['--y', step] }[e.key];
    if (move) { e.preventDefault(); el.style.setProperty(move[0], `${round1(num(el, move[0], 0) + move[1])}%`); commit(el, ctx, true); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItem(el, ctx); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(el, ctx); }
    else if (e.key === 'Enter' && el.classList.contains('free-text')) { e.preventDefault(); editText(el, ctx); }
  });
}

/* ───────── Création ───────── */
function itemId(ctx) { return ctx.newId(); }

async function append(canvas, html, ctx) {
  ctx.quiet();
  await ctx.api('eid/append', { eid: canvas.dataset.eid, html });
  ctx.reloadSelecting(html.match(/data-eid="([a-z0-9]+)"/)[1]);   // le nouvel élément n'a pas encore de position : on recharge en le sélectionnant
}

function addText(canvas, ctx) {
  const id = itemId(ctx);
  append(canvas, `<div class="free-item free-text" data-eid="${id}" data-font="display" style="--x: 8%; --y: 12%; --w: 50%; --fs: 4; --fw: 700">Votre titre</div>`, ctx).catch(ctx.fail);
}

function pickImage(canvas, ctx) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.addEventListener('change', () => { if (input.files[0]) addImage(canvas, input.files[0], ctx, { x: 35, y: 15 }); });
  input.click();
}

async function addImage(canvas, file, ctx, at) {
  try {
    const src = await ctx.upload(file);
    const id = itemId(ctx);
    await append(canvas, `<figure class="free-item" data-eid="${id}" style="--x: ${round1(clamp(at.x, 0, 85))}%; --y: ${round1(clamp(at.y, 0, 85))}%; --w: 30%"><img src="${src}" alt="" decoding="async"></figure>`, ctx);
  } catch (e) { ctx.fail(e); }
}

function duplicate(item, ctx) {
  const canvas = item.closest('.free');
  const copy = item.cloneNode(true);
  copy.querySelectorAll('.ed-hdl, [data-src-offset]').forEach((n) => (n.classList.contains('ed-hdl') ? n.remove() : n.removeAttribute('data-src-offset')));
  copy.removeAttribute('data-src-offset');
  copy.classList.remove('ed-selected', 'ed-free-item', 'is-editing');
  copy.removeAttribute('contenteditable');
  const id = itemId(ctx);
  copy.setAttribute('data-eid', id);
  copy.style.setProperty('--x', `${round1(num(item, '--x', 10) + 3)}%`);
  copy.style.setProperty('--y', `${round1(num(item, '--y', 10) + 4)}%`);
  append(canvas, copy.outerHTML, ctx).catch(ctx.fail);
}

function removeItem(item, ctx) {
  if (!confirm('Supprimer cet élément ?')) return;
  ctx.quiet();
  ctx.api('eid/remove', { eid: item.dataset.eid }).then(() => { item.remove(); ctx.select(null); ctx.refresh(); }).catch(ctx.fail);
}

/* ───────── Enregistrement ───────── */
function commit(item, ctx, debounce = false) {
  clearTimeout(item._t);
  const go = () => {
    ctx.quiet();
    ctx.api('eid/attrs', { eid: item.dataset.eid, attrs: { style: item.getAttribute('style') || null, 'data-font': item.getAttribute('data-font'), 'data-italic': item.hasAttribute('data-italic') ? '' : null, 'data-bg': item.getAttribute('data-bg') } })
      .then(() => ctx.refresh()).catch(ctx.fail);
  };
  if (debounce) item._t = setTimeout(go, 350); else go();
}

/* ───────── Déplacement, redimensionnement, texte ───────── */
function wireItem(item, canvas, ctx) {
  item.classList.add('ed-free-item');
  ['nw', 'ne', 'sw', 'se', 'w', 'e'].forEach((dir) => {
    const h = document.createElement('span');
    h.className = 'ed-hdl'; h.dataset.h = dir; h.setAttribute('aria-hidden', 'true');
    h.addEventListener('pointerdown', (e) => startResize(e, item, canvas, dir, ctx));
    item.append(h);
  });
  item.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.ed-hdl') || item.isContentEditable) return;
    e.preventDefault(); e.stopPropagation();
    ctx.select(item);
    startMove(e, item, canvas, ctx);
  });
  item.addEventListener('dblclick', () => { if (item.classList.contains('free-text')) editText(item, ctx); });
}

function startMove(e, item, canvas, ctx) {
  const r = canvas.getBoundingClientRect();
  const x0 = num(item, '--x', 10), y0 = num(item, '--y', 10), sx = e.clientX, sy = e.clientY;
  let moved = false;
  const move = (ev) => {
    const dx = ((ev.clientX - sx) / r.width) * 100, dy = ((ev.clientY - sy) / r.height) * 100;
    if (Math.abs(dx) + Math.abs(dy) > 0.4) moved = true;
    item.style.setProperty('--x', `${round1(clamp(x0 + dx, -30, 100))}%`);
    item.style.setProperty('--y', `${round1(clamp(y0 + dy, -30, 100))}%`);
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (moved) commit(item, ctx); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}

function startResize(e, item, canvas, dir, ctx) {
  e.preventDefault(); e.stopPropagation();
  ctx.select(item);
  const r = canvas.getBoundingClientRect();
  const w0 = num(item, '--w', 30), x0 = num(item, '--x', 10), sx = e.clientX;
  const west = dir.includes('w');
  const move = (ev) => {
    const d = ((ev.clientX - sx) / r.width) * 100;
    const w = clamp(west ? w0 - d : w0 + d, 4, 100);
    item.style.setProperty('--w', `${round1(w)}%`);
    if (west) item.style.setProperty('--x', `${round1(x0 + (w0 - w))}%`);
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); commit(item, ctx); ctx.showInspector(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}

function plainHtml(item) {
  const lines = [];
  let cur = '';
  [...item.childNodes].forEach((n) => {
    if (n.nodeType === 1 && n.classList.contains('ed-hdl')) return;
    if (n.nodeType === 3) cur += n.textContent;
    else if (n.tagName === 'BR') { lines.push(cur); cur = ''; }
    else { if (cur) { lines.push(cur); cur = ''; } lines.push(n.textContent); }
  });
  if (cur) lines.push(cur);
  return lines.map((l) => esc(l)).join('<br>').trim();
}

function editText(item, ctx) {
  const before = plainHtml(item);
  item.contentEditable = 'true';
  item.classList.add('is-editing');
  item.focus();
  document.getSelection().selectAllChildren(item);
  const onKey = (e) => { if (e.key === 'Escape') { item.innerHTML = before; finish(false); } e.stopPropagation(); };
  const finish = (save = true) => {
    item.removeEventListener('keydown', onKey);
    item.contentEditable = 'false'; item.classList.remove('is-editing');
    item.querySelectorAll('.ed-hdl').forEach((h) => h.remove());
    const html = plainHtml(item) || 'Texte';
    item.innerHTML = html;
    ['nw', 'ne', 'sw', 'se', 'w', 'e'].forEach((dir) => { const h = document.createElement('span'); h.className = 'ed-hdl'; h.dataset.h = dir; h.addEventListener('pointerdown', (e) => startResize(e, item, item.closest('.free'), dir, ctx)); item.append(h); });
    if (save && html !== before) { ctx.quiet(); ctx.api('eid/html', { eid: item.dataset.eid, html }).then(() => ctx.refresh()).catch(ctx.fail); }
  };
  item.addEventListener('keydown', onKey);
  item.addEventListener('blur', () => finish(true), { once: true });
}

/* ───────── Panneau d'options ───────── */
export function freeInspector(el, box, ctx) {
  const { seg } = ctx;
  const bind = (sel, ev, fn) => box.querySelectorAll(sel).forEach((n) => n.addEventListener(ev, (e) => fn(e, n)));
  const refresh = () => ctx.showInspector();

  /* La zone elle-même */
  if (el.classList.contains('free')) {
    const ratio = (el.style.getPropertyValue('--ratio') || '16 / 9').trim();
    const bg = el.getAttribute('data-bg') || '';
    box.innerHTML = `
      <h2>Zone libre</h2>
      <section><h3>Contenu</h3><div class="ed-seg"><button type="button" data-add="text"><i class="ph-duotone ph-text-t" aria-hidden="true"></i><span>Texte</span></button><button type="button" data-add="image"><i class="ph-duotone ph-image-square" aria-hidden="true"></i><span>Image</span></button></div></section>
      <section><h3>Proportions</h3><select aria-label="Proportions">${RATIOS.map((r) => `<option ${r === ratio ? 'selected' : ''}>${r}</option>`).join('')}</select></section>
      <section><h3>Fond</h3>${seg('Fond', BACKGROUNDS, bg)}</section>
      <p class="ed-help">Glissez les éléments pour les placer, tirez les poignées pour les agrandir. Double-clic dans un texte pour l'écrire.</p>
      <button type="button" class="ed-delete"><i class="ph-duotone ph-trash" aria-hidden="true"></i> Supprimer la zone</button>`;
    bind('[data-add="text"]', 'click', () => addText(el, ctx));
    bind('[data-add="image"]', 'click', () => pickImage(el, ctx));
    bind('select', 'change', (e) => { el.style.setProperty('--ratio', e.target.value); commit(el, ctx); });
    bind('[aria-label="Fond"] button', 'click', (e, b) => { if (b.dataset.val) el.setAttribute('data-bg', b.dataset.val); else el.removeAttribute('data-bg'); commit(el, ctx); refresh(); });
    bind('.ed-delete', 'click', () => { if (confirm('Supprimer cette zone et tout son contenu ?')) { ctx.quiet(); ctx.api('eid/remove', { eid: el.dataset.eid }).then(() => { el.remove(); ctx.select(null); ctx.refresh(); }).catch(ctx.fail); } });
    return;
  }

  /* Un élément (texte ou image) */
  const isText = el.classList.contains('free-text');
  const w = num(el, '--w', 30), z = num(el, '--z', 1);
  const rangeRow = (label, cls, min, max, step, value, unit) => `<section><h3>${label} <output>${value}${unit}</output></h3><input class="ed-range ${cls}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"></section>`;
  const live = (cls, name, unit, parse = (v) => v) => {
    const input = box.querySelector(cls);
    input.addEventListener('input', () => { el.style.setProperty(name, `${parse(input.value)}${unit}`); input.closest('section').querySelector('output').textContent = `${input.value}${unit === 'cqw' ? '' : unit}`; });
    input.addEventListener('change', () => commit(el, ctx));
  };

  if (isText) {
    const font = el.getAttribute('data-font') || 'sans';
    const fs = num(el, '--fs', 2.2), fw = num(el, '--fw', 400) >= 600, italic = el.hasAttribute('data-italic');
    const ta = el.style.getPropertyValue('--ta').trim() || 'left';
    const color = el.style.getPropertyValue('--c').trim();
    box.innerHTML = `
      <h2>Texte</h2>
      <section><h3>Police</h3>${seg('Police', FONTS, font)}</section>
      ${rangeRow('Taille', 'ed-fs', 0.8, 14, 0.1, fs, '')}
      <section><h3>Style</h3><div class="ed-seg" aria-label="Style"><button type="button" data-style="bold" aria-pressed="${fw}"><strong>G</strong><span>Gras</span></button><button type="button" data-style="italic" aria-pressed="${italic}"><em>I</em><span>Italique</span></button></div></section>
      <section><h3>Alignement</h3>${seg('Alignement', [{ id: 'left', label: 'Gauche' }, { id: 'center', label: 'Centre' }, { id: 'right', label: 'Droite' }], ta)}</section>
      <section><h3>Couleur</h3><div class="ed-colors" aria-label="Couleur">${COLORS.map((c) => `<button type="button" data-color="${c.v}" title="${c.label}" aria-label="${c.label}" aria-pressed="${color === c.v}" style="background:${c.v}"></button>`).join('')}</div></section>
      ${rangeRow('Largeur', 'ed-w', 5, 100, 1, Math.round(w), '%')}
      <section><h3>Ordre</h3><div class="ed-seg"><button type="button" data-z="front"><span>Devant</span></button><button type="button" data-z="back"><span>Derrière</span></button></div></section>`;
    bind('[aria-label="Police"] button', 'click', (e, b) => { el.setAttribute('data-font', b.dataset.val); commit(el, ctx); refresh(); });
    live('.ed-fs', '--fs', '');
    bind('[data-style="bold"]', 'click', () => { el.style.setProperty('--fw', fw ? '400' : '700'); commit(el, ctx); refresh(); });
    bind('[data-style="italic"]', 'click', () => { if (italic) el.removeAttribute('data-italic'); else el.setAttribute('data-italic', ''); commit(el, ctx); refresh(); });
    bind('[aria-label="Alignement"] button', 'click', (e, b) => { el.style.setProperty('--ta', b.dataset.val); commit(el, ctx); refresh(); });
    bind('[data-color]', 'click', (e, b) => { el.style.setProperty('--c', b.dataset.color); commit(el, ctx); refresh(); });
  } else {
    const o = num(el, '--o', 1), r = num(el, '--r', 0), rad = (el.style.getPropertyValue('--rad') || '0').trim();
    box.innerHTML = `
      <h2>Image</h2>
      ${rangeRow('Largeur', 'ed-w', 5, 100, 1, Math.round(w), '%')}
      ${rangeRow('Opacité', 'ed-o', 5, 100, 5, Math.round(o * 100), '%')}
      ${rangeRow('Rotation', 'ed-r', -45, 45, 1, Math.round(r), '°')}
      <section><h3>Arrondi</h3>${seg('Arrondi', RADII, rad === '' ? '0' : rad)}</section>
      <section><h3>Ordre</h3><div class="ed-seg"><button type="button" data-z="front"><span>Devant</span></button><button type="button" data-z="back"><span>Derrière</span></button></div></section>`;
    const op = box.querySelector('.ed-o');
    op.addEventListener('input', () => { el.style.setProperty('--o', String(op.value / 100)); op.closest('section').querySelector('output').textContent = `${op.value}%`; });
    op.addEventListener('change', () => commit(el, ctx));
    const rot = box.querySelector('.ed-r');
    rot.addEventListener('input', () => { el.style.setProperty('--r', `${rot.value}deg`); rot.closest('section').querySelector('output').textContent = `${rot.value}°`; });
    rot.addEventListener('change', () => commit(el, ctx));
    bind('[aria-label="Arrondi"] button', 'click', (e, b) => { el.style.setProperty('--rad', b.dataset.val); const img = el.querySelector('img'); if (img) img.style.removeProperty('border-radius'); commit(el, ctx); refresh(); });
  }

  const wr = box.querySelector('.ed-w');
  wr.addEventListener('input', () => { el.style.setProperty('--w', `${wr.value}%`); wr.closest('section').querySelector('output').textContent = `${wr.value}%`; });
  wr.addEventListener('change', () => commit(el, ctx));
  bind('[data-z]', 'click', (e, b) => {
    const zs = [...el.parentElement.querySelectorAll('.free-item')].map((n) => num(n, '--z', 1));
    el.style.setProperty('--z', String(b.dataset.z === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1));
    commit(el, ctx); refresh();
  });

  const actions = document.createElement('div');
  actions.className = 'ed-actions-row';
  actions.innerHTML = '<button type="button" data-act="dup"><i class="ph-duotone ph-copy" aria-hidden="true"></i> Dupliquer</button><button type="button" class="ed-delete" data-act="del"><i class="ph-duotone ph-trash" aria-hidden="true"></i> Supprimer</button>';
  actions.querySelector('[data-act="dup"]').addEventListener('click', () => duplicate(el, ctx));
  actions.querySelector('[data-act="del"]').addEventListener('click', () => removeItem(el, ctx));
  box.append(actions);
  void z;
}
