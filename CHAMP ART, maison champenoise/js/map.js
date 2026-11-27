/* CHAMP ART — map.js
   Carte schématique du nord-ouest de la Champagne, dessinée en SVG à partir de coordonnées réelles
   (projection équirectangulaire). Les tracés du fleuve, des routes et du rail sont indicatifs.
   Couches activables, zoom, déplacement, villes cliquables avec temps de trajet. */
(function () {
  'use strict';
  var CA = window.CA, $ = CA.$, $$ = CA.$$, clamp = CA.clamp;
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';

  /* Projection : 1° de latitude = 600 unités, 1° de longitude = 600 × cos(49°) ≈ 393,6 unités */
  var LON0 = 2.1, LAT0 = 49.62, KX = 393.6, KY = 600, W = 984, H = 600;
  function P(ll) { return [(ll[0] - LON0) * KX, (LAT0 - ll[1]) * KY]; }
  function f(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function smooth(pts) {           // Catmull-Rom → Bézier
    var d = 'M' + f(pts[0]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + f(c1) + ' ' + f(c2) + ' ' + f(p2);
    }
    return d;
  }

  /* ---------- Données géographiques (longitude, latitude) ---------- */
  var MARNE = [[2.42, 48.82], [2.50, 48.85], [2.60, 48.88], [2.70, 48.88], [2.78, 48.92], [2.88, 48.96], [2.94, 48.96], [3.03, 48.95], [3.13, 48.95], [3.20, 48.96], [3.27, 48.98], [3.33, 49.00], [3.40, 49.045], [3.53, 49.05], [3.64, 49.06], [3.77, 49.08], [3.88, 49.07], [3.93, 49.06], [3.99, 49.055], [4.10, 49.03], [4.22, 48.99], [4.36, 48.96]];
  var VALLEE = [[3.27, 48.98], [3.33, 49.00], [3.40, 49.045], [3.53, 49.05], [3.64, 49.06], [3.77, 49.08], [3.88, 49.07], [3.93, 49.06], [3.99, 49.055]];
  var A4 = [[2.42, 48.83], [2.50, 48.84], [2.62, 48.855], [2.72, 48.87], [2.80, 48.90], [2.90, 48.93], [3.02, 48.955], [3.15, 48.985], [3.28, 49.02], [3.40, 49.065], [3.52, 49.085], [3.65, 49.105], [3.78, 49.145], [3.90, 49.20], [3.98, 49.255], [4.12, 49.23], [4.28, 49.14], [4.40, 49.05], [4.52, 48.99]];
  var A26 = [[3.62, 49.57], [3.75, 49.48], [3.92, 49.38], [4.05, 49.31], [4.14, 49.24], [4.27, 49.12], [4.36, 49.00], [4.38, 48.85], [4.34, 48.66]];
  var RAIL = [[2.37, 48.877], [2.55, 48.90], [2.75, 48.925], [2.88, 48.945], [3.10, 48.935], [3.28, 48.975], [3.40, 49.03], [3.64, 49.045], [3.80, 49.055], [3.96, 49.03], [4.15, 48.98], [4.36, 48.945]];

  var CITIES = [
    { id: 'chateau-thierry', name: 'Château-Thierry', ll: [3.4007, 49.0436], home: true, dx: -20, dy: -28, a: 'end',
      tag: 'Implantation de CHAMP ART (fictive)', text: 'Ville de l\'Aisne, bâtie de part et d\'autre de la Marne, à l\'ouest du vignoble champenois. C\'est ici que la maison est imaginée.' },
    { id: 'paris', name: 'Paris', ll: [2.3522, 48.8566], dx: 13, dy: 5, a: 'start', route: '≈ 1 h', mode: 'Train ou A4',
      tag: 'Capitale', text: 'Depuis la gare de l\'Est, Château-Thierry se trouve à environ 1 h en train. L\'A4 relie aussi les deux villes en environ 1 h.' },
    { id: 'reims', name: 'Reims', ll: [4.0317, 49.2583], dx: 13, dy: 5, a: 'start', route: '≈ 40 min', mode: 'A4',
      tag: 'Grande ville champenoise', text: 'Reims est à environ 40 min de Château-Thierry par l\'A4. La ville est desservie par le TGV et croise l\'A4 et l\'A26.' },
    { id: 'epernay', name: 'Épernay', ll: [3.9603, 49.0404], dx: 13, dy: 26, a: 'start', route: '≈ 25 min', mode: 'Train',
      tag: 'Cœur du vignoble', text: 'Épernay est à environ 25 min en train de Château-Thierry, sur la ligne Paris–Strasbourg, au cœur du vignoble.' },
    { id: 'meaux', name: 'Meaux', ll: [2.8786, 48.9606], dx: 0, dy: 26, a: 'middle',
      tag: 'Seine-et-Marne', text: 'Ville de Seine-et-Marne, au bord de la Marne, entre Paris et Château-Thierry.' },
    { id: 'dormans', name: 'Dormans', ll: [3.6444, 49.0556], dx: 0, dy: -16, a: 'middle',
      tag: 'Vallée de la Marne', text: 'Commune de la Vallée de la Marne, entre Château-Thierry et Épernay.' },
    { id: 'soissons', name: 'Soissons', ll: [3.3236, 49.3817], dx: 13, dy: 5, a: 'start',
      tag: 'Aisne', text: 'Ville de l\'Aisne, au nord de Château-Thierry.' },
    { id: 'chalons', name: 'Châlons-en-Champagne', ll: [4.3633, 48.9566], dx: -13, dy: 26, a: 'end',
      tag: 'Préfecture de la Marne', text: 'Ville de la Marne, située elle aussi sur la Marne et sur la ligne Paris–Strasbourg.' },
    { id: 'roissy', name: 'Roissy-CDG', ll: [2.5479, 49.0097], dx: 13, dy: 5, a: 'start',
      tag: 'Aéroport', text: 'Paris-Charles-de-Gaulle, premier aéroport français : la porte d\'entrée vers l\'international.' }
  ];

  CA.onInit(function () {
    var svg = $('#map-svg'), wrap = $('#map'), card = $('#map-card');
    if (!svg || !wrap) return;

    /* ---------- Dessin ---------- */
    var defs = el('defs', {}, svg);
    var pat = el('pattern', { id: 'm-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'rgba(142,100,40,.5)', 'stroke-width': 1 }, pat);

    el('rect', { x: -500, y: -400, width: W + 1000, height: H + 800, fill: '#F8F1E5' }, svg);

    var g = el('g', {}, svg);
    var gGrat = el('g', {}, g);
    [2.5, 3, 3.5, 4, 4.5].forEach(function (lon) {
      var a = P([lon, 49.62]), b = P([lon, 48.62]);
      el('line', { class: 'm-grat', x1: a[0], y1: -400, x2: a[0], y2: H + 400 }, gGrat);
      var t = el('text', { class: 'm-gtxt', x: a[0] + 5, y: 14 }, gGrat); t.textContent = String(lon).replace('.', ',') + '° E';
    });
    [49.5, 49.25, 49, 48.75].forEach(function (lat) {
      var a = P([2.1, lat]);
      el('line', { class: 'm-grat', x1: -500, y1: a[1], x2: W + 500, y2: a[1] }, gGrat);
      var t = el('text', { class: 'm-gtxt', x: 8, y: a[1] - 5 }, gGrat); t.textContent = String(lat).replace('.', ',') + '° N';
    });

    /* Vignoble (repères indicatifs) */
    var gV = el('g', { 'data-layer-g': 'vignoble' }, g);
    el('path', { class: 'm-vigne-band', d: smooth(VALLEE.map(P)), 'stroke-width': 34 }, gV);
    var zones = [
      { ll: [4.04, 49.14], rx: 58, ry: 38, rot: -18, lab: 'Montagne de Reims', lx: 62, ly: 4 },
      { ll: [4.00, 48.97], rx: 21, ry: 56, rot: 0, lab: 'Côte des Blancs', lx: 30, ly: 8 },
      { ll: [3.74, 48.74], rx: 34, ry: 22, rot: -10, lab: 'Côte de Sézanne', lx: 40, ly: 6 }
    ];
    zones.forEach(function (z) {
      var c = P(z.ll);
      el('ellipse', { class: 'm-vigne', cx: c[0], cy: c[1], rx: z.rx, ry: z.ry, transform: 'rotate(' + z.rot + ' ' + c[0] + ' ' + c[1] + ')', fill: 'url(#m-hatch)' }, gV);
      var t = el('text', { class: 'm-vtxt', x: c[0] + z.lx, y: c[1] + z.ly }, gV); t.textContent = z.lab;
    });
    var tv = el('text', { class: 'm-vtxt', x: P([3.64, 49.0])[0] - 6, y: P([3.64, 49.0])[1] + 46, 'text-anchor': 'middle' }, gV);
    tv.textContent = 'Vallée de la Marne';

    /* Rivière */
    var gM = el('g', { 'data-layer-g': 'marne' }, g);
    var dM = smooth(MARNE.map(P));
    el('path', { class: 'm-river-b', d: dM, pathLength: 1 }, gM);
    el('path', { class: 'm-river', id: 'm-marne-path', d: dM, pathLength: 1 }, gM);
    var rt = el('text', { class: 'm-rtxt', dy: -11 }, gM);
    var tp = el('textPath', { startOffset: '72%' }, rt);
    tp.setAttribute('href', '#m-marne-path'); tp.setAttributeNS(XL, 'xlink:href', '#m-marne-path');
    tp.textContent = 'La Marne';

    /* Rail */
    var gR = el('g', { 'data-layer-g': 'rail' }, g);
    el('path', { class: 'm-rail', d: smooth(RAIL.map(P)) }, gR);

    /* Routes */
    var gA = el('g', { 'data-layer-g': 'routes' }, g);
    [A4, A26].forEach(function (r) { el('path', { class: 'm-road-c', d: smooth(r.map(P)), pathLength: 1 }, gA); });
    [A4, A26].forEach(function (r) { el('path', { class: 'm-road', d: smooth(r.map(P)), pathLength: 1 }, gA); });
    [{ t: 'A4', ll: [3.15, 48.985] }, { t: 'A26', ll: [3.92, 49.38] }].forEach(function (s) {
      var c = P(s.ll), sh = el('g', { class: 'm-shield', transform: 'translate(' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ')' }, gA);
      el('rect', { x: -16, y: -9, width: 32, height: 18, rx: 4 }, sh);
      var tx = el('text', { x: 0, y: 4, 'text-anchor': 'middle' }, sh); tx.textContent = s.t;
    });

    /* Trajets (tracés à la sélection) */
    var gRoutes = el('g', {}, g);

    /* Villes */
    var gC = el('g', {}, g), nodes = {};
    CITIES.forEach(function (c) {
      var p = P(c.ll);
      var grp = el('g', { class: 'm-city' + (c.home ? ' m-home' : ''), tabindex: 0, role: 'button', 'data-id': c.id, 'aria-label': c.name + ', afficher les informations', transform: 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')' }, gC);
      el('circle', { class: 'm-hit', r: 20 }, grp);
      if (c.home) {
        var halo = el('circle', { class: 'm-halo', r: 22 }, grp);
        el('circle', { class: 'm-core', r: 15 }, grp);
        var m = el('text', { class: 'm-mono', y: 5 }, grp); m.textContent = 'CA';
        c.halo = halo;
      } else {
        el('circle', { class: 'm-dot', r: 5.5 }, grp);
      }
      var lab = el('text', { class: 'm-lab', x: c.dx, y: c.dy, 'text-anchor': c.a }, grp); lab.textContent = c.name;
      nodes[c.id] = grp; c.node = grp; c.p = p;
    });

    /* Échelle (20 km ≈ 108 unités) et nord */
    var sc = el('g', { class: 'm-scale', transform: 'translate(34 566)' }, g);
    el('line', { x1: 0, y1: 0, x2: 108, y2: 0 }, sc); el('line', { x1: 0, y1: -5, x2: 0, y2: 5 }, sc); el('line', { x1: 108, y1: -5, x2: 108, y2: 5 }, sc);
    var st = el('text', { x: 0, y: -10 }, sc); st.textContent = '20 km';
    var nn = el('g', { class: 'm-north', transform: 'translate(940 540)' }, g);
    el('path', { d: 'M0 -22 L7 6 L0 0 L-7 6 Z' }, nn);
    var nt = el('text', { x: 0, y: 22, 'text-anchor': 'middle' }, nn); nt.textContent = 'N';

    /* ---------- Fiche d'information et trajets ---------- */
    var home = CITIES[0], selected = null;
    function showCard(c) {
      card.textContent = '';
      var left = document.createElement('div');
      var tag = document.createElement('span'); tag.className = 'map__tag'; tag.textContent = c.tag + (c.route ? ' · ' + c.mode : '');
      var h = document.createElement('h3'); h.textContent = c.name;
      left.appendChild(tag); left.appendChild(h);
      var p = document.createElement('p'); p.textContent = c.text;
      card.appendChild(left); card.appendChild(p);
    }
    function drawRoute(c) {
      gRoutes.textContent = '';
      if (!c.route) return;
      var a = home.p, b = c.p, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var vx = b[0] - a[0], vy = b[1] - a[1], len = Math.sqrt(vx * vx + vy * vy);
      var nx = -vy / len, ny = vx / len; if (ny > 0) { nx = -nx; ny = -ny; }      // courbe vers le nord
      var cx = mx + nx * len * .2, cy = my + ny * len * .2;
      var path = el('path', { class: 'm-route', pathLength: 1, d: 'M' + f(a) + ' Q' + f([cx, cy]) + ' ' + f(b) }, gRoutes);
      var lx = .25 * a[0] + .5 * cx + .25 * b[0], ly = .25 * a[1] + .5 * cy + .25 * b[1];
      var t = el('text', { class: 'm-routetxt', x: lx, y: ly - 7, 'text-anchor': 'middle' }, gRoutes); t.textContent = c.route;
      t.style.opacity = 0; t.style.transition = 'opacity .5s .5s';
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { path.classList.add('is-on'); t.style.opacity = 1; }); });
    }
    function select(c) {
      if (selected) selected.node.classList.remove('is-sel');
      selected = c; c.node.classList.add('is-sel');
      showCard(c); drawRoute(c);
    }
    CITIES.forEach(function (c) {
      c.node.addEventListener('click', function () { if (!dragMoved) select(c); });
      c.node.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c); } });
    });
    select(home);

    /* ---------- Couches ---------- */
    $$('[data-layer]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('is-on', on);
        var grp = svg.querySelector('[data-layer-g="' + b.getAttribute('data-layer') + '"]');
        if (grp) grp.classList.toggle('is-off', !on);
      });
    });

    /* ---------- Zoom et déplacement ---------- */
    var view = { cx: W / 2, cy: H / 2, w: W }, def = { cx: W / 2, cy: H / 2, w: W };
    function aspect() { var r = svg.getBoundingClientRect(); return r.width ? r.height / r.width : .65; }
    function apply() {
      var h = view.w * aspect();
      svg.setAttribute('viewBox', [(view.cx - view.w / 2).toFixed(1), (view.cy - h / 2).toFixed(1), view.w.toFixed(1), h.toFixed(1)].join(' '));
      svg.classList.toggle('is-zoomed', view.w < def.w - 1);
    }
    function defaults() {
      var narrow = svg.getBoundingClientRect().width < 640;
      def = narrow ? { cx: 560, cy: 310, w: 560 } : { cx: W / 2, cy: H / 2, w: W };
    }
    function clampView(v) {
      return { cx: clamp(v.cx, 40, W - 40), cy: clamp(v.cy, 20, H - 20), w: clamp(v.w, 200, 1180) };
    }
    function go(target, dur) {
      var t = clampView(target), from = { cx: view.cx, cy: view.cy, w: view.w };
      if (CA.reduce || !dur) { view = t; apply(); return; }
      CA.tween(dur, function (k) {
        view = { cx: from.cx + (t.cx - from.cx) * k, cy: from.cy + (t.cy - from.cy) * k, w: from.w + (t.w - from.w) * k };
        apply();
      }, CA.ease.out);
    }
    defaults(); view = { cx: def.cx, cy: def.cy, w: def.w }; apply();
    var lastW = svg.getBoundingClientRect().width;
    window.addEventListener('resize', function () {
      var w = svg.getBoundingClientRect().width;
      if ((w < 640) !== (lastW < 640)) { defaults(); view = { cx: def.cx, cy: def.cy, w: def.w }; }
      lastW = w; apply();
    });
    $$('[data-zoom]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var z = b.getAttribute('data-zoom');
        if (z === 'in') go({ cx: view.cx, cy: view.cy, w: view.w * .68 }, 380);
        else if (z === 'out') go({ cx: view.cx, cy: view.cy, w: view.w / .68 }, 380);
        else go({ cx: def.cx, cy: def.cy, w: def.w }, 520);
      });
    });

    var drag = null, dragMoved = false;
    svg.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.pointerType === 'touch' && !svg.classList.contains('is-zoomed')) return;
      drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, id: e.pointerId, captured: false };
      dragMoved = false;
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.captured && Math.abs(dx) + Math.abs(dy) > 6) {
        drag.captured = true; dragMoved = true; svg.classList.add('is-dragging');
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
      }
      if (!drag.captured) return;
      var k = view.w / svg.getBoundingClientRect().width;
      var t = clampView({ cx: drag.cx - dx * k, cy: drag.cy - dy * k, w: view.w });
      view.cx = t.cx; view.cy = t.cy; apply();
    });
    function endDrag(e) {
      if (!drag) return;
      svg.classList.remove('is-dragging'); drag = null;
      window.setTimeout(function () { dragMoved = false; }, 0);
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);

    /* ---------- Entrée : tracés qui se dessinent, halo qui pulse ---------- */
    function enter() {
      wrap.classList.add('is-drawn');
      if (home.halo && !CA.reduce) home.halo.classList.add('is-pulse');
    }
    if (CA.reduce || !('IntersectionObserver' in window)) enter();
    else {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { enter(); io.disconnect(); } }, { threshold: .3 });
      io.observe(wrap);
    }
  });
})();
