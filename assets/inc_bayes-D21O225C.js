import"./profile-C3BVnqfy.js";import"./steps-DubBdcfz.js";import"./page-header-BNAfIPCg.js";var e=document.querySelector(`[data-bayes]`);if(e){let t=1e3;e.innerHTML=`
    <div class="act-sliders">
      <label>Paiements frauduleux sur 1 000 <output data-o1></output><input type="range" min="1" max="200" step="1" value="2" data-base></label>
      <label>Le détecteur repère les fraudes (sensibilité) <output data-o2></output><input type="range" min="10" max="100" step="1" value="90" data-sens></label>
      <label>Il se trompe sur les paiements normaux (faux positifs) <output data-o3></output><input type="range" min="0" max="30" step="1" value="3" data-fp></label>
    </div>
    <div class="bayes-bar" aria-hidden="true"><span class="bayes-true" data-tbar></span><span class="bayes-false" data-fbar></span></div>
    <ul class="act-readout bayes-list" role="status" aria-live="polite" data-out></ul>`;let n=t=>e.querySelector(t),r=e=>String(Math.round(e*10)/10).replace(`.`,`,`);function i(){let e=+n(`[data-base]`).value,i=n(`[data-sens]`).value/100,a=n(`[data-fp]`).value/100;n(`[data-o1]`).textContent=e,n(`[data-o2]`).textContent=`${Math.round(i*100)} %`,n(`[data-o3]`).textContent=`${Math.round(a*100)} %`;let o=e*i,s=(t-e)*a,c=o+s,l=c>0?o/c*100:0;n(`[data-tbar]`).style.flexGrow=o,n(`[data-fbar]`).style.flexGrow=s;let u=a>0?i/a:1/0,d=a>0?e/(t-e)*u:1/0;n(`[data-out]`).innerHTML=`
      <li>Sur 1 000 paiements : <strong>${e}</strong> frauduleux, <strong>${t-e}</strong> normaux. Cote antérieure : <strong>${e}:${t-e}</strong>.</li>
      <li>Alertes attendues : <strong>${r(o)}</strong> vraies fraudes et <strong>${r(s)}</strong> fausses alertes, soit ${r(c)} au total.</li>
      <li>Rapport de vraisemblance : <strong>${a>0?r(u):`infini (aucune fausse alerte)`}</strong>${a>0?` (${Math.round(i*100)} % ÷ ${Math.round(a*100)} %)`:``}.</li>
      <li>Cote postérieure : <strong>${a>0?`${r(o)}:${r(s)}`:`aucune fausse alerte : fraude certaine`}</strong>${a>0?` (≈ ${String(Math.round(d*1e3)/1e3).replace(`.`,`,`)}), c'est-à-dire cote antérieure × rapport.`:``}</li>
      <li class="bayes-result">Après une alerte, probabilité de fraude : <strong>${r(l)} %</strong>.</li>`}e.addEventListener(`input`,i),i()}