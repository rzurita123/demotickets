/* ==========================================================================
   Piezas compartidas por varias pantallas (tablas de tickets, filtros,
   textos de estado) y pantallas de error.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  App.vistas = App.vistas || {};

  const ORDEN_CRITICIDAD = { 'cri-alta': 1, 'cri-media': 2, 'cri-baja': 3 };

  const ORDENES = {
    recientes: { texto: 'Más recientes', fn: (a, b) => b.creadoEn.localeCompare(a.creadoEn) },
    antiguos: { texto: 'Más antiguos', fn: (a, b) => a.creadoEn.localeCompare(b.creadoEn) },
    actualizados: { texto: 'Última actualización', fn: (a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn) },
    criticidad: { texto: 'Criticidad', fn: (a, b) => (ORDEN_CRITICIDAD[a.criticidadId] || 9) - (ORDEN_CRITICIDAD[b.criticidadId] || 9) || a.creadoEn.localeCompare(b.creadoEn) },
  };

  function enlaceTicket(t, contenido) {
    return h('a', { href: '#/tickets/' + t.numero }, contenido || '#' + t.numero);
  }

  function clasificacionCorta(t) {
    const S = App.store;
    const sis = S.nombre('sistemas', t.sistemaId, 'Sin sistema');
    return t.subsistemaId ? sis + ' › ' + S.nombre('subsistemas', t.subsistemaId, '') : sis;
  }

  function atiende(t) {
    const S = App.store;
    if (!t.operadorId) return h('span', { class: 'suave' }, 'Sin asignar');
    const op = S.usuario(t.operadorId);
    return h('span', { class: 'fila-sm', style: 'flex-wrap: nowrap' }, App.ui.avatar(op, 'sm'), h('span', null, op ? op.nombre : '—'));
  }

  /** Marcas chicas debajo del título: elevado y, para ORMEN, si originó una solución. */
  function marcas(t) {
    const S = App.store;
    const ui = App.ui;
    const u = App.auth.usuarioActual();
    const sol = u && u.rol !== 'CLIENTE' ? S.solucionOriginadaPor(t) : null;
    return [
      t.elevadoA ? [' · ', h('span', { class: 'marca-fila elev', title: 'Elevado a ' + S.nombreDestino(t.elevadoA) }, ui.icono('elevar', 'i-sm'), 'Elevado a ' + S.nombreDestino(t.elevadoA))] : null,
      sol ? [' · ', h('span', { class: 'marca-fila sol', title: '«' + sol.titulo + '»' }, ui.icono('libro', 'i-sm'), 'Originó una solución reutilizable')] : null,
    ];
  }

  /**
   * Tabla de tickets. columnas: lista de claves entre
   * numero, ticket, localidad, creador, estado, criticidad, atiende, actualizado, creado.
   */
  function tablaTickets(tickets, columnas, op) {
    const S = App.store;
    const ui = App.ui;
    const o = op || {};
    const def = {
      numero: { th: 'Nº', td: (t) => ui.celda('Nº', h('span', { class: 'num' }, '#' + t.numero), 'celda-num') },
      ticket: {
        th: 'Ticket',
        td: (t) => ui.celda('Ticket', h('div', { class: 'titulo-celda' },
          enlaceTicket(t, t.titulo),
          h('span', { class: 'sub' }, clasificacionCorta(t), t.registroDirecto ? ' · Registrado ya resuelto' : '', marcas(t))), 'sin-label'),
      },
      localidad: { th: 'Localidad', td: (t) => ui.celda('Localidad', S.nombre('localidades', t.localidadId)) },
      creador: { th: 'Creado por', td: (t) => { const u = S.usuario(t.creadoPorId); return ui.celda('Creado por', u ? (u.rol === 'CLIENTE' ? u.nombre : u.nombre + ' (Mesa de ayuda)') : '—'); } },
      estado: { th: 'Estado', td: (t) => ui.celda('Estado', ui.pistaEstado(t.estado)) },
      criticidad: { th: 'Criticidad', td: (t) => ui.celda('Criticidad', ui.badgeCriticidad(t.criticidadId)) },
      atiende: { th: 'Atiende', td: (t) => ui.celda('Atiende', atiende(t)) },
      actualizado: { th: 'Actualizado', td: (t) => ui.celda('Actualizado', ui.tiempo(t.actualizadoEn)) },
      creado: { th: 'Creado', td: (t) => ui.celda('Creado', ui.tiempo(t.creadoEn)) },
      cerrado: { th: 'Cerrado', td: (t) => ui.celda('Cerrado', ui.tiempo(t.cerradoEn)) },
      accion: { th: h('span', { class: 'sr-only' }, 'Acciones'), td: (t) => ui.celda('', o.accion ? o.accion(t) : null, 'derecha sin-label') },
    };
    const filas = tickets.map((t) => {
      const tr = h('tr', { class: 'clic' }, columnas.map((c) => def[c].td(t)));
      tr.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) return;
        App.router.ir('/tickets/' + t.numero);
      });
      return tr;
    });
    return h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive lista-tickets' },
      o.caption && h('caption', { class: 'sr-only' }, o.caption),
      h('thead', null, h('tr', null, columnas.map((c) => h('th', { scope: 'col' }, def[c].th)))),
      h('tbody', null, filas)));
  }

  /** Indicador numérico (inicio y estadísticas). Con href es un enlace. */
  function mosaico(op) {
    return h(op.href ? 'a' : 'div', { class: 'mosaico', href: op.href || null, dataset: op.tono ? { tono: op.tono } : null },
      h('span', { class: 'etiqueta' }, op.icono && App.ui.icono(op.icono, 'i-sm'), op.etiqueta),
      h('span', { class: 'valor' }, U.formatoNumero(op.valor)),
      op.detalle && h('span', { class: 'detalle' }, op.detalle));
  }

  /**
   * Cola de trabajo: pestañas con contador y la lista debajo.
   * cola({ id, activa, alCambiar, pestanas: [{ clave, texto, cuenta, tono, contenido: () => nodo }] })
   */
  function cola(op) {
    const pestanas = op.pestanas;
    let activa = pestanas.some((p) => p.clave === op.activa) ? op.activa : pestanas[0].clave;
    const panel = h('div', { class: 'cola-panel', role: 'tabpanel', id: op.id + '-panel', tabindex: '0' });
    const botones = pestanas.map((p) => h('button', {
      type: 'button', role: 'tab', id: op.id + '-' + p.clave, 'aria-controls': op.id + '-panel', dataset: { clave: p.clave, tono: p.tono || null },
      onClick: () => elegir(p.clave),
    }, h('span', null, p.texto), h('span', { class: 'cuenta' }, U.formatoNumero(p.cuenta))));
    const lista = h('div', { class: 'cola-pestanas', role: 'tablist', 'aria-label': op.etiqueta || 'Cola de trabajo' }, botones);
    lista.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = pestanas.findIndex((p) => p.clave === activa);
      const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length;
      elegir(pestanas[j].clave);
      botones[j].focus();
    });
    function pintar() {
      botones.forEach((b) => {
        const sel = b.dataset.clave === activa;
        b.setAttribute('aria-selected', String(sel));
        b.tabIndex = sel ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', op.id + '-' + activa);
      U.vaciar(panel).append(...[].concat(pestanas.find((p) => p.clave === activa).contenido()).filter(Boolean));
    }
    function elegir(clave) {
      activa = clave;
      pintar();
      if (op.alCambiar) op.alCambiar(clave);
    }
    pintar();
    return h('section', { class: 'cola' }, lista, panel);
  }

  /** Texto "Ticket #1005" o "Ticket #1005 · Título" para avisos. */
  function nombreTicket(t, conTitulo) {
    return 'Ticket #' + t.numero + (conTitulo ? ' · ' + t.titulo : '');
  }

  // ------------------------------------------------------- Pantallas de error ---

  App.vistas.noEncontrado = function () {
    return h('div', { class: 'card' }, App.ui.vacio({
      icono: 'buscar',
      titulo: 'No encontramos esta página',
      texto: 'Puede que el enlace esté mal escrito o que la pantalla no exista en la demo.',
      accion: h('a', { class: 'btn btn-primario', href: '#/' }, 'Ir al inicio'),
    }), h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Página no encontrada'));
  };

  App.vistas.sinAcceso = function (ctx) {
    return h('div', { class: 'card' }, h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Sin acceso'), App.ui.vacio({
      icono: 'candado',
      titulo: 'No tenés acceso a esta pantalla',
      texto: 'Tu rol (' + App.ui.nombreRol(ctx.usuario) + ') no tiene permiso para verla. El intento quedó registrado en la auditoría.',
      accion: h('a', { class: 'btn btn-primario', href: '#/' }, 'Ir al inicio'),
    }));
  };

  App.vistas.error = function (e) {
    return h('div', { class: 'card' }, h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Error'), App.ui.vacio({
      icono: 'alerta',
      titulo: 'Algo salió mal al mostrar esta pantalla',
      texto: (e && e.message ? e.message + '. ' : '') + 'Si el problema sigue, restablecé los datos de la demo desde el menú de tu usuario.',
      accion: h('div', { class: 'fila', style: 'justify-content: center' },
        h('a', { class: 'btn btn-primario', href: '#/' }, 'Ir al inicio'),
        h('button', { type: 'button', class: 'btn btn-neutro', onClick: () => App.layout.restablecerDatos(App.auth.usuarioActual()) }, 'Restablecer datos')),
    }));
  };

  App.comun = { ORDENES, ORDEN_CRITICIDAD, enlaceTicket, clasificacionCorta, atiende, tablaTickets, nombreTicket, mosaico, cola };
})(window.App = window.App || {});
