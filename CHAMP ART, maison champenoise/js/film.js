/* CHAMP ART — film.js
   Court film d'ambiance dessiné en direct sur un canvas : la caméra glisse le long des photographies
   (cadrage, zoom, travelling), lumière qui balaie, poussière d'or, grain, titres animés.
   Les bouteilles ne sont jamais déformées : on ne fait que recadrer et déplacer la caméra. */
(function () {
  'use strict';
  var CA = window.CA, $ = CA.$, clamp = CA.clamp;
  var W = 1280, H = 720, DUR = 6.6, OVER = 1.0;

  var SCENES = [
    { src: 'assets/img/crystal.webp', n: '01', name: 'Crystal', words: 'Fraîcheur · Finesse · Délicatesse', light: true,
      tint: '243,232,215', ink: '#3A0B15', accent: '#8E6428', a: { x: .36, y: .13, z: 1.12 }, b: { x: .36, y: .7, z: 1.32 } },
    { src: 'assets/img/obsidienne.webp', n: '02', name: 'Obsidienne', words: 'Puissance · Profondeur · Caractère', light: false,
      tint: '15,12,11', ink: '#F3E8D7', accent: '#D8BA7C', a: { x: .36, y: .74, z: 1.6 }, b: { x: .36, y: .22, z: 1.08 } },
    { src: 'assets/img/meteore.webp', n: '03', name: 'Météore', words: 'Originalité · Énergie · Expression', light: false,
      tint: '58,11,21', ink: '#F3E8D7', accent: '#D8BA7C', a: { x: .36, y: .3, z: 1.05 }, b: { x: .42, y: .6, z: 1.5 } }
  ];

  CA.onInit(function () {
    var cv = $('#film'); if (!cv) return;
    var ctx = cv.getContext('2d'), view = cv.closest('.view');
    var btn = $('[data-film-play]'), btnT = $('[data-film-play-t]'), label = $('[data-film-label]'), bar = $('[data-film-bar]');
    var gos = CA.$$('[data-film-go]');
    btn.removeAttribute('aria-pressed');
    var imgs = SCENES.map(function (s) { var i = new Image(); i.onload = function () { s.ok = true; if (!playing) still(); }; i.src = s.src; return i; });

    var total = DUR * SCENES.length, t = CA.reduce ? 2.4 : 0, last = 0, raf = 0, visible = false;
    var playing = !CA.reduce, userPaused = false;
    var motes = []; for (var m = 0; m < 56; m++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 2, v: 8 + Math.random() * 22, ph: Math.random() * 6.28, a: .2 + Math.random() * .5 });

    var grain = document.createElement('canvas'); grain.width = grain.height = 160;
    (function () { var g = grain.getContext('2d'), d = g.createImageData(160, 160); for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 26; } g.putImageData(d, 0, 0); })();
    var vig = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(15,6,8,.5)');

    function drawScene(i, u, alpha, now) {
      var s = SCENES[i], img = imgs[i]; if (!s.ok) return;
      var e = CA.ease.inOut(clamp(u)), x = s.a.x + (s.b.x - s.a.x) * e, y = s.a.y + (s.b.y - s.a.y) * e, z = s.a.z + (s.b.z - s.a.z) * e;
      var k = W / img.naturalWidth * z, sw = W / k, sh = H / k;
      var sx = clamp(x * img.naturalWidth - sw / 2, 0, img.naturalWidth - sw), sy = clamp(y * img.naturalHeight - sh / 2, 0, img.naturalHeight - sh);
      ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      // voile pour la lisibilité du titre
      var g = ctx.createLinearGradient(0, 0, W * .66, 0);
      g.addColorStop(0, 'rgba(' + s.tint + ',' + (s.light ? .92 : .86) + ')'); g.addColorStop(.6, 'rgba(' + s.tint + ',.35)'); g.addColorStop(1, 'rgba(' + s.tint + ',0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // titre
      var local = u * DUR, ta = clamp((local - .5) / .9) * clamp((DUR - .3 - local) / .7), ty = (1 - clamp((local - .5) / 1.1)) * 26;
      ctx.globalAlpha = alpha * ta; ctx.fillStyle = s.accent; ctx.textBaseline = 'alphabetic';
      ctx.font = '500 17px Jost, Avenir, "Segoe UI", sans-serif'; if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
      ctx.fillText('COLLECTION ' + s.n, 86, 250 + ty);
      ctx.fillStyle = s.ink; ctx.font = 'italic 400 ' + (s.name.length > 8 ? 112 : 132) + 'px "Cormorant Garamond", "Iowan Old Style", Georgia, serif'; if ('letterSpacing' in ctx) ctx.letterSpacing = '-2px';
      ctx.fillText(s.name, 80, 372 + ty * 1.3);
      ctx.font = '400 21px Jost, Avenir, "Segoe UI", sans-serif'; if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillStyle = s.ink; ctx.fillText(s.words, 86, 430 + ty * 1.5);
      ctx.fillStyle = s.accent; ctx.fillRect(86, 462 + ty * 1.6, 90 * clamp((local - 1) / 1.2), 2);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.globalAlpha = 1;
    }

    function render(time, now) {
      var s = Math.min(SCENES.length - 1, Math.floor(time / DUR)), local = time - s * DUR;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#1b0a0d'; ctx.fillRect(0, 0, W, H);
      drawScene(s, local / DUR, 1, now);
      var nx = (s + 1) % SCENES.length, flash = 0;
      if (local > DUR - OVER) { var a = (local - (DUR - OVER)) / OVER; drawScene(nx, 0, CA.ease.inOut(a), now); flash = Math.sin(Math.PI * a); }
      else if (s === 0 && time < OVER * .6) { /* départ : montée de lumière */ }
      // balayage de lumière
      ctx.globalCompositeOperation = 'lighter';
      var lx = (((time * .2) % 1.7) - .35) * W, lg = ctx.createLinearGradient(lx - 150, 0, lx + 230, 0);
      lg.addColorStop(0, 'rgba(255,230,180,0)'); lg.addColorStop(.5, 'rgba(255,230,180,.13)'); lg.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + 230, 0); ctx.lineTo(lx - 120, H); ctx.lineTo(lx - 150, H); ctx.closePath(); ctx.fill();
      // poussière d'or
      for (var i = 0; i < motes.length; i++) {
        var p = motes[i]; p.y -= p.v * (1 / 60); p.x += Math.sin(now / 1800 + p.ph) * .25; if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        ctx.fillStyle = 'rgba(216,186,124,' + (p.a * (.6 + .4 * Math.sin(now / 600 + p.ph))).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (flash > 0) { ctx.fillStyle = 'rgba(216,186,124,' + (flash * .28).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(-Math.random() * 80, -Math.random() * 80); ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, W + 160, H + 160); ctx.restore();
      var shown = local > DUR - OVER * .4 ? nx : s;
      if (label.getAttribute('data-i') !== String(shown)) { label.setAttribute('data-i', shown); label.textContent = SCENES[shown].n + ' · ' + SCENES[shown].name; gos.forEach(function (b, k) { b.classList.toggle('is-on', k === shown); }); }
      bar.style.transform = 'scaleX(' + (time / total).toFixed(4) + ')';
    }

    function still() { render(t, performance.now()); }
    function loop(now) {
      raf = 0;
      if (!playing || !visible || !view.classList.contains('is-active')) { last = 0; return; }
      var dt = last ? Math.min(.06, (now - last) / 1000) : 0; last = now; t = (t + dt) % total;
      render(t, now); raf = window.requestAnimationFrame(loop);
    }
    function kick() { if (!raf && playing && visible) raf = window.requestAnimationFrame(loop); }
    function setPlaying(p) { playing = p; btnT.textContent = p ? 'Pause' : 'Lecture'; btn.classList.toggle('is-paused', !p); if (p) kick(); else still(); }

    btn.addEventListener('click', function () { userPaused = playing; setPlaying(!playing); });
    gos.forEach(function (b) { b.addEventListener('click', function () { t = parseInt(b.getAttribute('data-film-go'), 10) * DUR + .01; if (!playing) { userPaused = false; setPlaying(true); } else still(); }); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { last = 0; kick(); } }).observe(cv); else visible = true;
    CA.on('view', function () { last = 0; kick(); });
    btnT.textContent = playing ? 'Pause' : 'Lecture'; btn.classList.toggle('is-paused', !playing);
    if (document.fonts && document.fonts.load) document.fonts.load('italic 120px "Cormorant Garamond"').then(function () { if (!playing) still(); }, function () {});
    still();
  });
})();
