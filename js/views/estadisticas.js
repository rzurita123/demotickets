/* ==========================================================================
   Estadísticas (módulo de estadísticas de "Contexto a desarrollar").
   - Gestión de ORMEN (Administrador): estadísticas generales por
     sistema/subsistema, por fecha, por usuario de Mesa de ayuda, por tipo de
     ticket y por tipo de problema, y las soluciones técnicas aplicadas.
   - Cliente: estadísticas de los tickets de su localidad y seguimiento de
     los tickets en curso.
   Como en el sistema actual, debajo se listan los tickets del filtro.
   Los borradores no cuentan. Al hacer clic en una barra se filtra el resto
   de la página; otro clic en la misma barra quita el filtro.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;

  const POR_PAGINA = 10;

  const PERIODOS = [
    { clave: '30d', texto: 'Últimos 30 días', dias: 30 },
    { clave: '3m', texto: 'Últimos 3 meses', meses: 3 },
    { clave: '6m', texto: 'Últimos 6 meses', meses: 6 },
    { clave: '12m', texto: 'Últimos 12 meses', meses: 12 },
    { clave: 'todo', texto: 'Todo el historial' },
  ];
  const DEFECTOS = { periodo: '6m' };

  /** Desde cuándo cuenta el período y en qué tramos (días o meses) se reparte. */
  function calcularTramos(periodo, tickets) {
    const ahora = new Date();
    const lista = [];
    if (periodo.dias) {
      const inicio = U.inicioDelDia(ahora.getTime() - (periodo.dias - 1) * U.DIA);
      for (let i = 0; i < periodo.dias; i++) {
        const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
        lista.push({ clave: U.claveDia(d), etiqueta: U.diaMes(d), etiquetaLarga: U.fecha(d) });
      }
      return { desde: inicio.getTime(), grano: 'dia', lista };
    }
    let n = periodo.meses;
    if (!n) {
      const primero = tickets.reduce((min, t) => (t.creadoEn < min ? t.creadoEn : min), ahora.toISOString());
      const p = new Date(primero);
      n = (ahora.getFullYear() - p.getFullYear()) * 12 + ahora.getMonth() - p.getMonth() + 1;
    }
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - (n - 1), 1);
    for (let i = 0; i < n; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
      lista.push({ clave: U.claveMes(d), etiqueta: U.capitalizar(U.mesCorto(d)), etiquetaLarga: U.mesLargo(d) });
    }
    return { desde: periodo.meses ? inicio.getTime() : 0, grano: 'mes', lista };
  }

  App.vistas.estadisticas = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const esCliente = u.rol === 'CLIENTE';
    const loc = esCliente ? S.nombre('localidades', u.localidadId) : null;
    const base = S.ticketsVisibles(u); // nunca incluye borradores
    const q = Object.assign({}, DEFECTOS, ctx.query);
    if (!PERIODOS.some((p) => p.clave === q.periodo)) q.periodo = DEFECTOS.periodo;
    const vistasTabla = new Set(); // tarjetas que el usuario pasó a tabla

    let T = calcularTramos(PERIODOS.find((p) => p.clave === q.periodo), base);

    function nombreOperador(id) {
      const o = S.usuario(id);
      return o ? o.nombre + (o.activo === false ? ' (usuario inactivo)' : '') : '—';
    }

    // Dimensiones: clave del filtro en la dirección → valor en el ticket → nombre.
    const DIM = {
      loc: { etiqueta: 'Localidad', valor: (t) => t.localidadId, nombre: (v) => S.nombre('localidades', v) },
      sis: { etiqueta: 'Sistema', valor: (t) => t.sistemaId, nombre: (v) => S.nombre('sistemas', v) },
      sub: {
        etiqueta: 'Subsistema',
        valor: (t) => t.subsistemaId || '',
        nombre: (v) => {
          const x = S.subsistema(v);
          if (!x) return '—';
          return q.sis ? x.nombre : S.nombre('sistemas', x.sistemaId) + ' › ' + x.nombre;
        },
      },
      tipo: { etiqueta: 'Tipo de solicitud', valor: (t) => t.tipoSolicitudId, nombre: (v) => S.nombre('tiposSolicitud', v) },
      tp: { etiqueta: 'Tipo de problema', valor: (t) => t.tipoProblemaId || 'tp-nodef', nombre: (v) => S.nombre('tiposProblema', v) },
      op: { etiqueta: 'Atiende', valor: (t) => t.operadorId || 'sin', nombre: (v) => (v === 'sin' ? 'Sin asignar' : nombreOperador(v)) },
      estado: { etiqueta: 'Estado', valor: (t) => t.estado, nombre: (v) => S.nombreEstado(v) },
      sol: { etiqueta: 'Solución del catálogo', valor: (t) => (t.estado === 'CERRADO' && t.solucion && t.solucion.solucionCatalogoId) || '', nombre: (v) => S.nombre('soluciones', v) },
      tramo: {
        etiqueta: 'Fecha',
        valor: (t) => (T.grano === 'dia' ? U.claveDia(t.creadoEn) : U.claveMes(t.creadoEn)),
        nombre: (v) => { const x = T.lista.find((b) => b.clave === v); return x ? x.etiquetaLarga : v; },
      },
    };
    // Un cliente sólo filtra por lo que ve en su pantalla.
    const CLAVES = esCliente ? ['sis', 'sub', 'tipo', 'estado', 'tramo'] : ['loc', 'sis', 'sub', 'tipo', 'tp', 'op', 'estado', 'sol', 'tramo'];
    Object.keys(DIM).forEach((k) => { if (!CLAVES.includes(k)) delete q[k]; });
    if (q.tramo && !T.lista.some((b) => b.clave === q.tramo)) q.tramo = '';
    if (q.sub) { const x = S.subsistema(q.sub); if (!x) q.sub = ''; else q.sis = x.sistemaId; }

    // --------------------------------------------------------- Filtros ---
    const ctrl = {};
    ctrl.periodo = ui.select({ id: 'e-periodo', valor: q.periodo, opciones: PERIODOS.map((p) => ({ valor: p.clave, texto: p.texto })) });
    if (!esCliente) ctrl.loc = ui.select({ id: 'e-loc', vacio: 'Todas', valor: q.loc, opciones: S.localidades().map((l) => ({ valor: l.id, texto: l.nombre })) });
    ctrl.sis = ui.select({ id: 'e-sis', vacio: 'Todos', valor: q.sis, opciones: S.sistemas().map((s) => ({ valor: s.id, texto: s.nombre })) });
    ctrl.sub = h('select', { id: 'e-sub', class: 'control' });
    ctrl.tipo = ui.select({ id: 'e-tipo', vacio: 'Todos', valor: q.tipo, opciones: S.catalogo('tiposSolicitud').map((x) => ({ valor: x.id, texto: x.nombre })) });
    if (!esCliente) ctrl.tp = ui.select({ id: 'e-tp', vacio: 'Todos', valor: q.tp, opciones: S.catalogo('tiposProblema').map((x) => ({ valor: x.id, texto: x.nombre })) });
    if (!esCliente) {
      ctrl.op = ui.select({ id: 'e-op', vacio: 'Cualquiera', valor: q.op,
        opciones: [{ valor: 'sin', texto: 'Sin asignar' }].concat(S.operadores().map((o) => ({ valor: o.id, texto: nombreOperador(o.id) }))) });
    }
    ctrl.estado = ui.select({ id: 'e-estado', vacio: 'Todos', valor: q.estado, opciones: D.ESTADOS_REGISTRADOS.map((e) => ({ valor: e, texto: S.nombreEstado(e) })) });

    function cargarSubs() {
      U.vaciar(ctrl.sub);
      const subs = q.sis ? S.subsistemasDe(q.sis) : [];
      ctrl.sub.append(h('option', { value: '' }, q.sis ? 'Todos' : 'Elegí primero el sistema'));
      subs.forEach((x) => ctrl.sub.append(h('option', { value: x.id }, x.nombre + (x.ejemplo ? ' (ejemplo)' : ''))));
      ctrl.sub.disabled = !q.sis;
      ctrl.sub.value = q.sub && subs.some((x) => x.id === q.sub) ? q.sub : '';
    }
    cargarSubs();

    const ETIQUETAS = { periodo: 'Período', loc: 'Localidad', sis: 'Sistema', sub: 'Subsistema', tipo: 'Tipo de solicitud', tp: 'Tipo de problema', op: 'Atiende', estado: 'Estado' };
    const filtros = h('div', { class: 'filtros', role: 'search', 'aria-label': 'Filtros de estadísticas' },
      Object.keys(ctrl).map((k) => ui.campo({ nombre: k, id: ctrl[k].id, etiqueta: ETIQUETAS[k], control: ctrl[k] })));
    const activos = h('div', { class: 'fila-sm' });

    function actualizarControles() {
      Object.keys(ctrl).forEach((k) => { if (k !== 'sub') ctrl[k].value = q[k] || ''; });
      cargarSubs();
    }

    function sincronizar() {
      const limpio = {};
      ['periodo'].concat(CLAVES, ['p']).forEach((k) => {
        if (q[k] && q[k] !== DEFECTOS[k] && !(k === 'p' && Number(q[k]) <= 1)) limpio[k] = q[k];
      });
      App.router.actualizarQuery(limpio);
    }

    function cambiar(k, v) {
      const foco = capturarFoco();
      q[k] = v || '';
      if (k === 'sis') q.sub = '';
      if (k === 'sub' && v) { const x = S.subsistema(v); if (x) q.sis = x.sistemaId; }
      if (k === 'periodo') {
        T = calcularTramos(PERIODOS.find((p) => p.clave === q.periodo), base);
        q.tramo = '';
      }
      q.p = '';
      actualizarControles();
      sincronizar();
      pintar(foco);
    }

    function limpiarTodo() {
      CLAVES.forEach((k) => { q[k] = ''; });
      q.p = '';
      actualizarControles();
      sincronizar();
      pintar();
    }

    Object.keys(ctrl).forEach((k) => ctrl[k].addEventListener('change', () => cambiar(k, ctrl[k].value)));

    function pintarActivos() {
      U.vaciar(activos);
      const lista = CLAVES.filter((k) => q[k]);
      lista.forEach((k) => {
        const texto = DIM[k].etiqueta + ': ' + DIM[k].nombre(q[k]);
        activos.append(h('span', { class: 'chip-activo' }, texto,
          h('button', { type: 'button', 'aria-label': 'Quitar filtro ' + texto, onClick: () => cambiar(k, '') }, ui.icono('x', 'i-sm'))));
      });
      if (lista.length > 1) activos.append(h('button', { type: 'button', class: 'enlace-boton chico', onClick: limpiarTodo }, 'Limpiar filtros'));
      activos.hidden = !lista.length;
    }

    // ---------------------------------------------- Foco al redibujar ---
    const cuerpo = h('div', { class: 'pila-lg' });

    function capturarFoco() {
      const a = document.activeElement;
      if (!a || !cuerpo.contains(a) || a.dataset.clave == null) return null;
      const grupo = a.closest('[role="group"]');
      return grupo ? { grupo: grupo.getAttribute('aria-label'), clave: a.dataset.clave } : null;
    }

    function restaurarFoco(f) {
      if (!f) return;
      const grupo = U.$$('[role="group"]', cuerpo).find((g) => g.getAttribute('aria-label') === f.grupo);
      const el = grupo && U.$$('[data-clave]', grupo).find((x) => x.dataset.clave === f.clave);
      if (el) el.focus({ preventScroll: true });
    }

    // ------------------------------------------------------- Cálculos ---
    function filtrar(lista, excepto) {
      const ex = new Set(excepto || []);
      if (ex.has('sis')) ex.add('sub'); // el gráfico por sistema muestra todos los sistemas
      const aplicar = CLAVES.filter((k) => q[k] && !ex.has(k));
      return lista.filter((t) => aplicar.every((k) => DIM[k].valor(t) === q[k]));
    }

    /** Cantidades por categoría. Con `categorias` se respeta ese orden (y se muestran los ceros). */
    function contar(k, lista, op) {
      const o = op || {};
      const m = U.contarPor(lista, DIM[k].valor);
      let datos;
      if (o.categorias) {
        datos = o.categorias.map((c) => ({ clave: c, etiqueta: DIM[k].nombre(c), valor: m.get(c) || 0 }));
      } else {
        datos = Array.from(m.entries())
          .filter(([c]) => c)
          .map(([c, n]) => ({ clave: c, etiqueta: DIM[k].nombre(c), valor: n }))
          .sort((a, b) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es'));
        if (o.limite && datos.length > o.limite) datos = datos.slice(0, o.limite);
        // La categoría elegida siempre se ve, aunque quede en cero o fuera del límite.
        if (q[k] && !datos.some((d) => d.clave === q[k])) datos.push({ clave: q[k], etiqueta: DIM[k].nombre(q[k]), valor: m.get(q[k]) || 0 });
      }
      return datos;
    }

    function tarjetaBarras(op) {
      const total = op.total != null ? op.total : op.datos.reduce((a, d) => a + d.valor, 0);
      const hayDatos = op.datos.some((d) => d.valor > 0);
      return App.charts.tarjeta({
        titulo: op.titulo,
        descripcion: op.descripcion,
        grafico: App.charts.barras({ titulo: op.titulo, datos: op.datos, seleccion: q[op.clave] || null, alSeleccionar: (v) => cambiar(op.clave, v), total, rotulosLargos: op.rotulosLargos }),
        tabla: {
          columnas: [op.columna, 'Tickets', op.columnaPorcentaje || '% del total'],
          filas: op.datos.map((d) => [d.etiqueta, U.formatoNumero(d.valor), U.porcentaje(d.valor, total)]),
        },
        vacio: hayDatos ? null : h('p', { class: 'chico suave' }, op.textoVacio || 'No hay tickets con estos filtros.'),
        pie: op.pie,
        ancho: op.ancho,
        enTabla: vistasTabla.has(op.titulo),
        alCambiarVista: (v) => { if (v) vistasTabla.add(op.titulo); else vistasTabla.delete(op.titulo); },
      });
    }

    function tarjetaFecha(enPeriodo) {
      const periodo = PERIODOS.find((p) => p.clave === q.periodo);
      const lista = filtrar(enPeriodo, ['tramo']);
      const m = U.contarPor(lista, DIM.tramo.valor);
      const datos = T.lista.map((b) => Object.assign({}, b, { valor: m.get(b.clave) || 0 }));
      const titulo = T.grano === 'dia' ? 'Tickets registrados por día' : 'Tickets registrados por mes';
      return App.charts.tarjeta({
        titulo,
        descripcion: periodo.texto + (esCliente ? ' · ' + loc : '') + '. Hacé clic en una columna para ver sólo ese ' + (T.grano === 'dia' ? 'día' : 'mes') + '.',
        grafico: App.charts.columnas({ titulo, datos, seleccion: q.tramo || null, alSeleccionar: (v) => cambiar('tramo', v) }),
        tabla: { columnas: [T.grano === 'dia' ? 'Día' : 'Mes', 'Tickets'], filas: datos.map((d) => [d.etiquetaLarga, U.formatoNumero(d.valor)]) },
        vacio: lista.length ? null : h('p', { class: 'chico suave' }, 'No hay tickets registrados en este período.'),
        ancho: true,
        enTabla: vistasTabla.has(titulo),
        alCambiarVista: (v) => { if (v) vistasTabla.add(titulo); else vistasTabla.delete(titulo); },
      });
    }

    function indicadores(filtrados) {
      const cuenta = (e) => filtrados.filter((t) => t.estado === e).length;
      const enCurso = filtrados.filter((t) => D.ESTADOS_ACTIVOS.includes(t.estado)).length;
      const cerrados = cuenta('CERRADO');
      const conCatalogo = filtrados.filter((t) => t.estado === 'CERRADO' && t.solucion && t.solucion.solucionCatalogoId).length;
      const periodo = PERIODOS.find((p) => p.clave === q.periodo);
      const lista = [
        C.mosaico({ etiqueta: 'Tickets registrados', icono: 'ticket', valor: filtrados.length, detalle: q.tramo ? DIM.tramo.nombre(q.tramo) : periodo.texto }),
        C.mosaico({ etiqueta: 'En curso', icono: 'reloj', valor: enCurso, detalle: [U.plural(cuenta('ABIERTO'), 'abierto', 'abiertos'), U.plural(cuenta('PENDIENTE'), 'pendiente', 'pendientes'), U.plural(cuenta('ELEVADO'), 'elevado', 'elevados')].join(' · ') }),
        C.mosaico({ etiqueta: 'Cerrados', icono: 'check', valor: cerrados, detalle: U.porcentaje(cerrados, filtrados.length) + ' de los registrados' }),
      ];
      if (!esCliente) {
        lista.push(C.mosaico({ etiqueta: 'Cerrados con el catálogo', icono: 'libro', valor: conCatalogo, detalle: U.porcentaje(conCatalogo, cerrados) + ' de los cerrados usó una solución del catálogo' }));
      }
      return h('div', { class: 'mosaicos', 'aria-live': 'polite' }, lista);
    }

    function tarjetaDetalle(filtrados) {
      const lista = filtrados.slice().sort(C.ORDENES.recientes.fn);
      const cont = h('div');
      const cols = esCliente ? ['numero', 'ticket', 'creador', 'estado', 'creado'] : ['numero', 'ticket', 'localidad', 'estado', 'atiende', 'creado'];
      const idTitulo = 'sec-detalle';
      function pintarTabla() {
        U.vaciar(cont);
        if (!lista.length) {
          cont.append(ui.vacio({
            icono: 'buscar',
            titulo: 'No hay tickets con estos filtros',
            texto: 'Probá con un período más largo o quitá algún filtro.',
            accion: CLAVES.some((k) => q[k]) ? h('button', { type: 'button', class: 'btn btn-neutro', onClick: limpiarTodo }, 'Limpiar filtros') : null,
          }));
          return;
        }
        const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        const pagina = Math.min(Math.max(1, Number(q.p) || 1), paginas);
        cont.append(
          C.tablaTickets(lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), cols, { caption: 'Tickets del filtro' }),
          ui.paginador({
            total: lista.length, pagina, porPagina: POR_PAGINA,
            alCambiar: (p) => {
              q.p = String(p);
              sincronizar();
              pintarTabla();
              const titulo = document.getElementById(idTitulo);
              if (titulo) titulo.scrollIntoView({ block: 'start' });
            },
          }));
      }
      pintarTabla();
      return h('section', { class: 'card sin-padding', 'aria-labelledby': idTitulo },
        h('div', { class: 'card-titulo', style: 'padding: 18px 20px 0' },
          h('h2', { id: idTitulo }, 'Tickets del filtro'),
          h('span', { class: 'suave' }, U.plural(lista.length, 'ticket', 'tickets'))),
        cont);
    }

    // --------------------------------------------------------- Pintar ---
    function pintar(foco) {
      pintarActivos();
      const enPeriodo = base.filter((t) => new Date(t.creadoEn).getTime() >= T.desde);
      const filtrados = filtrar(enPeriodo);
      const sub = (excepto) => filtrar(enPeriodo, excepto);

      const subsistemasEjemplo = ui.pendiente('Subsistemas de ejemplo', 'Faltan los subsistemas reales de ORMEN; en la demo sólo «Otros» es real.');
      const tarjetas = [
        tarjetaBarras({
          clave: 'estado', titulo: 'Estado actual', columna: 'Estado',
          descripcion: 'Seguimiento: cómo están hoy los tickets del período.',
          datos: contar('estado', sub(['estado']), { categorias: D.ESTADOS_REGISTRADOS }),
        }),
        tarjetaBarras({
          clave: 'tipo', titulo: 'Por tipo de solicitud', columna: 'Tipo de solicitud',
          descripcion: 'Solicitud de atención o sugerencia de funcionalidad.',
          datos: contar('tipo', sub(['tipo']), { categorias: S.catalogo('tiposSolicitud').map((x) => x.id) }),
        }),
        tarjetaBarras({
          clave: 'sis', titulo: 'Por sistema', columna: 'Sistema',
          descripcion: 'Sistema o servicio afectado.',
          datos: contar('sis', sub(['sis'])),
        }),
        (() => {
          const lista = sub(['sub']);
          const datos = contar('sub', lista, { limite: q.sis ? 0 : 10 });
          return tarjetaBarras({
            clave: 'sub',
            titulo: q.sis ? 'Subsistemas de ' + S.nombre('sistemas', q.sis) : 'Por subsistema',
            columna: 'Subsistema',
            descripcion: [q.sis ? 'Todos los subsistemas del sistema elegido. ' : 'Los 10 con más tickets. Elegí un sistema para ver todos los suyos. ', subsistemasEjemplo],
            datos,
            total: lista.length,
            rotulosLargos: !q.sis,
          });
        })(),
      ];
      if (!esCliente) {
        const cerradosCatalogo = sub(['sol']).filter((t) => DIM.sol.valor(t));
        tarjetas.push(
          tarjetaBarras({
            clave: 'tp', titulo: 'Por tipo de problema', columna: 'Tipo de problema',
            descripcion: 'Lo indica Mesa de ayuda al tratar el ticket.',
            datos: contar('tp', sub(['tp']), { categorias: S.catalogo('tiposProblema').map((x) => x.id) }),
          }),
          tarjetaBarras({
            clave: 'op', titulo: 'Por operador de Mesa de ayuda', columna: 'Atiende',
            descripcion: 'Quién atiende cada ticket.',
            datos: contar('op', sub(['op'])),
          }),
          tarjetaBarras({
            clave: 'loc', titulo: 'Por localidad', columna: 'Localidad',
            descripcion: 'Banca o agencia del ticket.',
            datos: contar('loc', sub(['loc'])),
          }),
          tarjetaBarras({
            clave: 'sol', titulo: 'Soluciones del catálogo más aplicadas', columna: 'Solución', columnaPorcentaje: '% de estos cierres',
            descripcion: 'Tickets cerrados con una solución del catálogo.',
            datos: contar('sol', cerradosCatalogo, { limite: 8 }),
            total: cerradosCatalogo.length,
            rotulosLargos: true,
            textoVacio: 'Ningún ticket de este filtro se cerró con una solución del catálogo.',
          }));
      }

      U.vaciar(cuerpo).append(
        indicadores(filtrados),
        h('div', { class: 'grid-graficos' }, tarjetaFecha(enPeriodo), tarjetas),
        tarjetaDetalle(filtrados));
      restaurarFoco(foco);
    }

    pintar();

    ctx.titulo(esCliente ? 'Estadísticas de ' + loc : 'Estadísticas');
    return h('div', { class: 'pila-lg' },
      ui.cabecera({
        antetitulo: esCliente ? loc : 'Gestión de ORMEN',
        titulo: esCliente ? 'Estadísticas de ' + loc : 'Estadísticas',
        subtitulo: (esCliente
          ? 'Los tickets de tu localidad, también los que cargó Mesa de ayuda.'
          : 'Tickets de todas las localidades.') + ' Los borradores no cuentan. Hacé clic en una barra para filtrar el resto de la página.',
      }),
      h('section', { class: 'card pila-sm', 'aria-label': 'Filtros' }, filtros, activos),
      cuerpo);
  };
})(window.App = window.App || {});
