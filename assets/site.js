(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toggle(btn, panel, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
  }

  /* Meni */
  var ddBtn = $('.hb-dd > button'), dd = $('.hb-menu');
  var mobBtn = $('.hb-burger'), mob = $('.hb-mob');
  var svBtn = $('.hb-mob > button'), sv = $('.hb-msv');
  function closeMenus() {
    if (dd) toggle(ddBtn, dd, false);
    if (mob) toggle(mobBtn, mob, false);
    if (sv) toggle(svBtn, sv, false);
  }
  if (ddBtn) {
    ddBtn.addEventListener('click', function (e) { e.stopPropagation(); toggle(ddBtn, dd, dd.hidden); });
    mobBtn.addEventListener('click', function (e) { e.stopPropagation(); toggle(mobBtn, mob, mob.hidden); if (mob.hidden) toggle(svBtn, sv, false); });
    svBtn.addEventListener('click', function () { toggle(svBtn, sv, sv.hidden); });
    mob.addEventListener('click', function (e) { e.stopPropagation(); if (e.target.closest('a')) closeMenus(); });
    d.addEventListener('click', closeMenus);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
  }

  /* Navigacija: skriva se pri skrolovanju nadole, vraća pri skrolovanju nagore */
  var bar = $('.site-bar');
  if (bar) {
    var lastY = scrollY, ticking = false;
    var syncBar = function () {
      ticking = false;
      var y = Math.max(0, scrollY), diff = y - lastY;
      bar.classList.toggle('stuck', y > 0);
      if (y <= bar.offsetHeight) bar.classList.remove('away');
      else if (Math.abs(diff) < 6) return;
      else if (diff < 0) bar.classList.remove('away');
      else if (!bar.querySelector('[aria-expanded="true"]') && !bar.querySelector(":focus-visible")) bar.classList.add('away');
      lastY = y;
    };
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(syncBar); }
    }, { passive: true });
    bar.addEventListener('focusin', function () { bar.classList.remove('away'); });
    syncBar();
  }
  
  /* Pre/posle klizači: posle puštanja se vraćaju na sredinu */
  $$('.wb-t').forEach(function (tile) {
    var range = $('.wb-range', tile), timer = 0;
    function set(v) { tile.style.setProperty('--p', v + '%'); }
    function cancel() { clearTimeout(timer); timer = 0; }
    range.addEventListener('input', function () { cancel(); tile.classList.remove('anim'); set(range.value); });
    range.addEventListener('pointerdown', cancel);
    function release() {
      cancel();
      timer = setTimeout(function () { tile.classList.add('anim'); range.value = 50; set(50); }, 600);
    }
    ['pointerup', 'pointercancel', 'touchend', 'blur'].forEach(function (ev) { range.addEventListener(ev, release); });
  });

  /* Filter radova */
  var grid = $('.wb-grid');
  $$('.wb-pill').forEach(function (pill, _, pills) {
    pill.addEventListener('click', function () {
      var f = pill.dataset.f, shown = 0;
      pills.forEach(function (p) { p.setAttribute('aria-pressed', p === pill ? 'true' : 'false'); });
      $$('.wb-t', grid).forEach(function (t) {
        t.hidden = f !== 'all' && t.dataset.cat !== f;
        if (!t.hidden) shown++;
      });
      grid.classList.toggle('one', shown === 1);
    });
  });

  /* Kolone recenzija: animacija je CSS (kompozitor), a JS pravi duplikat za petlju i pauzira van ekrana */
  var cols = $('.pb-cols');
  if (cols && !reduce && 'IntersectionObserver' in window) {
    var cloned = false;
    new IntersectionObserver(function (es) {
      var near = es[0].isIntersecting;
      /* Duplikati tek kad je sekcija blizu: kopirana slika bi se inače odmah učitala i pored loading="lazy" */
      if (near && !cloned) {
        cloned = true;
        $$('.pb-track', cols).forEach(function (track) {
          $$('.pb-card', track).forEach(function (card) {
            var c = card.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            track.appendChild(c);
          });
        });
      }
      cols.classList.toggle('run', near);
    }, { rootMargin: '200px' }).observe(cols);
  }

  /* FAQ */
  var ind = $('.fq-ind'), big = $('.fq-big'), items = $$('.fq-item');
  function moveInd() {
    var b = $('.fq-q.on');
    if (ind && b) {
      ind.style.height = b.offsetHeight + 'px';
      ind.style.transform = 'translateY(' + b.closest('.fq-item').offsetTop + 'px)';
    }
  }
  items.forEach(function (item) {
    var b = $('.fq-q', item);
    b.addEventListener('click', function () {
      items.forEach(function (o) {
        var on = o === item;
        o.classList.toggle('open', on);
        $('.fq-q', o).classList.toggle('on', on);
        $('.fq-q', o).setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      big.textContent = $('.fq-inl', item).textContent;
      moveInd();
    });
  });
  if (ind) {
    addEventListener('resize', moveInd, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(moveInd);
    moveInd();
  }

  if (reduce) return;

  /* Suptilno pojavljivanje pri skrolovanju; hero se nikad ne skriva da ne bi kasnio LCP */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-rv] > *').forEach(function (el) {
      var k = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.classList.add('rv');
      el.style.transitionDelay = Math.min(k * 90, 270) + 'ms';
      io.observe(el);
    });
  }

  /* Blago skrolovanje točkićem (samo miš, kao u dizajnu) */
  if (!matchMedia('(pointer: fine)').matches) return;
  var root = d.documentElement, target = scrollY, cur = scrollY, raf = 0;
  function max() { return Math.max(0, root.scrollHeight - innerHeight); }
  function loop() {
    cur += (target - cur) * 0.1;
    if (Math.abs(target - cur) < 0.5) { cur = target; scrollTo(0, cur); raf = 0; return; }
    scrollTo(0, cur);
    raf = requestAnimationFrame(loop);
  }
  function go() { if (!raf) raf = requestAnimationFrame(loop); }
  addEventListener('wheel', function (e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    target = Math.max(0, Math.min(max(), target + (e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY)));
    go();
  }, { passive: false });
  addEventListener('scroll', function () { if (!raf) target = cur = scrollY; }, { passive: true });
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    var el = a && a.hash.length > 1 && d.getElementById(a.hash.slice(1));
    if (!el) return;
    e.preventDefault();
    history.pushState(null, '', a.hash);
    cur = scrollY;
    target = Math.min(max(), el.getBoundingClientRect().top + scrollY);
    go();
  });
})();
