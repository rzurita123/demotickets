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
    const bloqueados = enCurso.filter((t) => t.estado === 'BLOQUEADO');
    const elevados = enCurso.filter((t) => t.elevadoA).length;

    return h('div', { class: 'pila-lg' },
      ui.cabecera({
        antetitulo: loc,
        titulo: 'Hola, ' + primerNombre(u),
        subtitulo: 'Acá ves todos los tickets de ' + loc + ', también los que Mesa de ayuda cargó por ustedes.',
        acciones: [
          h('a', { class: 'btn btn-neutro', href: '#/tickets' }, ui.icono('lista', 'i-sm'), 'Ver todos los tickets'),
          h('a', { class: 'btn btn-primario', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Crear un ticket'),
        ],
      }),
      bloqueados.length ? ui.aviso([
        h('strong', null, bloqueados.length === 1 ? 'Hay un ticket Bloqueado' : 'Hay ' + bloqueados.length + ' tickets Bloqueados'),
        ', es decir, en espera de un factor externo (por ejemplo, una respuesta de ustedes): ',
        bloqueados.map((t, i) => [i ? ', ' : '', App.comun.enlaceTicket(t, '#' + t.numero + ' ' + t.titulo)]),
        '.',
      ], null, 'pausa') : null,
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Abiertos', icono: 'circulo', valor: cuenta('ABIERTO'), detalle: 'Todavía no atendidos', href: '#/tickets?estado=ABIERTO' }),
        mosaico({ etiqueta: 'En proceso', icono: 'reloj', valor: cuenta('EN_PROCESO'), detalle: elevados ? U.plural(elevados, 'elevado a otro nivel', 'elevados a otro nivel') : 'Mesa de ayuda los está atendiendo', href: '#/tickets?estado=EN_PROCESO' }),
        mosaico({ etiqueta: 'Bloqueados', icono: 'pausa', valor: cuenta('BLOQUEADO'), detalle: 'Por un factor externo', href: '#/tickets?estado=BLOQUEADO' }),
        mosaico({ etiqueta: 'Cerrados', icono: 'check', valor: cerrados30, detalle: 'En los últimos 30 días', href: '#/tickets?estado=CERRADO' })),
      tarjeta('Tickets en curso',
        enCurso.length
          ? App.comun.tablaTickets(enCurso.slice(0, 8), ['numero', 'ticket', 'creador', 'estado', 'actualizado'], { caption: 'Tickets en curso de ' + loc })
          : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay tickets en curso', texto: 'Cuando creen un ticket va a aparecer acá hasta que se cierre.' }),
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

    const buscador = h('input', { type: 'search', id: 'buscar-solucion', placeholder: 'Describí el problema para buscar una solución (por ejemplo: la impresora no imprime)', 'aria-label': 'Describí el problema para buscar una solución' });
    const formBuscar = h('form', { class: 'buscador-rapido', role: 'search' },
      ui.icono('buscar'),
      buscador,
      h('button', { type: 'submit', class: 'btn btn-oscuro' }, 'Buscar'));
    formBuscar.addEventListener('submit', (e) => {
      e.preventDefault();
      App.router.ir('/soluciones/buscar' + (buscador.value.trim() ? '?q=' + encodeURIComponent(buscador.value.trim()) : ''));
    });

    return h('div', { class: 'pila-lg' },
      ui.cabecera({ antetitulo: 'Mesa de ayuda', titulo: 'Hola, ' + primerNombre(u), subtitulo: hoyLargo() }),
      h('div', { class: 'puertas' },
        h('a', { class: 'puerta azul', href: '#/tickets/nuevo' },
          h('div', { class: 'cabeza' }, h('span', { class: 'icono-caja' }, ui.icono('ticket', 'i-lg')), h('span', { class: 'eyebrow' }, 'Atención')),
          h('h2', null, 'Quiero crear un ticket'),
          h('p', null, 'Cargá el problema mientras hablás con la agencia. A medida que escribís aparecen soluciones parecidas.'),
          h('div', { class: 'pie-puerta' }, h('span'), h('span', { class: 'ir' }, 'Crear ticket', ui.icono('flechaDer', 'i-sm')))),
        h('a', { class: 'puerta dorada', href: '#/tickets/nuevo?modo=resuelto' },
          h('div', { class: 'cabeza' }, h('span', { class: 'icono-caja' }, ui.icono('checkCirculo', 'i-lg')), h('span', { class: 'eyebrow' }, 'Ya resuelto')),
          h('h2', null, 'Ya lo resolví'),
          h('p', null, 'Registrá un ticket que resolviste durante la llamada, con la solución aplicada.'),
          h('div', { class: 'pie-puerta' }, h('span'), h('span', { class: 'ir' }, 'Registrar', ui.icono('flechaDer', 'i-sm'))))),
      formBuscar,
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Sin asignar', icono: 'bandeja', valor: sinAsignar.length, detalle: 'Tickets en curso que nadie tomó', href: '#/tickets?atiende=sin' }),
        mosaico({ etiqueta: 'Mis tickets en curso', icono: 'usuario', valor: mios.length, detalle: U.plural(misBloqueados, 'bloqueado', 'bloqueados'), href: '#/tickets?atiende=' + u.id }),
        mosaico({ etiqueta: 'Elevados en curso', icono: 'elevar', valor: elevados, detalle: 'De todo el equipo', href: '#/tickets?estado=elevados' }),
        mosaico({ etiqueta: 'Mis borradores', icono: 'borrador', valor: borradores.length, detalle: 'Sólo los ves vos', href: '#/borradores' })),
      tarjeta('Sin asignar',
        sinAsignar.length
          ? App.comun.tablaTickets(sinAsignar.slice(0, 6), ['numero', 'ticket', 'localidad', 'criticidad', 'creado', 'accion'], {
            caption: 'Tickets sin asignar',
            accion: (t) => h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => tomar(t) }, ui.icono('asignar', 'i-sm'), 'Tomar'),
          })
          : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay tickets sin asignar', texto: 'Todos los tickets en curso tienen a alguien de Mesa de ayuda.' }),
        sinAsignar.length > 6 ? verTodos('#/tickets?atiende=sin', 'Ver los ' + sinAsignar.length) : null),
      tarjeta('Mis tickets en curso',
        mios.length
          ? App.comun.tablaTickets(mios.slice(0, 8), ['numero', 'ticket', 'localidad', 'estado', 'actualizado'], { caption: 'Mis tickets en curso' })
          : ui.vacio({ titulo: 'No tenés tickets en curso', texto: 'Tomá uno de la lista de sin asignar o creá un ticket nuevo.' }),
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
          h('div', { class: 'chico suave' }, 'Propuesta por ', autor ? autor.nombre : '—', ' · ', U.relativo(s.creadaEn), origen ? ' · desde el ticket #' + origen.numero : ' · sin ticket de origen'));
      }))
      : ui.vacio({ icono: 'checkCirculo', titulo: 'No hay borradores de solución por revisar' });

    return h('div', { class: 'pila-lg' },
      ui.cabecera({
        antetitulo: 'Gestión de ORMEN',
        titulo: 'Hola, ' + primerNombre(u),
        subtitulo: hoyLargo(),
        acciones: [h('a', { class: 'btn btn-neutro', href: '#/estadisticas' }, ui.icono('grafico', 'i-sm'), 'Estadísticas')],
      }),
      h('div', { class: 'mosaicos' },
        mosaico({ etiqueta: 'Tickets en curso', icono: 'lista', valor: enCurso.length, detalle: 'Abiertos, en proceso y bloqueados', href: '#/tickets' }),
        mosaico({ etiqueta: 'Sin asignar', icono: 'bandeja', valor: sinAsignar, detalle: 'En curso, sin operador', href: '#/tickets?atiende=sin' }),
        mosaico({ etiqueta: 'Elevados en curso', icono: 'elevar', valor: elevados.length, detalle: 'Derivados a otro grupo o persona', href: '#/tickets?estado=elevados' }),
        mosaico({ etiqueta: 'Cerrados', icono: 'check', valor: cerrados30, detalle: 'En los últimos 30 días', href: '#/tickets?estado=CERRADO' }),
        mosaico({ etiqueta: 'Soluciones por aprobar', icono: 'libro', valor: porAprobar.length, detalle: 'Borradores de Mesa de ayuda', href: '#/soluciones?estado=PENDIENTE' })),
      h('div', { class: 'dos-columnas' },
        h('div', { class: 'pila-lg' },
          tarjeta('Borradores de solución por revisar', listaPorAprobar, porAprobar.length > 4 ? verTodos('#/soluciones?estado=PENDIENTE', 'Ver las ' + porAprobar.length) : null),
          tarjeta('Tickets elevados en curso',
            elevados.length
              ? App.comun.tablaTickets(elevados.slice(0, 6), ['numero', 'ticket', 'localidad', 'estado', 'atiende', 'actualizado'], { caption: 'Tickets elevados en curso' })
              : ui.vacio({ titulo: 'No hay tickets elevados en curso' }),
            elevados.length > 6 ? verTodos('#/tickets?estado=elevados', 'Ver los ' + elevados.length) : null)),
        h('div', { class: 'pila-lg' },
          App.charts.tarjeta({
            titulo: 'Tickets registrados por mes',
            descripcion: 'Últimos 6 meses, todas las localidades',
            grafico: App.charts.columnas({ titulo: 'Tickets registrados por mes', datos: meses }),
            tabla: { columnas: ['Mes', 'Tickets'], filas: meses.map((m) => [m.etiquetaLarga, U.formatoNumero(m.valor)]) },
            pie: verTodos('#/estadisticas', 'Ver todas las estadísticas'),
          }),
          tarjeta('Administración', h('div', { class: 'pila-sm' }, [
            ['#/admin/usuarios', 'usuarios', 'Usuarios', 'Altas, roles y localidad de cada usuario'],
            ['#/admin/localidades', 'pin', 'Localidades', 'Bancas y agencias que usan el sistema'],
            ['#/admin/catalogos', 'capas', 'Catálogos', 'Sistemas, subsistemas, tipos y criticidades'],
            ['#/admin/parametros', 'ajustes', 'Parámetros de sugerencias', 'Puntos de cada criterio (provisorios)'],
            ['#/auditoria', 'escudo', 'Auditoría', 'Quién hizo qué y cuándo'],
          ].map(([href, ic, t, d]) => h('a', { href, class: 'fila', style: 'flex-wrap: nowrap; padding: 8px 4px; color: var(--texto)' },
            h('span', { class: 'avatar sm', style: 'background: var(--azul-claro); color: var(--azul-texto)' }, ui.icono(ic, 'i-sm')),
            h('span', { class: 'crecer' }, h('span', { class: 'fuerte', style: 'display: block' }, t), h('span', { class: 'chico suave' }, d)),
            ui.icono('derecha', 'i-sm'))))))));
  }

  App.vistas.inicio = function (ctx) {
    const u = ctx.usuario;
    if (u.rol === 'CLIENTE') return inicioCliente(ctx);
    if (u.rol === 'OPERADOR') return inicioOperador(ctx);
    return inicioAdmin(ctx);
  };
})(window.App = window.App || {});
