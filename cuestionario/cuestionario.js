/* ============================================================
   ADHOC — Motor del cuestionario (Diagnóstico de cumplimiento Ley 21.719)
   Vanilla JS. Lee cuestionario.json (versión pública, sin lógica interna).
   Guardado automático en el navegador. Envío por Formspree (v1).
   ============================================================ */
(function () {
  'use strict';

  var FORM_ENDPOINT = 'https://formspree.io/f/mjgdwzkv'; // v1: llega al correo de Adhoc. Etapa 3: reemplazar por /api hacia Notion.
  var STORAGE_KEY = 'adhoc_diag_v1';
  var MIN_CODE = 4;

  // Introducciones breves por sección (mejoran la experiencia; el contenido legal vive en la rúbrica).
  var INTROS = {
    S0: 'Unas preguntas para conocer tu empresa. El tamaño incide en el régimen de multas y en quién puede asumir el rol de delegado de datos.',
    S1: 'Piensa en los datos de personas: clientes, trabajadores, proveedores. Los datos de empresas no cuentan, pero sí los de sus contactos.',
    S2: 'Desde diciembre de 2026, todo uso de datos personales necesita una base legal: consentimiento u otra fuente que lo autorice.',
    S3: 'La ley exige mantener publicada una política de tratamiento con un contenido mínimo definido.',
    S4: 'Las personas podrán pedir acceso, rectificación, supresión, oposición, portabilidad y bloqueo de sus datos. Hay plazos para responder.',
    S5: 'La ley obliga a adoptar medidas de seguridad proporcionales al riesgo.',
    S6: 'Ciertas filtraciones deberán notificarse a la Agencia de Protección de Datos, y a los afectados en algunos casos.',
    S7: 'Los proveedores que tratan datos por cuenta de tu empresa requieren un contrato con menciones mínimas.',
    S8: 'Si tus datos se almacenan o procesan fuera de Chile, la transferencia debe cumplir requisitos especiales.',
    S9: 'El marketing directo necesita base de licitud y una opción de baja. Las cookies que tratan datos deben informarse.',
    S10: 'La ley premia la organización interna: el modelo de prevención certificado atenúa la responsabilidad de la empresa.'
  };
  var CONTACT_FIELDS = {
    nombre: { label: 'Nombre y apellido', type: 'text', required: true },
    cargo: { label: 'Cargo', type: 'text', required: false, tag: 'opcional' },
    correo: { label: 'Correo electrónico', type: 'email', required: true, help: 'A este correo llegará tu diagnóstico.' },
    telefono: { label: 'Teléfono', type: 'tel', required: true },
    razon_social: { label: 'Razón social de la empresa', type: 'text', required: true },
    rut_empresa: { label: 'RUT de la empresa', type: 'text', required: false, tag: 'opcional' }
  };

  var DATA = null, coreSections = [], qById = {};
  var els = {};
  var state = defaultState();

  function defaultState() {
    return { started: false, code: '', consent: false, currentScreen: 'welcome', answers: {}, contact: {}, submitted: false, startedAt: null };
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }
  function loadSaved() { try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }

  /* -------- helpers de datos / lógica -------- */
  function ans(id) { return state.answers[id]; }

  function questionVisible(q) {
    var v = q.visible_si; if (!v) return true;
    var a = ans(v.pregunta);
    if (v.es !== undefined) return a === v.es;
    if (v.distinto_de !== undefined) return a !== undefined && a !== v.distinto_de;
    if (v.en !== undefined) return v.en.indexOf(a) !== -1;
    if (v.no_incluye !== undefined) return !(Array.isArray(a) && a.indexOf(v.no_incluye) !== -1);
    if (v.no_es_solo !== undefined) return Array.isArray(a) && a.some(function (x) { return x !== v.no_es_solo; });
    return true;
  }
  function condTrue(c) {
    var a = ans(c.pregunta);
    if (c.es !== undefined) return a === c.es;
    if (c.en !== undefined) return c.en.indexOf(a) !== -1;
    if (c.incluye !== undefined) return Array.isArray(a) && a.indexOf(c.incluye) !== -1;
    if (c.incluye_alguna !== undefined) return Array.isArray(a) && c.incluye_alguna.some(function (x) { return a.indexOf(x) !== -1; });
    return false;
  }
  function activeModules() {
    return DATA.modulos_sectoriales.filter(function (m) {
      return m.gatillo && m.gatillo.cualquiera_de && m.gatillo.cualquiera_de.some(condTrue);
    });
  }

  /* -------- orden de pantallas -------- */
  function order() {
    var o = ['welcome'];
    coreSections.forEach(function (s) { o.push(s.id); });
    if (activeModules().length) o.push('sectorial');
    o.push('contact', 'done');
    return o;
  }
  function contentScreens() { return order().filter(function (s) { return s !== 'welcome' && s !== 'done'; }); }

  /* -------- navegación -------- */
  function go(screen) { state.currentScreen = screen; save(); render(); window.scrollTo(0, 0); }
  function next() {
    var o = order(), i = o.indexOf(state.currentScreen);
    if (i < o.length - 1) go(o[i + 1]);
  }
  function back() {
    var o = order(), i = o.indexOf(state.currentScreen);
    if (i > 0) go(o[i - 1]);
  }

  /* -------- render principal -------- */
  function render() {
    var s = state.currentScreen;
    els.topbar.hidden = (s === 'welcome' || s === 'done');
    els.navbar.hidden = (s === 'welcome' || s === 'done');
    if (s === 'welcome') return renderWelcome();
    if (s === 'done') return renderDone();
    if (s === 'sectorial') return renderSectorial();
    if (s === 'contact') return renderContact();
    return renderSection(s);
  }

  function updateProgress() {
    var cs = contentScreens(), pos = cs.indexOf(state.currentScreen);
    var sec = coreSections.filter(function (x) { return x.id === state.currentScreen; })[0];
    var titulo = sec ? sec.titulo.replace(/^S\d+\.\s*/, '') : (state.currentScreen === 'sectorial' ? 'Preguntas de tu rubro' : 'Tus datos de contacto');
    var pct = Math.round(((pos + 1) / cs.length) * 100);
    els.progFill.style.width = pct + '%';
    els.progPct.textContent = pct + '%';
    els.progLabel.textContent = 'Paso ' + (pos + 1) + ' de ' + cs.length + ' · ' + titulo;
  }

  /* -------- pantallas -------- */
  function renderWelcome() {
    var saved = state.started && !state.submitted;
    var c = DATA.config_ui;
    var h = '';
    if (saved) {
      h += '<div class="resume"><span>Tienes un cuestionario <b>en progreso</b>. Puedes continuar donde quedaste.</span>' +
        '<button class="btn" id="btnResume" type="button">Continuar →</button></div>';
    }
    h += '<span class="eyebrow accent">Diagnóstico de cumplimiento · Ley 21.719</span>';
    h += '<h1 class="title">Cuestionario de tu empresa</h1>';
    h += '<p class="lede">' + c.mensaje_bienvenida + '</p>';
    h += '<ul class="welcome-points">' +
      pt('⏱', 'Toma unos <b>' + c.tiempo_estimado + '</b>. Puedes pausar y retomar: tu avance se guarda solo.') +
      pt('✓', 'Responde con honestidad. No hay respuestas buenas ni malas, y <b>No lo sé</b> también es válido.') +
      pt('🔒', 'Tus respuestas son <b>confidenciales</b> y se usan solo para preparar tu diagnóstico.') +
      pt('⚖', 'Con esto, una <b>abogada revisa y firma</b> tu diagnóstico y te lo enviamos por correo en un día hábil.') +
      '</ul>';
    h += '<div class="field-code"><label for="code">Código de acceso <span class="hint">(lo recibiste en tu correo después de pagar)</span></label>' +
      '<input type="text" id="code" autocomplete="off" placeholder="Ej: ADHOC-XXXX" value="' + esc(state.code) + '" /></div>';
    h += '<label class="consent"><input type="checkbox" id="consent"' + (state.consent ? ' checked' : '') + ' />' +
      '<span>Autorizo a ADHOC Legal a tratar los datos de este cuestionario con el fin de preparar mi diagnóstico, conforme a su política de privacidad. Puedo revocar esta autorización en cualquier momento.</span></label>';
    h += '<div class="validation-msg" id="vmsg"></div>';
    h += '<button class="btn btn-primary btn-full" id="btnStart" type="button">Comenzar el cuestionario →</button>';
    els.app.innerHTML = '<div class="screen">' + h + '</div>';

    if (saved) byId('btnResume').onclick = function () { go(state.currentScreen === 'welcome' ? firstContent() : state.currentScreen); };
    byId('code').oninput = function () { state.code = this.value.trim(); save(); };
    byId('consent').onchange = function () { state.consent = this.checked; save(); };
    byId('btnStart').onclick = function () {
      if (state.code.length < MIN_CODE) return vmsg('Ingresa el código de acceso que recibiste al pagar.');
      if (!state.consent) return vmsg('Debes autorizar el tratamiento de datos para continuar.');
      if (!state.startedAt) state.startedAt = new Date().toISOString().slice(0, 10);
      state.started = true; save(); go(firstContent());
    };
  }
  function firstContent() { return coreSections[0].id; }
  function pt(ico, txt) { return '<li><span class="ico">' + ico + '</span><span>' + txt + '</span></li>'; }

  function renderSection(sid) {
    var sec = coreSections.filter(function (s) { return s.id === sid; })[0];
    var titulo = sec.titulo.replace(/^S\d+\.\s*/, '');
    var h = '<div class="screen"><h2 class="section-title">' + titulo + '</h2>';
    if (INTROS[sid]) h += '<p class="section-intro">' + INTROS[sid] + '</p>';
    var n = 0;
    sec.preguntas.forEach(function (qid) {
      var q = qById[qid]; if (!q) return;
      n++;
      h += questionHTML(q, n);
    });
    h += '<div class="validation-msg" id="vmsg"></div></div>';
    els.app.innerHTML = h;
    wireQuestions();
    els.btnBack.style.visibility = 'visible';
    els.btnNext.textContent = 'Continuar →';
    els.btnNext.onclick = function () { if (validateSection(sec.preguntas)) next(); };
    els.btnBack.onclick = back;
    refreshVisibility();
    updateProgress();
  }

  function renderSectorial() {
    var mods = activeModules();
    var h = '<div class="screen"><span class="eyebrow accent">Preguntas de tu rubro</span>' +
      '<h2 class="section-title">Ajustamos el diagnóstico a tu actividad</h2>' +
      '<p class="section-intro">Según lo que nos contaste, hay reglas específicas de tu rubro. Estas preguntas afinan tu diagnóstico.</p>';
    var n = 0, allQ = [];
    mods.forEach(function (m) {
      h += '<h3 style="margin:1.4rem 0 .6rem;font-size:1.05rem;color:var(--black)">' + m.nombre + '</h3>';
      m.preguntas.forEach(function (q) { n++; qById[q.id] = q; allQ.push(q.id); h += questionHTML(q, n); });
    });
    h += '<div class="validation-msg" id="vmsg"></div></div>';
    els.app.innerHTML = h;
    wireQuestions();
    els.btnNext.textContent = 'Continuar →';
    els.btnNext.onclick = function () { if (validateSection(allQ)) next(); };
    els.btnBack.onclick = back;
    refreshVisibility();
    updateProgress();
  }

  function questionHTML(q, n) {
    var a = ans(q.id);
    var h = '<div class="q" data-q="' + q.id + '"><div class="q-text"><span class="q-num">' + n + '.</span><span>' + esc(q.texto) + '</span></div>';
    if (q.tipo === 'multiple') h += '<div class="q-multi-hint">Puedes marcar varias</div>';
    if (q.tipo === 'texto') {
      h += '<input type="text" data-input="' + q.id + '" value="' + esc(a || '') + '" autocomplete="off" />';
    } else {
      h += '<div class="options">';
      (q.opciones || []).forEach(function (op) {
        var on = q.tipo === 'multiple' ? (Array.isArray(a) && a.indexOf(op) !== -1) : (a === op);
        h += '<button type="button" class="opt' + (on ? ' is-on' : '') + '" data-type="' + q.tipo + '" data-q="' + q.id + '" data-op="' + esc(op) + '">' +
          '<span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
          '<span>' + esc(op) + '</span></button>';
      });
      h += '</div>';
    }
    return h + '</div>';
  }

  function wireQuestions() {
    [].forEach.call(els.app.querySelectorAll('.opt'), function (btn) {
      btn.onclick = function () {
        var qid = btn.getAttribute('data-q'), op = btn.getAttribute('data-op'), type = btn.getAttribute('data-type');
        if (type === 'multiple') {
          var arr = Array.isArray(ans(qid)) ? ans(qid).slice() : [];
          var i = arr.indexOf(op);
          if (i === -1) arr.push(op); else arr.splice(i, 1);
          state.answers[qid] = arr;
          btn.classList.toggle('is-on');
        } else {
          state.answers[qid] = op;
          [].forEach.call(els.app.querySelectorAll('.opt[data-q="' + qid + '"]'), function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
        }
        save(); refreshVisibility();
      };
    });
    [].forEach.call(els.app.querySelectorAll('[data-input]'), function (inp) {
      inp.oninput = function () { state.answers[inp.getAttribute('data-input')] = inp.value.trim(); save(); };
    });
  }

  function refreshVisibility() {
    [].forEach.call(els.app.querySelectorAll('.q[data-q]'), function (block) {
      var q = qById[block.getAttribute('data-q')];
      block.style.display = (q && questionVisible(q)) ? '' : 'none';
    });
  }

  function validateSection(qids) {
    var missing = null;
    for (var i = 0; i < qids.length; i++) {
      var q = qById[qids[i]]; if (!q || !questionVisible(q)) continue;
      var a = ans(q.id);
      var empty = (a === undefined || a === '' || (Array.isArray(a) && a.length === 0));
      if (empty) { missing = q.id; break; }
    }
    if (missing) {
      vmsg('Te falta responder una pregunta más arriba.');
      var el = els.app.querySelector('.q[data-q="' + missing + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    vmsg(''); return true;
  }

  function renderContact() {
    if (!state.contact.razon_social && ans('P01')) state.contact.razon_social = ans('P01');
    var h = '<div class="screen"><span class="eyebrow accent">Último paso</span>' +
      '<h2 class="section-title">¿A dónde enviamos tu diagnóstico?</h2>' +
      '<p class="lede">Con estos datos preparamos tu informe y te lo enviamos por correo, revisado y firmado por abogada.</p>';
    Object.keys(CONTACT_FIELDS).forEach(function (k) {
      var f = CONTACT_FIELDS[k];
      h += '<div class="field"><label for="c_' + k + '">' + f.label + (f.tag ? ' <span class="opt-tag">(' + f.tag + ')</span>' : '') + '</label>' +
        '<input type="' + f.type + '" id="c_' + k + '" data-c="' + k + '" value="' + esc(state.contact[k] || '') + '" autocomplete="' + (f.type === 'email' ? 'email' : (f.type === 'tel' ? 'tel' : 'off')) + '" />' +
        (f.help ? '<div class="q-help">' + f.help + '</div>' : '') + '</div>';
    });
    h += '<div class="validation-msg" id="vmsg"></div></div>';
    els.app.innerHTML = h;
    [].forEach.call(els.app.querySelectorAll('[data-c]'), function (inp) {
      inp.oninput = function () { state.contact[inp.getAttribute('data-c')] = inp.value.trim(); save(); };
    });
    els.btnNext.textContent = 'Enviar mis respuestas →';
    els.btnNext.onclick = submit;
    els.btnBack.onclick = back;
    updateProgress();
  }

  function submit() {
    for (var k in CONTACT_FIELDS) {
      if (CONTACT_FIELDS[k].required && !(state.contact[k] && state.contact[k].length)) {
        vmsg('Completa los campos obligatorios para enviar.');
        var el = byId('c_' + k); if (el) el.focus();
        return;
      }
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.contact.correo || '')) { vmsg('Revisa tu correo electrónico.'); byId('c_correo').focus(); return; }
    vmsg('');
    els.btnNext.disabled = true;
    els.btnNext.innerHTML = '<span class="spinner"></span> Enviando…';

    var payload = buildPayload();
    fetch(FORM_ENDPOINT, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('bad');
      state.submitted = true; save(); go('done');
    }).catch(function () {
      els.btnNext.disabled = false; els.btnNext.textContent = 'Enviar mis respuestas →';
      vmsg('No pudimos enviar. Revisa tu conexión e inténtalo otra vez. Tus respuestas están guardadas.');
    });
  }

  function buildPayload() {
    var mods = activeModules().map(function (m) { return m.nombre; });
    var lines = [];
    coreSections.forEach(function (s) {
      lines.push('— ' + s.titulo + ' —');
      s.preguntas.forEach(function (qid) {
        var q = qById[qid]; if (!q || !questionVisible(q)) return;
        lines.push(q.texto + '  →  ' + fmt(ans(qid)));
      });
    });
    activeModules().forEach(function (m) {
      lines.push('— Rubro: ' + m.nombre + ' —');
      m.preguntas.forEach(function (q) { if (questionVisible(q)) lines.push(q.texto + '  →  ' + fmt(ans(q.id))); });
    });
    return {
      _subject: 'Diagnóstico Ley 21.719 — ' + (state.contact.razon_social || ans('P01') || 'nueva empresa'),
      tipo: 'Diagnóstico de cumplimiento (cuestionario pagado)',
      codigo_acceso: state.code,
      empresa: state.contact.razon_social || ans('P01') || '',
      rut_empresa: state.contact.rut_empresa || '',
      contacto_nombre: state.contact.nombre || '',
      contacto_cargo: state.contact.cargo || '',
      correo: state.contact.correo || '',
      telefono: state.contact.telefono || '',
      rubro: ans('P02') || '',
      modulos_activados: mods.join(', ') || 'ninguno',
      fecha_inicio: state.startedAt || '',
      respuestas: lines.join('\n'),
      respuestas_json: JSON.stringify(state.answers)
    };
  }
  function fmt(a) { if (a === undefined || a === '') return '(sin responder)'; return Array.isArray(a) ? a.join('; ') : a; }

  function renderDone() {
    var c = DATA.config_ui;
    els.app.innerHTML = '<div class="screen done">' +
      '<div class="done-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>' +
      '<h1>¡Listo! Recibimos tus respuestas</h1>' +
      '<p class="lede">' + c.mensaje_final + '</p>' +
      '<div class="done-card">' +
      step('1', 'Una abogada revisa tus respuestas', 'Analizamos tu situación frente a la Ley 21.719 con tu información.') +
      step('2', 'Preparamos tu diagnóstico', 'Con tu nivel de cumplimiento, tus brechas priorizadas y tu plan de acción.') +
      step('3', 'Lo recibes por correo', 'Firmado por abogada, en <b>' + esc(state.contact.correo || 'tu correo') + '</b>, dentro de un día hábil.') +
      '</div></div>';
  }
  function step(n, t, d) { return '<div class="step"><span class="ico" style="flex:none;width:26px;height:26px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:700;font-size:.85rem">' + n + '</span><span><b>' + t + '</b><br>' + d + '</span></div>'; }

  /* -------- utils -------- */
  function byId(id) { return document.getElementById(id); }
  function vmsg(t) { var e = byId('vmsg'); if (e) e.textContent = t || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* -------- init -------- */
  function init() {
    els = {
      app: byId('app'), topbar: byId('topbar'), navbar: byId('navbar'),
      btnBack: byId('btnBack'), btnNext: byId('btnNext'),
      progFill: byId('progFill'), progLabel: byId('progLabel'), progPct: byId('progPct')
    };
    fetch('cuestionario.json').then(function (r) { return r.json(); }).then(function (d) {
      DATA = d;
      coreSections = d.secciones.filter(function (s) { return s.id !== 'S11'; });
      d.preguntas.forEach(function (q) { qById[q.id] = q; });
      var saved = loadSaved();
      if (saved && saved.answers) { state = Object.assign(defaultState(), saved); }
      // Si terminó antes, arranca limpio para permitir un nuevo cuestionario.
      if (state.submitted) state = defaultState();
      render();
    }).catch(function () {
      els.app.innerHTML = '<div class="screen"><h1 class="title">No pudimos cargar el cuestionario</h1><p class="lede">Recarga la página en unos segundos. Si el problema persiste, escríbenos a adhocservicioslegales@gmail.com.</p></div>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
