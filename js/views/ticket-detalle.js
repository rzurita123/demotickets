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
      h('label', null, h('input', { type: 'radio', name: nombre, value: 'PUBLICO' }), h('span', { class: 'pub' }, ui.icono('ojo', 'i-sm'), 'Público · lo ve la localidad')),
      h('label', null, h('input', { type: 'radio', name: nombre, value: 'PRIVADO' }), h('span', { class: 'priv' }, ui.icono('candado', 'i-sm'), 'Privado · sólo ORMEN')));
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
      texto: esCliente
        ? 'Sólo podés ver los tickets de ' + S.nombre('localidades', u.localidadId) + '. Por seguridad no se indica si el ticket existe; el intento queda registrado en la auditoría.'
        : 'Revisá el número o buscalo en el listado.',
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

    // ------------------------------------------------------------ Cabecera ---
    const cabecera = h('div', { class: 'ticket-cabecera' },
      h('nav', { class: 'migas', 'aria-label': 'Ubicación' },
        h('a', { href: '#/tickets' }, esCliente ? 'Tickets de ' + loc : 'Tickets'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, '#' + t.numero)),
      h('div', { class: 'fila-sm' },
        ui.badgeEstado(t.estado, true),
        ui.badgeCriticidad(t.criticidadId, true),
        ui.badgeTipoSolicitud(t.tipoSolicitudId),
        t.registroDirecto ? h('span', { class: 'badge contorno' }, ui.icono('checkCirculo', 'i-sm'), 'Registrado ya resuelto') : null),
      h('h1', { id: 'titulo-pagina', tabindex: '-1' }, h('span', { class: 'numero' }, '#' + t.numero), ' ', t.titulo),
      h('div', { class: 'meta' },
        h('span', null, 'Localidad: ', h('strong', null, loc)),
        h('span', null, 'Creado por: ', h('strong', null, creador ? creador.nombre : '—'), creador && !creadorCliente ? ' (Mesa de ayuda, en nombre de la localidad)' : ''),
        h('span', null, 'Fecha: ', h('strong', null, U.fechaHora(t.creadoEn))),
        h('span', null, 'Atiende: ', h('strong', null, operador ? operador.nombre : 'Sin asignar'))));

    // --------------------------------------------------------- Descripción ---
    const descripcion = h('section', { class: 'card pila', 'aria-labelledby': 'sec-desc' },
      h('h2', { id: 'sec-desc' }, 'Descripción del problema'),
      h('div', { class: 'bloque-texto' }, t.descripcion),
      ui.galeria(t.adjuntos, { grande: true }));

    // ----------------------------------------------------------- Solución ---
    let solucion = null;
    if (cerrado && t.solucion && !esCliente) {
      const cat = t.solucion.solucionCatalogoId ? S.solucion(t.solucion.solucionCatalogoId) : null;
      const autor = S.usuario(t.solucion.autorId);
      const propuesta = S.soluciones().find((s) => s.ticketOrigenId === t.id);
      solucion = h('section', { class: 'solucion-ticket', 'aria-labelledby': 'sec-sol' },
        h('div', { class: 'fila-entre' },
          h('h3', { id: 'sec-sol' }, ui.icono('checkCirculo'), 'Solución aplicada'),
          h('span', { class: 'badge contorno', title: 'Supuesto de la demo: la localidad recibe el mensaje público, no la solución.' }, ui.icono('candado', 'i-sm'), 'La ve ORMEN')),
        h('div', { class: 'bloque-texto' }, t.solucion.texto),
        ui.galeria(t.solucion.adjuntos),
        cat ? h('p', { class: 'chico' }, ui.icono('libro', 'i-sm'), ' Basada en la solución del catálogo ', h('a', { href: '#/soluciones/' + cat.id }, '«' + cat.titulo + '»'), '.') : null,
        h('p', { class: 'chico suave' }, 'Registrada por ', autor ? autor.nombre : '—', ' · ', U.fechaHora(t.solucion.fecha)),
        propuesta ? h('div', { class: 'fila-sm' }, h('span', { class: 'chico' }, 'Propuesta para el catálogo:'), ui.badgeSolucion(propuesta.estado), h('a', { class: 'chico', href: '#/soluciones/' + propuesta.id }, 'Ver la propuesta')) : null);
    } else if (cerrado && esCliente) {
      solucion = ui.aviso(['Ticket cerrado el ', U.fechaHora(t.cerradoEn), '. Si el problema vuelve a aparecer, avisá a Mesa de ayuda: para agregar información hay que reabrirlo.'], 'verde');
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
      if (ev.tipo === 'creado') { ic = 'ticket'; texto = [fuerte, ev.desdeBorrador ? ' creó el ticket a partir de un borrador' : ' creó el ticket']; }
      else if (ev.tipo === 'estado') { ic = D.ESTADOS[ev.a] ? D.ESTADOS[ev.a].icono : 'circulo'; texto = [fuerte, ' cambió el estado de ', ui.badgeEstado(ev.de), ' a ', ui.badgeEstado(ev.a)]; }
      else if (ev.tipo === 'asignado') {
        ic = 'asignar';
        const op = S.usuario(ev.operadorId);
        texto = ev.operadorId === ev.autorId ? [fuerte, ' tomó el ticket'] : [fuerte, ' asignó el ticket a ', h('strong', null, op ? op.nombre : '—')];
      } else if (ev.tipo === 'datos') { ic = 'editar'; texto = [fuerte, ' modificó la clasificación: ', (ev.cambios || []).map((c) => c.etiqueta + ': ' + c.de + ' → ' + c.a).join(' · ')]; }
      else if (ev.tipo === 'cierre') {
        ic = 'check';
        texto = [fuerte, ev.registroDirecto ? ' registró el ticket ya resuelto' : ' cerró el ticket', ev.de ? [' (estaba ', ui.badgeEstado(ev.de), ')'] : null,
          ev.texto && !esCliente ? h('span', { class: 'chico suave', style: 'flex-basis: 100%' }, 'Solución: «' + U.truncar(ev.texto, 160) + '»') : null];
      } else if (ev.tipo === 'reapertura') { ic = 'reabrir'; texto = [fuerte, ' reabrió el ticket', ev.texto ? h('span', { class: 'chico suave', style: 'flex-basis: 100%' }, 'Motivo (privado): «' + ev.texto + '»') : null]; }
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
      if (esAdmin) return h('p', { class: 'chico suave composer' }, 'Como administrador consultás el ticket; el tratamiento lo hace Mesa de ayuda (supuesto de la demo).');
      if (cerrado) {
        return h('div', { class: 'composer' }, ui.aviso(esOperador
          ? ['El ticket está cerrado. Para agregar comentarios hay que reabrirlo. ', h('button', { type: 'button', class: 'enlace-boton', onClick: abrirReabrir }, 'Reabrir ticket')]
          : 'El ticket está cerrado. Si el problema vuelve a aparecer, avisá a Mesa de ayuda: para agregar información hay que reabrirlo.'));
      }
      const texto = h('textarea', { id: 'composer-texto', class: 'control', rows: '3', placeholder: esOperador ? 'Acción realizada o respuesta para la localidad…' : 'Tu mensaje para Mesa de ayuda…' });
      const imgs = ui.selectorImagenes({ pegarEn: [texto], max: 4, etiqueta: 'Imágenes del comentario', texto: 'Podés adjuntar, arrastrar o pegar imágenes.' });
      const form = h('form', { class: 'composer', novalidate: true },
        ui.campo({ nombre: 'texto', id: 'composer-texto', etiqueta: esOperador ? 'Agregar comentario' : 'Responder', control: texto }),
        esOperador ? ui.grupo({ nombre: 'visibilidad', etiqueta: '¿Quién lo ve?', requerido: true, control: opcionesVisibilidad('visibilidad'), ayuda: 'Cada comentario se marca como público o privado.' }) : null,
        imgs.el,
        h('div', { class: 'fila-entre' },
          h('span', { class: 'chico suave' }, esCliente ? 'Lo ven Mesa de ayuda y las personas de ' + loc + '.' : ''),
          h('button', { type: 'submit', class: 'btn btn-primario' }, ui.icono('enviar', 'i-sm'), esOperador ? 'Agregar comentario' : 'Enviar')));
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

    const cardActividad = h('section', { class: 'card', 'aria-labelledby': 'sec-act' },
      h('div', { class: 'card-titulo' }, h('h2', { id: 'sec-act' }, 'Actividad'), esCliente ? h('span', { class: 'chico suave' }, 'Respuestas públicas de Mesa de ayuda') : null),
      pestanas, listaAct, composer());

    // ------------------------------------------------------------ Ventanas ---
    function abrirCambioEstado(nuevo) {
      const est = D.ESTADOS[nuevo];
      const texto = h('textarea', { id: 'estado-texto', class: 'control', rows: '3' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        h('p', null, h('strong', null, est.nombre + ': '), est.descripcion),
        nuevo === 'ELEVADO' ? ui.avisoPendiente('¿A quién se eleva?', 'ORMEN todavía no definió a qué personas o grupos se eleva un ticket. En la demo sólo cambia el estado.') : null,
        ui.campo({ nombre: 'texto', id: 'estado-texto', etiqueta: 'Comentario', opcional: true, control: texto, ayuda: nuevo === 'PENDIENTE' ? 'Por ejemplo, qué dato necesitás de la agencia.' : null }),
        ui.grupo({ nombre: 'visibilidad', etiqueta: '¿Quién ve el comentario?', control: opcionesVisibilidad('vis-estado'), ayuda: 'Obligatorio si escribís un comentario.' }));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      const titulos = { ABIERTO: 'Volver a Abierto', PENDIENTE: 'Pasar a Pendiente', ELEVADO: 'Elevar el ticket' };
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: titulos[nuevo],
        cuerpo,
        acciones: [
          { texto: 'Cancelar' },
          { texto: titulos[nuevo], clase: 'btn-primario', icono: est.icono, fn: () => enVentana(cuerpo, () => S.cambiarEstado(t.id, u, nuevo, { texto: texto.value, visibilidad: ui.valorRadio(cuerpo, 'vis-estado') }), 'El ticket pasó a ' + est.nombre + '.' + avisoCorreo()) },
        ],
      });
    }

    function abrirCierre(sugerida) {
      let catId = sugerida ? (sugerida.tipo === 'catalogo' ? sugerida.id : sugerida.solucionCatalogoId || null) : null;
      const texto = h('textarea', { id: 'cierre-texto', class: 'control', rows: '6', value: sugerida ? sugerida.texto : '' });
      const basada = h('div', { class: 'fila-sm' });
      const imgs = ui.selectorImagenes({ pegarEn: [texto], etiqueta: 'Imágenes de la solución' });
      const selTp = ui.select({ id: 'cierre-tipo', valor: t.tipoProblemaId || 'tp-nodef', opciones: S.catalogo('tiposProblema', true).map((x) => ({ valor: x.id, texto: x.nombre })) });
      const mensaje = h('textarea', { id: 'cierre-mensaje', class: 'control', rows: '2', placeholder: 'Por ejemplo: quedó resuelto, cualquier cosa nos avisás.' });
      const chk = h('input', { type: 'checkbox', id: 'cierre-proponer' });
      const ayudaChk = h('span', { class: 'chico suave' });
      const inTit = h('input', { id: 'cierre-prop-titulo', class: 'control', type: 'text', maxlength: '120', value: t.titulo });
      const pal = ui.entradaPalabras({ id: 'cierre-prop-palabras' });
      const bloque = h('div', { class: 'pila', hidden: true },
        ui.campo({ nombre: 'propuestaTitulo', id: 'cierre-prop-titulo', etiqueta: 'Título para el catálogo', requerido: true, control: inTit }),
        ui.campo({ nombre: 'propuestaPalabras', id: 'cierre-prop-palabras', etiqueta: 'Palabras clave', requerido: true, control: pal.el, ayuda: 'Se usan para sugerirla cuando aparecen en la descripción de un ticket.' }));
      chk.addEventListener('change', () => { bloque.hidden = !chk.checked; });
      function pintarBasada() {
        U.vaciar(basada);
        chk.disabled = !!catId;
        ayudaChk.textContent = catId ? 'La solución ya viene del catálogo.' : 'Queda pendiente hasta que un administrador la apruebe.';
        if (catId) {
          chk.checked = false;
          bloque.hidden = true;
          const s = S.solucion(catId);
          basada.append(h('span', { class: 'chip-activo' }, ui.icono('libro', 'i-sm'), 'Basada en el catálogo: «' + (s ? s.titulo : '') + '»',
            h('button', { type: 'button', 'aria-label': 'Quitar la referencia al catálogo', onClick: () => { catId = null; pintarBasada(); } }, ui.icono('x', 'i-sm'))));
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
        } }, s.tipo === 'catalogo' ? ui.icono('libro', 'i-sm') : ui.icono('ticket', 'i-sm'), U.truncar(s.titulo, 48), h('span', { class: 'cuenta' }, s.puntaje + ' pts'))))) : null;
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        opcionesSug,
        basada,
        ui.campo({ nombre: 'solucionTexto', id: 'cierre-texto', etiqueta: 'Solución aplicada', requerido: true, control: texto, ayuda: 'Todo ticket cerrado tiene su solución. La ve ORMEN; a la localidad le llega el mensaje público.' }),
        imgs.el,
        ui.campo({ nombre: 'tipoProblemaId', id: 'cierre-tipo', etiqueta: 'Tipo de problema', control: selTp }),
        ui.campo({ nombre: 'mensajePublico', id: 'cierre-mensaje', etiqueta: 'Mensaje para la localidad', opcional: true, control: mensaje, ayuda: 'Se publica como comentario público.' + (creadorCliente ? ' Además se avisa por correo a ' + creador.nombre + '.' : '') }),
        h('label', { class: 'check', for: 'cierre-proponer' }, chk, h('span', null, h('strong', null, 'Proponer esta solución para el catálogo'), h('br'), ayudaChk)),
        bloque);
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Cerrar con solución',
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
            }), 'Ticket #' + t.numero + ' cerrado.' + (chk.checked ? ' La solución quedó pendiente de aprobación.' : '') + avisoCorreo()),
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
        subs.forEach((x) => selSub.append(h('option', { value: x.id }, x.nombre + (x.ejemplo ? ' (ejemplo)' : ''))));
        selSub.value = valor && subs.some((x) => x.id === valor) ? valor : '';
      }
      cargar(t.subsistemaId);
      selSis.addEventListener('change', () => cargar(''));
      const selTipo = ui.select({ id: 'cl-tipo', valor: t.tipoSolicitudId, opciones: S.catalogo('tiposSolicitud').map((x) => ({ valor: x.id, texto: x.nombre })) });
      const selCri = ui.select({ id: 'cl-cri', valor: t.criticidadId, opciones: S.catalogo('criticidades').map((x) => ({ valor: x.id, texto: x.nombre })) });
      const selTp = ui.select({ id: 'cl-tp', valor: t.tipoProblemaId || 'tp-nodef', opciones: S.catalogo('tiposProblema').map((x) => ({ valor: x.id, texto: x.nombre })) });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        h('div', { class: 'grid-2' },
          ui.campo({ nombre: 'sistemaId', id: 'cl-sistema', etiqueta: 'Sistema o servicio', control: selSis }),
          ui.campo({ nombre: 'subsistemaId', id: 'cl-subsistema', etiqueta: 'Subsistema', opcional: true, control: selSub })),
        h('div', { class: 'grid-2' },
          ui.campo({ nombre: 'tipoSolicitudId', id: 'cl-tipo', etiqueta: 'Tipo de solicitud', control: selTipo }),
          ui.campo({ nombre: 'criticidadId', id: 'cl-cri', etiqueta: 'Criticidad', control: selCri })),
        ui.campo({ nombre: 'tipoProblemaId', id: 'cl-tp', etiqueta: 'Tipo de problema', control: selTp }),
        h('p', { class: 'chico suave' }, 'El cambio queda en la actividad del ticket y en la auditoría.'));
      cuerpo.addEventListener('submit', (e) => e.preventDefault());
      ui.modal({
        antetitulo: 'Ticket #' + t.numero,
        titulo: 'Editar clasificación',
        cuerpo,
        acciones: [
          { texto: 'Cancelar' },
          { texto: 'Guardar cambios', clase: 'btn-primario', fn: () => enVentana(cuerpo, () => S.modificarClasificacion(t.id, u, { sistemaId: selSis.value, subsistemaId: selSub.value, tipoSolicitudId: selTipo.value, criticidadId: selCri.value, tipoProblemaId: selTp.value }), 'Clasificación actualizada.') },
        ],
      });
    }

    function abrirReabrir() {
      const motivo = h('textarea', { id: 'reabrir-motivo', class: 'control', rows: '3', placeholder: 'Por ejemplo: la agencia avisa que el problema volvió a aparecer.' });
      const cuerpo = h('form', { class: 'pila', novalidate: true },
        h('p', null, 'El ticket vuelve a ', h('strong', null, 'Abierto'), ' para poder agregarle comentarios. Cuando termines, cerralo de nuevo con su solución.'),
        ui.campo({ nombre: 'motivo', id: 'reabrir-motivo', etiqueta: 'Motivo', opcional: true, control: motivo, ayuda: 'Queda como nota privada (sólo ORMEN).' }));
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
        items.push(h('button', { type: 'button', class: 'btn btn-primario', onClick: () => ejecutar(() => S.asignar(t.id, u, u.id), 'Tomaste el ticket #' + t.numero + '.') }, ui.icono('asignar', 'i-sm'), 'Tomar el ticket'));
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
      const textosEstado = { ABIERTO: 'Volver a Abierto', PENDIENTE: 'Pasar a Pendiente', ELEVADO: 'Elevar' };
      D.ESTADOS_ACTIVOS.filter((e) => e !== t.estado).forEach((e) => items.push(
        h('button', { type: 'button', class: 'btn btn-neutro', onClick: () => abrirCambioEstado(e) }, ui.icono(D.ESTADOS[e].icono, 'i-sm'), textosEstado[e])));
      items.push(h('button', { type: 'button', class: 'btn btn-exito', onClick: () => abrirCierre() }, ui.icono('check', 'i-sm'), 'Cerrar con solución'));
      items.push(h('hr', { class: 'separador' }));
      items.push(h('button', { type: 'button', class: 'btn btn-fantasma', onClick: abrirClasificacion }, ui.icono('editar', 'i-sm'), 'Editar clasificación'));
      lateral.append(h('section', { class: 'card', 'aria-labelledby': 'sec-acciones' }, h('h2', { id: 'sec-acciones', style: 'margin-bottom: 12px' }, 'Acciones'), h('div', { class: 'acciones-ticket' }, items)));
    } else if (esOperador && cerrado) {
      lateral.append(h('section', { class: 'card pila-sm', 'aria-labelledby': 'sec-acciones' },
        h('h2', { id: 'sec-acciones' }, 'Acciones'),
        h('p', { class: 'chico suave' }, 'Para agregar comentarios a un ticket cerrado hay que reabrirlo.'),
        h('button', { type: 'button', class: 'btn btn-neutro', onClick: abrirReabrir }, ui.icono('reabrir', 'i-sm'), 'Reabrir ticket')));
    } else if (esAdmin) {
      lateral.append(ui.aviso('Como administrador consultás el ticket. El tratamiento lo hace Mesa de ayuda (supuesto de la demo).'));
    }

    if (t.estado === 'ELEVADO' && !esCliente) {
      lateral.append(ui.avisoPendiente('¿A quién se eleva?', 'ORMEN pidió el estado Elevado (pasado a otro nivel de soporte) pero todavía no definió a qué personas o grupos.'));
    }

    const datos = [
      ['Localidad', loc],
      ['Sistema', S.nombre('sistemas', t.sistemaId)],
      ['Subsistema', t.subsistemaId ? S.nombre('subsistemas', t.subsistemaId) : '—'],
      ['Tipo de solicitud', S.nombre('tiposSolicitud', t.tipoSolicitudId)],
      ['Criticidad', S.nombre('criticidades', t.criticidadId)],
      esCliente ? null : ['Tipo de problema', S.nombre('tiposProblema', t.tipoProblemaId, 'No definido')],
      ['Creado por', creador ? S.etiquetaUsuario(creador) : '—'],
      ['Creado', U.fechaHora(t.creadoEn)],
      ['Actualizado', U.fechaHora(t.actualizadoEn)],
      cerrado ? ['Cerrado', U.fechaHora(t.cerradoEn)] : null,
      ['Atiende', operador ? operador.nombre : 'Sin asignar'],
    ].filter(Boolean);
    lateral.append(h('section', { class: 'card', 'aria-labelledby': 'sec-datos' },
      h('h2', { id: 'sec-datos', style: 'margin-bottom: 12px' }, 'Datos del ticket'),
      h('dl', { class: 'datos-lista' }, datos.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))));

    if (!esCliente && activo) {
      const sugeridas = App.sugerencias.buscar({ texto: t.titulo + ' ' + t.descripcion, sistemaId: t.sistemaId, subsistemaId: t.subsistemaId, localidadId: t.localidadId, excluirTicketId: t.id, limite: 4 });
      lateral.append(h('section', { class: 'card pila', 'aria-labelledby': 'sec-sug' },
        h('div', { class: 'pila-sm' },
          h('h2', { id: 'sec-sug', class: 'fila-sm' }, ui.icono('bombilla'), 'Sugerencias de solución'),
          h('p', { class: 'chico suave' }, 'Según la descripción, el sistema y la localidad de este ticket.')),
        sugeridas.length
          ? h('div', { class: 'sugerencias' }, sugeridas.map((s, i) => ui.tarjetaSugerencia(s, { mejor: i === 0, alUsar: esOperador ? (x) => abrirCierre(x) : null, textoUsar: 'Usar al cerrar' })))
          : h('p', { class: 'chico' }, 'No se encontraron soluciones relevantes.'),
        h('a', { class: 'chico fuerte', href: '#/soluciones/buscar?q=' + encodeURIComponent(t.titulo) }, 'Buscar en el catálogo ', ui.icono('flechaDer', 'i-sm'))));
    }

    return h('div', { class: 'pila' },
      cabecera,
      h('div', { class: 'dos-columnas' },
        h('div', { class: 'pila-lg' }, descripcion, solucion, cardActividad),
        lateral));
  };
})(window.App = window.App || {});
