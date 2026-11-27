/* CHAMP ART — brush.js
   Coups de pinceau dorés générés à la volée : une courbe de Bézier, quelques dizaines de brins
   qui s'écartent vers la pointe, comme les poils d'un pinceau. Inspiré du geste du logo,
   sans en reprendre le dessin. Le tracé se dessine à l'apparition. */
(function () {
  'use strict';
  var CA = window.CA, NS = 'http://www.w3.org/2000/svg';
  CA.brushes = {};

  function rng(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  var PRESETS = {
    hero:    { w: 1200, h: 800, pts: [[260, 850], [500, 910], [800, 330], [1290, 90]], n: 44, spread: 30, wmin: 1, wmax: 3.4, seed: 11, colors: ['#B8894A', '#C9A15B', '#A67536', '#D8BA7C'], bow: 1.35, par: 'none' },
    meteore: { w: 1200, h: 800, pts: [[500, 830], [820, 880], [960, 300], [1300, 40]], n: 40, spread: 26, wmin: 1, wmax: 3.2, seed: 5, colors: ['#B3243F', '#B8894A', '#9B2C6B', '#D8BA7C', '#7A1A2D'], bow: 1.2 },
    divider: { w: 1200, h: 160, pts: [[-50, 110], [300, 20], [720, 150], [1270, 36]], n: 24, spread: 7, wmin: .8, wmax: 2.4, seed: 23, colors: ['#B8894A', '#C9A15B', '#A67536'], bow: 1.1 },
    contact: { w: 1200, h: 300, pts: [[-60, 240], [320, 290], [780, 40], [1270, 120]], n: 38, spread: 24, wmin: 1, wmax: 3.4, seed: 3, colors: ['#B8894A', '#C9A15B', '#A67536', '#D8BA7C'], bow: 1.2 }
  };

  function path(p) {
    return 'M' + p[0][0] + ' ' + p[0][1] + ' C' + p[1][0] + ' ' + p[1][1] + ' ' + p[2][0] + ' ' + p[2][1] + ' ' + p[3][0] + ' ' + p[3][1];
  }

  function build(svg, o) {
    svg.setAttribute('viewBox', '0 0 ' + o.w + ' ' + o.h);
    svg.setAttribute('preserveAspectRatio', o.par || 'xMidYMid slice');
    var rnd = rng(o.seed), P = o.pts;
    var dx = P[3][0] - P[0][0], dy = P[3][1] - P[0][1], len = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / len, ny = dx / len;          // normale au tracé
    var f = [0.04, 0.3, 0.75, 1.0 * o.bow];     // l'écart grandit vers la pointe
    var strands = [];
    for (var i = 0; i < o.n; i++) {
      var t = (i / (o.n - 1)) * 2 - 1;          // -1 .. 1 sur la largeur du pinceau
      var at = Math.abs(t), off = t * o.spread * (0.85 + rnd() * .3);
      var q = P.map(function (pt, k) { return [pt[0] + nx * off * f[k], pt[1] + ny * off * f[k]]; });
      var s0 = Math.pow(at, 1.3) * 0.4 * rnd();
      var e = Math.min(1, 0.74 + 0.26 * rnd() + (1 - at) * 0.1);
      var el = document.createElementNS(NS, 'path');
      el.setAttribute('d', path(q));
      el.setAttribute('pathLength', '1');
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', o.colors[Math.floor(rnd() * o.colors.length)]);
      el.setAttribute('stroke-width', ((1 - at * .55) * (o.wmin + rnd() * (o.wmax - o.wmin))).toFixed(2));
      el.setAttribute('stroke-opacity', (0.55 + 0.4 * (1 - at * .7) * (0.6 + rnd() * .4)).toFixed(2));
      el.setAttribute('stroke-dasharray', '0 3');
      if (o.par === 'none') el.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(el);
      strands.push({ el: el, s0: s0, e: e });
    }
    return strands;
  }

  CA.onInit(function () {
    CA.$$('svg[data-brush]').forEach(function (svg) {
      var key = svg.getAttribute('data-brush'), o = PRESETS[key];
      if (!o) return;
      var strands = build(svg, o);
      function set(p) {
        for (var i = 0; i < strands.length; i++) {
          var s = strands[i], L = CA.clamp(p - s.s0, 0, s.e - s.s0);
          s.el.setAttribute('stroke-dasharray', L.toFixed(4) + ' 3');
          s.el.setAttribute('stroke-dashoffset', (-s.s0).toFixed(4));
        }
      }
      var played = false;
      function play(dur, delay) {
        if (played) return; played = true;
        if (CA.reduce) { set(1); return; }
        window.setTimeout(function () { CA.tween(dur || 2000, set, CA.ease.inOut); }, delay || 0);
      }
      CA.brushes[key] = { set: set, play: play };
      set(CA.reduce ? 1 : 0);

      if (key === 'hero') return;                // lancé après l'entrée des photographies (scenes.js)
      if (CA.reduce || !('IntersectionObserver' in window)) { set(1); return; }
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { play(key === 'divider' ? 1700 : 2300, 150); io.disconnect(); }
      }, { threshold: .25 });
      io.observe(svg);
    });
  });
})();
