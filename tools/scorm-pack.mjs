/**
 * Empaquette le build (dist/) en package SCORM 1.2 : npm run scorm
 *   1. génère dist/imsmanifest.xml (titre, note de réussite, liste complète des fichiers) ;
 *   2. écrit scorm/intelligentsia-scorm12.zip (imsmanifest.xml à la racine du zip) ;
 *   3. copie le zip dans public/downloads/ : le lien « Télécharger le package SCORM » du site web l'utilisera au prochain build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { MAITRISE } from '../src/js/evaluations.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'scorm');
const ZIP_NAME = 'intelligentsia-scorm12.zip';
const TITLE = "Intelligentsia : comprendre l'IA";

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html introuvable : lancez « npm run scorm » (ou « vite build » d\'abord).');
  process.exit(1);
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const rel = (f) => path.relative(DIST, f).split(path.sep).join('/');
const skip = (r) => r === 'imsmanifest.xml' || r.startsWith('downloads/') || r.endsWith('.map') || r.endsWith('.gitkeep');

const files = walk(DIST).map(rel).filter((r) => !skip(r)).sort();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  © 2026 Rodulfo DOMINGUEZ JIMENEZ, R.D FORMATION (SIREN 900 763 913), Montpellier, France.
  Licence Creative Commons Attribution 4.0 International (CC BY 4.0) : utilisation libre, en citant l'auteur.
  https://creativecommons.org/licenses/by/4.0/deed.fr
  Voir LICENCE.txt et CREDITS.txt (éléments de tiers).
-->
<manifest identifier="INTELLIGENTSIA_IA" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG1">
    <organization identifier="ORG1">
      <title>${esc(TITLE)}</title>
      <item identifier="ITEM1" identifierref="RES1" isvisible="true">
        <title>${esc(TITLE)}</title>
        <adlcp:masteryscore>${MAITRISE}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${files.map((f) => `      <file href="${esc(f)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`;

fs.writeFileSync(path.join(DIST, 'imsmanifest.xml'), manifest);

const entries = { 'imsmanifest.xml': new Uint8Array(Buffer.from(manifest, 'utf8')) };
for (const f of files) entries[f] = new Uint8Array(fs.readFileSync(path.join(DIST, f)));
const zip = zipSync(entries, { level: 6 });

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, ZIP_NAME), zip);
fs.mkdirSync(path.join(ROOT, 'public', 'downloads'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public', 'downloads', 'intelligentsia-scorm.zip'), zip);

console.log(`SCORM 1.2 : ${files.length} fichiers, ${(zip.length / 1024 / 1024).toFixed(2)} Mo`);
console.log(`→ scorm/${ZIP_NAME}  (à importer dans SCORM Cloud, Moodle, 360Learning…)`);
