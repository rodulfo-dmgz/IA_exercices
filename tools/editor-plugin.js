/**
 * Éditeur d'images en mode développement (npm run dev uniquement — jamais dans le build).
 *
 * Fonctionnement :
 *  1. Chaque balise des pages modules/*.html reçoit data-src-offset = sa position dans le fichier source.
 *  2. L'éditeur (src/editor/editor.js) envoie « insère ceci avant/après la balise à cette position »
 *     à ces points d'entrée ; le plugin modifie le fichier HTML source (et enregistre l'image dans
 *     public/assets/images/modules/). Les modifications sont donc dans le code : build et SCORM les contiennent.
 *
 * Sécurité : le serveur de dev n'écoute que sur localhost ; seuls les fichiers modules/*.html et les
 * images (≤ 12 Mo) sont acceptés.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, 'modules');
const IMAGES_DIR = path.join(ROOT, 'public', 'assets', 'images', 'modules');
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source']);
const FORMATS = { '': '', wide: ' lesson-hero--wide', square: ' lesson-hero--square', portrait: ' lesson-hero--portrait', natural: ' lesson-hero--natural' };
const PLACEMENTS = { '': '', 'float-left': ' lesson-hero--float-left', 'float-right': ' lesson-hero--float-right', behind: ' lesson-hero--behind' };

/* ── Annotation du HTML (offset de chaque balise ouvrante dans le fichier d'origine) ── */
function annotate(html) {
  return html.replace(
    /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>|<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g,
    (match, _raw, tag, attrs, selfClose, offset) => (tag ? `<${tag}${attrs} data-src-offset="${offset}"${selfClose}>` : match),
  );
}

/* ── Manipulation du source ── */
function resolveFile(file) {
  const full = path.resolve(ROOT, file);
  if (!full.startsWith(MODULES_DIR + path.sep) || !full.endsWith('.html')) throw new Error('Fichier non autorisé');
  return full;
}

