/**
 * MEXA — l'hologramme guide du cours. Composant réutilisable.
 *
 * Dans une page :
 *   <div data-mexa data-audio="/assets/audio/jarvis.mp3"></div>
 *   <script type="module" src="/src/components/mexa/mexa.js"></script>
 *
 * Attributs data-* (tous facultatifs) :
 *   data-audio   fichier audio animé, lu UNIQUEMENT dans un LMS (Moodle, 360Learning, MOOC…)
 *   data-script  texte lu par la voix de synthèse du navigateur (démo web, ou LMS sans fichier audio)
 *   data-name    nom affiché dans l'interface (défaut : MEXA)
 *   data-height  hauteur de la scène, ex. "320px" (défaut : 480px)
 *   data-label   description pour les lecteurs d'écran
 *
 * Par script :
 *   import { mountMexa } from '/src/components/mexa/mexa.js';
 *   const mexa = mountMexa(el, { script: () => `Bonjour ${prenom}` });
 *   mexa.speak('Texte à dire'); mexa.stop(); mexa.destroy();
 *
 * Chaque instance a son propre état : on peut en afficher plusieurs, ou en créer/détruire
 * une par séance. Le rendu se met en pause quand la scène n'est pas visible.
 */
import gsap from 'gsap';

const COLORS = { p: [92, 143, 223], s: [43, 196, 184], a: [255, 107, 36], w: [255, 176, 32] }; // w = ambre
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.14v13.72L19 12 8 5.14z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>';
const TAU = Math.PI * 2;
const NB = 64;      // bandes de fréquence
const N = 230;      // points de la coque

