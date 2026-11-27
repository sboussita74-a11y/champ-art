/* CHAMP ART — dust.js
   Particules dessinées sur canvas : poussière d'or (accueil), bulles (savoir-faire), étincelles (Météore, au toucher).
   Une seule boucle ; chaque canvas ne s'anime que si sa vue est active et visible. */
(function () {
  'use strict';
  var CA = window.CA, items = [], raf = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  var GOLD = ['216,186,124', '184,137,74', '243,232,215'];
  var HOT = ['216,186,124', '184,137,74', '179,36,63', '155,44,107', '243,232,215'];

  function make(cv) {
    var type = cv.getAttribute('data-dust'), ctx = cv.getContext('2d');
    var it = { cv: cv, ctx: ctx, type: type, w: 0, h: 0, dpr: 1, p: [], vis: false, view: cv.closest('.view'), last: 0 };
    it.size = function () {
      var r = cv.getBoundingClientRect(); it.dpr = Math.min(window.devicePixelRatio || 1, 2);
      it.w = Math.max(1, r.width); it.h = Math.max(1, r.height);
      cv.width = Math.round(it.w * it.dpr); cv.height = Math.round(it.h * it.dpr);
      ctx.setTransform(it.dpr, 0, 0, it.dpr, 0, 0);
      var n = Math.round(it.w * it.h / (type === 'bubbles' ? 16000 : type === 'burst' ? 22000 : 14000));
      it.p = []; for (var i = 0; i < Math.min(n, 90); i++) it.p.push(spawn(it, true));
    };
    it.burst = function (x, y) {
      for (var i = 0; i < 70; i++) {
        var a = rnd(0, Math.PI * 2), v = rnd(1.5, 7.5);
        it.p.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, r: rnd(.8, 2.8), life: 1, dec: rnd(.008, .02), c: HOT[Math.floor(Math.random() * HOT.length)], spark: true });
      }
    };
    return it;
  }

  function spawn(it, anywhere) {
    var t = it.type;
    if (t === 'bubbles') return { x: rnd(0, it.w), y: anywhere ? rnd(0, it.h) : it.h + 12, r: rnd(2, 9), vy: rnd(.25, .9), ph: rnd(0, 6.28), a: rnd(.12, .4) };
    if (t === 'burst') return { x: rnd(0, it.w), y: anywhere ? rnd(0, it.h) : it.h + 8, r: rnd(.6, 1.9), vy: rnd(.15, .5), ph: rnd(0, 6.28), a: rnd(.15, .5), c: HOT[Math.floor(Math.random() * 2)], amb: true };
    return { x: rnd(0, it.w), y: anywhere ? rnd(0, it.h) : it.h + 8, r: rnd(.5, 2.1), vy: rnd(.12, .42), ph: rnd(0, 6.28), a: rnd(.15, .6), c: GOLD[Math.floor(Math.random() * GOLD.length)] };
  }

  function draw(it, dt, now) {
    var ctx = it.ctx, i, p;
    ctx.clearRect(0, 0, it.w, it.h);
    for (i = it.p.length - 1; i >= 0; i--) {
      p = it.p[i];
      if (p.spark) {
        p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy = p.vy * .985 + .06; p.life -= p.dec;
        if (p.life <= 0) { it.p.splice(i, 1); continue; }
        ctx.fillStyle = 'rgba(' + p.c + ',' + (p.life * .9).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.5 + p.life), 0, 6.283); ctx.fill();
        continue;
      }
      p.y -= p.vy * dt * .06; p.x += Math.sin(now / 1900 + p.ph) * .18;
      if (p.y < -14) { it.p[i] = spawn(it, false); continue; }
      if (it.type === 'bubbles') {
        ctx.strokeStyle = 'rgba(243,232,215,' + p.a + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(243,232,215,' + (p.a * .25) + ')'; ctx.beginPath(); ctx.arc(p.x - p.r * .3, p.y - p.r * .3, p.r * .22, 0, 6.283); ctx.fill();
      } else {
        var tw = .6 + .4 * Math.sin(now / 700 + p.ph);
        ctx.fillStyle = 'rgba(' + p.c + ',' + (p.a * tw).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }
  }

  function loop(now) {
    raf = 0; var any = false;
    items.forEach(function (it) {
      if (!it.vis || !it.view.classList.contains('is-active')) return;
      any = true; var dt = Math.min(48, now - (it.last || now)); it.last = now; draw(it, dt, now);
    });
    if (any) raf = window.requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !CA.reduce) raf = window.requestAnimationFrame(loop); }

  CA.onInit(function () {
    if (CA.reduce) return;
    CA.$$('canvas[data-dust]').forEach(function (cv) {
      var it = make(cv); items.push(it);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { it.vis = en[0].isIntersecting; if (it.vis) { it.last = 0; kick(); } }).observe(cv);
      } else it.vis = true;
      if (it.type === 'burst') {
        var host = cv.closest('[data-burst]');
        host.addEventListener('pointerdown', function (e) {
          if (e.target.closest('a,button')) return;
          var r = cv.getBoundingClientRect(); it.burst(e.clientX - r.left, e.clientY - r.top); kick();
        });
        var t = window.setInterval(function () { if (it.vis && it.view.classList.contains('is-active') && Math.random() < .5) it.burst(rnd(it.w * .2, it.w * .9), rnd(it.h * .15, it.h * .6)); }, 3200);
        void t;
      }
    });
    function resize() { items.forEach(function (it) { if (it.view.classList.contains('is-active')) it.size(); else it.stale = true; }); kick(); }
    window.addEventListener('resize', resize);
    CA.on('view', function (d) { items.forEach(function (it) { if (it.view === d.el) { it.size(); it.last = 0; } }); kick(); });
  });
})();