function openingTag(src, offset) {
  const m = /^<([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/.exec(src.slice(offset));
  if (!m) throw new Error('Position invalide (le fichier a changé : rechargez la page)');
  return { name: m[1].toLowerCase(), length: m[0].length, selfClose: !!m[2], text: m[0] };
}

function elementEnd(src, offset) {
  const tag = openingTag(src, offset);
  const openEnd = offset + tag.length;
  if (VOID.has(tag.name) || tag.selfClose) return openEnd;
  const re = new RegExp(`<(/?)${tag.name}\\b[^>]*?(/?)>`, 'gi');
  re.lastIndex = openEnd;
  let depth = 1, t;
  while ((t = re.exec(src))) {
    if (t[1]) depth--; else if (!t[2]) depth++;
    if (depth === 0) return t.index + t[0].length;
  }
  throw new Error('Balise non fermée');
}

const lineStart = (src, i) => src.lastIndexOf('\n', i - 1) + 1;
const indentOf = (src, i) => /^[ \t]*/.exec(src.slice(lineStart(src, i)))[0];
const eolOf = (src) => (src.includes('\r\n') ? '\r\n' : '\n');   // les fichiers du projet utilisent CRLF (Windows)
const indentBlock = (html, indent, eol) => html.split(/\r?\n/).map((l, i) => (i === 0 ? l : indent + l)).join(eol);

function insertHtml(src, offset, position, html) {
  openingTag(src, offset);
  const indent = indentOf(src, offset);
  if (position === 'after') {
    const end = elementEnd(src, offset);
    return src.slice(0, end) + eolOf(src) + indent + indentBlock(html, indent, eolOf(src)) + src.slice(end);
  }
  const ls = lineStart(src, offset);
  const startsLine = /^[ \t]*$/.test(src.slice(ls, offset));
  const at = startsLine ? ls : offset;
  const eol = eolOf(src);
  return src.slice(0, at) + (startsLine ? indent : '') + indentBlock(html, indent, eol) + eol + (startsLine ? '' : indent) + src.slice(at);
}

function removeElement(src, offset) {
  const end = elementEnd(src, offset);
  const ls = lineStart(src, offset);
  const startsLine = /^[ \t]*$/.test(src.slice(ls, offset));
  const nl = src.indexOf('\n', end);
  const endsLine = nl !== -1 && /^[ \t]*\r?$/.test(src.slice(end, nl));
  if (startsLine && endsLine) return { src: src.slice(0, ls) + src.slice(nl + 1), removed: src.slice(offset, end), from: ls, length: nl + 1 - ls };
  return { src: src.slice(0, offset) + src.slice(end), removed: src.slice(offset, end), from: offset, length: end - offset };
}

/** Retrouve un élément par son identifiant stable (data-eid) : les positions ne dépendent plus de l'état du fichier. */
function findEid(src, eid) {
  if (!/^[a-z0-9]{4,16}$/.test(String(eid))) throw new Error('Identifiant invalide');
  const m = new RegExp(String.raw`<[a-zA-Z][\w-]*\b[^>]*\bdata-eid="${eid}"[^>]*>`).exec(src);
  if (!m) throw new Error('Élément introuvable (rechargez la page)');
  return m.index;
}

/** Ajoute du HTML à la fin d'un élément (avant sa balise fermante). */
function appendHtml(src, offset, html) {
  if (/<\s*script|\son\w+\s*=/i.test(html)) throw new Error('Contenu refusé');
  const end = elementEnd(src, offset);
  const close = /<\/[a-zA-Z][\w-]*>\s*$/.exec(src.slice(offset, end));
  const at = end - close[0].length;
  const eol = eolOf(src);
  const indent = indentOf(src, offset) + '  ';
  return src.slice(0, at) + eol + indent + indentBlock(html, indent, eol) + eol + indentOf(src, offset) + src.slice(at);
}

function figureHtml({ src, format = '', placement = '', size = '', alt = '', width, height }) {
  const cls = `lesson-hero${PLACEMENTS[placement] ?? ''}${FORMATS[format] ?? ''}`;
  const dims = width && height ? ` width="${Number(width)}" height="${Number(height)}"` : '';
  const style = size ? ` style="--w: ${Number(size)}%"` : '';
  const safeAlt = String(alt).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<figure class="${cls}"${style}>
  <img src="${src}" alt="${safeAlt}"${dims} decoding="async"
       onload="this.closest('figure').classList.add('is-loaded')"
       onerror="this.closest('figure').hidden = true">
</figure>`;
}

/** Pose / retire des attributs sur la balise ouvrante (valeur null = retirer). */
function setAttrs(src, offset, attrs) {
  const tag = openingTag(src, offset);
  let text = tag.text;
  for (const [name, value] of Object.entries(attrs)) {
    if (!/^[a-z][a-z0-9-]*$/i.test(name)) throw new Error('Attribut invalide');
    text = text.replace(new RegExp(String.raw`\s${name}(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?(?=[\s/>])`, 'i'), '');
    if (value !== null && value !== undefined) {
      const safe = String(value).replace(/"/g, '&quot;');
      text = text.replace(/\s*(\/?)>$/, ` ${name}="${safe}"$1>`);
    }
  }
  return src.slice(0, offset) + text + src.slice(offset + tag.length);
}

/** Remplace le contenu d'une balise (texte modifié dans l'éditeur). */
function setInnerHtml(src, offset, html) {
  if (/<\s*script|\son\w+\s*=/i.test(html)) throw new Error('Contenu refusé');
  const tag = openingTag(src, offset);
  const end = elementEnd(src, offset);
  const close = /<\/[a-zA-Z][\w-]*>\s*$/.exec(src.slice(offset, end));
  if (!close) throw new Error('Balise sans fermeture');
  return src.slice(0, offset + tag.length) + html + src.slice(end - close[0].length);
}

function setFormat(src, offset, format) {
  const tag = openingTag(src, offset);
  const next = tag.text.replace(/class="([^"]*)"/, (_m, cls) => {
    const base = cls.split(/\s+/).filter((c) => c && !c.startsWith('lesson-hero--')).join(' ');
    return `class="${base}${FORMATS[format] ?? ''}"`;
  });
  return src.slice(0, offset) + next + src.slice(offset + tag.length);
}

/* ── HTTP ── */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 12e6) { reject(new Error('Fichier trop volumineux (12 Mo max)')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };

/* ── Historique : chaque modification est précédée d'une sauvegarde (annuler / rétablir / restaurer) ── */
const HISTORY_DIR = path.join(ROOT, '.editor-history');
const MAX_UNDO = 100, MAX_DISK = 60;
const stacks = new Map();   // fichier -> { undo: [{content,label,time}], redo: [...] }
const stackOf = (file) => { if (!stacks.has(file)) stacks.set(file, { undo: [], redo: [] }); return stacks.get(file); };
const LABELS = { '/insert': "Ajout d'un bloc", '/remove': 'Suppression', '/move': 'Déplacement', '/format': "Format d'image", '/attrs': 'Réglage de bloc', '/text': 'Texte modifié', '/eid/attrs': 'Réglage (zone libre)', '/eid/html': 'Texte (zone libre)', '/eid/append': 'Ajout (zone libre)', '/eid/remove': 'Suppression (zone libre)' };

function snapshot(file, label) {
  const content = fs.readFileSync(file, 'utf-8');
  const st = stackOf(file);
  st.undo.push({ content, label, time: Date.now() });
  if (st.undo.length > MAX_UNDO) st.undo.shift();
  st.redo.length = 0;
  try {   // copie sur disque : survit au redémarrage du serveur
    const dir = path.join(HISTORY_DIR, path.basename(file, '.html'));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${Date.now()}.json`), JSON.stringify({ label, content }));
    const files = fs.readdirSync(dir).sort();
    files.slice(0, Math.max(0, files.length - MAX_DISK)).forEach((f) => fs.unlinkSync(path.join(dir, f)));
  } catch (_) { /* l'historique disque est un bonus */ }
}

