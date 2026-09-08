/* Aplica el tema guardado antes del primer pintado.
   Va en archivo propio porque la CSP del sitio (script-src 'self') bloquea los scripts en línea. */
(function () {
  try {
    if (localStorage.getItem('adhoc-theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
}());
