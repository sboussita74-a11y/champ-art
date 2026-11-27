/* CHAMP ART — core.js
   Outils partagés : sélecteurs, boucle d'animation unique liée au défilement,
   découpage du texte en lettres et en mots, apparitions, défilement vers une ancre. */
(function () {
  'use strict';
  var CA = window.CA = window.CA || {};

  CA.$ = function (s, c) { return (c || document).querySelector(s); };
  CA.$$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  CA.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  CA.clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  CA.ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };

  /* ---------- Boucle d'images : un seul requestAnimationFrame pour tout le site ---------- */
  var subs = [], inits = [], queued = false;
  CA.onFrame = function (fn) { subs.push(fn); };
  CA.onInit = function (fn) { inits.push(fn); };
  var readies = [];
  CA.ready = function (fn) { readies.push(fn); };   /* après tous les démarrages : les modules écoutent déjà */
  CA.request = function () {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      var s = { y: window.pageYOffset, vh: window.innerHeight, vw: window.innerWidth };
      for (var i = 0; i < subs.length; i++) {
        try { subs[i](s); } catch (e) { if (window.console) console.error(e); }
      }
    });
  };
  window.addEventListener('scroll', CA.request, { passive: true });
  window.addEventListener('resize', CA.request);

  /* Interpolation temporelle simple */
  CA.tween = function (dur, fn, ease, done) {
    var t0 = null, e = ease || CA.ease.out;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = CA.clamp((t - t0) / dur);
      fn(e(k));
      if (k < 1) window.requestAnimationFrame(step); else if (done) done();
    }
    window.requestAnimationFrame(step);
  };

  /* ---------- Titres découpés en lettres (accessibles : le texte reste lu en entier) ---------- */
  CA.split = function (el) {
    var text = el.textContent.trim(), i = 0;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(' ')); return; }
      var w = document.createElement('span');
      w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(tok, function (ch) {
        var s = document.createElement('span');
        s.className = 'ch'; s.style.setProperty('--i', i++); s.textContent = ch;
        w.appendChild(s);
      });
      el.appendChild(w);
    });
  };

  /* ---------- Texte révélé mot à mot ---------- */
  CA.words = function (el) {
    var text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var list = [];
    text.split(' ').forEach(function (tok, k) {
      if (k) el.appendChild(document.createTextNode(' '));
      var s = document.createElement('span');
      s.className = 'wd'; s.setAttribute('aria-hidden', 'true'); s.textContent = tok;
      el.appendChild(s); list.push(s);
    });
    return list;
  };

  /* ---------- Apparition au défilement ---------- */
  CA.observeReveal = function (els) {
    if (!els.length) return;
    if (CA.reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (e) { io.observe(e); });
  };

  /* ---------- Défilement doux vers une position ---------- */
  CA.scrollToY = function (y) {
    window.scrollTo({ top: Math.max(0, y), behavior: CA.reduce ? 'auto' : 'smooth' });
  };

  /* ---------- Petit bus d'évènements entre modules ---------- */
  CA.on = function (name, fn) { document.addEventListener('ca:' + name, function (e) { fn(e.detail || {}); }); };
  CA.emit = function (name, detail) { document.dispatchEvent(new CustomEvent('ca:' + name, { detail: detail })); };

  /* ---------- Démarrage, une fois tous les scripts chargés ---------- */
  function boot() {
    if (!CA.reduce) {
      CA.$$('[data-split]').forEach(CA.split);
    }
    CA.observeReveal(CA.$$('[data-reveal], [data-split]'));
    inits.forEach(function (fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    });
    readies.forEach(function (fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    });
    CA.request();
  }
  /* Les scripts différés s'exécutent tous avant DOMContentLoaded : chacun a alors enregistré son démarrage */
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