function historyState(file) {
  const st = stackOf(file);
  return { canUndo: st.undo.length > 0, canRedo: st.redo.length > 0, undoLabel: st.undo.at(-1)?.label || '', redoLabel: st.redo.at(-1)?.label || '' };
}

function historyList(file) {
  const dir = path.join(HISTORY_DIR, path.basename(file, '.html'));
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse().slice(0, 40).map((f) => {
    let label = 'Version';
    try { label = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')).label; } catch (_) { /* ignoré */ }
    return { id: f.replace('.json', ''), time: Number(f.replace('.json', '')), label };
  });
}

export default function editorPlugin() {
  return {
    name: 'rd-editor',
    apply: 'serve',

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const url = (ctx.path || '').split('?')[0];
        if (!url.startsWith('/modules/') || !url.endsWith('.html')) return html;
        return {
          html: annotate(html),
          tags: [
            { tag: 'meta', attrs: { name: 'editor-file', content: url.slice(1) }, injectTo: 'head' },
            { tag: 'script', attrs: { type: 'module', src: '/src/editor/editor.js' }, injectTo: 'body' },
          ],
        };
      },
    },

    configureServer(server) {
      server.middlewares.use('/__editor', async (req, res) => {
        try {
          if (req.method !== 'POST') return send(res, 405, { error: 'POST uniquement' });
          const url = new URL(req.url, 'http://localhost');

          if (url.pathname === '/upload') {
            const ext = path.extname(url.searchParams.get('name') || '').toLowerCase();
            if (!IMG_EXT.has(ext)) return send(res, 400, { error: 'Format d\'image non accepté' });
            const slug = (url.searchParams.get('slug') || 'image').replace(/[^a-z0-9-]/gi, '-').slice(0, 40) || 'image';
            const fileName = `${slug}-${Date.now().toString(36)}${ext}`;
            fs.mkdirSync(IMAGES_DIR, { recursive: true });
            fs.writeFileSync(path.join(IMAGES_DIR, fileName), await readBody(req));
            return send(res, 200, { src: `/assets/images/modules/${fileName}` });
          }

          const data = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
          const file = resolveFile(data.file);

          if (url.pathname === '/state') return send(res, 200, historyState(file));
          if (url.pathname === '/history') return send(res, 200, { versions: historyList(file) });
          if (url.pathname === '/undo' || url.pathname === '/redo') {
            const st = stackOf(file), from = url.pathname === '/undo' ? st.undo : st.redo, to = url.pathname === '/undo' ? st.redo : st.undo;
            if (!from.length) return send(res, 400, { error: url.pathname === '/undo' ? 'Rien à annuler' : 'Rien à rétablir' });
            const entry = from.pop();
            to.push({ content: fs.readFileSync(file, 'utf-8'), label: entry.label, time: Date.now() });
            fs.writeFileSync(file, entry.content, 'utf-8');
            return send(res, 200, { ok: true, label: entry.label, ...historyState(file) });
          }
          if (url.pathname === '/restore') {
            const id = String(data.id || '');
            if (!/^[0-9]+$/.test(id)) throw new Error('Version invalide');
            const saved = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, path.basename(file, '.html'), `${id}.json`), 'utf-8'));
            snapshot(file, 'Avant restauration');
            fs.writeFileSync(file, saved.content, 'utf-8');
            return send(res, 200, { ok: true, ...historyState(file) });
          }

          let src = fs.readFileSync(file, 'utf-8');

          if (url.pathname === '/insert') {
            let html;
            if (data.kind === 'text') html = '<p class="panel-text">Nouveau texte : cliquez pour le modifier.</p>';
            else if (data.kind === 'free') {
              if (!/^[a-z0-9]{4,16}$/.test(String(data.eid))) throw new Error('Identifiant invalide');
              html = `<div class="free" data-eid="${data.eid}" style="--ratio: 16 / 9"></div>`;
            } else html = figureHtml(data);
            src = insertHtml(src, Number(data.offset), data.position === 'after' ? 'after' : 'before', html);
          } else if (url.pathname === '/eid/attrs') {
            src = setAttrs(src, findEid(src, data.eid), data.attrs || {});
          } else if (url.pathname === '/eid/html') {
            src = setInnerHtml(src, findEid(src, data.eid), String(data.html ?? ''));
          } else if (url.pathname === '/eid/append') {
            src = appendHtml(src, findEid(src, data.eid), String(data.html ?? ''));
          } else if (url.pathname === '/eid/remove') {
            src = removeElement(src, findEid(src, data.eid)).src;
          } else if (url.pathname === '/attrs') {
            src = setAttrs(src, Number(data.offset), data.attrs || {});
          } else if (url.pathname === '/text') {
            src = setInnerHtml(src, Number(data.offset), String(data.html ?? ''));
          } else if (url.pathname === '/remove') {
            src = removeElement(src, Number(data.offset)).src;
          } else if (url.pathname === '/format') {
            src = setFormat(src, Number(data.offset), data.format);
          } else if (url.pathname === '/move') {
            const from = Number(data.from), to = Number(data.to);
            const { src: without, removed, from: cutAt, length } = removeElement(src, from);
            const target = to > cutAt ? to - length : to;
            src = insertHtml(without, target, data.position === 'after' ? 'after' : 'before', removed);
          } else {
            return send(res, 404, { error: 'Action inconnue' });
          }
          snapshot(file, LABELS[url.pathname] || 'Modification');
          fs.writeFileSync(file, src, 'utf-8');
          return send(res, 200, { ok: true, ...historyState(file) });
        } catch (err) {
          return send(res, 400, { error: err.message });
        }
      });
    },
  };
}
