/* ==========================================================================
   Consulta de tickets (HU04): cada usuario ve los de su ámbito. Un cliente,
   los de su localidad; ORMEN, todos. Filtros guardados en la URL.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;

  const POR_PAGINA = 15;

  const ESTADOS_FILTRO = [
    { clave: 'en-curso', texto: 'En curso', fn: (t) => D.ESTADOS_ACTIVOS.includes(t.estado) },
    { clave: 'ABIERTO', texto: 'Abiertos', fn: (t) => t.estado === 'ABIERTO' },
    { clave: 'PENDIENTE', texto: 'Pendientes', fn: (t) => t.estado === 'PENDIENTE' },
    { clave: 'ELEVADO', texto: 'Elevados', fn: (t) => t.estado === 'ELEVADO' },
    { clave: 'CERRADO', texto: 'Cerrados', fn: (t) => t.estado === 'CERRADO' },
    { clave: 'todos', texto: 'Todos', fn: () => true },
  ];

  const DEFECTOS = { estado: 'en-curso', orden: 'recientes' };

  App.vistas.tickets = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const esCliente = u.rol === 'CLIENTE';
    const loc = esCliente ? S.nombre('localidades', u.localidadId) : null;
    const todos = S.ticketsVisibles(u);
    const q = Object.assign({}, DEFECTOS, ctx.query);
    if (!ESTADOS_FILTRO.some((e) => e.clave === q.estado)) q.estado = DEFECTOS.estado;
    if (!C.ORDENES[q.orden]) q.orden = DEFECTOS.orden;

    // ---- controles ----
    const inBuscar = h('input', { id: 'f-buscar', class: 'control', type: 'search', placeholder: 'Número, título o descripción', value: q.q || '' });
    const opcionesAtiende = [{ valor: 'sin', texto: 'Sin asignar' }];
    if (u.rol === 'OPERADOR') opcionesAtiende.push({ valor: u.id, texto: 'Yo (' + u.nombre + ')' });
    S.operadores().filter((o) => o.id !== u.id).forEach((o) => opcionesAtiende.push({ valor: o.id, texto: o.nombre + (o.activo === false ? ' (usuario inactivo)' : '') }));

    const controles = {
      loc: !esCliente && ui.select({ id: 'f-loc', vacio: 'Todas', valor: q.loc, opciones: S.localidades().map((l) => ({ valor: l.id, texto: l.nombre })) }),
      sis: ui.select({ id: 'f-sis', vacio: 'Todos', valor: q.sis, opciones: S.sistemas().map((s) => ({ valor: s.id, texto: s.nombre })) }),
      cri: ui.select({ id: 'f-cri', vacio: 'Todas', valor: q.cri, opciones: S.catalogo('criticidades').map((c) => ({ valor: c.id, texto: c.nombre })) }),
      atiende: !esCliente && ui.select({ id: 'f-atiende', vacio: 'Cualquiera', valor: q.atiende, opciones: opcionesAtiende }),
      tipo: ui.select({ id: 'f-tipo', vacio: 'Todos', valor: q.tipo, opciones: S.catalogo('tiposSolicitud').map((x) => ({ valor: x.id, texto: x.nombre })) }),
      orden: ui.select({ id: 'f-orden', valor: q.orden, opciones: Object.keys(C.ORDENES).map((k) => ({ valor: k, texto: C.ORDENES[k].texto })) }),
    };
    const ETIQUETAS = { loc: 'Localidad', sis: 'Sistema', cri: 'Criticidad', atiende: 'Atiende', tipo: 'Tipo de solicitud', orden: 'Orden' };

    const filtros = h('div', { class: 'filtros', role: 'search', 'aria-label': 'Filtros de tickets' },
      ui.campo({ nombre: 'q', id: 'f-buscar', etiqueta: 'Buscar', control: inBuscar, clase: 'buscar' }),
      Object.keys(controles).filter((k) => controles[k]).map((k) => ui.campo({ nombre: k, id: controles[k].id, etiqueta: ETIQUETAS[k], control: controles[k] })));

    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Estado' });
    const activos = h('div', { class: 'fila-sm' });
    const resultados = h('div');
    const textoTotal = h('p', { class: 'chico suave', 'aria-live': 'polite' });

    // ---- filtrado ----
    function coincideTexto(t, texto) {
      const n = texto.replace(/^#/, '').trim();
      if (/^\d+$/.test(n)) return String(t.numero).indexOf(n) === 0;
      const norm = U.normalizar(n);
      return U.normalizar(t.titulo + ' ' + t.descripcion).indexOf(norm) >= 0;
    }

    function filtrar(sinEstado) {
      const est = ESTADOS_FILTRO.find((e) => e.clave === q.estado);
      return todos.filter((t) =>
        (sinEstado || est.fn(t)) &&
        (!q.q || coincideTexto(t, q.q)) &&
        (!q.loc || t.localidadId === q.loc) &&
        (!q.sis || t.sistemaId === q.sis) &&
        (!q.cri || t.criticidadId === q.cri) &&
        (!q.tipo || t.tipoSolicitudId === q.tipo) &&
        (!q.atiende || (q.atiende === 'sin' ? !t.operadorId : t.operadorId === q.atiende)));
    }

    function sincronizar() {
      const limpio = {};
      Object.keys(q).forEach((k) => { if (q[k] && q[k] !== DEFECTOS[k] && !(k === 'p' && Number(q[k]) <= 1)) limpio[k] = q[k]; });
      App.router.actualizarQuery(limpio);
    }

    function cambiar(k, v) {
      q[k] = v || '';
      if (k !== 'p') q.p = '';
      sincronizar();
      pintar();
    }

    function pintar() {
      // chips de estado con cantidades
      const base = filtrar(true);
      U.vaciar(chips);
      ESTADOS_FILTRO.forEach((e) => {
        const n = base.filter(e.fn).length;
        chips.append(h('button', { type: 'button', class: 'chip', 'aria-pressed': String(q.estado === e.clave), onClick: () => cambiar('estado', e.clave) },
          e.texto, h('span', { class: 'cuenta' }, n)));
      });

      // filtros activos
      U.vaciar(activos);
      const quitables = [];
      if (q.q) quitables.push(['q', 'Búsqueda: «' + q.q + '»']);
      ['loc', 'sis', 'cri', 'atiende', 'tipo'].forEach((k) => {
        if (!q[k] || !controles[k]) return;
        const opt = Array.from(controles[k].options).find((o) => o.value === q[k]);
        quitables.push([k, ETIQUETAS[k] + ': ' + (opt ? opt.textContent : q[k])]);
      });
      quitables.forEach(([k, texto]) => activos.append(h('span', { class: 'chip-activo' }, texto,
        h('button', { type: 'button', 'aria-label': 'Quitar filtro ' + texto, onClick: () => { if (k === 'q') inBuscar.value = ''; else controles[k].value = ''; cambiar(k, ''); } }, ui.icono('x', 'i-sm')))));
      if (quitables.length > 1) {
        activos.append(h('button', { type: 'button', class: 'enlace-boton chico', onClick: () => {
          inBuscar.value = '';
          ['loc', 'sis', 'cri', 'atiende', 'tipo'].forEach((k) => { if (controles[k]) controles[k].value = ''; q[k] = ''; });
          cambiar('q', '');
        } }, 'Limpiar filtros'));
      }

      // resultados
      const lista = filtrar(false).sort(C.ORDENES[q.orden].fn);
      const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
      const pagina = Math.min(Math.max(1, Number(q.p) || 1), paginas);
      const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
      textoTotal.textContent = U.plural(lista.length, 'ticket', 'tickets');
      U.vaciar(resultados);
      if (!lista.length) {
        resultados.append(ui.vacio({
          icono: 'buscar',
          titulo: 'No hay tickets con estos filtros',
          texto: todos.length ? 'Probá con otro estado o quitá algún filtro.' : 'Todavía no hay tickets registrados.',
        }));
        return;
      }
      const cols = esCliente
        ? ['numero', 'ticket', 'creador', 'estado', 'criticidad', 'actualizado']
        : ['numero', 'ticket', 'localidad', 'estado', 'criticidad', 'atiende', 'actualizado'];
      resultados.append(
        C.tablaTickets(pag, cols, { caption: 'Tickets' }),
        ui.paginador({ total: lista.length, pagina, porPagina: POR_PAGINA, alCambiar: (p) => { cambiar('p', String(p)); document.getElementById('titulo-pagina').scrollIntoView({ block: 'start' }); } }));
    }

    inBuscar.addEventListener('input', U.debounce(() => cambiar('q', inBuscar.value.trim()), 220));
    Object.keys(controles).forEach((k) => { if (controles[k]) controles[k].addEventListener('change', () => cambiar(k, controles[k].value)); });
    pintar();

    ctx.titulo(esCliente ? 'Tickets de ' + loc : 'Tickets');
    return h('div', { class: 'pila' },
      ui.cabecera({
        antetitulo: esCliente ? loc : 'Todas las localidades',
        titulo: esCliente ? 'Tickets de ' + loc : 'Tickets',
        subtitulo: esCliente ? 'Todos los tickets de tu localidad, también los que cargó Mesa de ayuda.' : 'Tickets de todas las bancas y agencias.',
        acciones: App.auth.puede('tickets.crear', u) ? [h('a', { class: 'btn btn-primario', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Nuevo ticket')] : null,
      }),
      h('section', { class: 'card sin-padding', 'aria-label': 'Listado de tickets' },
        h('div', { style: 'padding: 18px 20px 6px' },
          filtros,
          h('div', { class: 'fila-entre', style: 'margin-bottom: 12px' }, chips, textoTotal),
          activos),
        resultados));
  };
})(window.App = window.App || {});
