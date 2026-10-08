/* ==========================================================================
   Inicio de cada rol.
   - Cliente: seguimiento de los tickets de su localidad.
   - Operador: puerta de entrada ("Quiero crear un ticket" / "Ya lo resolví"),
     buscador de soluciones y su cola de trabajo.
   - Administrador: indicadores, soluciones por aprobar y tickets elevados.
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
    const u = ctx.usuario;
    const loc = S.nombre('localidades', u.localidadId);
    const tickets = S.ticketsVisibles(u);
    const enCurso = tickets.filter(activo).sort(App.comun.ORDENES.actualizados.fn);
    const cuenta = (e) => tickets.filter((t) => t.estado === e).length;
    const desde = Date.now() - 30 * U.DIA;
    const cerrados = tickets.filter((t) => t.estado === 'CERRADO').sort((a, b) => b.cerradoEn.localeCompare(a.cerradoEn));
    const cerrados30 = cerrados.filter((t) => new Date(t.cerradoEn).getTime() >= desde).length;
    const elevados = enCurso.filter((t) => t.elevadoA).length;

    return h('div', { class: 'pila-lg' },
      ui.cabecera({
        titulo: 'Hola, ' + primerNombre(u),
        acciones: [h('a', { class: 'btn btn-primario btn-lg', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Crear un ticket')],
      }),
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Abiertos', icono: 'circulo', valor: cuenta('ABIERTO'), href: '#/tickets?estado=ABIERTO' }),
        mosaico({ etiqueta: 'En proceso', icono: 'reloj', valor: cuenta('EN_PROCESO'), tono: 'dorado', detalle: elevados ? U.plural(elevados, 'elevado', 'elevados') : null, href: '#/tickets?estado=EN_PROCESO' }),
        mosaico({ etiqueta: 'Bloqueados', icono: 'pausa', valor: cuenta('BLOQUEADO'), tono: 'rojo', href: '#/tickets?estado=BLOQUEADO' }),
        mosaico({ etiqueta: 'Cerrados · 30 días', icono: 'check', valor: cerrados30, tono: 'verde', href: '#/tickets?estado=CERRADO' })),
      tarjeta('Tickets en curso',
        enCurso.length
          ? App.comun.tablaTickets(enCurso.slice(0, 8), ['numero', 'ticket', 'creador', 'estado', 'actualizado'], { caption: 'Tickets en curso de ' + loc })
          : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay tickets en curso' }),
        enCurso.length > 8 ? verTodos('#/tickets', 'Ver los ' + enCurso.length) : null),
      tarjeta('Cerrados recientemente',
        cerrados.length
          ? App.comun.tablaTickets(cerrados.slice(0, 5), ['numero', 'ticket', 'creador', 'cerrado'], { caption: 'Tickets cerrados recientemente' })
          : ui.vacio({ titulo: 'Todavía no hay tickets cerrados' }),
        verTodos('#/tickets?estado=CERRADO')));
  }

  // ------------------------------------------------------------ Operador ---

  function inicioOperador(ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const enCurso = S.ticketsVisibles(u).filter(activo);
    const sinAsignar = enCurso.filter((t) => !t.operadorId).sort(App.comun.ORDENES.criticidad.fn);
    const mios = enCurso.filter((t) => t.operadorId === u.id).sort(App.comun.ORDENES.actualizados.fn);
    const misBloqueados = mios.filter((t) => t.estado === 'BLOQUEADO').length;
    const elevados = enCurso.filter((t) => t.elevadoA).length;
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

    return h('div', { class: 'pila-lg' },
      saludo(u),
      h('div', { class: 'puertas' },
        h('a', { class: 'puerta azul', href: '#/tickets/nuevo' },
          h('span', { class: 'icono-caja' }, ui.icono('ticket')),
          h('span', { class: 'textos' }, h('span', { class: 'eyebrow' }, 'Queda en proceso'), h('h2', null, 'Crear ticket')),
          h('span', { class: 'ir', 'aria-hidden': 'true' }, ui.icono('flechaDer'))),
        h('a', { class: 'puerta dorada', href: '#/tickets/nuevo?modo=resuelto' },
          h('span', { class: 'icono-caja' }, ui.icono('checkCirculo')),
          h('span', { class: 'textos' }, h('span', { class: 'eyebrow' }, 'Queda cerrado'), h('h2', null, 'Ya lo resolví')),
          h('span', { class: 'ir', 'aria-hidden': 'true' }, ui.icono('flechaDer')))),
      formBuscar,
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Sin asignar', icono: 'bandeja', valor: sinAsignar.length, tono: 'dorado', href: '#/tickets?atiende=sin' }),
        mosaico({ etiqueta: 'Mis tickets', icono: 'usuario', valor: mios.length, detalle: misBloqueados ? U.plural(misBloqueados, 'bloqueado', 'bloqueados') : null, href: '#/tickets?atiende=' + u.id }),
        mosaico({ etiqueta: 'Elevados', icono: 'elevar', valor: elevados, tono: 'naranja', href: '#/tickets?estado=elevados' }),
        mosaico({ etiqueta: 'Mis borradores', icono: 'borrador', valor: borradores.length, tono: 'gris', href: '#/borradores' })),
      tarjeta('Sin asignar',
        sinAsignar.length
          ? App.comun.tablaTickets(sinAsignar.slice(0, 6), ['numero', 'ticket', 'localidad', 'criticidad', 'creado', 'accion'], {
            caption: 'Tickets sin asignar',
            accion: (t) => h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => tomar(t) }, ui.icono('asignar', 'i-sm'), 'Tomar'),
          })
          : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay tickets sin asignar' }),
        sinAsignar.length > 6 ? verTodos('#/tickets?atiende=sin', 'Ver los ' + sinAsignar.length) : null),
      tarjeta('Mis tickets en curso',
        mios.length
          ? App.comun.tablaTickets(mios.slice(0, 8), ['numero', 'ticket', 'localidad', 'estado', 'actualizado'], { caption: 'Mis tickets en curso' })
          : ui.vacio({ titulo: 'No tenés tickets en curso' }),
        mios.length > 8 ? verTodos('#/tickets?atiende=' + u.id, 'Ver los ' + mios.length) : null));
  }

  // ------------------------------------------------------- Administrador ---

  function inicioAdmin(ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const tickets = S.ticketsVisibles(u);
    const enCurso = tickets.filter(activo);
    const sinAsignar = enCurso.filter((t) => !t.operadorId).length;
    const elevados = enCurso.filter((t) => t.elevadoA).sort(App.comun.ORDENES.actualizados.fn);
    const desde = Date.now() - 30 * U.DIA;
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

    const listaPorAprobar = porAprobar.length
      ? h('div', { class: 'pila-sm' }, porAprobar.slice(0, 4).map((s) => {
        const autor = S.usuario(s.creadaPorId);
        const origen = s.ticketOrigenId ? S.ticket(s.ticketOrigenId) : null;
        return h('a', { class: 'card compacta tarjeta-solucion', href: '#/soluciones/' + s.id },
          h('div', { class: 'fila-entre' }, h('h3', null, s.titulo), ui.badgeSolucion(s.estado)),
          h('div', { class: 'clasif' }, ui.clasificacion(s.sistemaId, s.subsistemaId)),
          h('div', { class: 'chico suave' }, autor ? autor.nombre : '—', ' · ', U.relativo(s.creadaEn), origen ? ' · ticket #' + origen.numero : ''));
      }))
      : ui.vacio({ icono: 'checkCirculo', titulo: 'Nada por revisar' });

    return h('div', { class: 'pila-lg' },
      saludo(u, h('a', { class: 'btn btn-neutro', href: '#/estadisticas' }, ui.icono('grafico', 'i-sm'), 'Estadísticas')),
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'En curso', icono: 'lista', valor: enCurso.length, href: '#/tickets' }),
        mosaico({ etiqueta: 'Sin asignar', icono: 'bandeja', valor: sinAsignar, tono: 'dorado', href: '#/tickets?atiende=sin' }),
        mosaico({ etiqueta: 'Elevados', icono: 'elevar', valor: elevados.length, tono: 'naranja', href: '#/tickets?estado=elevados' }),
        mosaico({ etiqueta: 'Cerrados · 30 días', icono: 'check', valor: cerrados30, tono: 'verde', href: '#/tickets?estado=CERRADO' }),
        mosaico({ etiqueta: 'Por aprobar', icono: 'libro', valor: porAprobar.length, tono: 'tinta', href: '#/soluciones?estado=PENDIENTE' })),
      h('div', { class: 'dos-columnas' },
        h('div', { class: 'pila-lg' },
          tarjeta('Soluciones por aprobar', listaPorAprobar, porAprobar.length > 4 ? verTodos('#/soluciones?estado=PENDIENTE', 'Ver las ' + porAprobar.length) : null),
          tarjeta('Tickets elevados en curso',
            elevados.length
              ? App.comun.tablaTickets(elevados.slice(0, 6), ['numero', 'ticket', 'localidad', 'estado', 'atiende', 'actualizado'], { caption: 'Tickets elevados en curso' })
              : ui.vacio({ titulo: 'No hay tickets elevados en curso' }),
            elevados.length > 6 ? verTodos('#/tickets?estado=elevados', 'Ver los ' + elevados.length) : null)),
        h('div', { class: 'pila-lg' },
          App.charts.tarjeta({
            titulo: 'Tickets registrados por mes',
            descripcion: 'Últimos 6 meses',
            grafico: App.charts.columnas({ titulo: 'Tickets registrados por mes', datos: meses }),
            tabla: { columnas: ['Mes', 'Tickets'], filas: meses.map((m) => [m.etiquetaLarga, U.formatoNumero(m.valor)]) },
            pie: verTodos('#/estadisticas', 'Ver todas las estadísticas'),
          }),
          tarjeta('Administración', h('div', { class: 'accesos' }, [
            ['#/admin/usuarios', 'usuarios', 'Usuarios'],
            ['#/admin/localidades', 'pin', 'Localidades'],
            ['#/admin/catalogos', 'capas', 'Catálogos'],
            ['#/admin/parametros', 'ajustes', 'Sugerencias'],
            ['#/auditoria', 'escudo', 'Auditoría'],
          ].map(([href, ic, t]) => h('a', { href, class: 'acceso' }, ui.icono(ic), h('span', null, t))))))));
  }

  App.vistas.inicio = function (ctx) {
    const u = ctx.usuario;
    if (u.rol === 'CLIENTE') return inicioCliente(ctx);
    if (u.rol === 'OPERADOR') return inicioOperador(ctx);
    return inicioAdmin(ctx);
  };
})(window.App = window.App || {});
