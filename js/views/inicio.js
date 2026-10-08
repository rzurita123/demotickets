/* ==========================================================================
   Inicio de cada rol.
   - Cliente: crear ticket y los tickets de su localidad, en una cola con pestañas.
   - Operador: crear ticket, buscador de soluciones y su cola de trabajo.
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

  function inicioCliente(ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const loc = S.nombre('localidades', u.localidadId);
    const tickets = S.ticketsVisibles(u);
    const enCurso = tickets.filter(activo).sort(C.ORDENES.actualizados.fn);
    const bloqueados = enCurso.filter((t) => t.estado === 'BLOQUEADO');
    const desde = Date.now() - 30 * U.DIA;
    const cerrados = tickets.filter((t) => t.estado === 'CERRADO' && new Date(t.cerradoEn).getTime() >= desde)
      .sort((a, b) => b.cerradoEn.localeCompare(a.cerradoEn));
    const cols = ['numero', 'ticket', 'creador', 'estado', 'actualizado'];
    const lista = (items, vacio, href) => (items.length
      ? [C.tablaTickets(items.slice(0, 12), cols, { caption: 'Tickets de ' + loc }), items.length > 12 ? h('div', { class: 'cola-pie' }, verTodos(href, 'Ver los ' + items.length)) : null]
      : ui.vacio({ icono: 'checkCirculo', titulo: vacio }));

    return h('div', { class: 'pila-lg' },
      saludo(u, h('a', { class: 'btn btn-primario btn-lg', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Crear ticket')),
      C.cola({
        id: 'cola-cliente',
        etiqueta: 'Tickets de ' + loc,
        activa: ctx.query.vista,
        alCambiar: (v) => App.router.actualizarQuery({ vista: v }),
        pestanas: [
          { clave: 'curso', texto: 'En curso', cuenta: enCurso.length, contenido: () => lista(enCurso, 'No hay tickets en curso', '#/tickets') },
          { clave: 'bloqueados', texto: 'Esperan tu respuesta', cuenta: bloqueados.length, tono: 'rojo', contenido: () => lista(bloqueados, 'Ningún ticket espera tu respuesta', '#/tickets?estado=BLOQUEADO') },
          { clave: 'cerrados', texto: 'Cerrados en 30 días', cuenta: cerrados.length, tono: 'verde', contenido: () => lista(cerrados, 'No hay tickets cerrados en los últimos 30 días', '#/tickets?estado=CERRADO') },
        ],
      }));
  }

  // ------------------------------------------------------------ Operador ---

  function inicioOperador(ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const enCurso = S.ticketsVisibles(u).filter(activo);
    const sinAsignar = enCurso.filter((t) => !t.operadorId).sort(C.ORDENES.criticidad.fn);
    const mios = enCurso.filter((t) => t.operadorId === u.id).sort(C.ORDENES.actualizados.fn);
    const borradores = S.borradoresDe(u);

    function tomar(t) {
      try {
        S.asignar(t.id, u, u.id);
        ui.toast('Tomaste el ticket #' + t.numero + '.', { accion: { texto: 'Abrir', fn: () => App.router.ir('/tickets/' + t.numero) } });
        ctx.refrescar();
      } catch (e) { ui.mostrarError(e); }
    }

    const buscador = h('input', { type: 'search', id: 'buscar-solucion', placeholder: 'Buscar una solución: «la impresora no imprime»', 'aria-label': 'Describí el problema para buscar una solución' });
    const formBuscar = h('form', { class: 'buscador-rapido', role: 'search' },
      ui.icono('buscar'),
      buscador,
      h('button', { type: 'submit', class: 'btn btn-oscuro' }, 'Buscar'));
    formBuscar.addEventListener('submit', (e) => {
      e.preventDefault();
      App.router.ir('/soluciones/buscar' + (buscador.value.trim() ? '?q=' + encodeURIComponent(buscador.value.trim()) : ''));
    });

    const pie = (n, href) => (n > 12 ? h('div', { class: 'cola-pie' }, verTodos(href, 'Ver los ' + n)) : null);
    const tablaBorradores = () => h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
      h('thead', null, h('tr', null, ['Borrador', 'Localidad', 'Guardado', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', null, borradores.map((b) => h('tr', null,
        ui.celda('Borrador', h('a', { class: 'fuerte', href: '#/borradores/' + b.id }, b.titulo || 'Sin título'), 'sin-label'),
        ui.celda('Localidad', b.localidadId ? S.nombre('localidades', b.localidadId) : '—'),
        ui.celda('Guardado', ui.tiempo(b.actualizadoEn)),
        ui.celda('', h('a', { class: 'btn btn-secundario btn-sm', href: '#/borradores/' + b.id }, 'Continuar'), 'derecha sin-label'))))));

    return h('div', { class: 'pila-lg' },
      saludo(u, [formBuscar, h('a', { class: 'btn btn-primario btn-lg', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Crear ticket')]),
      C.cola({
        id: 'cola-operador',
        etiqueta: 'Mi trabajo',
        activa: ctx.query.vista,
        alCambiar: (v) => App.router.actualizarQuery({ vista: v }),
        pestanas: [
          {
            clave: 'mios', texto: 'Mis tickets', cuenta: mios.length,
            contenido: () => (mios.length
              ? [C.tablaTickets(mios.slice(0, 12), ['numero', 'ticket', 'localidad', 'estado', 'actualizado'], { caption: 'Mis tickets en curso' }), pie(mios.length, '#/tickets?atiende=' + u.id)]
              : ui.vacio({ titulo: 'No tenés tickets en curso' })),
          },
          {
            clave: 'borradores', texto: 'Mis borradores', cuenta: borradores.length, tono: 'gris',
            contenido: () => (borradores.length ? tablaBorradores() : ui.vacio({ icono: 'borrador', titulo: 'No tenés borradores' })),
          },
          {
            clave: 'sin', texto: 'Sin asignar', cuenta: sinAsignar.length, tono: 'dorado',
            contenido: () => (sinAsignar.length
              ? [C.tablaTickets(sinAsignar.slice(0, 12), ['numero', 'ticket', 'localidad', 'criticidad', 'creado', 'accion'], {
                caption: 'Tickets sin asignar',
                accion: (t) => h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => tomar(t) }, ui.icono('asignar', 'i-sm'), 'Tomar'),
              }), pie(sinAsignar.length, '#/tickets?atiende=sin')]
              : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay tickets sin asignar' })),
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
      saludo(u, h('a', { class: 'btn btn-neutro', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Crear ticket')),
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Por aprobar', icono: 'libro', valor: porAprobar.length, tono: 'tinta', href: '#/soluciones?estado=PENDIENTE' }),
        mosaico({ etiqueta: 'Registrados en 30 días', icono: 'ticket', valor: ultimos30.length, href: '#/estadisticas?periodo=30d' }),
        mosaico({ etiqueta: 'Cerrados en 30 días', icono: 'check', valor: cerrados30, tono: 'verde', href: '#/tickets?estado=CERRADO' }),
        mosaico({ etiqueta: 'En curso', icono: 'reloj', valor: enCurso.length, tono: 'dorado', href: '#/tickets' }),
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
      h('div', { class: 'grid-2' },
        App.charts.tarjeta({
          titulo: 'Sistemas con más tickets',
          descripcion: 'Últimos 30 días',
          grafico: App.charts.barras({ titulo: 'Sistemas con más tickets', datos: porSistema, total: ultimos30.length }),
          tabla: { columnas: ['Sistema', 'Tickets'], filas: porSistema.map((d) => [d.etiqueta, U.formatoNumero(d.valor)]) },
          vacio: porSistema.length ? null : h('p', { class: 'chico suave' }, 'No hay tickets en los últimos 30 días.'),
        }),
        tarjeta('Administración', h('div', { class: 'accesos' }, [
          ['#/admin/usuarios', 'usuarios', 'Usuarios'],
          ['#/admin/localidades', 'pin', 'Localidades'],
          ['#/admin/catalogos', 'capas', 'Catálogos'],
          ['#/auditoria', 'escudo', 'Auditoría'],
        ].map(([href, ic, t]) => h('a', { href, class: 'acceso' }, ui.icono(ic), h('span', null, t)))))));
  }

  App.vistas.inicio = function (ctx) {
    const u = ctx.usuario;
    if (u.rol === 'CLIENTE') return inicioCliente(ctx);
    if (u.rol === 'OPERADOR') return inicioOperador(ctx);
    return inicioAdmin(ctx);
  };
})(window.App = window.App || {});
