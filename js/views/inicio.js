/* ==========================================================================
   Inicio de cada rol.
   - Cliente: los tickets de su localidad, en una cola con pestañas (no hay pantalla Tickets aparte).
     Sus estadísticas están en App.vistas.estadisticasCliente.
   - Operador: crear ticket y su cola de trabajo (la búsqueda está en la barra).
   - Administrador: soluciones reutilizables por aprobar y analíticas.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;

  const fmtDia = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoyLargo = () => U.capitalizar(fmtDia.format(new Date()).replace(',', ''));
  const primerNombre = (u) => u.nombre.split(' ')[0];
  const activo = (t) => D.ESTADOS_ACTIVOS.includes(t.estado);

  const mosaico = (op) => App.comun.mosaico(op);

  function tarjeta(titulo, contenido, extra) {
    return h('section', { class: 'card' },
      h('div', { class: 'card-titulo' }, h('h2', null, titulo), extra),
      contenido);
  }

  /** Saludo con la fecha; acción opcional a la derecha. */
  function saludo(u, accion) {
    return h('div', { class: 'cabecera saludo' },
      h('div', { class: 'titulos' },
        h('h1', { id: 'titulo-pagina', tabindex: '-1' }, 'Hola, ' + primerNombre(u)),
        h('span', { class: 'suave' }, hoyLargo())),
      accion ? h('div', { class: 'acciones' }, accion) : null);
  }

  function verTodos(href, texto) {
    return h('a', { href, class: 'chico fuerte', style: 'color: var(--azul-texto)' }, texto || 'Ver todos', ' ', App.ui.icono('flechaDer', 'i-sm'));
  }

  // ------------------------------------------------------------- Cliente ---

  const POR_PAGINA_CLIENTE = 15;

  /**
   * Inicio del cliente: la única lista de tickets de su localidad (ya no hay
   * pantalla Tickets aparte), en pestañas y con páginas.
   */
  function inicioCliente(ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const loc = S.nombre('localidades', u.localidadId);
    const tickets = S.ticketsVisibles(u);
    const enCurso = tickets.filter(activo).sort(C.ORDENES.actualizados.fn);
    const bloqueados = enCurso.filter((t) => t.estado === 'BLOQUEADO');
    const cerrados = tickets.filter((t) => t.estado === 'CERRADO').sort((a, b) => b.cerradoEn.localeCompare(a.cerradoEn));
    const cols = ['numero', 'ticket', 'creador', 'estado', 'duracion', 'actualizado'];
    const vistaActual = ctx.query.vista || 'curso';

    function lista(clave, items, vacio) {
      if (!items.length) return ui.vacio({ icono: 'checkCirculo', titulo: vacio });
      const paginas = Math.ceil(items.length / POR_PAGINA_CLIENTE);
      const pagina = clave === vistaActual ? Math.min(Math.max(1, Number(ctx.query.p) || 1), paginas) : 1;
      return [
        C.tablaTickets(items.slice((pagina - 1) * POR_PAGINA_CLIENTE, pagina * POR_PAGINA_CLIENTE), cols, { caption: 'Tickets de ' + loc }),
        paginas > 1 ? ui.paginador({
          total: items.length, pagina, porPagina: POR_PAGINA_CLIENTE,
          alCambiar: (p) => { App.router.actualizarQuery({ vista: clave, p: String(p) }); ctx.refrescar(); },
        }) : null,
      ];
    }

    return h('div', { class: 'pila-lg' },
      saludo(u),
      C.cola({
        id: 'cola-cliente',
        etiqueta: 'Tickets de ' + loc,
        activa: ctx.query.vista,
        alCambiar: (v) => App.router.actualizarQuery({ vista: v }),
        pestanas: [
          { clave: 'curso', texto: 'En curso', cuenta: enCurso.length, contenido: () => lista('curso', enCurso, 'No hay tickets en curso') },
          { clave: 'bloqueados', texto: 'Esperan tu respuesta', cuenta: bloqueados.length, tono: 'rojo', contenido: () => lista('bloqueados', bloqueados, 'Ningún ticket espera tu respuesta') },
          { clave: 'cerrados', texto: 'Cerrados', cuenta: cerrados.length, tono: 'verde', contenido: () => lista('cerrados', cerrados, 'Todavía no hay tickets cerrados') },
        ],
      }));
  }

  /**
   * Estadísticas del cliente: lo mínimo de su localidad (en curso, cerrados,
   * tiempos de resolución, tickets por sistema y por mes).
   */
  App.vistas.estadisticasCliente = function (ctx) {
    const S = App.store;
    const C = App.comun;
    const u = ctx.usuario;
    const loc = S.nombre('localidades', u.localidadId);
    const tickets = S.ticketsVisibles(u);
    const enCurso = tickets.filter(activo);
    const bloqueados = enCurso.filter((t) => t.estado === 'BLOQUEADO');
    const hace30 = Date.now() - 30 * U.DIA;
    const cerrados30 = tickets.filter((t) => t.estado === 'CERRADO' && new Date(t.cerradoEn).getTime() >= hace30).length;
    const hace90 = Date.now() - 90 * U.DIA;
    const resueltos90 = tickets.filter((t) => t.estado === 'CERRADO' && !t.registroDirecto && new Date(t.cerradoEn).getTime() >= hace90);
    const promedio = resueltos90.length ? resueltos90.reduce((a, t) => a + S.duracionTicket(t), 0) / resueltos90.length : 0;
    const masAntiguo = enCurso.slice().sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))[0];
    const ultimos90 = tickets.filter((t) => new Date(t.creadoEn).getTime() >= hace90);
    const porSistema = Array.from(U.contarPor(ultimos90, (t) => t.sistemaId), ([clave, valor]) => ({ clave, valor, etiqueta: S.nombre('sistemas', clave) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    // Tickets registrados por mes (últimos 6 meses).
    const meses = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({ clave: U.claveMes(d), etiqueta: U.mesCorto(d), etiquetaLarga: U.mesLargo(d), valor: 0 });
    }
    const porMes = U.contarPor(tickets, (t) => U.claveMes(t.creadoEn));
    meses.forEach((m) => { m.valor = porMes.get(m.clave) || 0; });

    ctx.titulo('Estadísticas de ' + loc);
    return h('div', { class: 'pila-lg' },
      App.ui.cabecera({ titulo: 'Estadísticas de ' + loc }),
      h('div', { class: 'mosaicos' },
        C.mosaico({ etiqueta: 'En curso', icono: 'reloj', valor: enCurso.length, tono: 'dorado', detalle: bloqueados.length ? U.plural(bloqueados.length, 'espera tu respuesta', 'esperan tu respuesta') : 'Ninguno espera tu respuesta', href: '#/' }),
        C.mosaico({ etiqueta: 'Cerrados en 30 días', icono: 'check', valor: cerrados30, tono: 'verde', href: '#/?vista=cerrados' }),
        C.mosaico({ etiqueta: 'Resolución promedio', icono: 'historial', valor: resueltos90.length ? U.duracionCorta(promedio) : '—', detalle: 'Últimos 90 días · ' + U.plural(resueltos90.length, 'ticket', 'tickets') }),
        C.mosaico({ etiqueta: 'Abierto hace más tiempo', icono: 'bandeja', valor: masAntiguo ? U.duracionCorta(S.duracionTicket(masAntiguo)) : '—', detalle: masAntiguo ? '#' + masAntiguo.numero + ' · ' + U.truncar(masAntiguo.titulo, 34) : 'No hay tickets en curso', href: masAntiguo ? '#/tickets/' + masAntiguo.numero : null })),
      h('div', { class: 'grid-2' },
        App.charts.tarjeta({
          titulo: 'Tickets registrados por mes',
          descripcion: 'Últimos 6 meses',
          grafico: App.charts.columnas({ titulo: 'Tickets registrados por mes', datos: meses }),
          tabla: { columnas: ['Mes', 'Tickets'], filas: meses.map((m) => [m.etiquetaLarga, U.formatoNumero(m.valor)]) },
        }),
        App.charts.tarjeta({
          titulo: 'Tickets por sistema',
          descripcion: 'Últimos 90 días',
          grafico: App.charts.barras({ titulo: 'Tickets por sistema', datos: porSistema, total: ultimos90.length }),
          tabla: { columnas: ['Sistema', 'Tickets'], filas: porSistema.map((d) => [d.etiqueta, U.formatoNumero(d.valor)]) },
          vacio: porSistema.length ? null : h('p', { class: 'chico suave' }, 'No hay tickets en los últimos 90 días.'),
        })));
  };

  // ------------------------------------------------------------ Operador ---

  function inicioOperador(ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const enCurso = S.ticketsVisibles(u).filter(activo);
    const pendientes = enCurso.filter((t) => !t.operadorId).sort(C.ORDENES.criticidad.fn);
    const mios = enCurso.filter((t) => t.operadorId === u.id).sort(C.ORDENES.actualizados.fn);
    const borradores = S.borradoresDe(u);
    const favoritos = S.favoritosDe(u);
    const favTickets = favoritos.filter((f) => f.tipo === 'ticket').map((f) => f.item);
    const favSoluciones = favoritos.filter((f) => f.tipo === 'solucion').map((f) => f.item);

    function tomar(t) {
      try {
        S.asignar(t.id, u, u.id);
        ui.toast('Tomaste el ticket #' + t.numero + '.', { accion: { texto: 'Abrir', fn: () => App.router.ir('/tickets/' + t.numero) } });
        ctx.refrescar();
      } catch (e) { ui.mostrarError(e); }
    }

    const pie = (n, href) => (n > 12 ? h('div', { class: 'cola-pie' }, verTodos(href, 'Ver los ' + n)) : null);
    const tablaBorradores = () => h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
      h('thead', null, h('tr', null, ['Borrador', 'Localidad', 'Guardado', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', null, borradores.map((b) => h('tr', null,
        ui.celda('Borrador', h('a', { class: 'fuerte', href: '#/borradores/' + b.id }, b.titulo || 'Sin título'), 'sin-label'),
        ui.celda('Localidad', b.localidadId ? S.nombre('localidades', b.localidadId) : '—'),
        ui.celda('Guardado', ui.tiempo(b.actualizadoEn)),
        ui.celda('', h('a', { class: 'btn btn-secundario btn-sm', href: '#/borradores/' + b.id }, 'Continuar'), 'derecha sin-label'))))));

    // Favoritos: primero los tickets y después las soluciones reutilizables, cada grupo con su tabla.
    const tablaSolucionesFav = () => h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
      h('caption', { class: 'sr-only' }, 'Soluciones reutilizables favoritas'),
      h('thead', null, h('tr', null, ['Solución', 'Estado', 'Usos', h('span', { class: 'sr-only' }, 'Favorito')].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', null, favSoluciones.map((s) => {
        const usos = S.usosDeSolucion(s.id).length;
        const tr = h('tr', { class: 'clic' },
          ui.celda('Solución', h('div', { class: 'titulo-celda' }, h('a', { href: '#/soluciones/' + s.id }, s.titulo), h('span', { class: 'sub' }, ui.clasificacion(s.sistemaId, s.subsistemaId))), 'sin-label'),
          ui.celda('Estado', ui.badgeSolucion(s.estado)),
          ui.celda('Usos', usos ? U.plural(usos, 'vez', 'veces') : h('span', { class: 'suave' }, 'Sin usos')),
          ui.celda('', ui.botonFavorito('solucion', s.id, { etiqueta: s.titulo }), 'celda-fav derecha sin-label'));
        tr.addEventListener('click', (e) => { if (!e.target.closest('a, button')) App.router.ir('/soluciones/' + s.id); });
        return tr;
      }))));
    // La cola sólo acepta una lista plana de nodos.
    const contenidoFavoritos = () => (favoritos.length
      ? [].concat(
        favTickets.length ? [h('h3', { class: 'cola-subtitulo' }, 'Tickets'), C.tablaTickets(favTickets, ['numero', 'ticket', 'localidad', 'estado', 'duracion', 'actualizado'], { caption: 'Tickets favoritos' })] : [],
        favSoluciones.length ? [h('h3', { class: 'cola-subtitulo' }, 'Soluciones reutilizables'), tablaSolucionesFav()] : [])
      : ui.vacio({ icono: 'estrella', titulo: 'Todavía no tenés favoritos', texto: 'Marcá con la estrella los tickets o las soluciones reutilizables que consultás seguido y van a aparecer acá.' }));

    return h('div', { class: 'pila-lg' },
      saludo(u),
      C.cola({
        id: 'cola-operador',
        etiqueta: 'Mi trabajo',
        activa: ctx.query.vista,
        alCambiar: (v) => App.router.actualizarQuery({ vista: v }),
        pestanas: [
          // Lo principal es lo que nadie tomó todavía, de cualquier localidad.
          {
            clave: 'pendientes', texto: 'Pendientes', cuenta: pendientes.length, tono: 'dorado',
            contenido: () => (pendientes.length
              ? [C.tablaTickets(pendientes.slice(0, 12), ['numero', 'ticket', 'localidad', 'criticidad', 'duracion', 'accion'], {
                caption: 'Tickets pendientes: nadie de Mesa de ayuda los tomó',
                accion: (t) => h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => tomar(t) }, ui.icono('asignar', 'i-sm'), 'Tomar'),
              }), pie(pendientes.length, '#/tickets?estado=ABIERTO')]
              : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay tickets pendientes', texto: 'Todos los tickets en curso ya los tomó alguien de Mesa de ayuda.' })),
          },
          {
            clave: 'mios', texto: 'Mis tickets', cuenta: mios.length,
            contenido: () => (mios.length
              ? [C.tablaTickets(mios.slice(0, 12), ['numero', 'ticket', 'localidad', 'estado', 'duracion', 'actualizado'], { caption: 'Mis tickets en curso' }), pie(mios.length, '#/tickets?atiende=' + u.id)]
              : ui.vacio({ titulo: 'No tenés tickets en curso' })),
          },
          { clave: 'favoritos', texto: 'Favoritos', cuenta: favoritos.length, contenido: contenidoFavoritos },
          {
            clave: 'borradores', texto: 'Mis borradores', cuenta: borradores.length, tono: 'gris',
            contenido: () => (borradores.length ? tablaBorradores() : ui.vacio({ icono: 'borrador', titulo: 'No tenés borradores' })),
          },
        ],
      }));
  }

  // ------------------------------------------------------- Administrador ---

  function inicioAdmin(ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const tickets = S.ticketsVisibles(u);
    const enCurso = tickets.filter(activo);
    const sinAsignar = enCurso.filter((t) => !t.operadorId).length;
    const desde = Date.now() - 30 * U.DIA;
    const ultimos30 = tickets.filter((t) => new Date(t.creadoEn).getTime() >= desde);
    const cerrados30 = tickets.filter((t) => t.estado === 'CERRADO' && new Date(t.cerradoEn).getTime() >= desde).length;
    const porAprobar = S.soluciones({ estado: 'PENDIENTE' }).sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

    // Tickets registrados por mes (últimos 6 meses).
    const meses = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({ clave: U.claveMes(d), etiqueta: U.mesCorto(d), etiquetaLarga: U.mesLargo(d), valor: 0 });
    }
    const porMes = U.contarPor(tickets, (t) => U.claveMes(t.creadoEn));
    meses.forEach((m) => { m.valor = porMes.get(m.clave) || 0; });

    // Sistemas con más tickets en los últimos 30 días.
    const porSistema = Array.from(U.contarPor(ultimos30, (t) => t.sistemaId), ([clave, valor]) => ({ clave, valor, etiqueta: S.nombre('sistemas', clave) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);

    async function aprobar(s) {
      const ok = await ui.confirmar({ titulo: 'Aprobar la solución reutilizable', mensaje: '«' + s.titulo + '» se empieza a sugerir al cargar tickets parecidos.', textoConfirmar: 'Aprobar' });
      if (!ok) return;
      try {
        S.aprobarSolucion(s.id, u);
        ui.toast('Solución reutilizable aprobada: desde ahora se sugiere.');
        ctx.refrescar();
      } catch (e) { ui.mostrarError(e); }
    }

    const listaPorAprobar = porAprobar.length
      ? h('div', { class: 'por-aprobar' }, porAprobar.slice(0, 5).map((s) => {
        const autor = S.usuario(s.creadaPorId);
        const origen = s.ticketOrigenId ? S.ticket(s.ticketOrigenId) : null;
        return h('div', { class: 'por-aprobar-item' },
          h('div', { class: 'crecer' },
            h('a', { class: 'fuerte', href: '#/soluciones/' + s.id }, s.titulo),
            h('div', { class: 'chico suave' }, ui.clasificacion(s.sistemaId, s.subsistemaId), ' · ', autor ? autor.nombre : '—', ' · ', U.relativo(s.creadaEn), origen ? ' · ticket #' + origen.numero : '')),
          h('div', { class: 'fila-sm', style: 'flex-wrap: nowrap' },
            h('a', { class: 'btn btn-neutro btn-sm', href: '#/soluciones/' + s.id }, 'Revisar'),
            h('button', { type: 'button', class: 'btn btn-exito btn-sm', onClick: () => aprobar(s) }, ui.icono('check', 'i-sm'), 'Aprobar')));
      }))
      : ui.vacio({ icono: 'checkCirculo', titulo: 'Nada por aprobar' });

    return h('div', { class: 'pila-lg' },
      saludo(u),
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Por aprobar', icono: 'libro', valor: porAprobar.length, tono: 'tinta', href: '#/soluciones?estado=PENDIENTE' }),
        mosaico({ etiqueta: 'Registrados en 30 días', icono: 'ticket', valor: ultimos30.length, href: '#/estadisticas?periodo=30d' }),
        mosaico({ etiqueta: 'Cerrados en 30 días', icono: 'check', valor: cerrados30, tono: 'verde', href: '#/tickets?estado=CERRADO' }),
        mosaico({ etiqueta: 'En curso', icono: 'reloj', valor: enCurso.length, tono: 'dorado', href: '#/tickets?estado=en-curso' }),
        mosaico({ etiqueta: 'Sin asignar', icono: 'bandeja', valor: sinAsignar, tono: 'gris', href: '#/tickets?atiende=sin' })),
      h('div', { class: 'grid-2' },
        tarjeta('Soluciones reutilizables por aprobar', listaPorAprobar, porAprobar.length > 5 ? verTodos('#/soluciones?estado=PENDIENTE', 'Ver las ' + porAprobar.length) : null),
        App.charts.tarjeta({
          titulo: 'Tickets registrados por mes',
          descripcion: 'Últimos 6 meses',
          grafico: App.charts.columnas({ titulo: 'Tickets registrados por mes', datos: meses }),
          tabla: { columnas: ['Mes', 'Tickets'], filas: meses.map((m) => [m.etiquetaLarga, U.formatoNumero(m.valor)]) },
          pie: verTodos('#/estadisticas', 'Ver todas las estadísticas'),
        })),
      App.charts.tarjeta({
        titulo: 'Sistemas con más tickets',
        descripcion: 'Últimos 30 días',
        grafico: App.charts.barras({ titulo: 'Sistemas con más tickets', datos: porSistema, total: ultimos30.length }),
        tabla: { columnas: ['Sistema', 'Tickets'], filas: porSistema.map((d) => [d.etiqueta, U.formatoNumero(d.valor)]) },
        vacio: porSistema.length ? null : h('p', { class: 'chico suave' }, 'No hay tickets en los últimos 30 días.'),
      }));
  }

  App.vistas.inicio = function (ctx) {
    const u = ctx.usuario;
    if (u.rol === 'CLIENTE') return inicioCliente(ctx);
    if (u.rol === 'OPERADOR') return inicioOperador(ctx);
    return inicioAdmin(ctx);
  };
})(window.App = window.App || {});
