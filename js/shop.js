/* CHAMP ART — shop.js
   Panier de DÉMONSTRATION : sélection, quantités, retrait d'un produit, récapitulatif, parcours de commande simulé.
   Aucun paiement, aucune donnée bancaire, aucune requête réseau. Le panier est mémorisé dans ce navigateur seulement. */
(function () {
  'use strict';
  var CA = window.CA, $ = CA.$, $$ = CA.$$;
  var CAT = {
    crystal:    { name: 'Crystal',    price: 49, img: 'assets/img/crystal-640.webp',    col: 'Collection 01', hash: 'crystal' },
    obsidienne: { name: 'Obsidienne', price: 59, img: 'assets/img/obsidienne-640.webp', col: 'Collection 02', hash: 'obsidienne' },
    meteore:    { name: 'Météore',    price: 54, img: 'assets/img/meteore-640.webp',    col: 'Collection 03', hash: 'meteore' }
  };
  var KEY = 'champart-demo-panier', cart = {}, info = { prenom: '', mode: '' }, step = 1, timers = [];

  function fmt(n) { return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }); }
  function load() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY) || '{}');
      Object.keys(CAT).forEach(function (k) { var n = parseInt(o[k], 10); if (n > 0) cart[k] = Math.min(n, 99); });
    } catch (e) { cart = {}; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* stockage indisponible : le panier reste en mémoire */ } }
  function count() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); }
  function total() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k] * CAT[k].price; }, 0); }

  /* ---------- Notification ---------- */
  var toastT = 0;
  function toast(msg) {
    var t = $('#toast'); $('[data-toast-t]', t).textContent = msg; t.classList.add('is-on');
    window.clearTimeout(toastT); toastT = window.setTimeout(function () { t.classList.remove('is-on'); }, 3600);
  }

  /* ---------- Affichage du panier ---------- */
  function lineHTML(id, n) {
    var p = CAT[id];
    return '<li class="cl" data-id="' + id + '">' +
      '<a class="cl__img arch" href="#' + p.hash + '" tabindex="-1" aria-hidden="true"><img src="' + p.img + '" width="640" height="960" alt=""></a>' +
      '<div class="cl__main"><p class="cl__col">' + p.col + '</p><h3 class="cl__name"><a href="#' + p.hash + '">' + p.name + '</a></h3><p class="cl__unit">' + fmt(p.price) + ' <small>prix fictif</small></p></div>' +
      '<div class="qty" role="group" aria-label="Quantité de ' + p.name + '"><button type="button" data-lq="-1" aria-label="Retirer une bouteille de ' + p.name + '">−</button><output aria-live="polite">' + n + '</output><button type="button" data-lq="1" aria-label="Ajouter une bouteille de ' + p.name + '">+</button></div>' +
      '<p class="cl__tot">' + fmt(n * p.price) + '</p>' +
      '<button class="cl__rm" type="button" data-rm aria-label="Retirer ' + p.name + ' du panier">Retirer</button></li>';
  }
  function sumHTML(id, n) { var p = CAT[id]; return '<li><span>' + n + ' × ' + p.name + '</span><b>' + fmt(n * p.price) + '</b></li>'; }

  function render() {
    var ids = Object.keys(cart), n = count();
    $$('[data-cart-count]').forEach(function (b) {
      var old = b.textContent; b.textContent = n; b.classList.toggle('is-zero', n === 0);
      if (old !== String(n) && n > 0 && !CA.reduce) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
    });
    $$('[data-cart-label]').forEach(function (b) { b.textContent = n ? '(' + n + ')' : ''; });
    var root = $('[data-cart]'); if (!root) return;
    $('[data-lines]', root).innerHTML = ids.map(function (k) { return lineHTML(k, cart[k]); }).join('');
    $('[data-sum-lines]', root).innerHTML = ids.map(function (k) { return sumHTML(k, cart[k]); }).join('');
    $('[data-recap]', root).innerHTML = ids.map(function (k) { var p = CAT[k]; return '<li><span class="cl__img arch"><img src="' + p.img + '" width="640" height="960" alt=""></span><span><b>' + p.name + '</b><small>' + cart[k] + ' × ' + fmt(p.price) + ' · prix fictif</small></span><span class="cl__tot">' + fmt(cart[k] * p.price) + '</span></li>'; }).join('');
    $('[data-sub]', root).textContent = fmt(total()); $('[data-total]', root).textContent = fmt(total());
    var empty = n === 0;
    $('[data-empty]', root).hidden = !empty; $('[data-lines]', root).hidden = empty; $('[data-actions]', root).hidden = empty;
    root.classList.toggle('is-empty', empty);
  }

  function setStep(n) {
    var root = $('[data-cart]'); if (!root) return;
    if (n > 1 && count() === 0 && n !== 4) n = 1;
    step = n; root.setAttribute('data-step', n);
    $$('[data-pane]', root).forEach(function (p) { p.hidden = parseInt(p.getAttribute('data-pane'), 10) !== n; });
    $$('.cs4 li', root).forEach(function (li) {
      var s = parseInt(li.getAttribute('data-s'), 10); li.classList.toggle('is-on', s === n); li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (n === 3) $('[data-recap-mode]', root).textContent = info.mode || 'Livraison à domicile';
    var head = $('.cart__head', root);
    if (CA.view() && CA.view().getAttribute('data-view') === 'panier' && window.pageYOffset > 40) CA.scrollToY(head.getBoundingClientRect().top + window.pageYOffset - 90);
  }

  function clearTimers() { timers.forEach(window.clearTimeout); timers = []; }
  function confirmOrder() {
    var root = $('[data-cart]'), n = count(), tot = total();
    var ref = 'DEMO-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
    $('[data-ref]', root).textContent = ref;
    var who = info.prenom ? ', ' + info.prenom : '';
    $('[data-done-text]', root).textContent = 'Merci' + who + '. Voici la fin d\'un parcours de commande simulé : ' + n + (n > 1 ? ' bouteilles' : ' bouteille') + ', pour un total fictif de ' + fmt(tot) + '. Rien n\'est acheté, rien n\'est payé.';
    cart = {}; save(); render(); setStep(4);
    var steps = $$('.tl li', root), pane = $('.cdone', root);
    steps.forEach(function (li) { li.classList.remove('is-done'); }); pane.classList.remove('is-played'); void pane.offsetWidth; pane.classList.add('is-played');
    clearTimers();
    steps.forEach(function (li, i) { timers.push(window.setTimeout(function () { li.classList.add('is-done'); }, CA.reduce ? 0 : 700 + i * 1100)); });
    window.setTimeout(function () { var t = $('[data-done-title]', root); if (t) t.focus({ preventScroll: true }); }, 60);
  }

  CA.onInit(function () {
    load();
    $$('[data-price]').forEach(function (el) { el.textContent = fmt(CAT[el.getAttribute('data-price')].price); });
    render();

    function add(id, n, btn) {
      cart[id] = Math.min(99, (cart[id] || 0) + n); save(); render();
      toast((n > 1 ? n + ' × ' : '') + CAT[id].name + ' ajouté' + (CAT[id].name === 'Météore' ? 'e' : 'e') + ' à votre sélection');
      if (btn && !CA.reduce) { btn.classList.remove('is-added'); void btn.offsetWidth; btn.classList.add('is-added'); }
    }

    document.addEventListener('click', function (e) {
      var t = e.target.closest('button, a'); if (!t) return;
      var a = t.closest('[data-add]');
      if (a && a.tagName === 'BUTTON') {
        var id = a.getAttribute('data-add'), n = 1;
        if (a.hasAttribute('data-use-qty')) { var o = $('[data-q-out]', a.closest('[data-buy]')); n = o ? parseInt(o.textContent, 10) || 1 : 1; }
        add(id, n, a); return;
      }
      if (t.hasAttribute('data-add-all')) { Object.keys(CAT).forEach(function (k) { cart[k] = Math.min(99, (cart[k] || 0) + 1); }); save(); render(); toast('Les trois cuvées sont dans votre sélection'); return; }
      var q = t.closest('[data-q]');
      if (q) { var out = $('[data-q-out]', q.closest('[data-buy]')); out.textContent = Math.max(1, Math.min(9, (parseInt(out.textContent, 10) || 1) + parseInt(q.getAttribute('data-q'), 10))); return; }
      var lq = t.closest('[data-lq]');
      if (lq) { var li = lq.closest('.cl'), key = li.getAttribute('data-id'); cart[key] = Math.max(1, Math.min(99, cart[key] + parseInt(lq.getAttribute('data-lq'), 10))); save(); render(); var again = $('.cl[data-id="' + key + '"] [data-lq="' + lq.getAttribute('data-lq') + '"]'); if (again) again.focus(); return; }
      if (t.hasAttribute('data-rm')) { var k2 = t.closest('.cl').getAttribute('data-id'); delete cart[k2]; save(); render(); toast(CAT[k2].name + ' retiré du panier'); return; }
      var go = t.closest('[data-cart] [data-go]');
      if (go) { setStep(parseInt(go.getAttribute('data-go'), 10)); return; }
      if (t.hasAttribute('data-confirm')) { confirmOrder(); return; }
    });

    var form = $('[data-cart] form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('[data-error]', form), ok = form.elements.age.checked;
      err.hidden = ok; if (!ok) { form.elements.age.focus(); return; }
      info.prenom = form.elements.prenom.value.trim().slice(0, 40);
      info.mode = ($('input[name="mode"]:checked', form) || {}).value || '';
      setStep(3);
    });

    CA.on('view', function (d) { if (d.id === 'panier') { clearTimers(); setStep(1); } });
  });
})();