/* ── Géométrie partagée (identique pour toutes les instances) ── */
const rnd = gsap.utils.random;
const clamp1 = gsap.utils.clamp(-1, 1);
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, a).toFixed(3)})`;

const PTS = [];
const LINKS = [];
(() => {
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    PTS.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
  }
  PTS.forEach((p, i) => {
    PTS.map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
      .filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
      .forEach((o) => {
        const k = i < o.j ? i + '-' + o.j : o.j + '-' + i;
        if (!seen.has(k)) { seen.add(k); LINKS.push([i, o.j]); }
      });
  });
})();
const RINGS = [{ r: 1.16, ax: 1.2, sp: 0.15 }, { r: 0.9, ax: 0.4, sp: -0.22 }, { r: 0.66, ax: 0.9, sp: 0.3 }];

/* ── Voix de synthèse : choix automatique de la plus naturelle, ou voix choisie par l'utilisateur ── */
// Voix par défaut : une voix d'homme française (Paul sous Windows, Henri/Rémy en ligne sur Edge, Thomas sur Mac).
// Attention : « Jasper » n'est pas une vraie voix, c'est un alias de Hortense (voix de femme) dans certains navigateurs.
const DEFAULT_VOICE = /(paul|henri|r[ée]my|antoine|claude|thomas)/i;

/** Vrai dans un LMS : l'API SCORM de la coquille est connectée. */
function inLms() {
  try {
    const api = window.SCORM_API || (window.parent && window.parent.SCORM_API);
    return !!(api && api.isConnected && api.isConnected());
  } catch (_) { return false; }
}

/** Voix françaises disponibles sur l'appareil, de la plus naturelle à la moins naturelle. */
export function listFrenchVoices() {
  if (!('speechSynthesis' in window)) return [];
  const score = (v) => (DEFAULT_VOICE.test(v.name) ? 1000 : 0)             // voix par défaut d'abord
    + (/natural|neural|online/i.test(v.name) ? 100 : 0)   // voix « naturelles » (Edge, Windows 11…)
    + (/google/i.test(v.name) ? 50 : 0)                                    // voix Google (Chrome)
    + (/fr[-_]fr/i.test(v.lang) ? 10 : 0)
    + (v.localService ? 0 : 5);
  return speechSynthesis.getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'))
    .sort((a, b) => score(b) - score(a));
}

/** La voix par défaut (homme) quand elle est installée ; sinon la voix française la plus naturelle. Aucun choix proposé. */
function preferredVoice() {
  if (!('speechSynthesis' in window)) return null;
  const all = speechSynthesis.getVoices();
  // voix par défaut d'abord, quelle que soit la langue annoncée par le navigateur
  return all.find((v) => DEFAULT_VOICE.test(v.name)) || listFrenchVoices()[0] || null;
}

/** Les voix arrivent par vagues : d'abord celles du système, puis (parfois) d'autres. On attend un court instant la voix par défaut. */
function voicesReady() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    const hasDefault = () => speechSynthesis.getVoices().some((v) => DEFAULT_VOICE.test(v.name));
    if (hasDefault()) { resolve(); return; }
    const done = () => { clearTimeout(timer); speechSynthesis.removeEventListener('voiceschanged', check); resolve(); };
    const check = () => { if (hasDefault()) done(); };
    const timer = setTimeout(done, speechSynthesis.getVoices().length ? 1500 : 3000);
    speechSynthesis.addEventListener('voiceschanged', check);
  });
}

// Échauffement : on demande les voix dès le chargement pour qu'elles soient prêtes au premier clic
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

/** Monte MEXA dans `root`. Retourne un contrôleur { play, speak, stop, toggle, isSpeaking, destroy }. */
export function mountMexa(root, opts = {}) {
  const name = opts.name || root.dataset.name || 'MEXA';
  const audioSrc = opts.audio ?? root.dataset.audio ?? '';
  const script = opts.script ?? root.dataset.script ?? '';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;

  /* ── DOM ── */
  root.classList.add('mexa');
  if (opts.height || root.dataset.height) root.style.setProperty('--mexa-height', opts.height || root.dataset.height);
  root.innerHTML = `
    <canvas class="mexa-canvas" role="img"
      aria-label="${opts.label || root.dataset.label || `${name} : hologramme interactif, assistant virtuel animé et piloté par la voix`}"></canvas>
    <div class="mexa-data mexa-data--tl" aria-hidden="true">
      <div>&gt; UNIT: ${name}</div>
      <div>&gt; CORE ENERGY: <span data-energy>0%</span></div>
      <div class="dim">&gt; STATE: <span data-state>VEILLE</span></div>
    </div>
    <div class="mexa-data mexa-data--br" aria-hidden="true">
      <div>&gt; NEURAL LINK: ONLINE</div>
      <div class="dim">&gt; INTERACT: HOVER / DRAG</div>
      <div class="dim">&gt; VOICE: <span data-voice>AURA SYNC</span></div>
    </div>
    <div class="mexa-btn-wrapper">
      <button type="button" class="mexa-btn" aria-label="Écouter ${name}">${ICON_PLAY}</button>
    </div>`;
  const canvas = root.querySelector('.mexa-canvas');
  const g = canvas.getContext('2d');
  const btn = root.querySelector('.mexa-btn');
  const energyEl = root.querySelector('[data-energy]');
  const stateEl = root.querySelector('[data-state]');
  const voiceEl = root.querySelector('[data-voice]');
  // Les fichiers audio animés ne servent que dans un LMS ; ailleurs, c'est la voix de synthèse
  const audioEl = audioSrc && inLms() ? Object.assign(new Audio(), { src: audioSrc, preload: 'metadata' }) : null;

  /* ── État (animé par GSAP) ── */
  const S = { awake: 0, fast: 0, breath: 0, punch: 0, voice: 0, aura: 0, heat: 0, spin: 0.16, ry: 0.6, rx0: 0.32,
              think: 0, curious: 0, blink: 0, glitch: 0, follow: 0 };
  const A = { x: 0, y: 0 };   // regard autonome
  const D = { x: 0, y: 0 };   // dérive dans la scène
  const G = { x: 0, y: 0 };   // regard vers le pointeur
  let W = 0, H = 0, CX = 0, CY = 0, BX = 0, BY = 0, R = 1, coreR = 20, sc = 1;
  let alive = true, visible = true, speaking = false, fake = false, dragging = false, wandering = false;
  let lastMX = 0, lastMY = 0, bassV = 0, midV = 0, hiV = 0, lastBeat = 0, fluxAvg = 0, hi = 0, lastPct = -1;
  let utterance = null, fakeTimer = null;
  const timers = new Set();
  const later = (delay, fn) => {
    const c = gsap.delayedCall(delay, () => { timers.delete(c); if (alive) fn(); });
    timers.add(c);
    return c;
  };

  /* Particules propres à l'instance */
  const motes = Array.from({ length: 40 }, () => ({
    a: rnd(0, TAU), inc: rnd(0.2, 1.4), tilt: rnd(0, TAU), r0: rnd(0.35, 1.25),
    sp: rnd(0.15, 0.6) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, TAU), warm: Math.random() < 0.4 }));
  const sparks = [];
  const halo = Array.from({ length: 110 }, (_, i) => {
    const th = (i / 110) * TAU + rnd(-0.03, 0.03), m = th < Math.PI ? th : TAU - th;
    return { th, r0: Math.random(), sz: rnd(0.8, 1.9), sp: rnd(0.04, 0.16) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, TAU),
             bin: Math.min(63, Math.floor(m / Math.PI * 40)), c: i % 5 === 0 ? COLORS.w : i % 2 ? COLORS.a : COLORS.s };
  });

  function proj(x, y, z, ry, rx) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const X = x * cy + z * sy, Z0 = -x * sy + z * cy, Y = y * cx - Z0 * sx, Z = y * sx + Z0 * cx;
    const k = 1 / (1 - Z * 0.12) * sc;
    return { x: CX + X * R * k, y: CY + Y * R * k, z: Z };
  }

  /* ── Audio ── */
  let actx = null, an = null, bytes = null;
  const raw = new Float32Array(NB), prev = new Float32Array(NB), sp = new Float32Array(NB);

  function initAudio() {
    if (actx || !audioEl) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    an = actx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.6;
    const src = actx.createMediaElementSource(audioEl);
    src.connect(an); an.connect(actx.destination);
    bytes = new Uint8Array(an.frequencyBinCount);
  }

  function readAudio(dt, t) {
    if (speaking && !fake && an) {
      an.getByteFrequencyData(bytes);
      for (let i = 0; i < NB; i++) raw[i] = Math.min(1, Math.pow(bytes[i + 1] / 255, 1.4) * 1.5);
    } else if (speaking) {            // voix simulée (syllabes)
      const e = Math.pow(Math.max(0, Math.sin(t * 6.3) * Math.sin(t * 1.9 + 1)), 0.7);
      for (let i = 0; i < NB; i++) raw[i] = e * Math.max(0, 1 - i / NB) * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 9));
    } else raw.fill(0);

    let flux = 0, vs = 0, rs = 0, h = 0, bs = 0, ms = 0, hs = 0;
    const up = 1 - Math.exp(-dt * 45), dn = 1 - Math.exp(-dt * 8);
    for (let i = 0; i < NB; i++) {
      flux += Math.max(0, raw[i] - prev[i]); prev[i] = raw[i];
      sp[i] += (raw[i] - sp[i]) * (raw[i] > sp[i] ? up : dn);
      if (i < 40) { vs += sp[i]; rs += raw[i]; }
      if (i < 6) bs += sp[i]; else if (i < 24) ms += sp[i]; else if (i < 52) hs += sp[i];
      if (i >= 24) h += sp[i];
    }
    S.voice += (Math.min(1, vs / 40 * 1.8) - S.voice) * (1 - Math.exp(-dt * 14));
    hi = h / 40;
    bassV = Math.min(1, bs / 6 * 1.6); midV = Math.min(1, ms / 18 * 1.8); hiV = Math.min(1, hs / 28 * 2.2);
    const inst = Math.min(1, rs / 40 * 1.8);
    S.fast += (inst - S.fast) * (1 - Math.exp(-dt * (inst > S.fast ? 70 : 12)));
    fluxAvg += (flux - fluxAvg) * Math.min(1, dt * 4);
    if (speaking && flux > fluxAvg * 1.7 + 0.35 && t - lastBeat > 0.13) {   // attaque de syllabe
      lastBeat = t; beat(Math.min(1, Math.max(0.3, (flux - fluxAvg) / 3)));
    }
  }

  function beat(k) {
    gsap.fromTo(S, { punch: k * 0.5 }, { punch: 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
  }

  /* ── Rendu ── */
  function frame(t, dtms) {
    if (!alive || !visible || !W) return;
    const dt = Math.min(dtms / 1000, 0.05);
    readAudio(dt, t);
    const aw = S.awake, v = S.voice, au = S.aura;
    if (!dragging) S.ry += S.spin * calm * dt * (1 + v * 0.8);
    const gx = A.x + (G.x - A.x) * S.follow, gy = A.y + (G.y - A.y) * S.follow;
    const ry = S.ry + gx * 0.35, rx = S.rx0 + gy * 0.25 + Math.sin(t * 0.4) * 0.04;
    const rxm = Math.max(0, W / 2 - R * 1.3 - 16), rym = Math.max(0, H / 2 - R * 1.3 - 6);
    D.x = Math.max(-rxm, Math.min(rxm, D.x)); D.y = Math.max(-rym, Math.min(rym, D.y));
    CX = BX + D.x + Math.sin(t * 0.33) * R * 0.025; CY = BY + D.y + Math.cos(t * 0.27) * R * 0.025;
    sc = 0.55 + 0.45 * aw;
    coreR = R * 0.12 * (1 + S.breath * 0.07 + S.punch * 0.2 + v * 0.1) * (0.3 + 0.7 * aw);
    const cx = CX + gx * R * 0.09, cy = CY + gy * R * 0.09 + (S.breath - 0.5) * R * 0.02;
    const shellCol = mix(COLORS.p, COLORS.s, 0.25 + 0.5 * S.heat);
    const C = COLORS;

    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';

    // brume ambiante
    const hz = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    hz.addColorStop(0, rgba(C.a, (0.10 + 0.22 * au + 0.1 * S.punch) * aw));
    hz.addColorStop(0.4, rgba(C.s, (0.04 + 0.08 * au) * aw));
    hz.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hz; g.fillRect(0, 0, W, H);

    // coque : la surface vibre selon le spectre
    const P = PTS.map((p, i) => {
      const b = sp[Math.min(NB - 1, Math.floor((p.y + 1) / 2 * 40))];
      const k = 1 + b * au * 0.16 + Math.sin(t * 1.3 + i) * 0.004 + S.glitch * Math.sin(i * 7 + t * 50) * 0.03;
      return proj(p.x * k, p.y * k, p.z * k, ry, rx);
    });
    const bk = [[], [], []];
    LINKS.forEach(([i, j]) => { const z = (P[i].z + P[j].z) / 2; bk[z > 0.33 ? 2 : z > -0.33 ? 1 : 0].push(i, j); });
    bk.forEach((arr, b) => {
      g.beginPath();
      for (let q = 0; q < arr.length; q += 2) { g.moveTo(P[arr[q]].x, P[arr[q]].y); g.lineTo(P[arr[q + 1]].x, P[arr[q + 1]].y); }
      g.strokeStyle = rgba(shellCol, [0.12, 0.25, 0.45][b] * aw * (1 + au * 0.6)); g.lineWidth = 0.7 + b * 0.25; g.stroke();
    });
    P.forEach((p) => {
      const d = (p.z + 1) / 2, s = 0.8 + d * 1.6;
      g.fillStyle = rgba(p.z > 0 ? C.a : shellCol, (0.2 + 0.7 * d * d) * aw);
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });

    // anneaux gyroscopiques
    RINGS.forEach((rg, k) => {
      const ax = rg.ax + Math.sin(t * 0.3 + k) * 0.25 + S.think * 0.5, w = t * rg.sp * (1 + S.think * 2), arr = [];
      for (let u = 0; u <= 56; u++) {
        const a = u / 56 * TAU, x = Math.cos(a) * rg.r, y = Math.sin(a) * rg.r;
        const y1 = y * Math.cos(ax), z1 = y * Math.sin(ax);
        arr.push(proj(x * Math.cos(w) - y1 * Math.sin(w), x * Math.sin(w) + y1 * Math.cos(w), z1, ry, rx));
      }
      [0, 1].forEach((front) => {
        g.beginPath(); let pen = false;
        arr.forEach((p) => { if ((p.z >= 0) === !!front) { pen ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); pen = true; } else pen = false; });
        g.strokeStyle = rgba(k === 1 ? C.a : C.s, (front ? 0.8 : 0.25) * aw); g.lineWidth = front ? 1.2 : 0.8; g.stroke();
      });
    });

    // pensées : lucioles qui convergent vers le noyau
    motes.forEach((m) => {
      const ang = m.a + t * m.sp * (1 + S.think * 3), r = m.r0 * (1 - S.think * 0.8);
      const x = r * Math.cos(ang), y0 = r * Math.sin(ang) * Math.sin(m.inc), z0 = r * Math.sin(ang) * Math.cos(m.inc);
      const p = proj(x * Math.cos(m.tilt) + z0 * Math.sin(m.tilt), y0, -x * Math.sin(m.tilt) + z0 * Math.cos(m.tilt), ry, rx);
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + m.ph);
      g.fillStyle = rgba(m.warm ? C.a : C.w, (0.3 + 0.6 * tw) * aw * (0.5 + (p.z + 1) / 4));
      g.beginPath(); g.arc(p.x, p.y, 1 + tw * 1.2 + S.think, 0, TAU); g.fill();
    });

    // aura : halo de particules
    if (au > 0.01) {
      halo.forEach((p) => {
        const e = sp[p.bin], th = p.th + t * p.sp;
        const r = coreR * (1.9 + p.r0 * 1.3) * (1 + S.punch * 0.12)
                + (e * 0.75 + S.fast * 0.25) * au * R * 0.12 * (0.4 + p.r0) + Math.sin(t * 1.3 + p.ph) * coreR * 0.08;
        const a = (0.2 + 0.55 * e + 0.2 * S.fast) * au * (0.55 + 0.45 * Math.sin(t * 1.7 + p.ph));
        g.fillStyle = rgba(p.c, Math.min(0.85, a));
        g.beginPath(); g.arc(cx + Math.cos(th) * r, cy + Math.sin(th) * r, p.sz * (1 + e * 0.9), 0, TAU); g.fill();
      });
    }

    // étincelles
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vx *= 1 - dt * 1.6; s.vy *= 1 - dt * 1.6; s.x += s.vx * dt; s.y += s.vy * dt;
      const k = s.life / s.max;
      g.strokeStyle = rgba(s.c, k * 0.5); g.lineWidth = 0.9 * k + 0.3;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 0.05, s.y - s.vy * 0.05); g.stroke();
    }

    // noyau : orbe d'énergie
    const cr = coreR * (1 - S.blink * 0.25) * (1 + S.curious * 0.08);
    const gz = g.createRadialGradient(cx, cy, 0, cx, cy, cr * 4);
    gz.addColorStop(0, rgba(C.w, 0.9 * aw)); gz.addColorStop(0.18, rgba(C.a, 0.35 * aw));
    gz.addColorStop(0.5, rgba(C.s, 0.08 * aw)); gz.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gz; g.beginPath(); g.arc(cx, cy, cr * 4, 0, TAU); g.fill();

    [0.6, 0.9, 1.25].forEach((f, k) => {
      g.strokeStyle = rgba(k === 1 ? C.s : C.a, (0.55 - k * 0.1) * aw * (1 + v * 0.5)); g.lineWidth = 1.4;
      g.beginPath(); g.arc(cx, cy, cr * f * (1 + Math.sin(t * 2 + k) * 0.05 + S.punch * 0.1), 0, TAU); g.stroke();
    });
    g.lineWidth = 2; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a0 = t * (k % 2 ? -1 : 1) * (1 + v * 2) * (0.8 + k * 0.4) + k * 2;
      g.shadowColor = rgba(k % 2 ? C.s : C.a, 0.8 * aw); g.shadowBlur = 8;
      g.strokeStyle = rgba(k % 2 ? C.s : C.a, 0.75 * aw);
      g.beginPath(); g.arc(cx, cy, cr * (1.55 + k * 0.35), a0, a0 + 1.2); g.stroke();
    }
    g.shadowBlur = 0;
    const hc = g.createRadialGradient(cx, cy, 0, cx, cy, cr);
    hc.addColorStop(0, rgba(C.w, aw)); hc.addColorStop(0.5, rgba(C.a, 0.55 * aw)); hc.addColorStop(1, rgba(C.a, 0));
    g.fillStyle = hc; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();

    if (S.glitch > 0.05) [[C.a, 3], [C.s, -3]].forEach(([c, o]) => {
      g.strokeStyle = rgba(c, 0.5 * S.glitch); g.lineWidth = 2;
      g.beginPath(); g.arc(cx + o * S.glitch, cy, coreR * 1.15, 0, TAU); g.stroke();
    });

    const pct = Math.round(62 + S.breath * 6 + v * 32);
    if (pct !== lastPct) { lastPct = pct; energyEl.textContent = pct + '%'; }
  }

  function resize() {
    const r = root.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    if (!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    BX = W / 2; BY = H / 2; CX = BX; CY = BY; R = Math.min(W, H) * 0.34;
  }

  /* ── Vie autonome (GSAP) ── */
  const say = (txt) => { stateEl.textContent = txt; };
  const acts = {
    glance() {
      if (S.follow > 0.5) return;
      gsap.to(A, { x: rnd(-1, 1), y: rnd(-0.6, 0.6), duration: rnd(0.25, 0.5), ease: 'expo.out' });
    },
    think() {
      if (speaking) return;
      say('RÉFLEXION');
      gsap.timeline({ onComplete: () => { if (!speaking) say('VEILLE'); } })
        .to(S, { think: 1, duration: 1.2, ease: 'power2.inOut' })
        .to(S, { think: 0, duration: 1.4, ease: 'expo.out' }, '+=.6');
    },
    curious() {
      gsap.timeline().to(S, { curious: 1, duration: 0.4, ease: 'back.out(2)' }).to(S, { curious: 0, duration: 1.2, ease: 'power2.inOut' }, '+=.6');
    },
    glitch() {
      gsap.fromTo(S, { glitch: 1 }, { glitch: 0, duration: 0.35, ease: 'steps(6)' });
      gsap.fromTo(canvas, { x: 3, skewX: 2 }, { x: 0, skewX: 0, duration: 0.3, ease: 'steps(5)' });
    },
    pulse() { gsap.fromTo(S, { punch: 0.3 }, { punch: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' }); },
  };
  (function live() {
    later(rnd(1.4, 3.6), () => {
      const pool = speaking ? ['glance', 'pulse'] : ['glance', 'glance', 'think', 'curious', 'glitch', 'pulse'];
      acts[gsap.utils.random(pool)]();
      live();
    });
  })();
  (function blinkLoop() {
    later(rnd(2.2, 5.5), () => {
      const tl = gsap.timeline().to(S, { blink: 1, duration: 0.07, ease: 'power2.in' }).to(S, { blink: 0, duration: 0.18, ease: 'power2.out' });
      if (Math.random() < 0.3) tl.to(S, { blink: 1, duration: 0.06 }, '+=.08').to(S, { blink: 0, duration: 0.16 });
      blinkLoop();
    });
  })();
  gsap.to(S, { breath: 1, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  function wander() {
    const rxm = Math.max(0, W / 2 - R * 1.3 - 16), rym = Math.max(0, H / 2 - R * 1.3 - 6);
    gsap.to(D, { x: rnd(-rxm, rxm), y: rnd(-rym, rym), duration: rnd(6, 10), ease: 'sine.inOut',
      onComplete: () => later(rnd(0.5, 2.5), wander) });
  }

  /* ── Voix ── */
  const listeners = { start: [], end: [] };
  const emit = (type) => listeners[type].forEach((fn) => fn());

  function speakOn() {
    if (!wandering) { wandering = true; later(2.5, wander); }
    speaking = true; say('PAROLE');
    btn.innerHTML = ICON_PAUSE; btn.setAttribute('aria-label', `Mettre ${name} en pause`);
    root.classList.add('is-ready');
    gsap.to(S, { awake: 1, duration: 2.2, ease: 'power3.out', overwrite: 'auto' });
    gsap.fromTo(S, { punch: 0.8 }, { punch: 0, duration: 1, ease: 'power3.out', delay: 1.2, overwrite: 'auto' });
    gsap.to(S, { aura: 1, heat: 1, spin: 0.5, duration: 1.4, delay: 0.6, ease: 'power3.out' });
    emit('start');
  }
  function speakOff() {
    const was = speaking;
    speaking = false; fake = false; say('VEILLE');
    btn.innerHTML = ICON_PLAY; btn.setAttribute('aria-label', `Écouter ${name}`);
    gsap.to(S, { aura: 0, heat: 0, spin: 0.16, duration: 1.2, ease: 'power2.inOut' });
    if (was) emit('end');
  }
  function cancelVoices() {
    speakSeq++;
    if (audioEl) audioEl.pause();
    if (utterance && 'speechSynthesis' in window) { utterance.onend = utterance.onerror = null; speechSynthesis.cancel(); }
    utterance = null;
    clearTimeout(fakeTimer);
  }

  /** Lit un texte avec la voix de synthèse du navigateur (voix simulée si indisponible). */
  let speakSeq = 0;
  function speak(text) {
    cancelVoices();
    fake = true;
    speakOn();
    const token = ++speakSeq;
    const words = String(text).split(/\s+/).filter(Boolean).length || 1;
    if ('speechSynthesis' in window && text) {
      voicesReady().then(() => {
        if (token !== speakSeq || !speaking || !alive) return;      // arrêté entre-temps
        const voice = preferredVoice();
        utterance = new SpeechSynthesisUtterance(String(text));
        if (voice) { utterance.voice = voice; utterance.lang = voice.lang; } else utterance.lang = 'fr-FR';
        utterance.rate = 0.96;
        utterance.onend = utterance.onerror = () => { if (speaking) speakOff(); };
        voiceEl.textContent = voice ? voice.name.replace(/^Microsoft\s+/i, '').replace(/\s+-\s+.*$/, '').toUpperCase() : 'PAR DÉFAUT';
        speechSynthesis.speak(utterance);
      });
    } else {
      fakeTimer = setTimeout(() => { if (speaking) speakOff(); }, Math.max(2000, words * 400));
    }
  }

  function playAudio() {
    cancelVoices();
    try { initAudio(); actx.resume(); } catch (_) { fake = true; }
    audioEl.play().then(speakOn).catch(() => { fake = true; speakOn(); setTimeout(() => speaking && speakOff(), 4000); });
  }

  /** Lance MEXA : fichier audio s'il y en a un, sinon lecture du script. */
  function play() {
    if (speaking) return;
    const text = typeof script === 'function' ? script() : script;
    if (audioEl) playAudio();
    else speak(text);
  }
  function stop() { cancelVoices(); if (speaking) speakOff(); }
  function toggle() { speaking ? stop() : play(); }

  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  if (audioEl) audioEl.addEventListener('ended', () => { if (speaking) speakOff(); });

  /* ── Interactions ── */
  root.addEventListener('pointerenter', () => gsap.to(S, { follow: 1, curious: 1, duration: 0.6, ease: 'power2.out' }));
  root.addEventListener('pointerleave', () => { dragging = false; gsap.to(S, { follow: 0, curious: 0, duration: 1.2, ease: 'power2.inOut' }); });
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    G.x = clamp1((e.clientX - r.left - CX) / (W * 0.35)); G.y = clamp1((e.clientY - r.top - CY) / (H * 0.35));
  });
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; canvas.setPointerCapture(e.pointerId); gsap.killTweensOf(S, 'rx0'); });
  canvas.addEventListener('pointerup', () => { dragging = false; gsap.to(S, { rx0: 0.32, duration: 2, ease: 'elastic.out(1,.6)' }); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    S.ry += (e.clientX - lastMX) * 0.006; S.rx0 = Math.max(-0.9, Math.min(1.2, S.rx0 + (e.clientY - lastMY) * 0.004));
    lastMX = e.clientX; lastMY = e.clientY;
  });

  /* ── Démarrage ── */
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; });
  io.observe(root);
  resize();
  gsap.ticker.add(frame);

  function destroy() {
    alive = false;
    cancelVoices();
    gsap.ticker.remove(frame);
    gsap.killTweensOf([S, A, D, canvas]);
    timers.forEach((c) => c.kill());
    timers.clear();
    ro.disconnect(); io.disconnect();
    if (actx) actx.close().catch(() => {});
    root.innerHTML = '';
    root.classList.remove('mexa', 'is-ready');
  }

  if (import.meta.hot) import.meta.hot.dispose(destroy);

  return {
    root, play, speak, stop, toggle, destroy,
    isSpeaking: () => speaking,
    /** Voix françaises disponibles (la première est la plus naturelle). */
    voices: listFrenchVoices,
    currentVoice: () => (preferredVoice() || {}).name || '',
    /** Abonnement : mexa.on('start' | 'end', fn) */
    on(type, fn) { if (listeners[type]) listeners[type].push(fn); return this; },
  };
}

/** Monte toutes les balises [data-mexa] de la page. */
export function mountAllMexa(scope = document) {
  return [...scope.querySelectorAll('[data-mexa]:not(.mexa)')].map((el) => mountMexa(el));
}

// Montage automatique quand on charge le fichier depuis une page
if (typeof document !== 'undefined') {
  const mount = () => { window.MEXA = mountAllMexa(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}
