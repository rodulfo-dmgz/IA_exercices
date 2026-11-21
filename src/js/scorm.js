/**
 * SCORM 1.2 API Wrapper — RD Formation
 * Localise automatiquement l'API dans la hiérarchie des fenêtres Moodle.
 *
 * suspend_data est partagé par "sections" (getSection / setSection / flush) :
 * le tableur y range son classeur ('wb'), le moteur d'exercices sa progression ('ex').
 * Un ancien suspend_data qui contient directement un classeur (sans sections)
 * est relu comme la section 'wb'.
 */
var SCORM_API = (function () {
  'use strict';

  var api = null;
  var initialized = false;
  var offline = false;
  var debug = false;   // passer à true pour tracer les appels SCORM dans la console
  var sections = null;
  var sessionStart = Date.now();
  var sessionTimeSet = false;

  function log() {
    if (debug && window.console) {
      console.log.apply(console, ['[SCORM]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function findAPI(win) {
    var attempts = 0;
    var limit = 500;
    while (win && !win.API && win.parent && win.parent !== win && attempts < limit) {
      attempts++;
      win = win.parent;
    }
    return win ? win.API : null;
  }

  function locateAPI() {
    var found = findAPI(window);
    if (!found && window.opener && !window.opener.closed) {
      try { found = findAPI(window.opener); } catch (e) { /* cross-origin */ }
    }
    if (!found && window.frames && window.frames.length > 0) {
      for (var i = 0; i < window.frames.length; i++) {
        try {
          if (window.frames[i].API) { found = window.frames[i].API; break; }
        } catch (e) { /* ignore */ }
      }
    }
    return found;
  }

  var LIMIT = 3900;   // marge sous les 4096 caractères de suspend_data
  var errors = [];
  function noteError(key, value) {
    var code = '', message = '', detail = '';
    try {
      code = api.LMSGetLastError();
      message = api.LMSGetErrorString(code);
      detail = api.LMSGetDiagnostic(code);
    } catch (e) { /* LMS sans diagnostic */ }
    errors.push({ key: key, code: String(code), message: String(message), detail: String(detail) });
    if (errors.length > 10) errors.shift();
    log('Refusé par le LMS :', key, '=', String(value).substring(0, 60), '→ erreur', code, message, detail);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function timespan(ms) {   // HH:MM:SS (format SCORM 1.2)
    var s = Math.round(ms / 1000);
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }

  var self = {
    init: function () {
      if (initialized) return true;
      api = locateAPI();
      if (!api) {
        offline = true;
        log('API SCORM introuvable — mode hors ligne');
        return false;
      }
      try {
        var result = api.LMSInitialize('');
        initialized = (result === true || result === 'true');
        if (initialized) {
          log('Session SCORM initialisée');
          log('Étudiant :', api.LMSGetValue('cmi.core.student_name'));
        }
      } catch (e) {
        log('Erreur init:', e);
        offline = true;
      }
      return initialized;
    },

    get: function (key) {
      if (!initialized || !api) return '';
      try {
        var v = api.LMSGetValue(key);
        return (v === null || v === undefined) ? '' : String(v);
      } catch (e) { log('Erreur get:', key, e); return ''; }
    },

    set: function (key, value) {
      if (!initialized || !api) return false;
      if (key === 'cmi.core.session_time') sessionTimeSet = true;
      try {
        var v = api.LMSSetValue(key, String(value));
        var ok = (v === true || v === 'true');
        if (!ok) noteError(key, value);
        return ok;
      } catch (e) { log('Erreur set:', key, e); return false; }
    },

    /* Dernières erreurs refusées par le LMS : [{key, code, message, detail}] (10 maximum) */
    errors: function () { return errors.slice(); },

    /* Mode d'ouverture : « browse » / « review » ou « no-credit » → aucune note ni statut ne doit être enregistré. */
    canRecord: function () {
      if (!initialized) return false;
      var mode = self.get('cmi.core.lesson_mode'), credit = self.get('cmi.core.credit');
      return mode !== 'browse' && mode !== 'review' && credit !== 'no-credit';
    },

    /* Note de réussite imposée par le LMS (cmi.student_data.mastery_score) ; null si absente. */
    masteryScore: function () {
      var n = parseFloat(self.get('cmi.student_data.mastery_score'));
      return (isNaN(n) || n <= 0 || n > 100) ? null : n;
    },

    /* Objectif (cmi.objectives) : créé au premier appel, mis à jour ensuite. o = { id, raw, min, max, status } */
    objective: function (o) {
      if (!initialized) return false;
      var count = parseInt(self.get('cmi.objectives._count'), 10) || 0, n = count, i;
      for (i = 0; i < count; i++) { if (self.get('cmi.objectives.' + i + '.id') === o.id) { n = i; break; } }
      var p = 'cmi.objectives.' + n + '.';
      if (n === count) self.set(p + 'id', o.id);
      if (o.min !== undefined) self.set(p + 'score.min', o.min);
      if (o.max !== undefined) self.set(p + 'score.max', o.max);
      if (o.raw !== undefined) self.set(p + 'score.raw', o.raw);
      if (o.status) self.set(p + 'status', o.status);
      return true;
    },

    commit: function () {
      if (!initialized || !api) return false;
      try {
        var v = api.LMSCommit('');
        return (v === true || v === 'true');
      } catch (e) { log('Erreur commit:', e); return false; }
    },

    /* Statut : « passed » est définitif, « completed » ne redevient pas « incomplete ». */
    setStatus: function (status) {
      if (!self.canRecord()) return false;
      var cur = self.get('cmi.core.lesson_status');
      if (cur === 'passed' || (cur === 'completed' && status === 'incomplete')) return false;
      return self.set('cmi.core.lesson_status', status);
    },
    /* Première sauvegarde : « not attempted » → « incomplete », sans jamais toucher un statut acquis. */
    markIncomplete: function () {
      if (!self.canRecord()) return false;
      var cur = self.get('cmi.core.lesson_status');
      return (cur === '' || cur === 'not attempted') ? self.set('cmi.core.lesson_status', 'incomplete') : false;
    },

    /* suspend_data par sections */
    getSection: function (name) {
      if (!sections) {
        sections = {};
        var raw = self.get('cmi.suspend_data');
        if (raw) {
          try {
            var d = JSON.parse(raw);
            if (d && typeof d === 'object') sections = d.sheets ? { wb: d } : d;
          } catch (e) { log('suspend_data illisible, ignoré'); }
        }
      }
      return sections[name];
    },
    setSection: function (name, value) {
      self.getSection(name);   // charge l'existant avant d'écraser une section
      sections[name] = value;
    },
    /* Écrit toutes les sections dans suspend_data. → { ok, size } ; ok = false si le LMS refuse (taille…) */
    flush: function () {
      var data = JSON.stringify(sections || {}), compact = false;
      if (data.length > LIMIT) {
        // SCORM 1.2 : 4096 caractères au plus. On ne garde que l'essentiel (notes, progression),
        // puis on retire les dates des notes ; le profil reste dans le navigateur.
        var s = {};
        ['notes', 'cours'].forEach(function (k) { if (sections[k] !== undefined) s[k] = sections[k]; });
        data = JSON.stringify(s); compact = true;
        if (data.length > LIMIT && s.notes) {
          var n = {};
          Object.keys(s.notes).forEach(function (id) { n[id] = s.notes[id].slice(0, 4); });
          s.notes = n; data = JSON.stringify(s);
        }
        log('suspend_data compacté :', data.length, 'caractères');
      }
      var ok = data.length <= 4096 && self.set('cmi.suspend_data', data);
      return { ok: ok, size: data.length, compact: compact };
    },

    /* Trace une tentative d'exercice : cmi.interactions.n.* (SCORM 1.2 : écriture seule, on ajoute à la suite). */
    interaction: function (o) {
      if (!initialized || !self.canRecord()) return false;
      var n = parseInt(self.get('cmi.interactions._count'), 10) || 0, p = 'cmi.interactions.' + n + '.';
      self.set(p + 'id', o.id);
      self.set(p + 'type', o.type || 'performance');
      if (o.correct !== undefined && o.correct !== '') self.set(p + 'correct_responses.0.pattern', String(o.correct).substring(0, 255));
      self.set(p + 'time', timespan(Date.now() - new Date().setHours(0, 0, 0, 0)));
      if (o.weighting !== undefined) self.set(p + 'weighting', o.weighting);
      if (o.response !== undefined) self.set(p + 'student_response', String(o.response).substring(0, 255));
      self.set(p + 'result', o.result);
      return true;
    },

    quit: function () {
      if (!initialized || !api) return false;
      try {
        if (!sessionTimeSet) self.set('cmi.core.session_time', timespan(Date.now() - sessionStart));
        var st = self.get('cmi.core.lesson_status');
        // « suspend » : le LMS conserve suspend_data et propose la reprise
        self.set('cmi.core.exit', (st === '' || st === 'not attempted' || st === 'incomplete') ? 'suspend' : '');
        self.commit();
        var v = api.LMSFinish('');
        initialized = false;
        return (v === true || v === 'true');
      } catch (e) { log('Erreur quit:', e); return false; }
    },

    isConnected: function () { return initialized; },
    isOffline: function () { return offline; }
  };
  return self;
})();

// Les modules ES n'exposent rien : on publie le wrapper pour shell.js, main.js et les pages (window.parent.SCORM_API)
window.SCORM_API = SCORM_API;
