/* CHAMP ART — router.js
   Les « pages » sont des vues du même document. Le routeur lit le hash simple (#crystal, #panier…),
   joue un rideau de transition aux couleurs de la page d'arrivée, puis affiche la vue. */
(function () {
  'use strict';
  var CA = window.CA, $ = CA.$, $$ = CA.$$;
  var VIEWS = {}, busy = false, pending = null, curtain, curtainName, top;
  CA.current = null;
  CA.view = function () { return VIEWS[CA.current]; };

  function fromHash() {
    var h = (window.location.hash || '').replace(/^#/, '');
    return VIEWS[h] ? h : null;
  }

  function replay(view) {
    var els = $$('[data-replay]', view);
    els.forEach(function (e) { e.classList.remove('is-in'); });
    view.classList.remove('is-entered');
    void view.offsetWidth;
    window.setTimeout(function () {
      view.classList.add('is-entered');
      els.forEach(function (e) { e.classList.add('is-in'); });
    }, CA.reduce ? 0 : 90);
  }

  function swap(id) {
    var prev = CA.current, el = VIEWS[id];
    if (prev) { VIEWS[prev].classList.remove('is-active', 'is-entered'); }
    el.classList.add('is-active');
    CA.current = id;
    document.documentElement.setAttribute('data-view', id);
    document.title = (id === 'accueil' ? 'CHAMP ART, maison champenoise' : el.getAttribute('data-title') + ' · CHAMP ART');
    top.style.setProperty('--band', el.getAttribute('data-band') || '#3A0B15');
    window.scrollTo(0, 0);
    replay(el);
    CA.emit('view', { id: id, prev: prev, el: el });
    CA.request();
  }

  function go(id) {
    if (id === CA.current) return;
    if (busy) { pending = id; return; }
    if (CA.current === null || CA.reduce || !curtain) { swap(id); return; }
    busy = true;
    var el = VIEWS[id];
    curtain.style.setProperty('--cur', el.getAttribute('data-cur') || '#3A0B15');
    curtainName.innerHTML = '<small>CHAMP ART</small>' + el.getAttribute('data-title');
    curtain.classList.remove('is-reveal');
    curtain.classList.add('is-live');
    void curtain.offsetWidth;
    curtain.classList.add('is-cover');
    window.setTimeout(function () {
      swap(id);
      curtain.classList.remove('is-cover');
      curtain.classList.add('is-reveal');
      window.setTimeout(function () {
        curtain.classList.remove('is-live', 'is-reveal');
        busy = false;
        if (pending && pending !== CA.current) { var p = pending; pending = null; go(p); } else pending = null;
      }, 900);
    }, 880);
  }
  CA.go = function (id) { if (window.location.hash !== '#' + id) { try { window.location.hash = id; } catch (e) { go(id); } } else go(id); };

  CA.onInit(function () {
    top = $('#top'); curtain = $('#curtain'); curtainName = $('[data-curtain-name]');
    $$('.view').forEach(function (v) { VIEWS[v.getAttribute('data-view')] = v; });
    window.addEventListener('hashchange', function () { go(fromHash() || 'accueil'); });
  });
  CA.ready(function () {
    var first = fromHash() || 'accueil';
    swap(first);
    if (!fromHash()) { try { window.history.replaceState(null, '', '#accueil'); } catch (e) { /* hash non modifiable ici */ } }
  });
})();
