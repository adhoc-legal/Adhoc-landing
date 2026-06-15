/* ADHOC — interacciones y animaciones (vanilla) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── NAV: estado scrolled + hamburguesa ── */
  var nav = document.querySelector('nav');
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
  }

  /* ── HERO: dibujar highlight ── */
  var heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    heroTitle.classList.add('pre');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        heroTitle.classList.remove('pre');
        heroTitle.classList.add('lit');
      });
    });
    setTimeout(function () {
      heroTitle.classList.remove('pre');
      heroTitle.classList.add('lit', 'hl-done');
    }, 1300);
  }

  /* ── CONTADOR REGRESIVO Ley 21.719 ── */
  (function () {
    var box = document.getElementById('countdown');
    if (!box) return;
    var cd = document.querySelector('.hero-countdown');
    // 1 de diciembre de 2026, 00:00 hora de Chile continental (UTC-3)
    var target = new Date('2026-12-01T00:00:00-03:00').getTime();
    var elD = box.querySelector('[data-cd="days"]');
    var elH = box.querySelector('[data-cd="hours"]');
    var elM = box.querySelector('[data-cd="mins"]');
    var elS = box.querySelector('[data-cd="secs"]');
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var timer;
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        if (timer) clearInterval(timer);
        if (cd) {
          var lbl = cd.querySelector('.cd-label');
          if (lbl) lbl.textContent = 'La Ley 21.719 ya está vigente.';
        }
        box.innerHTML = '<a class="cd-live" href="#evaluacion">Ponte al día ahora →</a>';
        return;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      if (elD) elD.textContent = d;
      if (elH) elH.textContent = pad(h);
      if (elM) elM.textContent = pad(m);
      if (elS) elS.textContent = pad(sec);
    }
    tick();
    timer = setInterval(tick, 1000);
  })();

  /* ── Días restantes en la barra de anuncio ── */
  (function () {
    var el = document.getElementById('announce-days');
    if (!el) return;
    var target = new Date('2026-12-01T00:00:00-03:00').getTime();
    function upd() {
      var diff = target - Date.now();
      if (diff <= 0) {
        var bar = document.getElementById('announce');
        if (bar) bar.innerHTML = '<span class="announce-txt">La Ley 21.719 ya está vigente. Ponte al día ahora.</span><span class="announce-cta">Evalúa tu empresa <span class="arr">&#8594;</span></span>';
        return;
      }
      el.textContent = Math.floor(diff / 86400000);
    }
    upd();
    setInterval(upd, 60000);
  })();

  /* ── REVEAL on scroll ── */
  function setupReveal() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.classList.contains('reveal') || child.classList.contains('reveal-clip')) {
          child.setAttribute('data-delay', i * step);
        }
      });
    });

    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-clip'));
    if (reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }

    function reveal(el) {
      var delay = el.getAttribute('data-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      el.classList.add('in');
      var d = parseInt(delay, 10) || 0;
      setTimeout(function () { el.classList.add('shown'); }, 760 + d);
    }
    function check() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = els.length - 1; i >= 0; i--) {
        var el = els[i];
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          reveal(el);
          els.splice(i, 1);
        }
      }
    }
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    setTimeout(function () {
      document.querySelectorAll('.reveal:not(.shown), .reveal-clip:not(.shown)').forEach(function (e) {
        var r = e.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (r.top < vh * 1.1 && r.bottom > -50) { e.classList.add('in'); e.classList.add('shown'); }
      });
    }, 1600);
  }
  setupReveal();

  /* ── COUNT-UP para números ── */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals'), 10) || 0;
    var dur = 1400, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(tick);
  }
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (counters.length) {
    if (reduce) {
      counters.forEach(function (c) { c.textContent = parseFloat(c.getAttribute('data-count')).toFixed(parseInt(c.getAttribute('data-decimals'), 10) || 0); });
    } else {
      var checkCount = function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        for (var i = counters.length - 1; i >= 0; i--) {
          var c = counters[i];
          var r = c.getBoundingClientRect();
          if (r.top < vh * 0.9 && r.bottom > 0) { countUp(c); counters.splice(i, 1); }
        }
      };
      checkCount();
      window.addEventListener('scroll', checkCount, { passive: true });
      setTimeout(function () {
        counters.slice().forEach(function (c) { c.textContent = parseFloat(c.getAttribute('data-count')).toFixed(parseInt(c.getAttribute('data-decimals'), 10) || 0); });
      }, 1500);
    }
  }

  /* ── Imagen de equipo: fallback a placeholder monograma ── */
  document.querySelectorAll('.team-photo').forEach(function (img) {
    img.addEventListener('error', function () {
      var ph = img.parentElement.querySelector('.team-ph');
      if (ph) { img.style.display = 'none'; ph.style.display = 'flex'; }
    });
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
  });

  /* ── TOGGLE DARK / LIGHT ── */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('adhoc-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('adhoc-theme', 'dark');
      }
    });
  }

  /* ── CTA flotante (móvil) ── */
  var floatCta = document.querySelector('.float-cta');
  var contacto = document.getElementById('contacto');
  if (floatCta) {
    window.addEventListener('scroll', function () {
      var pastHero = window.scrollY > window.innerHeight * 0.8;
      var inContacto = contacto && contacto.getBoundingClientRect().top < window.innerHeight * 0.9;
      floatCta.classList.toggle('show', pastHero && !inContacto);
    }, { passive: true });
  }

  /* ── FORM: validación + envío real vía Formspree ── */
  var form = document.getElementById('contactForm');
  var toast = document.getElementById('toast');
  var errorMsg = document.getElementById('formErrorMsg');

  if (form) {
    form.querySelectorAll('[required]').forEach(function (f) {
      f.addEventListener('input', function () { f.classList.remove('error'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* validación */
      var valid = true;
      form.querySelectorAll('[required]').forEach(function (f) {
        if (!f.value.trim()) { f.classList.add('error'); valid = false; }
        else f.classList.remove('error');
      });
      var email = form.querySelector('#email');
      if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
        email.classList.add('error'); valid = false;
      }
      if (!valid) {
        var firstErr = form.querySelector('.error');
        if (firstErr) firstErr.focus();
        return;
      }

      /* estado enviando */
      var btn = form.querySelector('.form-submit');
      var label = btn.querySelector('.lbl');
      var orig = label ? label.textContent : btn.textContent;
      if (label) label.textContent = 'Enviando…'; else btn.textContent = 'Enviando…';
      btn.disabled = true;
      if (errorMsg) errorMsg.textContent = '';

      /* envío a Formspree */
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            if (label) label.textContent = orig; else btn.textContent = orig;
            btn.disabled = false;
            if (toast) {
              toast.textContent = '✓ Mensaje enviado correctamente';
              toast.classList.add('show');
              setTimeout(function () { toast.classList.remove('show'); }, 3500);
            }
          } else {
            return res.json().then(function (data) {
              throw new Error((data && data.error) || 'Error al enviar');
            });
          }
        })
        .catch(function (err) {
          if (label) label.textContent = orig; else btn.textContent = orig;
          btn.disabled = false;
          if (errorMsg) {
            errorMsg.textContent = 'No se pudo enviar el mensaje. Inténtalo de nuevo o contáctanos por LinkedIn.';
          }
          console.error('Form error:', err);
        });
    });
  }
})();
