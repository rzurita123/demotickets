/* ==========================================================================
   Soluciones (para operadores y gestión de ORMEN).
   - Catálogo: soluciones aprobadas, también las cargadas sin ticket.
   - Base de conocimiento: una solución es conocimiento depurado y
     reutilizable, independiente del ticket del que pueda surgir. Flujo:
     ticket → Proponer como solución → borrador → el administrador lo
     revisa o edita → solución aprobada.
   - Búsqueda por descripción (HU03 / RF13).
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  const PESTANAS = [
    { estado: 'APROBADA', texto: 'Aprobadas' },
    { estado: 'PENDIENTE', texto: 'Por aprobar', tono: 'dorado' },
    { estado: 'RECHAZADA', texto: 'Rechazadas', tono: 'rojo' },
  ];


  function origenTexto(s) {
    const S = App.store;
    if (s.ticketOrigenId) {
      const t = S.ticket(s.ticketOrigenId);
      return t ? 'De la resolución del ticket #' + t.numero : 'De la resolución de un ticket';
    }
    return 'Cargada sin ticket';
  }

  /** Fila del catálogo: título y clasificación, palabras clave, usos u autor, origen. */
  function filaSolucion(s, usos, u) {
    const S = App.store;
    const ui = App.ui;
    const autor = S.usuario(s.creadaPorId);
    const extra = s.palabrasClave.length > 3 ? s.palabrasClave.length - 3 : 0;
    const tr = h('tr', { class: 'clic' },
      ui.celda('Solución', h('div', { class: 'titulo-celda' },
        h('a', { href: '#/soluciones/' + s.id }, s.titulo),
        h('span', { class: 'sub' }, ui.clasificacion(s.sistemaId, s.subsistemaId))), 'sin-label'),
      ui.celda('Palabras clave', h('div', { class: 'chips' }, s.palabrasClave.slice(0, 3).map((p) => h('span', { class: 'palabra-clave' }, p)), extra ? h('span', { class: 'palabra-clave' }, '+' + extra) : null)),
      s.estado === 'APROBADA'
        ? ui.celda('Usos', usos ? U.plural(usos, 'vez', 'veces') : h('span', { class: 'suave' }, 'Sin usos'), 'numero')
        : ui.celda('Propuesta', [autor ? (autor.id === u.id ? 'Vos' : autor.nombre) : '—', h('span', { class: 'sub' }, U.relativo(s.creadaEn))]),
      ui.celda('Origen', origenTexto(s)));
    tr.addEventListener('click', (e) => { if (!e.target.closest('a, button')) App.router.ir('/soluciones/' + s.id); });
    return tr;
  }

  // ------------------------------------------------------------- Listado ---

  App.vistas.soluciones = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const esAdmin = u.rol === 'ADMINISTRADOR';
    const q = Object.assign({ estado: 'APROBADA' }, ctx.query);
    if (!PESTANAS.some((p) => p.estado === q.estado)) q.estado = 'APROBADA';
    const usos = S.contarUsos();
    const todas = S.soluciones();

    const inBuscar = h('input', { id: 's-buscar', class: 'control', type: 'search', placeholder: 'Título, pasos o palabras clave', value: q.q || '' });
    const selSis = ui.select({ id: 's-sis', vacio: 'Todos', valor: q.sis, opciones: [{ valor: 'general', texto: 'General (sin sistema)' }].concat(S.sistemas().map((s) => ({ valor: s.id, texto: s.nombre }))) });
    const selOrigen = ui.select({ id: 's-origen', vacio: 'Todos', valor: q.origen, opciones: [{ valor: 'ticket', texto: 'Desde un ticket' }, { valor: 'directa', texto: 'Cargadas sin ticket' }] });
    const selOrden = ui.select({ id: 's-orden', valor: q.orden || 'usos', opciones: [{ valor: 'usos', texto: 'Más aplicadas' }, { valor: 'recientes', texto: 'Más recientes' }, { valor: 'titulo', texto: 'Título (A-Z)' }] });

    const pestanas = h('div', { class: 'cola-pestanas', role: 'group', 'aria-label': 'Estado de las soluciones' });
    const resultados = h('div', { id: 'panel-soluciones', 'aria-live': 'polite' });

    function filtrar() {
      const n = U.normalizar(q.q || '');
      return todas.filter((s) =>
        s.estado === q.estado &&
        (!n || U.normalizar(s.titulo + ' ' + s.descripcion + ' ' + s.palabrasClave.join(' ')).indexOf(n) >= 0) &&
        (!q.sis || (q.sis === 'general' ? !s.sistemaId : s.sistemaId === q.sis)) &&
        (!q.origen || (q.origen === 'ticket' ? !!s.ticketOrigenId : !s.ticketOrigenId)));
    }

    function pintar() {
      U.vaciar(pestanas);
      PESTANAS.forEach((p) => {
        const n = todas.filter((s) => s.estado === p.estado).length;
        pestanas.append(h('button', { type: 'button', 'aria-pressed': String(q.estado === p.estado), dataset: { tono: p.tono || null }, onClick: () => cambiar('estado', p.estado) },
          h('span', null, p.texto), h('span', { class: 'cuenta' }, n)));
      });
      U.vaciar(resultados);
      const orden = q.orden || 'usos';
      const lista = filtrar().sort((a, b) =>
        orden === 'titulo' ? a.titulo.localeCompare(b.titulo, 'es')
          : orden === 'recientes' ? b.actualizadaEn.localeCompare(a.actualizadaEn)
            : (usos.get(b.id) || 0) - (usos.get(a.id) || 0) || a.titulo.localeCompare(b.titulo, 'es'));
      if (!lista.length) {
        resultados.append(ui.vacio({
          icono: 'libro',
          titulo: q.estado === 'PENDIENTE' ? 'No hay soluciones reutilizables por aprobar' : q.estado === 'RECHAZADA' ? 'No hay soluciones reutilizables rechazadas' : 'No hay soluciones reutilizables con estos filtros',
        }));
        return;
      }
      const columnas = ['Solución', 'Palabras clave', q.estado === 'APROBADA' ? 'Usos' : 'Propuesta', 'Origen'];
      resultados.append(h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
        h('caption', { class: 'sr-only' }, 'Soluciones reutilizables'),
        h('thead', null, h('tr', null, columnas.map((c) => h('th', { scope: 'col', class: c === 'Usos' ? 'numero' : null }, c)))),
        h('tbody', null, lista.map((s) => filaSolucion(s, usos.get(s.id) || 0, u))))));
    }

    function cambiar(k, v) {
      q[k] = v || '';
      const limpio = {};
      Object.keys(q).forEach((x) => { if (q[x] && !(x === 'estado' && q[x] === 'APROBADA') && !(x === 'orden' && q[x] === 'usos')) limpio[x] = q[x]; });
      App.router.actualizarQuery(limpio);
      pintar();
    }

    inBuscar.addEventListener('input', U.debounce(() => cambiar('q', inBuscar.value.trim()), 220));
    selSis.addEventListener('change', () => cambiar('sis', selSis.value));
    selOrigen.addEventListener('change', () => cambiar('origen', selOrigen.value));
    selOrden.addEventListener('change', () => cambiar('orden', selOrden.value));
    pintar();

    return h('div', { class: 'pila' },
      ui.cabecera({
        titulo: 'Soluciones reutilizables',
        acciones: [
          h('a', { class: 'btn btn-neutro', href: '#/soluciones/buscar' }, ui.icono('buscar', 'i-sm'), 'Buscar por problema'),
          h('a', { class: 'btn btn-primario', href: '#/soluciones/nueva' }, ui.icono('mas', 'i-sm'), esAdmin ? 'Nueva solución reutilizable' : 'Proponer solución reutilizable'),
        ],
      }),
      h('section', { class: 'cola', 'aria-label': 'Soluciones reutilizables' },
        h('div', { class: 'cola-cabeza' }, pestanas),
        h('div', { class: 'filtros filtros-grilla filtros-cola' },
          ui.campo({ nombre: 'q', id: 's-buscar', etiqueta: 'Buscar', control: inBuscar, clase: 'buscar' }),
          ui.campo({ nombre: 'sis', id: 's-sis', etiqueta: 'Sistema', control: selSis }),
          ui.campo({ nombre: 'origen', id: 's-origen', etiqueta: 'Origen', control: selOrigen }),
          ui.campo({ nombre: 'orden', id: 's-orden', etiqueta: 'Orden', control: selOrden })),
        resultados));
  };

  // ------------------------------------------------------------- Detalle ---

  App.vistas.solucion = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const s = S.solucion(ctx.params.id);
    if (!s) {
      return h('div', { class: 'card' }, h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Solución reutilizable no encontrada'),
        ui.vacio({ icono: 'libro', titulo: 'No encontramos la solución reutilizable', accion: h('a', { class: 'btn btn-primario', href: '#/soluciones' }, 'Ver las soluciones reutilizables') }));
    }
    ctx.titulo(s.titulo);
    const esAdmin = u.rol === 'ADMINISTRADOR';
    const usos = S.usosDeSolucion(s.id).sort((a, b) => b.cerradoEn.localeCompare(a.cerradoEn));
    const autor = S.usuario(s.creadaPorId);
    const revisor = S.usuario(s.revisadaPorId);
    const origen = s.ticketOrigenId ? S.ticket(s.ticketOrigenId) : null;

    async function aprobar() {
      const ok = await ui.confirmar({ titulo: 'Aprobar la solución reutilizable', mensaje: 'Se empieza a sugerir al cargar tickets parecidos.', textoConfirmar: 'Aprobar' });
      if (!ok) return;
      try {
        S.aprobarSolucion(s.id, u);
        ui.toast('Solución reutilizable aprobada: desde ahora se sugiere.');
        ctx.refrescar({ enfocar: '#titulo-pagina' });
      } catch (e) { ui.mostrarError(e); }
    }

    function rechazar() {
      const motivo = h('textarea', { id: 'rechazo-motivo', class: 'control', rows: '3', placeholder: 'Por ejemplo: es demasiado general, conviene una solución por síntoma.' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        ui.campo({ nombre: 'motivo', id: 'rechazo-motivo', etiqueta: 'Motivo del rechazo', requerido: true, control: motivo }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        titulo: 'Rechazar la solución reutilizable',
        antetitulo: s.titulo,
        cuerpo,
        acciones: [
          { texto: 'Cancelar' },
          {
            texto: 'Rechazar', clase: 'btn-peligro', icono: 'xCirculo', fn: () => {
              try { S.rechazarSolucion(s.id, u, motivo.value); } catch (e) {
                if (e.campos) { ui.mostrarErrores(cuerpo, e.campos); return false; }
                throw e;
              }
              ui.toast('Solución reutilizable rechazada.');
              ctx.refrescar({ enfocar: '#titulo-pagina' });
              return true;
            },
          },
        ],
      });
    }

    // Columna principal
    const principal = h('div', { class: 'pila-lg' },
      h('section', { class: 'card pila', 'aria-labelledby': 'sec-pasos' },
        h('h2', { id: 'sec-pasos' }, 'Pasos a seguir'),
        h('div', { class: 'pasos' }, s.descripcion),
        ui.galeria(s.adjuntos, { grande: true })),
      h('section', { class: 'card pila-sm', 'aria-labelledby': 'sec-claves' },
        h('h2', { id: 'sec-claves' }, 'Palabras clave'),
        h('div', { class: 'chips' }, s.palabrasClave.map((p) => h('span', { class: 'palabra-clave' }, p)))),
      h('section', { class: 'card sin-padding', 'aria-labelledby': 'sec-usos' },
        h('div', { class: 'card-titulo', style: 'padding: 18px 22px 0' }, h('h2', { id: 'sec-usos' }, 'Resoluciones que la usaron'), h('span', { class: 'suave' }, U.plural(usos.length, 'ticket', 'tickets'))),
        usos.length
          ? App.comun.tablaTickets(usos.slice(0, 10), ['numero', 'ticket', 'localidad', 'cerrado'], { caption: 'Tickets resueltos con esta solución reutilizable' })
          : h('p', { class: 'chico suave', style: 'padding: 0 22px 18px' }, 'Sin usos todavía.')));

    // Lateral
    const lateral = h('aside', { class: 'pila' });
    if (s.estado === 'PENDIENTE') {
      lateral.append(esAdmin
        ? h('section', { class: 'card acento-dorado pila', 'aria-labelledby': 'sec-revision' },
          h('h2', { id: 'sec-revision' }, 'Revisión'),
          h('p', { class: 'chico suave' }, autor ? autor.nombre : '—', ' · ', U.relativo(s.creadaEn)),
          h('div', { class: 'acciones-ticket' },
            h('button', { type: 'button', class: 'btn btn-exito', onClick: aprobar }, ui.icono('checkCirculo', 'i-sm'), 'Aprobar'),
            h('a', { class: 'btn btn-neutro', href: '#/soluciones/' + s.id + '/editar?aprobar=1' }, ui.icono('editar', 'i-sm'), 'Editar y aprobar'),
            h('button', { type: 'button', class: 'btn btn-peligro', onClick: rechazar }, ui.icono('xCirculo', 'i-sm'), 'Rechazar')))
        : ui.aviso('Esperando aprobación.', null, 'borrador'));
    } else if (s.estado === 'RECHAZADA') {
      lateral.append(ui.aviso([h('strong', null, 'Rechazada'), ' por ', revisor ? revisor.nombre : '—', ' el ', U.fecha(s.revisadaEn), '. Motivo: ', s.motivoRechazo || '—'], 'rojo'));
    } else if (esAdmin) {
      lateral.append(h('a', { class: 'btn btn-neutro', href: '#/soluciones/' + s.id + '/editar' }, ui.icono('editar', 'i-sm'), 'Editar'));
    }
    const datos = [
      ['Estado', ui.badgeSolucion(s.estado)],
      ['Sistema', s.sistemaId ? S.nombre('sistemas', s.sistemaId) : 'General'],
      ['Subsistema', s.subsistemaId ? S.nombre('subsistemas', s.subsistemaId) : '—'],
      ['Surgió de', origen ? h('a', { href: '#/tickets/' + origen.numero }, 'Resolución del ticket #' + origen.numero) : 'Cargada sin ticket'],
      [s.ticketOrigenId || s.estado !== 'APROBADA' ? 'Propuesta por' : 'Cargada por', autor ? autor.nombre : '—'],
      ['Fecha', U.fechaHora(s.creadaEn)],
      s.revisadaEn ? [s.estado === 'RECHAZADA' ? 'Rechazada por' : 'Aprobada por', revisor ? revisor.nombre : '—'] : null,
      s.revisadaEn ? ['Revisión', U.fechaHora(s.revisadaEn)] : null,
      s.estado === 'APROBADA' ? ['Usada', U.plural(usos.length, 'vez', 'veces')] : null,
    ].filter(Boolean);
    lateral.append(h('section', { class: 'card', 'aria-labelledby': 'sec-datos-sol' },
      h('h2', { id: 'sec-datos-sol', style: 'margin-bottom: 12px' }, 'Datos'),
      h('dl', { class: 'datos-lista' }, datos.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))));
    if (origen && S.puedeVerTicket(origen, u)) {
      lateral.append(h('section', { class: 'card pila-sm', 'aria-labelledby': 'sec-origen' },
        h('h2', { id: 'sec-origen' }, 'Resolución de origen'),
        h('a', { href: '#/tickets/' + origen.numero, class: 'fuerte' }, '#' + origen.numero + ' · ' + origen.titulo),
        h('p', { class: 'chico' }, U.truncar(origen.solucion ? origen.solucion.texto : '', 200))));
    }

    return h('div', { class: 'pila' },
      ui.cabecera({
        migas: [{ href: '#/soluciones' + (s.estado !== 'APROBADA' ? '?estado=' + s.estado : ''), texto: 'Soluciones' }, { texto: U.truncar(s.titulo, 40) }],
        titulo: s.titulo,
      }),
      h('div', { class: 'dos-columnas' }, principal, lateral));
  };

  // ---------------------------------------------------------- Formulario ---

  App.vistas.solucionForm = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const esAdmin = u.rol === 'ADMINISTRADOR';
    const existente = ctx.params.id ? S.solucion(ctx.params.id) : null;
    if (ctx.params.id && !existente) return App.vistas.noEncontrado(ctx);
    if (existente && !esAdmin) return App.vistas.sinAcceso(ctx);
    const aprobarAlGuardar = !!existente && existente.estado === 'PENDIENTE' && ctx.query.aprobar === '1';
    const marcar = () => ctx.marcarSucio(true);

    const inTitulo = h('input', { id: 'sol-titulo', class: 'control', type: 'text', maxlength: '120', value: existente ? existente.titulo : '' });
    const selSis = ui.select({ id: 'sol-sistema', vacio: 'General (sirve para cualquier sistema)', valor: existente ? existente.sistemaId : '', opciones: S.sistemas(true).map((s) => ({ valor: s.id, texto: s.nombre })) });
    const selSub = h('select', { id: 'sol-subsistema', class: 'control' });
    function cargarSubs(valor) {
      U.vaciar(selSub);
      const subs = selSis.value ? S.subsistemasDe(selSis.value, true) : [];
      selSub.append(h('option', { value: '' }, selSis.value ? 'Todos los subsistemas' : 'Elegí primero el sistema'));
      subs.forEach((x) => selSub.append(h('option', { value: x.id }, x.nombre)));
      selSub.disabled = !selSis.value;
      selSub.value = valor && subs.some((x) => x.id === valor) ? valor : '';
    }
    cargarSubs(existente ? existente.subsistemaId : '');
    selSis.addEventListener('change', () => cargarSubs(''));
    const inDesc = h('textarea', { id: 'sol-descripcion', class: 'control', rows: '9', value: existente ? existente.descripcion : '', placeholder: '1. Primer paso…\n2. Segundo paso…' });
    const palabras = ui.entradaPalabras({ id: 'sol-palabras', valor: existente ? existente.palabrasClave : [], alCambiar: () => { marcar(); probar(); } });
    const imagenes = ui.selectorImagenes({ inicial: existente ? existente.adjuntos : [], pegarEn: [inDesc], etiqueta: 'Imágenes de los pasos', alCambiar: marcar });
    const resumen = h('div');

    // Probador de palabras clave
    const inPrueba = h('textarea', { id: 'sol-prueba', class: 'control', rows: '3', placeholder: 'Por ejemplo: la impresora de la terminal 2 no imprime el comprobante' });
    const resultadoPrueba = h('div', { class: 'pila-sm', 'aria-live': 'polite' });
    function probar() {
      U.vaciar(resultadoPrueba);
      const texto = inPrueba.value.trim();
      const lista = palabras.valor();
      if (!texto) { resultadoPrueba.append(h('p', { class: 'chico suave' }, 'Escribí un problema de ejemplo.')); return; }
      const coinciden = App.sugerencias.palabrasClaveEn(texto, lista);
      const p = S.datos.parametros;
      resultadoPrueba.append(
        h('div', { class: 'chips' }, lista.length ? lista.map((x) => h('span', { class: ['palabra-clave', coinciden.includes(x) && 'coincide'] }, coinciden.includes(x) ? ui.icono('check', 'i-sm') : null, x)) : h('span', { class: 'chico suave' }, 'Todavía no hay palabras clave.')),
        h('p', { class: 'chico' }, coinciden.length
          ? '+' + coinciden.length * p.pesoPalabraClave + ' pts por ' + U.plural(coinciden.length, 'palabra clave', 'palabras clave') + '.'
          : 'Ninguna palabra clave coincide.'));
    }
    inPrueba.addEventListener('input', U.debounce(probar, 200));
    probar();

    const form = h('form', { class: 'pila-lg', novalidate: true },
      resumen,
      h('section', { class: 'card pila' },
        ui.campo({ nombre: 'titulo', id: 'sol-titulo', etiqueta: 'Título', requerido: true, control: inTitulo }),
        h('div', { class: 'grid-2' },
          ui.campo({ nombre: 'sistemaId', id: 'sol-sistema', etiqueta: 'Sistema o servicio', opcional: true, control: selSis }),
          ui.campo({ nombre: 'subsistemaId', id: 'sol-subsistema', etiqueta: 'Subsistema', opcional: true, control: selSub })),
        ui.campo({ nombre: 'descripcion', id: 'sol-descripcion', etiqueta: 'Pasos a seguir', requerido: true, control: inDesc }),
        h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, 'Imágenes ', h('span', { class: 'opcional' }, '(opcional)')), imagenes.el),
        ui.campo({ nombre: 'palabrasClave', id: 'sol-palabras', etiqueta: 'Palabras clave', requerido: true, control: palabras.el })),
      h('div', { class: 'fila' },
        h('button', { type: 'submit', class: 'btn btn-primario btn-lg' }, ui.icono(aprobarAlGuardar ? 'checkCirculo' : 'check', 'i-sm'),
          aprobarAlGuardar ? 'Guardar y aprobar' : existente ? 'Guardar cambios' : esAdmin ? 'Guardar' : 'Proponer'),
        h('a', { class: 'btn btn-fantasma btn-lg', href: existente ? '#/soluciones/' + existente.id : '#/soluciones' }, 'Cancelar')));
    form.addEventListener('input', marcar);
    form.addEventListener('change', marcar);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const datos = { titulo: inTitulo.value, sistemaId: selSis.value, subsistemaId: selSub.value, descripcion: inDesc.value, palabrasClave: palabras.valor(), adjuntos: imagenes.valor() };
      try {
        let s;
        if (aprobarAlGuardar) {
          S.guardarSolucion(datos, u, existente.id);
          s = S.aprobarSolucion(existente.id, u);
        } else {
          s = S.guardarSolucion(datos, u, existente ? existente.id : null);
        }
        ctx.marcarSucio(false);
        ui.toast(aprobarAlGuardar ? 'Solución reutilizable aprobada: desde ahora se sugiere.' : existente ? 'Cambios guardados.' : esAdmin ? 'Solución reutilizable cargada.' : 'Solución reutilizable propuesta: queda por aprobar.');
        App.router.ir('/soluciones/' + s.id);
      } catch (err) {
        if (err.campos) ui.mostrarErrores(form, err.campos, resumen);
        else ui.mostrarError(err);
      }
    });

    const titulo = aprobarAlGuardar ? 'Revisar y aprobar' : existente ? 'Editar solución reutilizable' : esAdmin ? 'Nueva solución reutilizable' : 'Proponer solución reutilizable';
    ctx.titulo(titulo);
    return h('div', { class: 'pila' },
      ui.cabecera({
        migas: [{ href: '#/soluciones', texto: 'Soluciones' }, { texto: titulo }],
        titulo,
      }),
      h('div', { class: 'dos-columnas' }, form,
        h('aside', { class: 'pila' }, h('section', { class: 'card pila', 'aria-labelledby': 'sec-probar' },
          h('h2', { id: 'sec-probar' }, 'Probar las palabras clave'),
          ui.campo({ nombre: 'prueba', id: 'sol-prueba', etiqueta: 'Descripción de ejemplo', control: inPrueba }),
          resultadoPrueba))));
  };

  // ------------------------------------------------------------ Búsqueda ---

  App.vistas.buscarSoluciones = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const esOperador = u.rol === 'OPERADOR';
    const q = Object.assign({}, ctx.query);

    const inTexto = h('textarea', { id: 'b-texto', class: 'control', rows: '3', value: q.q || '', placeholder: 'Por ejemplo: la terminal muestra el mensaje de terminal bloqueada y no permite vender' });
    const selSis = ui.select({ id: 'b-sis', vacio: 'Cualquiera', valor: q.sis, opciones: S.sistemas().map((s) => ({ valor: s.id, texto: s.nombre })) });
    const selSub = h('select', { id: 'b-sub', class: 'control' });
    function cargarSubs(valor) {
      U.vaciar(selSub);
      const subs = selSis.value ? S.subsistemasDe(selSis.value) : [];
      selSub.append(h('option', { value: '' }, selSis.value ? 'Cualquiera' : 'Elegí primero el sistema'));
      subs.forEach((x) => selSub.append(h('option', { value: x.id }, x.nombre)));
      selSub.disabled = !selSis.value;
      selSub.value = valor && subs.some((x) => x.id === valor) ? valor : '';
    }
    cargarSubs(q.sub);
    const selLoc = ui.select({ id: 'b-loc', vacio: 'Cualquiera', valor: q.loc, opciones: S.localidades().map((l) => ({ valor: l.id, texto: l.nombre })) });
    const resultados = h('div', { class: 'sugerencias' });
    const estado = h('p', { class: 'chico suave', 'aria-live': 'polite' });

    function usar(r) {
      const usarParam = r.tipo === 'catalogo' ? 'catalogo:' + r.id : 'ticket:' + r.id;
      App.router.ir('/tickets/nuevo?' + U.buildQuery({ modo: 'resuelto', descripcion: inTexto.value.trim(), usar: usarParam, sis: selSis.value, sub: selSub.value, loc: selLoc.value }));
    }

    function buscar() {
      q.q = inTexto.value.trim();
      q.sis = selSis.value;
      q.sub = selSub.value;
      q.loc = selLoc.value;
      App.router.actualizarQuery({ q: q.q, sis: q.sis, sub: q.sub, loc: q.loc });
      U.vaciar(resultados);
      if (!q.q && !q.sis) {
        estado.textContent = 'Escribí cómo describe el problema la agencia.';
        return;
      }
      const res = App.sugerencias.buscar({ texto: q.q, sistemaId: q.sis, subsistemaId: q.sub, localidadId: q.loc, limite: 12 });
      if (!res.length) {
        estado.textContent = '';
        resultados.append(h('div', { class: 'card' }, ui.vacio({
          icono: 'buscar',
          titulo: 'Sin coincidencias',
          accion: esOperador ? h('a', { class: 'btn btn-primario', href: '#/tickets/nuevo?' + U.buildQuery({ descripcion: q.q, sis: q.sis, sub: q.sub, loc: q.loc }) }, ui.icono('mas', 'i-sm'), 'Crear ticket con esta descripción') : null,
        })));
        return;
      }
      estado.textContent = U.plural(res.length, 'resultado', 'resultados') + ', ordenados de mayor a menor puntaje.';
      res.forEach((r, i) => resultados.append(ui.tarjetaSugerencia(r, { mejor: i === 0, alUsar: esOperador ? usar : null, textoUsar: 'Crear ticket cerrado con esta' })));
    }

    const buscarDiferido = U.debounce(buscar, 250);
    inTexto.addEventListener('input', buscarDiferido);
    selSis.addEventListener('change', () => { cargarSubs(''); buscar(); });
    [selSub, selLoc].forEach((el) => el.addEventListener('change', buscar));
    const form = h('form', { class: 'card pila', role: 'search', 'aria-label': 'Buscar soluciones' },
      ui.campo({ nombre: 'q', id: 'b-texto', etiqueta: 'Descripción del problema', control: inTexto }),
      h('div', { class: 'grid-3' },
        ui.campo({ nombre: 'sis', id: 'b-sis', etiqueta: 'Sistema', opcional: true, control: selSis }),
        ui.campo({ nombre: 'sub', id: 'b-sub', etiqueta: 'Subsistema', opcional: true, control: selSub }),
        ui.campo({ nombre: 'loc', id: 'b-loc', etiqueta: 'Localidad', opcional: true, control: selLoc })),
      h('div', { class: 'fila', style: 'justify-content: flex-end' },
        h('button', { type: 'submit', class: 'btn btn-oscuro btn-lg' }, ui.icono('buscar', 'i-sm'), 'Buscar')));
    form.addEventListener('submit', (e) => { e.preventDefault(); buscar(); });
    buscar();

    return h('div', { class: 'pila' },
      ui.cabecera({
        migas: [{ href: '#/soluciones', texto: 'Soluciones' }, { texto: 'Buscar' }],
        titulo: 'Buscar una solución',
      }),
      form,
      estado,
      resultados);
  };
})(window.App = window.App || {});
