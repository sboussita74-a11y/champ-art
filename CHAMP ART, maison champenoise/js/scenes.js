/* CHAMP ART — scenes.js
   Animations liées au défilement et à la caméra, par vue :
   parallaxe, ruban qui défile, texte révélé mot à mot, scène épinglée des trois collections (accueil),
   travelling vertical (Crystal), défilement latéral (Obsidienne), étapes du savoir-faire (maison),
   caméra au pointeur (bouteilles), faisceau de lumière (Obsidienne). */
(function () {
  'use strict';
  var CA = window.CA, $ = CA.$, $$ = CA.$$, clamp = CA.clamp, ease = CA.ease;
  var view = null, id = '', C = {};
  var vh = window.innerHeight, vw = window.innerWidth;
  var ptr = { x: 0, y: 0, tx: 0, ty: 0, has: false, cx: 0, cy: 0 };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t); return t * t * (3 - 2 * t); }

  /* ---------- Mise en cache par vue ---------- */
  function build() {
    vh = window.innerHeight; vw = window.innerWidth;
    var y = window.pageYOffset;
    C = { par: [], rib: [], words: [], stage: null, travel: [], hs: [], craft: null, cams: [], spot: null };
    $$('[data-speed]', view).forEach(function (el) {
      el.style.setProperty('--px', '0px'); el.style.setProperty('--py', '0px');
      var r = el.getBoundingClientRect(), ax = el.getAttribute('data-axis') === 'x';
      C.par.push({ el: el, sp: parseFloat(el.getAttribute('data-speed')), x: ax, base: r.top + y + r.height / 2 });
    });
    $$('[data-ribbon]', view).forEach(function (el) { C.rib.push({ el: el, half: el.scrollWidth / 2 }); });
    $$('[data-words]', view).forEach(function (el) { C.words.push({ el: el, w: el._w || [] }); });
    C.cams = $$('[data-camera], [data-bottle]', view);
    C.spot = $('[data-spot]', view);

    var st = $('[data-stage]', view);
    if (st && !CA.reduce) {
      C.stage = { el: st, scenes: $$('[data-scene]', st), dots: $$('.stage__dots li', st), idx: -1 };
    }
    if (!CA.reduce) {
      $$('[data-travel]', view).forEach(function (el) {
        var img = $('[data-cam]', el), stops = img.getAttribute('data-stops').split(';').map(function (s) { var a = s.split(',').map(parseFloat); return { x: a[0], y: a[1], z: a[2] }; });
        el.style.setProperty('--n', stops.length);
        C.travel.push({ el: el, frame: $('.travel__frame', el), img: img, stops: stops, caps: $$('[data-cap]', el), cur: -1 });
      });
      $$('[data-hscroll]', view).forEach(function (el) {
        var track = $('[data-track]', el), pin = $('.deep__pin', el), dist = Math.max(0, track.scrollWidth - pin.clientWidth + vw * .08);
        el.style.height = (dist + vh) + 'px';
        C.hs.push({ el: el, track: track, dist: dist });
      });
      var cr = $('[data-craft]', view);
      if (cr) {
        C.craft = { el: cr, steps: $$('[data-step]', cr), nav: $$('.craft__nav button', cr), big: $('[data-craft-n]', cr), idx: -1 };
        cr.style.setProperty('--n', C.craft.steps.length);
      }
    }
  }

  /* ---------- Boucle liée au défilement ---------- */
  function frame(s) {
    if (!view) return;
    var y = s.y, i, k;
    vh = s.vh;
    for (i = 0; i < C.par.length; i++) {
      k = C.par[i];
      if (k.x) k.el.style.setProperty('--px', (y * k.sp).toFixed(1) + 'px');
      else k.el.style.setProperty('--py', ((k.base - (y + vh / 2)) * k.sp).toFixed(1) + 'px');
    }
    for (i = 0; i < C.rib.length; i++) {
      k = C.rib[i]; k.el.style.transform = 'translate3d(' + (-((y * .55) % (k.half || 1))).toFixed(1) + 'px,0,0)';
    }
    for (i = 0; i < C.words.length; i++) {
      k = C.words[i];
      var r = k.el.getBoundingClientRect(), a = vh * .86, b = vh * .3;
      var p = clamp((a - r.top) / (a - b + r.height * .55)), n = Math.round(p * k.w.length * 1.04);
      for (var j = 0; j < k.w.length; j++) k.w[j].classList.toggle('is-lit', j < n);
    }
    if (C.stage) stage(C.stage);
    C.travel.forEach(travel);
    C.hs.forEach(function (h) {
      var r = h.el.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, h.el.offsetHeight - vh));
      h.track.style.transform = 'translate3d(' + (-p * h.dist).toFixed(1) + 'px,0,0)';
    });
    if (C.craft) craft(C.craft);
  }

  function stage(S) {
    var r = S.el.getBoundingClientRect(), total = Math.max(1, S.el.offsetHeight - vh), p = clamp(-r.top / total);
    var reveal = [1, ease.inOut(clamp((p - .27) / .14)), ease.inOut(clamp((p - .6) / .14))];
    var idx = p < .41 ? 0 : p < .74 ? 1 : 2;
    S.scenes.forEach(function (sc, i) {
      var R = reveal[i];
      sc.style.clipPath = i === 0 ? 'none' : 'circle(' + (R * 128).toFixed(1) + '% at 50% 100%)';
      sc.style.visibility = (i > 0 && R <= 0.001) ? 'hidden' : 'visible';
      sc.style.setProperty('--lp', clamp((p - (i * .333 - .12)) / .55).toFixed(3));
    });
    if (idx !== S.idx) {
      S.idx = idx;
      S.scenes.forEach(function (sc, i) { sc.classList.toggle('is-active', i === idx); sc.toggleAttribute('inert', i !== idx); });
      S.dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
    }
  }

  function travel(T) {
    var r = T.el.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, T.el.offsetHeight - vh)), n = T.stops.length;
    var pos = p * (n - 1), i = Math.min(n - 2, Math.floor(pos)), f = smooth((pos - i - .12) / .76);
    var a = T.stops[i], b = T.stops[i + 1];
    var z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), f)), fx = lerp(a.x, b.x, f), fy = lerp(a.y, b.y, f);
    var W = T.frame.clientWidth, H = T.frame.clientHeight;
    var tx = clamp(W / 2 - fx * W * z, W - W * z, 0), ty = clamp(H / 2 - fy * H * z, H - H * z, 0);
    T.img.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + z.toFixed(3) + ')';
    var cur = Math.round(pos);
    if (cur !== T.cur) { T.cur = cur; T.caps.forEach(function (c, k) { c.classList.toggle('is-on', k === cur); }); }
  }

  function craft(S) {
    var r = S.el.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, S.el.offsetHeight - vh)), n = S.steps.length;
    var idx = Math.min(n - 1, Math.floor(p * n));
    if (idx === S.idx) return;
    S.idx = idx;
    S.steps.forEach(function (st, k) { st.classList.toggle('is-on', k === idx); st.toggleAttribute('inert', k !== idx); });
    S.nav.forEach(function (b, k) { b.classList.toggle('is-on', k === idx); if (k === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    if (S.big) S.big.textContent = '0' + (idx + 1);
  }

  /* ---------- Caméra au pointeur + lumière d'Obsidienne ---------- */
  function tick(now) {
    window.requestAnimationFrame(tick);
    if (!view || CA.reduce) return;
    if (document.hidden || window.pageYOffset > vh * 1.4) return;
    if (!ptr.has) { ptr.tx = Math.sin(now / 5200) * .6; ptr.ty = Math.cos(now / 6900) * .35; }
    ptr.x = lerp(ptr.x, ptr.tx, .05); ptr.y = lerp(ptr.y, ptr.ty, .05);
    for (var i = 0; i < C.cams.length; i++) { C.cams[i].style.setProperty('--cx', ptr.x.toFixed(3)); C.cams[i].style.setProperty('--cy', ptr.y.toFixed(3)); }
    if (C.spot) {
      var r = C.spot.getBoundingClientRect(), mx, my;
      if (ptr.has) { mx = ptr.cx - r.left; my = ptr.cy - r.top; }
      else { mx = r.width * (.28 + .16 * Math.sin(now / 3100)); my = r.height * (.5 + .24 * Math.sin(now / 4300 + 1.3)); }
      C.spot.style.setProperty('--mx', mx.toFixed(0) + 'px'); C.spot.style.setProperty('--my', my.toFixed(0) + 'px');
    }
  }

  CA.onInit(function () {
    $$('[data-words]').forEach(function (el) { if (!CA.reduce) el._w = CA.words(el); });
    $$('[data-title-split]').forEach(function (el) { if (!CA.reduce) CA.split(el); });

    CA.on('view', function (d) {
      view = d.el; id = d.id; ptr.has = false;
      build();
      window.setTimeout(function () { if (view === d.el) { build(); CA.request(); } }, 350);
      if (id === 'accueil' && CA.brushes && CA.brushes.hero) CA.brushes.hero.play(2400, 1100);
    });
    CA.onFrame(frame);

    var rt = 0;
    window.addEventListener('resize', function () { window.clearTimeout(rt); rt = window.setTimeout(function () { if (view) { build(); CA.request(); } }, 150); });
    window.addEventListener('load', function () { if (view) { build(); CA.request(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (view) { build(); CA.request(); } });

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      ptr.has = true; ptr.cx = e.clientX; ptr.cy = e.clientY;
      ptr.tx = (e.clientX / window.innerWidth - .5) * 2; ptr.ty = (e.clientY / window.innerHeight - .5) * 2;
    }, { passive: true });
    document.addEventListener('mouseleave', function () { ptr.has = false; });

    /* clic sur une étape du savoir-faire : on rejoint sa position dans la scène épinglée */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.craft__nav button');
      if (!b || !C.craft) return;
      var el = C.craft.el, k = parseInt(b.getAttribute('data-go'), 10), n = C.craft.steps.length;
      var top = el.getBoundingClientRect().top + window.pageYOffset, dist = el.offsetHeight - vh;
      CA.scrollToY(top + dist * ((k + .5) / n));
    });

    /* triptyque des collections : un panneau s'ouvre au survol ou au focus */
    $$('[data-tri]').forEach(function (tri) {
      var ps = $$('[data-p]', tri);
      function on(p) { ps.forEach(function (q) { q.classList.toggle('is-active', q === p); }); }
      ps.forEach(function (p) {
        p.addEventListener('mouseenter', function () { on(p); });
        p.addEventListener('focusin', function () { on(p); });
      });
    });

    if (!CA.reduce) window.requestAnimationFrame(tick);
  });
})();
