import{n as e}from"./profile-C3BVnqfy.js";import{c as t,i as n,l as r,n as i,o as a,r as o,t as s}from"./notes-B_vowOOE.js";import{n as c,t as l}from"./exit-BiVslBBi.js";import"./page-header-BNAfIPCg.js";var u=e=>String(e).replace(/[&<>"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`})[e]),d=document.getElementById(`bilan-root`);function f(){let t=e();return t?[t.prenom,t.nom].filter(Boolean).join(` `):``}function p(e,t){return e?e[0]/t.questions.length*100>=70?{cls:`ok`,icon:`seal-check`,txt:`Réussie`}:{cls:`ko`,icon:`arrow-counter-clockwise`,txt:`À revoir`}:{cls:`none`,icon:`circle-dashed`,txt:`Pas encore faite`}}function m(){let e=o(),m=a(e),h=new Date().toLocaleDateString(`fr-FR`,{day:`numeric`,month:`long`,year:`numeric`});document.getElementById(`bilan-print-head`).innerHTML=`<h1>Bilan des auto-évaluations</h1><p>Intelligentsia · ${u(h)}${f()?` · ${u(f())}`:``}</p>`,d.innerHTML=`
    <h2 class="panel-title">Vos notes</h2>
    <div class="bilan-global is-${m.done===0?`none`:m.reussi?`ok`:`ko`}">
      <div class="bilan-figure"><strong>${m.pct} %</strong><span>note globale</span></div>
      <ul class="bilan-facts">
        <li><i class="ph-duotone ph-exam" aria-hidden="true"></i> ${m.done} évaluation${m.done>1?`s`:``} faite${m.done>1?`s`:``} sur ${m.total}</li>
        <li><i class="ph-duotone ph-target" aria-hidden="true"></i> ${m.got} point${m.got>1?`s`:``} sur ${m.max}</li>
        <li><i class="ph-duotone ph-${m.reussi?`seal-check`:`hourglass-medium`}" aria-hidden="true"></i> ${m.reussi?`Objectif atteint (note de réussite : 70 %)`:`Note de réussite : 70 %`}</li>
      </ul>
    </div>
    ${m.done===m.total?m.reussi?`<div class="bilan-congrats is-ok" role="status"><i class="ph-duotone ph-confetti" aria-hidden="true"></i><div><h3>Félicitations${f()?`, `+u(f()):``} !</h3><p>Vous avez terminé et <strong>réussi</strong> le parcours avec ${m.pct} %.</p></div></div>`:`<div class="bilan-congrats" role="status"><i class="ph-duotone ph-flag-checkered" aria-hidden="true"></i><div><h3>Parcours terminé</h3><p>Votre note globale est de ${m.pct} %. Il en faut 70 % pour réussir : refaites les évaluations à améliorer.</p></div></div>`:``}
    <p class="panel-text">${i()?`<strong>Mode révision :</strong> la plateforme n'enregistre plus vos résultats. Les notes affichées ici datent de vos dernières sessions et restent valables.`:s()?`Cette note globale est transmise au <strong>carnet de notes de votre plateforme</strong> à chaque évaluation. Seule votre meilleure tentative compte.`:`Vos notes sont enregistrées dans ce navigateur. Seule votre meilleure tentative compte. Pensez à imprimer ou à enregistrer ce bilan en PDF.`}</p>
    <div class="bilan-actions no-print">
      <button type="button" class="btn btn-primary" id="bilan-print"><i class="ph-duotone ph-printer" aria-hidden="true"></i> Imprimer / enregistrer en PDF</button>
      ${l()?`<button type="button" class="btn ${m.done===m.total?`btn-cta`:`btn-outline`}" id="bilan-quit"><i class="ph-duotone ph-sign-out" aria-hidden="true"></i> Terminer et quitter</button>`:``}
    </div>
    ${r.map(n=>{let r=t.filter(e=>e.module===n.id);return`<div class="bilan-table-wrap"><table class="bilan-table">
        <caption>Module ${n.id} · ${u(n.titre)}</caption>
        <thead><tr><th scope="col">Séance</th><th scope="col">Auto-évaluation</th><th scope="col">Essais</th><th scope="col">Meilleure note</th><th scope="col">Statut</th></tr></thead>
        <tbody>${r.map(t=>{let n=e[t.id],r=p(n,t);return`<tr>
            <td>${t.seance}</td>
            <th scope="row"><a href="${t.page}#quiz">${u(t.titre)}</a></th>
            <td>${n?n[2]:`—`}</td>
            <td>${n?`<strong>${n[0]} / ${t.questions.length}</strong>`:`—`}</td>
            <td><span class="badge badge--${r.cls}"><i class="ph-duotone ph-${r.icon}" aria-hidden="true"></i> ${r.txt}</span></td>
          </tr>`}).join(``)}</tbody></table></div>`}).join(``)}`;let g=document.getElementById(`bilan-attestation`);g&&(g.hidden=!(m.done===m.total&&m.reussi),g.innerHTML=g.hidden?``:`<p class="att-kicker">Attestation de réussite</p>
      <h2>${u(f()||`Apprenant·e`)}</h2>
      <p>a suivi et réussi le parcours <strong>Intelligentsia : comprendre l'IA</strong> le ${u(h)}, avec une note globale de <strong>${m.pct} %</strong>.</p>
      <ul>${r.map(t=>{let r=n(t.id,e);return`<li>Module ${t.id} · ${u(t.titre)} : ${r.pct} %</li>`}).join(``)}</ul>`),document.getElementById(`bilan-print`).addEventListener(`click`,()=>window.print());let _=document.getElementById(`bilan-quit`);_&&_.addEventListener(`click`,c)}m();