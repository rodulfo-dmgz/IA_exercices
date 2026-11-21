import"./profile-C3BVnqfy.js";import"./steps-DubBdcfz.js";import"./page-header-BNAfIPCg.js";var e=document.querySelector(`[data-cotes]`);if(e){e.innerHTML=`
    <div class="act-two">
      <fieldset class="act-card"><legend>De la cote à la probabilité</legend>
        <div class="act-inline"><label>Pour <input type="number" min="0" step="1" value="3" data-x inputmode="numeric"></label>
          <span aria-hidden="true">contre</span><label>contre <input type="number" min="0" step="1" value="1" data-y inputmode="numeric"></label></div>
        <p class="act-readout" role="status" aria-live="polite" data-r1></p>
        <div class="prob-bar" aria-hidden="true"><span data-bar1></span></div>
      </fieldset>
      <fieldset class="act-card"><legend>De la probabilité à la cote</legend>
        <div class="act-inline"><label>Probabilité (%) <input type="number" min="0" max="100" step="any" value="20" data-p inputmode="decimal"></label></div>
        <p class="act-readout" role="status" aria-live="polite" data-r2></p>
        <div class="prob-bar" aria-hidden="true"><span data-bar2></span></div>
      </fieldset>
    </div>
    <details class="act-details"><summary>Voir les formules et des exemples résolus</summary>
      <ul class="act-values">
        <li><strong>Cote → probabilité :</strong> x:y donne x / (x + y). Exemple : 4:1 → 4 / 5 = 0,8 = 80 %.</li>
        <li><strong>Probabilité → cote :</strong> p donne p : (1 − p). Exemple : 25 % → 0,25 : 0,75 = 1:3.</li>
        <li><strong>Piège :</strong> 1:4 n'est pas 25 % : c'est 1 / (1 + 4) = 20 %.</li>
      </ul>
    </details>`;let t=t=>e.querySelector(t),n=e=>String(Math.round(e*100)/100).replace(`.`,`,`);function r(){let e=Number(t(`[data-x]`).value),r=Number(t(`[data-y]`).value);if(!(e>=0&&r>=0)||e+r===0){t(`[data-r1]`).textContent=`Saisissez deux nombres positifs.`,t(`[data-bar1]`).style.width=`0`;return}let i=e/(e+r)*100;t(`[data-r1]`).innerHTML=`Cote <strong>${e}:${r}</strong> : ${e} cas favorable${e>1?`s`:``} pour ${r} défavorable${r>1?`s`:``}, donc <strong>${e} chance${e>1?`s`:``} sur ${e+r}</strong>, soit <strong>${n(i)} %</strong>.`,t(`[data-bar1]`).style.width=`${i}%`}function i(){let e=Number(t(`[data-p]`).value);if(!(e>=0&&e<=100)){t(`[data-r2]`).textContent=`Saisissez un pourcentage entre 0 et 100.`,t(`[data-bar2]`).style.width=`0`;return}if(t(`[data-bar2]`).style.width=`${e}%`,e===100){t(`[data-r2]`).textContent=`Certain : aucun cas défavorable, la cote est infinie.`;return}if(e===0){t(`[data-r2]`).textContent=`Impossible : aucun cas favorable.`;return}let r=e/(100-e);t(`[data-r2]`).innerHTML=`<strong>${n(e)} %</strong> : ${n(e)} cas favorables pour ${n(100-e)} défavorables, soit une cote de <strong>${n(r)}:1</strong>${r<1?` (ou <strong>1:${n(1/r)}</strong>)`:``}.`}e.addEventListener(`input`,e=>{e.target.matches(`[data-x], [data-y]`)?r():i()}),r(),i()}