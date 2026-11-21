/** Bilan des auto-évaluations : tableau des notes, note globale, impression / PDF. */
import { EVALS, MODULES, MAITRISE } from './evaluations.js';
import { loadNotes, summary, inLms, lmsReadOnly, moduleSummary } from './notes.js';
import { getProfile } from './profile.js';
import { requestQuit, canQuit } from './exit.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const root = document.getElementById('bilan-root');

function nom() {
  const p = getProfile();
  return p ? [p.prenom, p.nom].filter(Boolean).join(' ') : '';
}

function statut(n, e) {
  if (!n) return { cls: 'none', icon: 'circle-dashed', txt: 'Pas encore faite' };
  return n[0] / e.questions.length * 100 >= MAITRISE
    ? { cls: 'ok', icon: 'seal-check', txt: 'Réussie' }
    : { cls: 'ko', icon: 'arrow-counter-clockwise', txt: 'À revoir' };
}

function draw() {
  const notes = loadNotes();
  const s = summary(notes);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  document.getElementById('bilan-print-head').innerHTML = `<h1>Bilan des auto-évaluations</h1><p>Intelligentsia · ${esc(date)}${nom() ? ` · ${esc(nom())}` : ''}</p>`;

  const globalCls = s.done === 0 ? 'none' : s.reussi ? 'ok' : 'ko';
  root.innerHTML = `
    <h2 class="panel-title">Vos notes</h2>
    <div class="bilan-global is-${globalCls}">
      <div class="bilan-figure"><strong>${s.pct} %</strong><span>note globale</span></div>
      <ul class="bilan-facts">
        <li><i class="ph-duotone ph-exam" aria-hidden="true"></i> ${s.done} évaluation${s.done > 1 ? 's' : ''} faite${s.done > 1 ? 's' : ''} sur ${s.total}</li>
        <li><i class="ph-duotone ph-target" aria-hidden="true"></i> ${s.got} point${s.got > 1 ? 's' : ''} sur ${s.max}</li>
        <li><i class="ph-duotone ph-${s.reussi ? 'seal-check' : 'hourglass-medium'}" aria-hidden="true"></i> ${s.reussi ? `Objectif atteint (note de réussite : ${MAITRISE} %)` : `Note de réussite : ${MAITRISE} %`}</li>
      </ul>
    </div>
    ${s.done === s.total ? (s.reussi
      ? `<div class="bilan-congrats is-ok" role="status"><i class="ph-duotone ph-confetti" aria-hidden="true"></i><div><h3>Félicitations${nom() ? ', ' + esc(nom()) : ''} !</h3><p>Vous avez terminé et <strong>réussi</strong> le parcours avec ${s.pct} %.</p></div></div>`
      : `<div class="bilan-congrats" role="status"><i class="ph-duotone ph-flag-checkered" aria-hidden="true"></i><div><h3>Parcours terminé</h3><p>Votre note globale est de ${s.pct} %. Il en faut ${MAITRISE} % pour réussir : refaites les évaluations à améliorer.</p></div></div>`) : ''}
    <p class="panel-text">${lmsReadOnly()
      ? '<strong>Mode révision :</strong> la plateforme n\'enregistre plus vos résultats. Les notes affichées ici datent de vos dernières sessions et restent valables.'
      : inLms()
      ? 'Cette note globale est transmise au <strong>carnet de notes de votre plateforme</strong> à chaque évaluation. Seule votre meilleure tentative compte.'
      : 'Vos notes sont enregistrées dans ce navigateur. Seule votre meilleure tentative compte. Pensez à imprimer ou à enregistrer ce bilan en PDF.'}</p>
    <div class="bilan-actions no-print">
      <button type="button" class="btn btn-primary" id="bilan-print"><i class="ph-duotone ph-printer" aria-hidden="true"></i> Imprimer / enregistrer en PDF</button>
      ${canQuit() ? `<button type="button" class="btn ${s.done === s.total ? 'btn-cta' : 'btn-outline'}" id="bilan-quit"><i class="ph-duotone ph-sign-out" aria-hidden="true"></i> Terminer et quitter</button>` : ''}
    </div>
    ${MODULES.map((m) => {
      const evs = EVALS.filter((e) => e.module === m.id);
      return `<div class="bilan-table-wrap"><table class="bilan-table">
        <caption>Module ${m.id} · ${esc(m.titre)}</caption>
        <thead><tr><th scope="col">Séance</th><th scope="col">Auto-évaluation</th><th scope="col">Essais</th><th scope="col">Meilleure note</th><th scope="col">Statut</th></tr></thead>
        <tbody>${evs.map((e) => {
          const n = notes[e.id], st = statut(n, e);
          return `<tr>
            <td>${e.seance}</td>
            <th scope="row"><a href="${e.page}#quiz">${esc(e.titre)}</a></th>
            <td>${n ? n[2] : '—'}</td>
            <td>${n ? `<strong>${n[0]} / ${e.questions.length}</strong>` : '—'}</td>
            <td><span class="badge badge--${st.cls}"><i class="ph-duotone ph-${st.icon}" aria-hidden="true"></i> ${st.txt}</span></td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
    }).join('')}`;
  const att = document.getElementById('bilan-attestation');
  if (att) {
    att.hidden = !(s.done === s.total && s.reussi);
    att.innerHTML = att.hidden ? '' : `<p class="att-kicker">Attestation de réussite</p>
      <h2>${esc(nom() || 'Apprenant·e')}</h2>
      <p>a suivi et réussi le parcours <strong>Intelligentsia : comprendre l'IA</strong> le ${esc(date)}, avec une note globale de <strong>${s.pct} %</strong>.</p>
      <ul>${MODULES.map((m) => { const r = moduleSummary(m.id, notes); return `<li>Module ${m.id} · ${esc(m.titre)} : ${r.pct} %</li>`; }).join('')}</ul>`;
  }
  document.getElementById('bilan-print').addEventListener('click', () => window.print());
  const quit = document.getElementById('bilan-quit');
  if (quit) quit.addEventListener('click', requestQuit);
}

draw();
