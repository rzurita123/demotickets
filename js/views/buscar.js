/* ==========================================================================
   Búsqueda general (buscador de la barra superior).
   - Un número (#1150 o 1150) de un ticket visible abre ese ticket.
   - Un texto muestra en una única lista los tickets que coinciden (del ámbito
     de cada usuario) y, para ORMEN, las soluciones y resoluciones parecidas.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;
  const MAX_TICKETS = 25;

  /** Busca desde cualquier pantalla: abre el ticket si es un número, si no va a los resultados. */
  function ir(texto) {
    const t = String(texto || '').trim();
    const num = /^#?(\d+)$/.exec(t);
    if (num) {
      const r = App.store.ticketParaUsuario(num[1], App.auth.usuarioActual());
      if (!r.error) { App.router.ir('/tickets/' + num[1]); return; }
    }
    App.router.ir('/buscar' + (t ? '?q=' + encodeURIComponent(t) : ''));
  }

  /** Coincide si el número empieza igual o si todas las palabras están en el título o la descripción. */
  function coincide(t, texto) {
    const limpio = texto.replace(/^#/, '').trim();
    if (/^\d+$/.test(limpio)) return String(t.numero).indexOf(limpio) === 0;
    const donde = U.normalizar(t.titulo + ' ' + t.descripcion);
    return U.normalizar(limpio).split(/\s+/).filter(Boolean).every((p) => donde.indexOf(p) >= 0);
  }

  function puntajeCoincidencia(t, texto) {
    const consulta = U.normalizar(texto.replace(/^#/, '').trim());
    const titulo = U.normalizar(t.titulo);
    const descripcion = U.normalizar(t.descripcion);
    const completo = titulo + ' ' + descripcion;
    let puntaje = completo === consulta ? 100 : (completo.indexOf(consulta) >= 0 ? 20 : 0);
    for (const termino of consulta.split(/\s+/).filter(Boolean)) {
      if (titulo.indexOf(termino) >= 0) puntaje += 5;
      let desde = 0;
      while ((desde = completo.indexOf(termino, desde)) >= 0) { puntaje += 1; desde += termino.length; }
    }
    return puntaje;
  }

  App.vistas.buscar = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const esCliente = u.rol === 'CLIENTE';
    const esOperador = App.store.esOrmen(u);
    const q = (ctx.query.q || '').trim();

    const input = h('input', { type: 'search', id: 'buscar-todo', value: q, placeholder: esCliente ? 'Buscar tickets' : 'Buscar tickets o soluciones', 'aria-label': esCliente ? 'Buscar tickets' : 'Buscar tickets o soluciones' });
    // En escritorio se usa el buscador de la barra; éste es para el celular.
    const form = h('form', { class: 'buscador-rapido buscar-pagina', role: 'search' },
      ui.icono('buscar'), input, h('button', { type: 'submit', class: 'btn btn-oscuro' }, 'Buscar'));
    form.addEventListener('submit', (e) => { e.preventDefault(); ir(input.value); });

    ctx.titulo(q ? 'Buscar «' + q + '»' : 'Buscar');
    const cabecera = [ui.cabecera({ titulo: 'Buscar' }), form];
    if (!q) {
      return h('div', { class: 'pila-lg' }, cabecera,
        h('div', { class: 'card' }, ui.vacio({ icono: 'buscar', titulo: esCliente ? 'Escribí un número o lo que pasó' : 'Escribí un número de ticket o cómo se describe el problema' })));
    }

    const activo = (t) => D.ESTADOS_ACTIVOS.includes(t.estado);
    const tickets = S.ticketsVisibles(u).filter((t) => coincide(t, q))
      .sort((a, b) => (puntajeCoincidencia(b, q) - puntajeCoincidencia(a, q)) || (activo(b) - activo(a)) || b.actualizadoEn.localeCompare(a.actualizadoEn));
    const soluciones = esCliente ? [] : App.sugerencias.buscar({ texto: q, limite: 12 });

    function usar(r) {
      const usarParam = r.tipo === 'catalogo' ? 'catalogo:' + r.id : 'ticket:' + r.id;
      App.router.ir('/tickets/nuevo?' + U.buildQuery({ modo: 'resuelto', descripcion: q, usar: usarParam }));
    }

    const cols = esCliente
      ? ['numero', 'ticket', 'creador', 'estado', 'actualizado']
      : ['numero', 'ticket', 'localidad', 'estado', 'atiende', 'actualizado'];
    const bloqueTickets = h('section', { class: 'resultados-busqueda-bloque' },
      h('div', { class: 'resultados-busqueda-titulo' }, h('h2', null, 'Tickets'), h('span', { class: 'cuenta' }, U.formatoNumero(tickets.length))),
      tickets.length
        ? [C.tablaTickets(tickets.slice(0, MAX_TICKETS), cols, { caption: 'Tickets que coinciden' }),
          tickets.length > MAX_TICKETS ? h('div', { class: 'cola-pie' },
            h('a', { class: 'chico fuerte', href: '#/tickets?' + U.buildQuery({ estado: 'todos', q }) }, 'Ver los ' + tickets.length + ' en el listado ', ui.icono('flechaDer', 'i-sm'))) : null]
        : ui.vacio({ icono: 'buscar', titulo: 'Ningún ticket coincide' }));

    const bloques = [bloqueTickets];
    if (!esCliente) {
      bloques.push(h('section', { class: 'resultados-busqueda-bloque' },
        h('div', { class: 'resultados-busqueda-titulo' }, h('h2', null, 'Soluciones'), h('span', { class: 'cuenta' }, U.formatoNumero(soluciones.length))),
        soluciones.length
          ? h('div', { class: 'sugerencias resultados-busqueda' }, soluciones.map((r) => ui.tarjetaSugerencia(r, { alUsar: esOperador ? usar : null, textoUsar: 'Crear ticket cerrado con esta' })))
          : ui.vacio({ icono: 'libro', titulo: 'Ninguna solución parecida' })));
    }

    return h('div', { class: 'pila-lg' }, cabecera,
      h('section', { class: 'card resultados-busqueda-lista', 'aria-label': 'Resultados de la búsqueda' }, bloques));
  };

  App.buscar = { ir };
})(window.App = window.App || {});
