/* ==========================================================================
   Detalle y tratamiento de un ticket (HU04 a HU10).
   - Cliente: ve el ticket si es de su localidad, sin lo privado; puede
     responder mientras no esté cerrado.
   - Operador: comenta (público o privado, obligatorio elegir), cambia el
     estado, toma o asigna, reclasifica, cierra con solución y reabre.
   - Administrador: consulta (supuesto de la demo: no trata tickets).
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;

  function opcionesVisibilidad(nombre) {
    const ui = App.ui;
    return h('div', { class: 'visibilidad-opciones' },
      h('label', null, h('input', { type: 'radio', name: nombre, value: 'PUBLICO' }), h('span', { class: 'pub' }, ui.icono('ojo', 'i-sm'), 'Público')),
      h('label', null, h('input', { type: 'radio', name: nombre, value: 'PRIVADO' }), h('span', { class: 'priv' }, ui.icono('candado', 'i-sm'), 'Privado · sólo ORMEN')));
  }

  /** Flujo del ticket: Abierto → En proceso (o Bloqueado) → Cerrado. */
  function flujoEstado(estado) {
    const pasos = [
      { clave: 'ABIERTO', texto: 'Abierto' },
      { clave: 'EN_PROCESO', texto: estado === 'BLOQUEADO' ? 'Bloqueado' : 'En proceso' },
      { clave: 'CERRADO', texto: 'Cerrado' },
    ];
    const actual = estado === 'BLOQUEADO' ? 1 : pasos.findIndex((p) => p.clave === estado);
    return h('ol', { class: ['flujo', estado === 'BLOQUEADO' && 'bloqueado'], 'aria-label': 'Estado del ticket' },
      pasos.map((p, i) => h('li', { class: [i < actual && 'hecho', i === actual && 'actual'], 'aria-current': i === actual ? 'step' : null },
        h('span', { class: 'punto' }, i < actual || (i === actual && estado === 'CERRADO') ? App.ui.icono('check', 'i-sm') : String(i + 1)),
        h('span', null, p.texto))));
  }

  function sinAcceso(ctx, r) {
    const S = App.store;
    const u = ctx.usuario;
    if (r.error === 'sin-acceso') S.registrarAuditoria(u.id, 'ACCESO_DENEGADO', r.ticket.id, 'Ticket #' + r.ticket.numero + ' de otra localidad');
    const esCliente = u.rol === 'CLIENTE';
    ctx.titulo('Ticket no disponible');
    return h('div', { class: 'card' }, h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Ticket no disponible'), App.ui.vacio({
      icono: 'candado',
      titulo: esCliente ? 'No encontramos el ticket #' + ctx.params.numero + ' o no tenés acceso' : 'No existe el ticket #' + ctx.params.numero,
      accion: h('a', { class: 'btn btn-primario', href: '#/tickets' }, esCliente ? 'Ver los tickets de ' + S.nombre('localidades', u.localidadId) : 'Ir al listado'),
    }));
  }

  App.vistas.ticketDetalle = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const r = S.ticketParaUsuario(ctx.params.numero, u);
    if (r.error) return sinAcceso(ctx, r);
    const t = r.ticket;

    const esOperador = u.rol === 'OPERADOR';
    const esCliente = u.rol === 'CLIENTE';
    const esAdmin = u.rol === 'ADMINISTRADOR';
    const activo = D.ESTADOS_ACTIVOS.includes(t.estado);
    const cerrado = t.estado === 'CERRADO';
    const creador = S.usuario(t.creadoPorId);
    const creadorCliente = creador && creador.rol === 'CLIENTE';
    const operador = S.usuario(t.operadorId);
    const loc = S.nombre('localidades', t.localidadId);
    const actividad = S.actividadVisible(t, u);
    ctx.titulo('Ticket #' + t.numero);

    const refrescar = () => ctx.refrescar({ enfocar: '#titulo-pagina' });
    function ejecutar(fn, mensaje) {
      try {
        fn();
        ui.toast(mensaje);
        refrescar();
        return true;
      } catch (e) {
        ui.mostrarError(e);
        return false;
      }
    }
    /** Para acciones dentro de ventanas: marca los campos con error y deja la ventana abierta. */
    function enVentana(cuerpo, fn, mensaje) {
      try {
        fn();
      } catch (e) {
        if (e.campos) { ui.mostrarErrores(cuerpo, e.campos, cuerpo); return false; }
        throw e;
      }
      ui.toast(mensaje);
      refrescar();
      return true;
    }
    const avisoCorreo = () => (creadorCliente && creador.activo !== false ? ' Se avisó por correo a ' + creador.nombre + '.' : '');

    const verRecorrido = () => App.recorrido.abrir(t, u);
    const solucionOriginada = esCliente ? null : S.solucionOriginadaPor(t);
    const textoAtiende = operador
      ? operador.nombre + (t.estado === 'EN_PROCESO' ? ' (en proceso)' : t.estado === 'BLOQUEADO' ? ' (bloqueado)' : '')
      : 'Sin asignar';

    // ------------------------------------------------------------ Cabecera ---
    const cabecera = h('div', { class: 'ticket-cabecera' },
      h('nav', { class: 'migas', 'aria-label': 'Ubicación' },
        h('a', { href: '#/tickets' }, esCliente ? 'Tickets de ' + loc : 'Tickets'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, '#' + t.numero)),
      h('div', { class: 'fila-sm' },
        ui.badgeElevado(t, verRecorrido),
        ui.badgeOrigenSolucion(solucionOriginada, true),
        ui.badgeCriticidad(t.criticidadId, true),
        t.registroDirecto ? h('span', { class: 'badge contorno' }, ui.icono('checkCirculo', 'i-sm'), 'Registrado ya resuelto') : null),
      h('div', { class: 'ticket-titular' },
        h('h1', { id: 'titulo-pagina', tabindex: '-1' }, h('span', { class: 'numero' }, '#' + t.numero), ' ', t.titulo),
        flujoEstado(t.estado)),
      h('dl', { class: 'meta-ticket' },
        [['Localidad', loc], ['Atiende', textoAtiende], ['Creado por', creador ? creador.nombre : '—'], ['Creado', U.fechaHora(t.creadoEn)]]
          .map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v)))));

    // --------------------------------------------------------- Descripción ---
    const descripcion = h('section', { class: 'hoja-seccion pila', 'aria-labelledby': 'sec-desc' },
      h('h2', { id: 'sec-desc' }, 'Descripción del problema'),
      h('div', { class: 'bloque-texto' }, t.descripcion),
      ui.galeria(t.adjuntos, { grande: true }));

    // ----------------------------------------------------------- Solución ---
    let solucion = null;
    if (cerrado && t.solucion && !esCliente) {
      const cat = t.solucion.solucionCatalogoId ? S.solucion(t.solucion.solucionCatalogoId) : null;
      const autor = S.usuario(t.solucion.autorId);
      const propuesta = S.propuestaDeTicket(t) || S.soluciones().find((s) => s.ticketOrigenId === t.id);
      const puedeProponer = (esOperador || esAdmin) && !S.propuestaDeTicket(t);
      solucion = h('section', { class: 'solucion-ticket', 'aria-labelledby': 'sec-sol' },
        h('div', { class: 'fila-entre' },
          h('h3', { id: 'sec-sol' }, ui.icono('checkCirculo'), 'Resolución del ticket'),
          h('span', { class: 'badge contorno' }, ui.icono('candado', 'i-sm'), 'Sólo ORMEN')),
        h('div', { class: 'bloque-texto' }, t.solucion.texto),
        ui.galeria(t.solucion.adjuntos),
        cat ? h('p', { class: 'chico' }, ui.icono('libro', 'i-sm'), ' Basada en la solución reutilizable ', h('a', { href: '#/soluciones/' + cat.id }, '«' + cat.titulo + '»')) : null,
        h('span', { class: 'chico suave' }, autor ? autor.nombre : '—', ' · ', U.fechaHora(t.solucion.fecha)),
        propuesta || puedeProponer ? h('div', { class: 'origina' },
          h('span', { class: 'origina-flecha' }, ui.icono('flechaDer', 'i-sm'), propuesta ? 'Dio origen a' : 'Puede dar origen a'),
          propuesta ? h('a', { class: 'fila-sm fuerte', href: '#/soluciones/' + propuesta.id }, ui.icono('libro', 'i-sm'), 'Solución reutilizable «' + propuesta.titulo + '»', ui.badgeSolucion(propuesta.estado)) : null,
          puedeProponer ? h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => abrirProponer() }, ui.icono('libro', 'i-sm'), 'Proponer como solución reutilizable') : null) : null);
    } else if (cerrado && esCliente) {
      solucion = ui.aviso(['Cerrado el ', U.fechaHora(t.cerradoEn), '.'], 'verde');
    }

    // ----------------------------------------------------------- Actividad ---
    function itemActividad(ev) {
      const autor = S.usuario(ev.autorId);
      const nombreAutor = autor ? autor.nombre : 'Usuario';
      const quien = !autor ? '' : autor.rol === 'CLIENTE' ? S.nombre('localidades', autor.localidadId) : autor.rol === 'OPERADOR' ? 'Mesa de ayuda' : 'ORMEN';
      if (ev.tipo === 'comentario') {
        return h('article', { class: ['item-act', ev.visibilidad === 'PRIVADO' && 'privado'] },
          ui.avatar(autor),
          h('div', null,
            h('div', { class: 'cabeza' },
              h('span', { class: 'autor' }, nombreAutor),
              h('span', { class: 'chico suave' }, quien),
              esCliente ? null : ui.badgeVisibilidad(ev.visibilidad),
              h('span', { class: 'cuando' }, ui.tiempo(ev.fecha))),
            h('div', { class: 'burbuja' }, h('div', { class: 'cuerpo' }, ev.texto), ui.galeria(ev.adjuntos))));
      }
      const fuerte = h('strong', null, nombreAutor);
      let ic = 'circulo';
      let texto;
      const nota = (etiqueta, txt) => (txt ? h('span', { class: 'chico suave', style: 'flex-basis: 100%' }, etiqueta + ': «' + txt + '»') : null);
      const pasoA = (ev2) => (ev2.de && ev2.a && ev2.de !== ev2.a ? [ui.badgeEstado(ev2.de), '→', ui.badgeEstado(ev2.a)] : null);
      if (ev.tipo === 'creado') { ic = 'ticket'; texto = [fuerte, ev.desdeBorrador ? ' creó el ticket a partir de un borrador' : ' creó el ticket', ev.estado === 'EN_PROCESO' ? [' y lo atiende', ui.badgeEstado('EN_PROCESO')] : null]; }
      else if (ev.tipo === 'estado') { ic = D.ESTADOS[ev.a] ? D.ESTADOS[ev.a].icono : 'circulo'; texto = [fuerte, ' cambió el estado de ', ui.badgeEstado(ev.de), ' a ', ui.badgeEstado(ev.a)]; }
      else if (ev.tipo === 'asignado') {
        ic = 'asignar';
        const op = S.usuario(ev.operadorId);
        texto = ev.operadorId === ev.autorId ? [fuerte, ' tomó el ticket', pasoA(ev)] : [fuerte, ' asignó el ticket a ', h('strong', null, op ? op.nombre : '—'), pasoA(ev)];
      } else if (ev.tipo === 'liberado') { ic = 'bandeja'; texto = [fuerte, ' devolvió el ticket a la cola', pasoA(ev)]; }
      else if (ev.tipo === 'elevado') {
        ic = 'elevar';
        texto = [fuerte, ' elevó el ticket a ', h('button', { type: 'button', class: 'badge elevado', title: 'Ver el recorrido', onClick: verRecorrido }, ui.icono('elevar', 'i-sm'), S.nombreDestino(ev.destino)),
          !esCliente ? nota('Motivo (privado)', ev.texto) : null];
      } else if (ev.tipo === 'bloqueo') { ic = 'pausa'; texto = [fuerte, ' bloqueó el ticket', pasoA(ev), nota(ev.visibilidad === 'PRIVADO' ? 'Factor externo (privado)' : 'Factor externo', ev.texto)]; }
      else if (ev.tipo === 'desbloqueo') { ic = 'reabrir'; texto = [fuerte, ' desbloqueó el ticket', pasoA(ev), nota('Nota (privada)', ev.texto)]; }
      else if (ev.tipo === 'propuesta') {
        ic = 'libro';
        const sol = S.solucion(ev.solucionId);
        texto = [fuerte, ' propuso la resolución como solución reutilizable', sol ? [': ', h('a', { href: '#/soluciones/' + sol.id }, '«' + sol.titulo + '»'), ' ', ui.badgeSolucion(sol.estado)] : null];
      } else if (ev.tipo === 'datos') { ic = 'editar'; texto = [fuerte, ' modificó la clasificación: ', (ev.cambios || []).map((c) => c.etiqueta + ': ' + c.de + ' → ' + c.a).join(' · ')]; }
      else if (ev.tipo === 'cierre') {
        ic = 'check';
        texto = [fuerte, ev.registroDirecto ? ' registró el ticket ya resuelto' : ' cerró el ticket', ev.de ? [' (estaba ', ui.badgeEstado(ev.de), ')'] : null,
          ev.texto && !esCliente ? h('span', { class: 'chico suave', style: 'flex-basis: 100%' }, 'Resolución: «' + U.truncar(ev.texto, 160) + '»') : null];
      } else if (ev.tipo === 'reapertura') { ic = 'reabrir'; texto = [fuerte, ' reabrió el ticket', ev.a ? ['→', ui.badgeEstado(ev.a)] : null, nota('Motivo (privado)', ev.texto)]; }
      else texto = [fuerte, ' actualizó el ticket'];
      return h('div', { class: 'item-act evento' },
        h('div', { class: 'marcador' }, h('span', null, ui.icono(ic, 'i-sm'))),
        h('div', { class: 'texto-evento' }, texto, h('span', { class: 'cuando' }, ui.tiempo(ev.fecha))));
    }

    const listaAct = h('div', { class: 'actividad', id: 'panel-actividad', role: esCliente ? null : 'tabpanel' });
    let filtroAct = 'todo';
    const nComentarios = (v) => actividad.filter((ev) => ev.tipo === 'comentario' && (!v || ev.visibilidad === v)).length;
    const pestanas = esCliente ? null : h('div', { class: 'pestanas', role: 'tablist', 'aria-label': 'Filtrar actividad' },
      [['todo', 'Todo', actividad.length], ['PUBLICO', 'Públicos', nComentarios('PUBLICO')], ['PRIVADO', 'Privados', nComentarios('PRIVADO')]].map(([v, texto, n]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(v === filtroAct), 'aria-controls': 'panel-actividad', 'data-filtro': v, onClick: () => { filtroAct = v; pintarActividad(); } }, texto + ' (' + n + ')')));
    function pintarActividad() {
      if (pestanas) U.$$('button', pestanas).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.filtro === filtroAct)));
      U.vaciar(listaAct);
      const visibles = actividad.filter((ev) => filtroAct === 'todo' || (ev.tipo === 'comentario' && ev.visibilidad === filtroAct));
      if (!visibles.length) listaAct.append(h('p', { class: 'chico suave', style: 'padding: 14px 0' }, 'No hay comentarios de este tipo.'));
      visibles.forEach((ev) => listaAct.append(itemActividad(ev)));
    }
    pintarActividad();

    // Para responder o comentar
    function composer() {
      if (esAdmin) return null;
      if (cerrado) {
        return esOperador
          ? h('div', { class: 'composer' }, h('button', { type: 'button', class: 'btn btn-neutro', style: 'align-self: flex-start', onClick: abrirReabrir }, ui.icono('reabrir', 'i-sm'), 'Reabrir para comentar'))
          : null;
      }
      const texto = h('textarea', { id: 'composer-texto', class: 'control', rows: '3', placeholder: esOperador ? 'Acción realizada o respuesta para la localidad…' : 'Tu mensaje para Mesa de ayuda…' });
      const imgs = ui.selectorImagenes({ pegarEn: [texto], max: 4, etiqueta: 'Imágenes del comentario' });
      const form = h('form', { class: 'composer', novalidate: true },
        ui.campo({ nombre: 'texto', id: 'composer-texto', etiqueta: esOperador ? 'Agregar comentario' : 'Responder', control: texto }),
        imgs.el,
        h('div', { class: 'fila-entre' },
          esOperador ? ui.grupo({ nombre: 'visibilidad', etiqueta: '¿Quién lo ve?', requerido: true, control: opcionesVisibilidad('visibilidad') }) : h('span'),
          h('button', { type: 'submit', class: 'btn btn-primario' }, ui.icono('enviar', 'i-sm'), esOperador ? 'Comentar' : 'Enviar')));
      form.addEventListener('input', () => ctx.marcarSucio(!!texto.value.trim()));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const visibilidad = esOperador ? ui.valorRadio(form, 'visibilidad') : 'PUBLICO';
        try {
          S.comentar(t.id, u, { texto: texto.value, visibilidad, adjuntos: imgs.valor() });
        } catch (err) {
          if (err.campos) ui.mostrarErrores(form, err.campos);
          else ui.mostrarError(err);
          return;
        }
        ctx.marcarSucio(false);
        ui.toast(esCliente ? 'Mensaje enviado a Mesa de ayuda.' : visibilidad === 'PRIVADO' ? 'Comentario privado agregado. Sólo lo ve ORMEN.' : 'Comentario público agregado.' + avisoCorreo());
        ctx.refrescar({ enfocar: '#composer-texto' });
      });
      return form;
    }

    const cardActividad = h('section', { class: 'hoja-seccion', 'aria-labelledby': 'sec-act' },
      h('div', { class: 'card-titulo' }, h('h2', { id: 'sec-act' }, 'Actividad')),
      pestanas, listaAct, composer());

    // ------------------------------------------------------------ Ventanas ---
    function abrirElevar() {
      const sel = h('select', { id: 'elevar-destino', class: 'control' },
        h('option', { value: '' }, 'Elegí un grupo o una persona…'),
        h('optgroup', { label: 'Grupos de soporte' }, S.catalogo('gruposSoporte', true)
          .filter((g) => !(t.elevadoA && t.elevadoA.tipo === 'grupo' && t.elevadoA.id === g.id))
          .map((g) => h('option', { value: 'grupo:' + g.id }, g.nombre))),
        h('optgroup', { label: 'Personas de Mesa de ayuda' }, S.operadores(true)
          .filter((o) => o.id !== t.operadorId)
          .map((o) => h('option', { value: 'usuario:' + o.id }, o.nombre))));
      const motivo = h('textarea', { id: 'elevar-motivo', class: 'control', rows: '3', placeholder: 'Por ejemplo: se reinició el router y sigue sin conexión; hay que revisar el enlace.' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        t.elevadoA ? ui.aviso(['Hoy está elevado a ', h('strong', null, S.nombreDestino(t.elevadoA)), '.']) : null,
        ui.campo({ nombre: 'destino', id: 'elevar-destino', etiqueta: '¿A quién se eleva?', requerido: true, control: sel }),
        ui.campo({ nombre: 'motivo', id: 'elevar-motivo', etiqueta: 'Motivo (privado)', requerido: true, control: motivo }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Elevar el ticket',
        cuerpo,
        enfocar: '#elevar-destino',
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Elevar', clase: 'btn-primario', icono: 'elevar', fn: () => enVentana(cuerpo, () => S.elevar(t.id, u, { destino: sel.value, motivo: motivo.value }), 'Ticket elevado a ' + S.nombreDestino({ tipo: sel.value.split(':')[0], id: sel.value.split(':')[1] }) + '.' + avisoCorreo()) },
        ],
      });
    }

    function abrirBloquear() {
      const texto = h('textarea', { id: 'bloqueo-texto', class: 'control', rows: '3', placeholder: 'Por ejemplo: esperamos que la agencia confirme el número de terminal.' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        ui.campo({ nombre: 'texto', id: 'bloqueo-texto', etiqueta: '¿Qué lo detiene?', requerido: true, control: texto }),
        ui.grupo({ nombre: 'visibilidad', etiqueta: '¿Quién ve el motivo?', requerido: true, control: opcionesVisibilidad('vis-bloqueo') }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Bloquear el ticket',
        cuerpo,
        enfocar: '#bloqueo-texto',
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Bloquear', clase: 'btn-primario', icono: 'pausa', fn: () => enVentana(cuerpo, () => S.bloquear(t.id, u, { texto: texto.value, visibilidad: ui.valorRadio(cuerpo, 'vis-bloqueo') }), 'Ticket #' + t.numero + ' bloqueado.' + avisoCorreo()) },
        ],
      });
    }

    function abrirDesbloquear() {
      const texto = h('textarea', { id: 'desbloqueo-texto', class: 'control', rows: '2', placeholder: 'Por ejemplo: la agencia confirmó el dato.' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        flujoEstado('EN_PROCESO'),
        ui.campo({ nombre: 'texto', id: 'desbloqueo-texto', etiqueta: 'Qué cambió (privado)', opcional: true, control: texto }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Desbloquear el ticket',
        tamano: 'angosto',
        cuerpo,
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Desbloquear', clase: 'btn-primario', icono: 'reabrir', fn: () => enVentana(cuerpo, () => S.desbloquear(t.id, u, { texto: texto.value }), 'Ticket #' + t.numero + ' En proceso de nuevo.' + avisoCorreo()) },
        ],
      });
    }

    async function liberar() {
      const ok = await ui.confirmar({
        titulo: 'Devolver a la cola',
        mensaje: 'Vuelve a Abierto y sin asignar.',
        textoConfirmar: 'Devolver a la cola',
      });
      if (ok) ejecutar(() => S.liberar(t.id, u), 'Ticket #' + t.numero + ' devuelto a la cola.');
    }

    function abrirProponer() {
      const inTit = h('input', { id: 'prop-titulo', class: 'control', type: 'text', maxlength: '120', value: t.titulo });
      const inDesc = h('textarea', { id: 'prop-descripcion', class: 'control', rows: '7', value: t.solucion ? t.solucion.texto : '' });
      const pal = ui.entradaPalabras({ id: 'prop-palabras' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        h('ol', { class: 'pasos-flujo', 'aria-label': 'Flujo' },
          h('li', { class: 'hecho' }, 'Ticket'), h('li', { class: 'hecho' }, 'Resolución'), h('li', { class: 'actual' }, 'Solución reutilizable'), h('li', null, 'Aprobación del administrador')),
        ui.campo({ nombre: 'propuestaTitulo', id: 'prop-titulo', etiqueta: 'Título', requerido: true, control: inTit }),
        ui.campo({ nombre: 'propuestaDescripcion', id: 'prop-descripcion', etiqueta: 'Pasos a seguir', requerido: true, control: inDesc }),
        ui.campo({ nombre: 'propuestaPalabras', id: 'prop-palabras', etiqueta: 'Palabras clave', requerido: true, control: pal.el }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Proponer como solución reutilizable',
        tamano: 'ancho',
        cuerpo,
        enfocar: '#prop-titulo',
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Proponer', clase: 'btn-primario', icono: 'libro', fn: () => enVentana(cuerpo, () => S.proponerSolucion(t.id, u, { titulo: inTit.value, descripcion: inDesc.value, palabrasClave: pal.valor() }), 'Solución reutilizable propuesta: queda por aprobar.') },
        ],
      });
    }

    function abrirCierre(sugerida) {
      let catId = sugerida ? (sugerida.tipo === 'catalogo' ? sugerida.id : sugerida.solucionCatalogoId || null) : null;
      const texto = h('textarea', { id: 'cierre-texto', class: 'control', rows: '6', value: sugerida ? sugerida.texto : '' });
      const basada = h('div', { class: 'fila-sm' });
      const imgs = ui.selectorImagenes({ pegarEn: [texto], etiqueta: 'Imágenes de la resolución' });
      const selTp = ui.select({ id: 'cierre-tipo', valor: t.tipoProblemaId || 'tp-nodef', opciones: S.catalogo('tiposProblema', true).map((x) => ({ valor: x.id, texto: x.nombre })) });
      const mensaje = h('textarea', { id: 'cierre-mensaje', class: 'control', rows: '2', placeholder: 'Por ejemplo: quedó resuelto, cualquier cosa nos avisás.' });
      const chk = h('input', { type: 'checkbox', id: 'cierre-proponer' });
      const inTit = h('input', { id: 'cierre-prop-titulo', class: 'control', type: 'text', maxlength: '120', value: t.titulo });
      const pal = ui.entradaPalabras({ id: 'cierre-prop-palabras' });
      const bloque = h('div', { class: 'pila', hidden: true },
        ui.campo({ nombre: 'propuestaTitulo', id: 'cierre-prop-titulo', etiqueta: 'Título de la solución reutilizable', requerido: true, control: inTit }),
        ui.campo({ nombre: 'propuestaPalabras', id: 'cierre-prop-palabras', etiqueta: 'Palabras clave', requerido: true, control: pal.el }));
      chk.addEventListener('change', () => { bloque.hidden = !chk.checked; });
      function pintarBasada() {
        U.vaciar(basada);
        chk.disabled = !!catId;
        if (catId) {
          chk.checked = false;
          bloque.hidden = true;
          const s = S.solucion(catId);
          basada.append(h('span', { class: 'chip-activo' }, ui.icono('libro', 'i-sm'), 'Basada en la solución reutilizable «' + (s ? s.titulo : '') + '»',
            h('button', { type: 'button', 'aria-label': 'Quitar la referencia a la solución reutilizable', onClick: () => { catId = null; pintarBasada(); } }, ui.icono('x', 'i-sm'))));
        }
      }
      pintarBasada();
      const sugeridas = App.sugerencias.buscar({ texto: t.titulo + ' ' + t.descripcion, sistemaId: t.sistemaId, subsistemaId: t.subsistemaId, localidadId: t.localidadId, excluirTicketId: t.id, limite: 3 });
      const opcionesSug = sugeridas.length ? h('div', { class: 'pila-sm' },
        h('span', { class: 'chico fuerte' }, 'Partir de una sugerencia'),
        h('div', { class: 'chips' }, sugeridas.map((s) => h('button', { type: 'button', class: 'chip', onClick: () => {
          texto.value = s.texto;
          catId = s.tipo === 'catalogo' ? s.id : s.solucionCatalogoId || null;
          pintarBasada();
          texto.focus();
        } }, s.tipo === 'catalogo' ? ui.icono('libro', 'i-sm') : ui.icono('ticket', 'i-sm'), U.truncar(s.titulo, 48))))) : null;
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        opcionesSug,
        basada,
        ui.campo({ nombre: 'solucionTexto', id: 'cierre-texto', etiqueta: 'Resolución (privada)', requerido: true, control: texto }),
        imgs.el,
        h('div', { class: 'grid-2' },
          ui.campo({ nombre: 'tipoProblemaId', id: 'cierre-tipo', etiqueta: 'Tipo de problema', control: selTp }),
          ui.campo({ nombre: 'mensajePublico', id: 'cierre-mensaje', etiqueta: 'Mensaje para la localidad', opcional: true, control: mensaje })),
        h('label', { class: 'check', for: 'cierre-proponer' }, chk, h('strong', null, 'Proponer como solución reutilizable')),
        bloque);
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Cerrar con resolución',
        tamano: 'ancho',
        cuerpo,
        enfocar: '#cierre-texto',
        acciones: [
          { texto: 'Cancelar' },
          {
            texto: 'Cerrar ticket', clase: 'btn-exito', icono: 'check',
            fn: () => enVentana(cuerpo, () => S.cerrar(t.id, u, {
              texto: texto.value,
              adjuntos: imgs.valor(),
              solucionCatalogoId: catId,
              tipoProblemaId: selTp.value,
              mensajePublico: mensaje.value,
              proponer: chk.checked ? { titulo: inTit.value, palabrasClave: pal.valor() } : null,
            }), 'Ticket #' + t.numero + ' cerrado.' + (chk.checked ? ' Solución reutilizable propuesta.' : '') + avisoCorreo()),
          },
        ],
      });
    }

    function abrirClasificacion() {
      const selSis = ui.select({ id: 'cl-sistema', valor: t.sistemaId, opciones: S.sistemas().map((s) => ({ valor: s.id, texto: s.nombre + (s.activo === false ? ' (inactivo)' : '') })) });
      const selSub = h('select', { id: 'cl-subsistema', class: 'control' });
      function cargar(valor) {
        U.vaciar(selSub);
        const subs = S.subsistemasDe(selSis.value);
        selSub.append(h('option', { value: '' }, 'Sin subsistema'));
        subs.forEach((x) => selSub.append(h('option', { value: x.id }, x.nombre)));
        selSub.value = valor && subs.some((x) => x.id === valor) ? valor : '';
      }
      cargar(t.subsistemaId);
      selSis.addEventListener('change', () => cargar(''));
      const selCri = ui.select({ id: 'cl-cri', valor: t.criticidadId, opciones: S.catalogo('criticidades').map((x) => ({ valor: x.id, texto: x.nombre })) });
      const selTp = ui.select({ id: 'cl-tp', valor: t.tipoProblemaId || 'tp-nodef', opciones: S.catalogo('tiposProblema').map((x) => ({ valor: x.id, texto: x.nombre })) });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        h('div', { class: 'grid-2' },
          ui.campo({ nombre: 'sistemaId', id: 'cl-sistema', etiqueta: 'Sistema o servicio', control: selSis }),
          ui.campo({ nombre: 'subsistemaId', id: 'cl-subsistema', etiqueta: 'Subsistema', opcional: true, control: selSub })),
        h('div', { class: 'grid-2' },
          ui.campo({ nombre: 'criticidadId', id: 'cl-cri', etiqueta: 'Criticidad', control: selCri }),
          ui.campo({ nombre: 'tipoProblemaId', id: 'cl-tp', etiqueta: 'Tipo de problema', control: selTp })));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Editar clasificación',
        cuerpo,
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Guardar cambios', clase: 'btn-primario', fn: () => enVentana(cuerpo, () => S.modificarClasificacion(t.id, u, { sistemaId: selSis.value, subsistemaId: selSub.value, criticidadId: selCri.value, tipoProblemaId: selTp.value }), 'Clasificación actualizada.') },
        ],
      });
    }

    function abrirReabrir() {
      const motivo = h('textarea', { id: 'reabrir-motivo', class: 'control', rows: '3', placeholder: 'Por ejemplo: la agencia avisa que el problema volvió a aparecer.' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        flujoEstado('EN_PROCESO'),
        ui.campo({ nombre: 'motivo', id: 'reabrir-motivo', etiqueta: 'Motivo (privado)', opcional: true, control: motivo }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Reabrir el ticket',
        tamano: 'angosto',
        cuerpo,
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Reabrir', clase: 'btn-primario', icono: 'reabrir', fn: () => enVentana(cuerpo, () => S.reabrir(t.id, u, { motivo: motivo.value }), 'Ticket #' + t.numero + ' reabierto.' + avisoCorreo()) },
        ],
      });
    }

    // ------------------------------------------------------------ Lateral ---
    const lateral = h('aside', { class: 'pila', 'aria-label': 'Datos y acciones del ticket' });

    if (esOperador && activo) {
      const items = [];
      if (t.operadorId !== u.id) {
        items.push(h('button', { type: 'button', class: 'btn btn-primario', onClick: () => ejecutar(() => S.asignar(t.id, u, u.id), 'Tomaste el ticket #' + t.numero + (t.estado === 'ABIERTO' ? ': pasó a En proceso.' : '.') + (t.estado === 'ABIERTO' ? avisoCorreo() : '')) },
          ui.icono('asignar', 'i-sm'), 'Tomar el ticket'));
      }
      const otros = S.operadores(true).filter((o) => o.id !== t.operadorId && o.id !== u.id);
      if (otros.length) {
        const selOp = ui.select({ id: 'asignar-a', vacio: 'Asignar a…', opciones: otros.map((o) => ({ valor: o.id, texto: o.nombre })) });
        selOp.setAttribute('aria-label', 'Asignar a otro operador');
        items.push(h('div', { class: 'fila-sm', style: 'flex-wrap: nowrap' }, selOp,
          h('button', { type: 'button', class: 'btn btn-neutro', onClick: () => {
            if (!selOp.value) { selOp.focus(); return; }
            const op = S.usuario(selOp.value);
            ejecutar(() => S.asignar(t.id, u, selOp.value), 'Ticket asignado a ' + op.nombre + '.');
          } }, 'Asignar')));
      }
      items.push(h('hr', { class: 'separador' }));
      if (t.estado === 'EN_PROCESO') {
        items.push(h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirElevar }, ui.icono('elevar', 'i-sm'), t.elevadoA ? 'Elevar a otro grupo o persona' : 'Elevar'));
        items.push(h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirBloquear }, ui.icono('pausa', 'i-sm'), 'Bloquear'));
        items.push(h('button', { type: 'button', class: 'btn btn-neutro', onClick: liberar }, ui.icono('bandeja', 'i-sm'), 'Devolver a la cola'));
      } else if (t.estado === 'BLOQUEADO') {
        items.push(h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirDesbloquear }, ui.icono('reabrir', 'i-sm'), 'Desbloquear'));
      }
      items.push(h('button', { type: 'button', class: 'btn btn-exito btn-lg', onClick: () => abrirCierre() }, ui.icono('check', 'i-sm'), 'Cerrar con resolución'));
      lateral.append(h('section', { class: 'card acento-azul', 'aria-labelledby': 'sec-acciones' }, h('h2', { id: 'sec-acciones', style: 'margin-bottom: 14px' }, 'Acciones'), h('div', { class: 'acciones-ticket' }, items)));
    } else if (esOperador && cerrado) {
      lateral.append(h('section', { class: 'card pila-sm', 'aria-labelledby': 'sec-acciones' },
        h('h2', { id: 'sec-acciones' }, 'Acciones'),
        h('div', { class: 'acciones-ticket' },
          h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirReabrir }, ui.icono('reabrir', 'i-sm'), 'Reabrir ticket'),
          !S.propuestaDeTicket(t) ? h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirProponer }, ui.icono('libro', 'i-sm'), 'Proponer como solución reutilizable') : null)));
    } else if (esAdmin) {
      if (cerrado && !S.propuestaDeTicket(t)) {
        lateral.append(h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirProponer }, ui.icono('libro', 'i-sm'), 'Proponer como solución reutilizable'));
      }
    }

    const datos = [
      ['Sistema', S.nombre('sistemas', t.sistemaId)],
      ['Subsistema', t.subsistemaId ? S.nombre('subsistemas', t.subsistemaId) : '—'],
      ['Criticidad', S.nombre('criticidades', t.criticidadId)],
      esCliente ? null : ['Tipo de problema', S.nombre('tiposProblema', t.tipoProblemaId, 'No definido')],
      ['Actualizado', U.fechaHora(t.actualizadoEn)],
      cerrado ? ['Cerrado', U.fechaHora(t.cerradoEn)] : null,
    ].filter(Boolean);
    lateral.append(h('section', { class: 'card pila-sm', 'aria-labelledby': 'sec-datos' },
      h('div', { class: 'fila-entre' },
        h('h2', { id: 'sec-datos' }, 'Clasificación'),
        esOperador && activo ? h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', onClick: abrirClasificacion }, ui.icono('editar', 'i-sm'), 'Editar') : null),
      h('dl', { class: 'datos-lista' }, datos.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      h('button', { type: 'button', class: 'enlace-boton chico', style: 'align-self: flex-start; margin-top: 4px', onClick: verRecorrido }, ui.icono('recorrido', 'i-sm'), ' Ver el recorrido del ticket')));

    if (!esCliente && activo) {
      const sugeridas = App.sugerencias.buscar({ texto: t.titulo + ' ' + t.descripcion, sistemaId: t.sistemaId, subsistemaId: t.subsistemaId, localidadId: t.localidadId, excluirTicketId: t.id, limite: 4 });
      const opSug = { alUsar: esOperador ? (x) => abrirCierre(x) : null, textoUsar: 'Usar al cerrar' };
      lateral.append(h('section', { class: 'card pila-sm', 'aria-labelledby': 'sec-sug' },
        h('h2', { id: 'sec-sug', class: 'fila-sm' }, ui.icono('bombilla'), 'Sugerencias'),
        sugeridas.length
          ? h('ul', { class: 'sug-compactas' }, sugeridas.map((s) => h('li', { class: s.tipo === 'catalogo' ? 'es-solucion' : null },
            h('button', { type: 'button', onClick: () => ui.modalSugerencia(s, opSug) },
              ui.icono(s.tipo === 'catalogo' ? 'libro' : 'ticket', 'i-sm'),
              h('span', { class: 'crecer' },
                h('span', { class: 'titulo-sug' }, s.titulo),
                h('span', { class: 'fuente-sug' }, s.tipo === 'catalogo' ? 'Solución' : 'Resolución del ticket #' + s.ticket.numero))))))
          : h('p', { class: 'chico suave' }, 'Sin coincidencias.'),
        h('a', { class: 'chico fuerte', href: '#/soluciones/buscar?q=' + encodeURIComponent(t.titulo) }, 'Buscar soluciones ', ui.icono('flechaDer', 'i-sm'))));
    }

    return h('div', { class: 'pila' },
      cabecera,
      h('div', { class: 'dos-columnas' },
        h('div', { class: 'hoja' }, descripcion, solucion ? h('div', { class: 'hoja-seccion' }, solucion) : null, cardActividad),
        lateral));
  };
})(window.App = window.App || {});
