/* CHAMP ART — nav.js
   Barre supérieure : rubrique active, losange doré qui glisse, méga-menu des collections, compactage au défilement,
   menu plein écran (mobile). Aussi : bouton « aller au contenu », retour en haut, visionneuse d'images. */
(function () {
  'use strict';
  var CA = window.CA, $ = CA.$, $$ = CA.$$;

  CA.onInit(function () {
    var top = $('#top'), band = $('.top__band', top), ink = $('.top__ink', top), menu = $('#menu'), burger = $('.top__burger', top);
    var main = $('#contenu'), megaLi = $('.has-mega', top), megaLink = $('a', megaLi);
    var wide = window.matchMedia('(min-width: 1080px)');
    var key = 'accueil', closeT = null;

    /* ----- rubrique active ----- */
    function keyOf(id) { return (id === 'crystal' || id === 'obsidienne' || id === 'meteore') ? 'collections' : id; }
    function mark() {
      $$('[data-nav]').forEach(function (a) {
        if (a.getAttribute('data-nav') === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }
    function inkTo(a) {
      if (!a || !wide.matches) { ink.classList.remove('is-on'); return; }
      var r = a.getBoundingClientRect(), b = band.getBoundingClientRect();
      ink.style.setProperty('--ix', Math.round(r.left - b.left + r.width / 2 - 3.2) + 'px');
      ink.classList.add('is-on');
    }
    function inkActive() { inkTo($('.top__side [data-nav="' + key + '"]', top)); }

    CA.on('view', function (d) { key = keyOf(d.id); mark(); closeMega(); closeMenu(true); window.setTimeout(inkActive, 30); });
    $$('.top__side a', top).forEach(function (a) {
      a.addEventListener('mouseenter', function () { inkTo(a); if (a.parentNode === megaLi) openMega(); else closeMega(); });
      a.addEventListener('focus', function () { inkTo(a); });
    });
    $$('.top__side', top).forEach(function (n) { n.addEventListener('mouseleave', inkActive); n.addEventListener('focusout', function () { window.setTimeout(inkActive, 0); }); });
    window.addEventListener('resize', inkActive);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(inkActive);
    window.addEventListener('load', inkActive);

    /* ----- compact au défilement ----- */
    var compact = false;
    CA.onFrame(function (s) {
      var c = s.y > 60;
      if (c === compact) return;
      compact = c; top.classList.toggle('is-compact', c);
      window.setTimeout(inkActive, 480);
    });

    /* ----- méga-menu ----- */
    function openMega() { if (!wide.matches) return; window.clearTimeout(closeT); top.classList.add('is-mega'); megaLi.classList.add('is-open'); megaLink.setAttribute('aria-expanded', 'true'); }
    function closeMega() { top.classList.remove('is-mega'); megaLi.classList.remove('is-open'); megaLink.setAttribute('aria-expanded', 'false'); }
    top.addEventListener('mouseleave', function () { closeT = window.setTimeout(closeMega, 180); });
    top.addEventListener('mouseenter', function () { window.clearTimeout(closeT); });
    megaLink.addEventListener('focus', openMega);
    top.addEventListener('focusin', function (e) { if (!e.target.closest('.has-mega') && !e.target.closest('.mega')) closeMega(); });
    $('.mega', top).addEventListener('click', function () { closeMega(); });

    /* ----- menu plein écran ----- */
    function setMenu(open) {
      menu.classList.toggle('is-open', open);
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('.top__burger-t', burger).textContent = open ? 'Fermer' : 'Menu';
      document.documentElement.classList.toggle('menu-open', open);
      main.toggleAttribute('inert', open); $('.footer').toggleAttribute('inert', open);
    }
    function closeMenu(quiet) { if (menu.classList.contains('is-open')) { setMenu(false); if (!quiet) burger.focus(); } }
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); if (menu.classList.contains('is-open')) window.setTimeout(function () { var a = $('a', menu); if (a) a.focus(); }, 120); });
    wide.addEventListener ? wide.addEventListener('change', function () { if (wide.matches) closeMenu(true); }) : null;

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('#lightbox').hidden) return;
      closeMega(); closeMenu();
    });

    /* ----- liens vers la vue courante : retour en haut en douceur ----- */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (id === CA.current) { e.preventDefault(); CA.scrollToY(0); closeMenu(true); closeMega(); }
    });

    /* ----- aller au contenu / retour en haut ----- */
    $('[data-skip]').addEventListener('click', function () { main.focus({ preventScroll: false }); });
    $$('[data-top]').forEach(function (b) { b.addEventListener('click', function () { CA.scrollToY(0); }); });

    /* ----- visionneuse ----- */
    var box = $('#lightbox'), img = $('#lightbox-img'), cap = $('#lightbox-cap'), list = [], idx = 0, opener = null;
    function show(i) {
      idx = (i + list.length) % list.length;
      img.src = list[idx].getAttribute('data-zoom-src'); img.alt = list[idx].getAttribute('data-zoom-alt') || '';
      cap.textContent = list[idx].getAttribute('data-zoom-alt') || '';
    }
    function openLb(btn) {
      list = $$('[data-zoom-src]', btn.closest('.view')); opener = btn; box.hidden = false; show(list.indexOf(btn));
      document.documentElement.classList.add('menu-open'); $('[data-lb-close]').focus();
    }
    function closeLb() { box.hidden = true; document.documentElement.classList.remove('menu-open'); if (opener) opener.focus(); }
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-zoom-src]'); if (b) openLb(b); });
    $('[data-lb-close]').addEventListener('click', closeLb);
    $('[data-lb-prev]').addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]').addEventListener('click', function () { show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') { var f = $$('button', box); var i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
  });
})();
