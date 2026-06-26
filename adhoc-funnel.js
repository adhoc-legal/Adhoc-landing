/* ADHOC — Funnel de evaluación Ley N° 21.719 (vanilla, same-origin) */
(function () {
  'use strict';

  var section = document.getElementById('evaluacion');
  if (!section) return;

  var FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjgdwzkv';

  var QUESTIONS = [
    { q: '¿Qué describe mejor a tu organización?', options: [
      { label: 'Profesional independiente', r: 1 },
      { label: 'Empresa pequeña (1–10 personas)', r: 1 },
      { label: 'Pyme (11–50 personas)', r: 2 },
      { label: 'Mediana o grande (50+ personas)', r: 3 },
      { label: 'Aún no me formalizo', r: 2 }
    ] },
    { q: '¿Recopilas o almacenas datos personales de clientes, usuarios o trabajadores?', options: [
      { label: 'Sí, una gran cantidad', r: 3 },
      { label: 'Sí, algunos datos', r: 2 },
      { label: 'Muy pocos', r: 1 },
      { label: 'No recopilo datos personales', r: 0 }
    ] },
    { q: '¿Cuentas con política de privacidad y cláusulas de consentimiento actualizadas?', options: [
      { label: 'Sí, actualizadas a la nueva ley', r: 0 },
      { label: 'Tengo, pero están desactualizadas', r: 2 },
      { label: 'No tengo', r: 3 },
      { label: 'No estoy seguro/a', r: 3 }
    ] },
    { q: '¿Hay alguien responsable de la protección de datos en tu organización?', options: [
      { label: 'Sí, hay un responsable designado', r: 0 },
      { label: 'Alguien lo ve de forma informal', r: 2 },
      { label: 'No hay nadie a cargo', r: 3 }
    ] },
    { q: '¿Compartes o transfieres datos personales con terceros?', options: [
      { label: 'No comparto con terceros', r: 0 },
      { label: 'Sí, con contratos que lo regulan', r: 1 },
      { label: 'Sí, sin contratos claros', r: 3 },
      { label: 'No estoy seguro/a', r: 3 }
    ] },
    { q: '¿Has hecho un registro de actividades de tratamiento o una evaluación de riesgos?', options: [
      { label: 'Sí, está documentado', r: 0 },
      { label: 'Parcialmente', r: 2 },
      { label: 'No lo he hecho', r: 3 }
    ] },
    { q: '¿Has recibido reclamos, solicitudes sobre datos o requerimientos de una autoridad?', legal: true, options: [
      { label: 'Sí, hemos recibido alguno', r: 3 },
      { label: 'No, pero me preocupa', r: 2 },
      { label: 'No, nunca', r: 0 },
      { label: 'No estoy seguro/a', r: 2 }
    ] }
  ];
  var TOTAL = QUESTIONS.length;
  var MAX = QUESTIONS.reduce(function (s, q) { return s + Math.max.apply(null, q.options.map(function (o) { return o.r; })); }, 0);

  function def() { return { step: 0, answers: new Array(TOTAL).fill(null), lead: { name: '', phone: '', email: '' }, screen: 'quiz' }; }
  var state = def();
  try {
    var raw = localStorage.getItem('adhoc_funnel_21719_v1');
    if (raw) {
      var p = JSON.parse(raw);
      state = {
        step: typeof p.step === 'number' ? p.step : 0,
        answers: Array.isArray(p.answers) && p.answers.length === TOTAL ? p.answers : new Array(TOTAL).fill(null),
        lead: p.lead || { name: '', phone: '', email: '' },
        screen: p.screen || 'quiz'
      };
    }
  } catch (e) {}
  function save() { try { localStorage.setItem('adhoc_funnel_21719_v1', JSON.stringify(state)); } catch (e) {} }

  var screens = { quiz: document.getElementById('fnl-quiz'), capture: document.getElementById('fnl-capture'), result: document.getElementById('fnl-result') };
  var host = document.getElementById('fnl-host');
  var bar = document.getElementById('fnl-progress');
  var stepLabel = document.getElementById('fnl-step');
  var legal = document.getElementById('fnl-legal');
  var quizBack = document.getElementById('fnl-quiz-back');

  function showScreen(n) {
    state.screen = n;
    save();
    Object.keys(screens).forEach(function (k) { screens[k].classList.remove('active'); });
    void screens[n].offsetWidth;
    screens[n].classList.add('active');
  }

  function renderStep() {
    var i = state.step, q = QUESTIONS[i];
    stepLabel.textContent = 'Paso ' + (i + 1) + ' de ' + TOTAL;
    bar.style.width = (i / TOTAL * 100) + '%';
    setTimeout(function () { bar.style.width = ((i + 1) / TOTAL * 100) + '%'; }, 20);
    quizBack.hidden = (i === 0);
    legal.hidden = !q.legal;
    var html = '<h3>' + q.q + '</h3><div class="options" role="radiogroup">';
    q.options.forEach(function (opt, idx) {
      var sel = state.answers[i] === idx ? ' selected' : '';
      html += '<button class="opt' + sel + '" role="radio" aria-checked="' + (sel ? 'true' : 'false') + '" data-idx="' + idx + '"><span class="opt-label">' + opt.label + '</span><span class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></button>';
    });
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('.opt').forEach(function (btn) {
      btn.addEventListener('click', function () { select(parseInt(btn.dataset.idx, 10), btn); });
    });
  }

  var advancing = false;
  function select(idx, btn) {
    if (advancing) return;
    var i = state.step;
    state.answers[i] = idx;
    host.querySelectorAll('.opt').forEach(function (b) { b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('selected');
    btn.setAttribute('aria-checked', 'true');
    save();
    advancing = true;
    setTimeout(function () {
      advancing = false;
      if (i < TOTAL - 1) {
        state.step = i + 1;
        save();
        renderStep();
      } else {
        showScreen('capture');
      }
    }, 280);
  }
  quizBack.addEventListener('click', function () {
    if (state.step > 0) { state.step--; save(); renderStep(); }
  });

  var nameI = document.getElementById('fnl-name');
  var phoneI = document.getElementById('fnl-phone');
  var emailI = document.getElementById('fnl-email');
  var fName = document.getElementById('fnl-field-name');
  var fPhone = document.getElementById('fnl-field-phone');
  var fEmail = document.getElementById('fnl-field-email');
  nameI.value = state.lead.name || '';
  phoneI.value = state.lead.phone || '';
  emailI.value = state.lead.email || '';
  phoneI.addEventListener('input', function () { phoneI.value = phoneI.value.replace(/\D/g, '').slice(0, 9); fPhone.classList.remove('invalid'); });
  nameI.addEventListener('input', function () { fName.classList.remove('invalid'); });
  emailI.addEventListener('input', function () { fEmail.classList.remove('invalid'); });
  document.getElementById('fnl-cap-back').addEventListener('click', function () {
    state.step = TOTAL - 1; save(); renderStep(); showScreen('quiz');
  });

  function buildSummary() {
    return QUESTIONS.map(function (q, i) {
      var a = state.answers[i];
      var resp = (a !== null && q.options[a]) ? q.options[a].label : '(sin responder)';
      return (i + 1) + '. ' + q.q + ' → ' + resp;
    }).join('\n');
  }

  function submitLead(lead) {
    var fd = new FormData();
    fd.append('origen', 'funnel-21719');
    fd.append('_subject', 'Nuevo lead · Funnel Ley 21.719');
    fd.append('nombre', lead.nombre);
    fd.append('whatsapp', lead.whatsapp);
    fd.append('email', lead.email);
    fd.append('puntaje', String(lead.puntaje));
    fd.append('nivel', lead.nivel);
    fd.append('respuestas', lead.resumen);
    fetch(FORMSPREE_ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      .catch(function (err) { console.error('[adhoc-funnel] error al enviar lead:', err); });
  }

  document.getElementById('fnl-submit').addEventListener('click', function () {
    var name = nameI.value.trim();
    var phone = phoneI.value.replace(/\D/g, '');
    var email = emailI.value.trim();
    var ok = true;
    if (name.length < 2) { fName.classList.add('invalid'); ok = false; }
    if (phone.length < 8 || phone.length > 9) { fPhone.classList.add('invalid'); ok = false; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { fEmail.classList.add('invalid'); ok = false; }
    if (!ok) return;
    state.lead = { name: name, phone: phone, email: email };
    save();
    var pct = score(), level = pct >= 60 ? 'alto' : pct >= 30 ? 'medio' : 'bajo';
    submitLead({ nombre: name, whatsapp: '+56' + phone, email: email, puntaje: pct, nivel: level, resumen: buildSummary() });
    showScreen('result');
    renderResult();
  });

  var LEVELS = {
    high: { color: '#E5322E', soft: '#FCEEEE', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', word: 'Alto', title: 'Riesgo alto de incumplimiento', msg: function (n) { return n + ', tu organización está expuesta a sanciones bajo la Ley N° 21.719. Hay brechas importantes que conviene cerrar cuanto antes.'; } },
    medium: { color: '#C77D14', soft: '#FAF2E2', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', word: 'Medio', title: 'Riesgo medio: quedan brechas', msg: function (n) { return n + ', tienes avances, pero quedan brechas críticas por resolver para cumplir con la nueva Ley de Protección de Datos.'; } },
    low: { color: '#1F8A52', soft: '#EAF6EE', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>', word: 'Bajo', title: 'Buen punto de partida', msg: function (n) { return n + ', vas por buen camino. Aún falta formalizar algunos aspectos para quedar plenamente alineado con la Ley N° 21.719.'; } }
  };

  function score() {
    var s = 0;
    state.answers.forEach(function (a, i) { if (a !== null && QUESTIONS[i].options[a]) s += QUESTIONS[i].options[a].r; });
    return Math.round(s / MAX * 100);
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderResult() {
    var pct = score();
    var level = pct >= 60 ? LEVELS.high : pct >= 30 ? LEVELS.medium : LEVELS.low;
    var first = (state.lead.name || '').trim().split(/\s+/)[0] || 'Hola';
    var ic = document.getElementById('fnl-res-icon');
    ic.style.background = level.soft;
    ic.style.color = level.color;
    ic.innerHTML = level.icon;
    document.getElementById('fnl-res-title').textContent = level.title;
    document.getElementById('fnl-res-sub').textContent = level.msg(first);
    var fill = document.getElementById('fnl-fill'), pctEl = document.getElementById('fnl-pct'), wordEl = document.getElementById('fnl-word');
    fill.style.background = level.color;
    pctEl.style.color = level.color;
    wordEl.style.color = level.color;
    wordEl.textContent = 'Exposición ' + level.word.toLowerCase();

    if (reduce) {
      fill.style.width = pct + '%';
      pctEl.textContent = pct + '%';
      return;
    }
    fill.style.width = '0%';
    pctEl.textContent = '0%';
    setTimeout(function () { fill.style.width = pct + '%'; }, 120);
    var cur = 0, st = Math.max(1, Math.round(pct / 28));
    function tk() {
      cur += st;
      if (cur >= pct) { pctEl.textContent = pct + '%'; return; }
      pctEl.textContent = cur + '%';
      setTimeout(tk, 28);
    }
    setTimeout(tk, 200);
  }

  document.getElementById('fnl-restart').addEventListener('click', function () {
    state = def();
    save();
    nameI.value = '';
    phoneI.value = '';
    emailI.value = '';
    fName.classList.remove('invalid');
    fPhone.classList.remove('invalid');
    fEmail.classList.remove('invalid');
    renderStep();
    showScreen('quiz');
  });

  /* CTA "QUIERO MI REVISIÓN LEGAL" → pre-llenar el formulario de contacto */
  var offerCta = document.getElementById('offer-cta');
  if (offerCta) {
    offerCta.addEventListener('click', function () {
      var pct = score();
      var lv = pct >= 60 ? LEVELS.high : pct >= 30 ? LEVELS.medium : LEVELS.low;
      var nm = document.getElementById('nombre');
      var tel = document.getElementById('telefono');
      var em = document.getElementById('email');
      var area = document.getElementById('area');
      var msg = document.getElementById('mensaje');
      if (nm) nm.value = state.lead.name || '';
      if (tel) tel.value = state.lead.phone ? ('+56 ' + state.lead.phone) : '';
      if (em) em.value = state.lead.email || '';
      if (area) area.value = 'ley21719';
      if (msg) msg.value = 'Hola, completé la evaluación de la Ley N° 21.719 y mi nivel de exposición fue ' + lv.word + ' (' + pct + '%). Me gustaría obtener mi informe de cumplimiento (desde $99.990).';
      /* el href="#contacto" hace el scroll */
    });
  }

  renderStep();
  if (state.screen === 'result' && state.lead.name) { showScreen('result'); renderResult(); }
  else if (state.screen === 'capture') { showScreen('capture'); }
  else { showScreen('quiz'); }
})();
